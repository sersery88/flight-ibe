use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post},
    Router,
};

use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use redis::AsyncCommands;
use chrono::Datelike;

mod amadeus;
pub mod models;
mod rate_limiter;
mod sse;

pub use models::*;

/// Cache TTL for flight search results (5 minutes)
const SEARCH_CACHE_TTL_SECS: u64 = 300;

#[derive(Clone)]
struct AppState {
    amadeus_client: reqwest::Client,
    redis_client: Option<redis::Client>,
}


#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    // Initialize logging with explicit level
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .init();

    tracing::info!("🚀 Starting Flypink API Server...");

    // Initialize Redis client (optional - caching works without it)
    let redis_client = match std::env::var("REDIS_URL") {
        Ok(url) => {
            match redis::Client::open(url) {
                Ok(client) => {
                    tracing::info!("Redis client initialized for caching");
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!("Failed to connect to Redis: {}. Caching disabled.", e);
                    None
                }
            }
        }
        Err(_) => {
            tracing::info!("REDIS_URL not set. Caching disabled.");
            None
        }
    };

    let state = AppState {
        amadeus_client: reqwest::Client::new(),
        redis_client,
    };


    let app = Router::new()
        .route("/health", get(health))
        .route("/flight-search", post(flight_search))
        .route("/flight-price", post(flight_price))
        .route("/flight-price-stream", post(sse::flight_price_stream))
        .route("/upsell-stream", post(sse::upsell_stream))
        .route("/price-matrix", post(price_matrix))
        .route("/price-matrix-stream", post(sse::price_matrix_stream))
        .route("/flight-order", post(flight_order))
        .route("/flight-order/{id}", get(get_flight_order))
        .route("/flight-order/{id}", delete(delete_flight_order))
        .route("/seatmaps", post(get_seatmaps))
        .route("/seatmaps/order/{id}", get(get_seatmaps_by_order))
        .route("/upsell", post(get_upsell_offers))
        .route("/flight-availabilities", post(get_flight_availabilities))
        .route("/flight-destinations", get(get_flight_destinations))
        .route("/flight-dates", get(get_flight_dates))
        .route("/price-metrics", get(get_price_metrics))
        .route("/flight-delay-prediction", get(predict_flight_delay))
        .route("/flight-choice-prediction", post(predict_flight_choice))
        .route("/airport-direct-destinations", get(get_airport_direct_destinations))
        .route("/airline-destinations", get(get_airline_destinations))
        .route("/flight-status", get(get_flight_status))
        .route("/checkin-links", get(get_checkin_links))
        .route("/locations", get(search_locations))
        .route("/airports", get(get_airports_by_geocode))
        .route("/airlines", get(get_airlines))
        .route("/busiest-period", get(get_busiest_period))
        .route("/air-traffic-booked", get(get_air_traffic_booked))
        .route("/recommended-locations", get(get_recommended_locations))
        .route("/location-score", get(get_location_score))
        .layer(CorsLayer::permissive())
        .with_state(Arc::new(state));

    let listener = TcpListener::bind(&std::env::var("ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string())).await.unwrap();

    let addr = listener.local_addr().unwrap();
    tracing::info!("🚀 Server running on http://{}", addr);
    println!("🚀 Server running on http://{}", addr);

    axum::serve(listener, app).await.unwrap();
}

async fn health() -> StatusCode {
    StatusCode::OK
}

// FlightSearchRequest is defined in models.rs

async fn flight_search(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FlightSearchRequest>,
) -> Result<Json<models::FlightOffersResponse>, StatusCode> {
    if let Some(ref return_date) = payload.return_date {
        tracing::info!("🔍 Flight search request: {} -> {}, departure: {}, return: {}",
            payload.origin, payload.destination, payload.departure_date, return_date);
    } else {
        tracing::info!("🔍 Flight search request: {} -> {}, departure: {} (one-way)",
            payload.origin, payload.destination, payload.departure_date);
    }

    // Generate cache key from search parameters (including travel_class, non_stop, and maxResults)
    let cache_key = format!(
        "flight_search:{}:{}:{}:{}:{}:{}:{}:{}:{}:{}",
        payload.origin,
        payload.destination,
        payload.departure_date,
        payload.return_date.as_deref().unwrap_or(""),
        payload.adults,
        payload.children,
        payload.infants,
        payload.travel_class.as_deref().unwrap_or("ECONOMY"),
        payload.non_stop.unwrap_or(false),
        payload.max_results.unwrap_or(50)
    );

    // Try to get from cache first
    if let Some(ref redis_client) = state.redis_client {
        if let Ok(mut conn) = redis_client.get_multiplexed_async_connection().await {
            if let Ok(cached) = conn.get::<_, String>(&cache_key).await {
                if let Ok(resp) = serde_json::from_str::<models::FlightOffersResponse>(&cached) {
                    tracing::debug!("Cache hit for flight search: {}", cache_key);
                    return Ok(Json(resp));
                }
            }
        }
    }

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Search flights
    match amadeus::search_flights(&state.amadeus_client, &token, &payload).await {
        Ok(resp) => {
            // Cache the result
            if let Some(ref redis_client) = state.redis_client {
                if let Ok(mut conn) = redis_client.get_multiplexed_async_connection().await {
                    if let Ok(json) = serde_json::to_string(&resp) {
                        let _: Result<(), _> = conn.set_ex(&cache_key, json, SEARCH_CACHE_TTL_SECS).await;
                        tracing::debug!("Cached flight search result: {}", cache_key);
                    }
                }
            }
            Ok(Json(resp))
        }
        Err(e) => {
            // Log auch ohne Tracing-Filter sichtbar machen
            println!("Amadeus search error: {:?}", e);
            tracing::error!("Amadeus search error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn flight_price(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::FlightPriceRequest>,
) -> Result<Json<models::FlightPriceResponse>, (StatusCode, Json<serde_json::Value>)> {
    tracing::info!("Flight price request received, include_bags: {}", payload.include_bags);

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "errors": [{
                        "code": 500,
                        "title": "INTERNAL_SERVER_ERROR",
                        "detail": "Failed to get authentication token"
                    }]
                }))
            ));
        }
    };

    // Price the flight offer
    match amadeus::price_flight_offers(
        &state.amadeus_client,
        &token,
        &[payload.flight_offer],
        payload.include_bags,
    ).await {
        Ok(resp) => {
            // Log included bags info
            if let Some(ref included) = resp.included {
                tracing::info!("Pricing response includes {} bag options", included.bags.len());
                for (id, bag) in &included.bags {
                    tracing::info!("Bag option {}: {:?}", id, bag);
                }
            } else {
                tracing::info!("Pricing response has no included bag options");
            }
            Ok(Json(resp))
        },
        Err(e) => {
            let error_msg = e.to_string();
            tracing::error!("Amadeus pricing error: {:?}", e);

            // Try to parse the error message to extract Amadeus error details
            if error_msg.contains("4926") || error_msg.contains("No fare applicable") {
                Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "errors": [{
                            "code": 4926,
                            "title": "INVALID DATA RECEIVED",
                            "detail": "No fare applicable",
                            "status": 400
                        }]
                    }))
                ))
            } else {
                Err((
                    StatusCode::BAD_GATEWAY,
                    Json(serde_json::json!({
                        "errors": [{
                            "code": 502,
                            "title": "BAD_GATEWAY",
                            "detail": error_msg
                        }]
                    }))
                ))
            }
        }
    }
}

async fn price_matrix(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::PriceMatrixRequest>,
) -> Result<Json<models::PriceMatrixResponse>, StatusCode> {
    tracing::info!("Price matrix request: {} -> {}, {} outbound dates x {} inbound dates",
        payload.origin, payload.destination, payload.outbound_dates.len(), payload.inbound_dates.len());

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Generate all valid combinations
    let mut combinations = Vec::new();
    for outbound in &payload.outbound_dates {
        for inbound in &payload.inbound_dates {
            // Only add if inbound is after outbound
            if inbound > outbound {
                combinations.push((outbound.clone(), inbound.clone()));
            }
        }
    }

    tracing::info!("Searching {} valid date combinations in batches (3 parallel per batch, 2 seconds between batches)", combinations.len());

    // Search combinations in batches to respect rate limits
    // Amadeus Test: 10 req/sec max, but we use 3 parallel every 2 seconds to be extra safe
    let currency = payload.currency.clone().unwrap_or_else(|| "EUR".to_string());
    let batch_size = 3; // 3 parallel requests per batch
    let mut all_results = Vec::new();

    for (batch_idx, chunk) in combinations.chunks(batch_size).enumerate() {
        tracing::info!("Processing batch {} of {} ({} requests in parallel)",
            batch_idx + 1,
            combinations.len().div_ceil(batch_size),
            chunk.len()
        );

        let futures: Vec<_> = chunk.iter().map(|(outbound, inbound)| {
            let client = state.amadeus_client.clone();
            let token = token.clone();
            let origin = payload.origin.clone();
            let destination = payload.destination.clone();
            let outbound = outbound.clone();
            let inbound = inbound.clone();
            let adults = payload.adults;
            let children = payload.children;
            let infants = payload.infants;
            let currency = currency.clone();

            async move {
                let req = models::FlightSearchRequest {
                    origin,
                    destination,
                    departure_date: outbound.clone(),
                    return_date: Some(inbound.clone()),
                    adults,
                    children,
                    infants,
                    currency: Some(currency.clone()),
                    travel_class: None,
                    non_stop: None,
                    max_price: None,
                    max_results: Some(250), // Get up to 250 offers to find cheapest
                    included_airline_codes: None,
                    excluded_airline_codes: None,
                    additional_legs: None,
                };

                match amadeus::search_flights(&client, &token, &req).await {
                    Ok(resp) => {
                        let price = resp.data.first().map(|offer| offer.price.total.clone());
                        (outbound, inbound, price, currency)
                    }
                    Err(e) => {
                        tracing::warn!("Failed to get price for {} - {}: {:?}", outbound, inbound, e);
                        (outbound, inbound, None, currency)
                    }
                }
            }
        }).collect();

        // Wait for this batch to complete
        let batch_results = futures::future::join_all(futures).await;
        all_results.extend(batch_results);

        // Wait 2 seconds before next batch (3 requests every 2 seconds = 1.5 req/sec)
        if batch_idx < combinations.len().div_ceil(batch_size) - 1 {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }
    }

    let results = all_results;

    // Build response
    let prices: Vec<models::PriceMatrixEntry> = results.into_iter().map(|(outbound, inbound, price, currency)| {
        models::PriceMatrixEntry {
            outbound_date: outbound,
            inbound_date: inbound,
            price,
            currency,
        }
    }).collect();

    tracing::info!("Price matrix completed: {} prices returned", prices.len());

    Ok(Json(models::PriceMatrixResponse { prices }))
}

async fn flight_order(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::FlightOrderRequest>,
) -> Result<Json<models::FlightOrderResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Create the flight order
    match amadeus::create_flight_order(&state.amadeus_client, &token, &payload).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus order creation error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn get_flight_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<models::FlightOrderResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get the flight order
    match amadeus::get_flight_order(&state.amadeus_client, &token, &id).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus get order error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn delete_flight_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Delete the flight order
    match amadeus::delete_flight_order(&state.amadeus_client, &token, &id).await {
        Ok(()) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            tracing::error!("Amadeus delete order error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn get_seatmaps(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::SeatmapRequest>,
) -> Result<Json<models::SeatmapResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get seatmaps
    match amadeus::get_seatmaps(&state.amadeus_client, &token, &payload.flight_offers).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus seatmap error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn get_seatmaps_by_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<models::SeatmapResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get seatmaps by order ID
    match amadeus::get_seatmaps_by_order(&state.amadeus_client, &token, &id).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus seatmap by order error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn get_upsell_offers(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::UpsellRequest>,
) -> Result<Json<models::FlightOffersResponse>, StatusCode> {
    tracing::info!("Upsell request received with {} offers", payload.flight_offers.len());

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get upsell offers
    match amadeus::get_upsell_offers(&state.amadeus_client, &token, &payload.flight_offers).await {
        Ok(resp) => {
            tracing::info!("Upsell response received with {} offers", resp.data.len());
            Ok(Json(resp))
        },
        Err(e) => {
            tracing::error!("Amadeus upsell error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn get_flight_availabilities(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::FlightAvailabilityRequest>,
) -> Result<Json<models::FlightAvailabilityResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get flight availabilities
    match amadeus::get_flight_availabilities(&state.amadeus_client, &token, &payload).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus availability error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for flight destinations
#[derive(Debug, serde::Deserialize)]
pub struct FlightDestinationsQuery {
    pub origin: String,
    pub max_price: Option<i32>,
}

async fn get_flight_destinations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FlightDestinationsQuery>,
) -> Result<Json<models::FlightDestinationsResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get flight destinations
    match amadeus::get_flight_destinations(&state.amadeus_client, &token, &params.origin, params.max_price).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus destinations error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for flight dates
#[derive(Debug, serde::Deserialize)]
pub struct FlightDatesQuery {
    pub origin: String,
    pub destination: String,
}

async fn get_flight_dates(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FlightDatesQuery>,
) -> Result<Json<models::FlightDatesResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get flight dates
    match amadeus::get_flight_dates(&state.amadeus_client, &token, &params.origin, &params.destination).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::warn!("Amadeus dates error: {:?}, returning mock data for testing", e);

            // Return mock data for testing when Amadeus API fails
            let mock_data = generate_mock_flight_dates(&params.origin, &params.destination);
            Ok(Json(mock_data))
        }
    }
}

/// Generate mock flight dates for testing
fn generate_mock_flight_dates(origin: &str, destination: &str) -> models::FlightDatesResponse {
    use chrono::{Utc, Duration};

    let mut dates = Vec::new();
    let base_price = 500.0;

    // Generate dates for the next 60 days
    for i in 0..60 {
        let date = Utc::now() + Duration::days(i);
        let date_str = date.format("%Y-%m-%d").to_string();

        // Vary prices based on day of week (weekends more expensive)
        let day_of_week = date.weekday().num_days_from_monday();
        let weekend_multiplier = if day_of_week >= 5 { 1.3 } else { 1.0 };

        // Add some randomness
        let random_factor = 0.8 + (i % 7) as f64 * 0.1;
        let price = base_price * weekend_multiplier * random_factor;

        dates.push(models::FlightDate {
            data_type: "flight-date".to_string(),
            origin: origin.to_string(),
            destination: destination.to_string(),
            departure_date: date_str,
            return_date: None,
            price: models::FlightDestinationPrice {
                total: format!("{:.2}", price),
            },
        });
    }

    models::FlightDatesResponse {
        data: dates,
        dictionaries: None,
    }
}

/// Query parameters for price metrics
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMetricsQuery {
    pub origin: String,
    pub destination: String,
    pub departure_date: String,
    pub currency_code: Option<String>,
    pub one_way: Option<bool>,
}

async fn get_price_metrics(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PriceMetricsQuery>,
) -> Result<Json<models::ItineraryPriceMetricsResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get price metrics
    match amadeus::get_itinerary_price_metrics(
        &state.amadeus_client,
        &token,
        &params.origin,
        &params.destination,
        &params.departure_date,
        params.currency_code.as_deref(),
        params.one_way,
    ).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus price metrics error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for flight delay prediction
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightDelayQuery {
    pub origin: String,
    pub destination: String,
    pub departure_date: String,
    pub departure_time: String,
    pub arrival_date: String,
    pub arrival_time: String,
    pub aircraft_code: String,
    pub carrier_code: String,
    pub flight_number: String,
    pub duration: String,
}

async fn predict_flight_delay(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FlightDelayQuery>,
) -> Result<Json<models::FlightDelayPredictionResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Predict flight delay
    match amadeus::predict_flight_delay(
        &state.amadeus_client,
        &token,
        &params.origin,
        &params.destination,
        &params.departure_date,
        &params.departure_time,
        &params.arrival_date,
        &params.arrival_time,
        &params.aircraft_code,
        &params.carrier_code,
        &params.flight_number,
        &params.duration,
    ).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus delay prediction error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

async fn predict_flight_choice(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<models::FlightChoicePredictionRequest>,
) -> Result<Json<models::FlightOffersResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Predict flight choice
    match amadeus::predict_flight_choice(&state.amadeus_client, &token, &payload.data).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus choice prediction error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for airport direct destinations
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirportDirectDestinationsQuery {
    pub departure_airport_code: String,
    pub max: Option<i32>,
}

async fn get_airport_direct_destinations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AirportDirectDestinationsQuery>,
) -> Result<Json<models::DirectDestinationsResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get airport direct destinations
    match amadeus::get_airport_direct_destinations(&state.amadeus_client, &token, &params.departure_airport_code, params.max).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus airport destinations error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for airline destinations
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirlineDestinationsQuery {
    pub airline_code: String,
    pub max: Option<i32>,
}

async fn get_airline_destinations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AirlineDestinationsQuery>,
) -> Result<Json<models::AirlineDestinationsResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get airline destinations
    match amadeus::get_airline_destinations(&state.amadeus_client, &token, &params.airline_code, params.max).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus airline destinations error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for flight status
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightStatusQuery {
    pub carrier_code: String,
    pub flight_number: String,
    pub scheduled_departure_date: String,
}

async fn get_flight_status(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FlightStatusQuery>,
) -> Result<Json<models::FlightStatusResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get flight status
    match amadeus::get_flight_status(&state.amadeus_client, &token, &params.carrier_code, &params.flight_number, &params.scheduled_departure_date).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus flight status error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for check-in links
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckinLinksQuery {
    pub airline_code: String,
    pub language: Option<String>,
}

async fn get_checkin_links(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CheckinLinksQuery>,
) -> Result<Json<models::CheckinLinksResponse>, StatusCode> {
    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Get check-in links
    match amadeus::get_checkin_links(&state.amadeus_client, &token, &params.airline_code, params.language.as_deref()).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus checkin links error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for locations search
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationsQuery {
    pub keyword: String,
    pub sub_type: Option<String>,
    pub page_limit: Option<i32>,
}

async fn search_locations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<LocationsQuery>,
) -> Result<Json<models::LocationsResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::search_locations(&state.amadeus_client, &token, &params.keyword, params.sub_type.as_deref(), params.page_limit).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus locations error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for airports by geocode
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirportsQuery {
    pub latitude: f64,
    pub longitude: f64,
    pub radius: Option<i32>,
    pub page_limit: Option<i32>,
}

async fn get_airports_by_geocode(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AirportsQuery>,
) -> Result<Json<models::LocationsResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_airports_by_geocode(&state.amadeus_client, &token, params.latitude, params.longitude, params.radius, params.page_limit).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus airports error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for airlines
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirlinesQuery {
    pub airline_codes: Option<String>,
}

async fn get_airlines(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AirlinesQuery>,
) -> Result<Json<models::AirlinesResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_airlines(&state.amadeus_client, &token, params.airline_codes.as_deref()).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus airlines error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for busiest period
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusiestPeriodQuery {
    pub city_code: String,
    pub period: String,
    pub direction: Option<String>,
}

async fn get_busiest_period(
    State(state): State<Arc<AppState>>,
    Query(params): Query<BusiestPeriodQuery>,
) -> Result<Json<models::BusiestPeriodResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_busiest_period(&state.amadeus_client, &token, &params.city_code, &params.period, params.direction.as_deref()).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus busiest period error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for air traffic booked
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirTrafficBookedQuery {
    pub origin_city_code: String,
    pub period: String,
    pub max: Option<i32>,
}

async fn get_air_traffic_booked(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AirTrafficBookedQuery>,
) -> Result<Json<models::AirTrafficBookedResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_air_traffic_booked(&state.amadeus_client, &token, &params.origin_city_code, &params.period, params.max).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus air traffic booked error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for recommended locations
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendedLocationsQuery {
    pub city_codes: String,
    pub traveler_country_code: Option<String>,
}

async fn get_recommended_locations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<RecommendedLocationsQuery>,
) -> Result<Json<models::RecommendedLocationsResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_recommended_locations(&state.amadeus_client, &token, &params.city_codes, params.traveler_country_code.as_deref()).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus recommended locations error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

/// Query parameters for location score
#[derive(Debug, serde::Deserialize)]
pub struct LocationScoreQuery {
    pub latitude: f64,
    pub longitude: f64,
}

async fn get_location_score(
    State(state): State<Arc<AppState>>,
    Query(params): Query<LocationScoreQuery>,
) -> Result<Json<models::LocationScoreResponse>, StatusCode> {
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    match amadeus::get_location_score(&state.amadeus_client, &token, params.latitude, params.longitude).await {
        Ok(resp) => Ok(Json(resp)),
        Err(e) => {
            tracing::error!("Amadeus location score error: {:?}", e);
            Err(StatusCode::BAD_GATEWAY)
        }
    }
}
