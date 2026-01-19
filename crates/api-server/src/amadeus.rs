use reqwest::Client;
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

use anyhow::{Result, anyhow};
use std::env;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

use crate::models::{
    AirTrafficBookedResponse, AirlineDestinationsResponse, AirlinesResponse, AmadeusErrorResponse,
    BusiestPeriodResponse, CheckinLinksResponse, DirectDestinationsResponse,
    FlightAvailabilityRequest, FlightAvailabilityResponse, FlightDatesResponse,
    FlightDelayPredictionResponse, FlightDestinationsResponse, FlightOffer, FlightOffersResponse,
    FlightOrderRequest, FlightOrderResponse, FlightPriceResponse, FlightSearchRequest,
    FlightStatusResponse, ItineraryPriceMetricsResponse, LocationScoreResponse, LocationsResponse,
    RecommendedLocationsResponse, SeatmapResponse,
};

/// Amadeus API Base URL - configurable via AMADEUS_ENV environment variable
/// Set AMADEUS_ENV=production for production, otherwise uses test environment
static BASE_URL_CACHE: OnceLock<String> = OnceLock::new();

fn get_base_url() -> &'static str {
    BASE_URL_CACHE.get_or_init(|| match env::var("AMADEUS_ENV").as_deref() {
        Ok("production") => "https://api.amadeus.com".to_string(),
        _ => "https://test.api.amadeus.com".to_string(),
    })
}

/// Token cache with expiry tracking
struct TokenCache {
    token: String,
    expires_at: Instant,
}

static TOKEN_CACHE: OnceLock<RwLock<Option<TokenCache>>> = OnceLock::new();

fn get_token_cache() -> &'static RwLock<Option<TokenCache>> {
    TOKEN_CACHE.get_or_init(|| RwLock::new(None))
}

/// Check if running in production environment
#[allow(dead_code)]
pub fn is_production() -> bool {
    env::var("AMADEUS_ENV").as_deref() == Ok("production")
}

/// Get current environment name
#[allow(dead_code)]
pub fn get_environment() -> &'static str {
    if is_production() {
        "production"
    } else {
        "test"
    }
}

#[derive(Deserialize, Debug)]
pub struct TokenResponse {
    pub access_token: String,
    #[allow(dead_code)]
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct AmadeusError {
    pub errors: Option<Vec<AmadeusErrorDetail>>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct AmadeusErrorDetail {
    pub status: Option<i32>,
    pub code: Option<i32>,
    pub title: Option<String>,
    pub detail: Option<String>,
}

/// Get a valid access token, using cache if available
pub async fn get_token(client: &Client) -> Result<String> {
    // Check cache first
    {
        let cache = get_token_cache().read().await;
        if let Some(ref cached) = *cache {
            // Use token if it has at least 60 seconds remaining
            if cached.expires_at > Instant::now() + Duration::from_secs(60) {
                return Ok(cached.token.clone());
            }
        }
    }

    // Fetch new token
    let token_response = fetch_new_token(client).await?;
    let token = token_response.access_token.clone();

    // Cache the token (expires_in is in seconds, subtract buffer)
    let expires_at = Instant::now()
        + Duration::from_secs((token_response.expires_in as u64).saturating_sub(120));

    {
        let mut cache = get_token_cache().write().await;
        *cache = Some(TokenCache {
            token: token.clone(),
            expires_at,
        });
    }

    Ok(token)
}

/// Fetch a new token from Amadeus OAuth2 endpoint
#[instrument(skip(client))]
async fn fetch_new_token(client: &Client) -> Result<TokenResponse> {
    let client_id = env::var("AMADEUS_CLIENT_ID")
        .map_err(|_| anyhow!("AMADEUS_CLIENT_ID environment variable not set"))?;
    let client_secret = env::var("AMADEUS_CLIENT_SECRET")
        .map_err(|_| anyhow!("AMADEUS_CLIENT_SECRET environment variable not set"))?;

    debug!("Fetching new Amadeus token from {}", get_base_url());

    // Correct endpoint: /v1/security/oauth2/token (NOT /v20/)
    // Use form data with client_id and client_secret (NOT Basic Auth header)
    let response = client
        .post(format!("{}/v1/security/oauth2/token", get_base_url()))
        .form(&[
            ("grant_type", "client_credentials"),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
        ])
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        error!(
            "Token request failed: status={}, error={}",
            status, error_text
        );
        return Err(anyhow!(
            "Token request failed with status {}: {}",
            status,
            error_text
        ));
    }

    info!("Successfully obtained Amadeus access token");
    Ok(response.json().await?)
}

/// Search for flight offers
pub async fn search_flights(
    client: &Client,
    token: &str,
    req: &FlightSearchRequest,
) -> Result<FlightOffersResponse> {
    if let Some(ref return_date) = req.return_date {
        info!(
            "search_flights called: origin={}, destination={}, departure={}, return={}",
            req.origin, req.destination, req.departure_date, return_date
        );
    } else {
        info!(
            "search_flights called: origin={}, destination={}, departure={} (one-way)",
            req.origin, req.destination, req.departure_date
        );
    }

    // Build travelers array - each traveler needs a unique ID
    let mut travelers = Vec::new();
    let mut traveler_id = 1;

    // Add adults
    for _ in 0..req.adults {
        travelers.push(serde_json::json!({
            "id": traveler_id.to_string(),
            "travelerType": "ADULT"
        }));
        traveler_id += 1;
    }

    // Add children (ages 2-11)
    for _ in 0..req.children {
        travelers.push(serde_json::json!({
            "id": traveler_id.to_string(),
            "travelerType": "CHILD"
        }));
        traveler_id += 1;
    }

    // Add infants (under 2, on adult lap)
    // HELD_INFANT = infant on adult's lap (no seat), requires associatedAdultId
    for i in 0..req.infants {
        // Associate each infant with a different adult (if possible)
        let adult_id = (i % req.adults) + 1;
        travelers.push(serde_json::json!({
            "id": traveler_id.to_string(),
            "travelerType": "HELD_INFANT",
            "associatedAdultId": adult_id.to_string()
        }));
        traveler_id += 1;
    }

    // Build origin-destinations
    let mut origin_destinations = vec![serde_json::json!({
        "id": "1",
        "originLocationCode": req.origin,
        "destinationLocationCode": req.destination,
        "departureDateTimeRange": {
            "date": req.departure_date
        }
    })];

    let mut leg_id = 2;

    // Add return leg if round-trip (only if no additional legs for multi-city)
    if req.additional_legs.is_none() {
        if let Some(ref return_date) = req.return_date {
            origin_destinations.push(serde_json::json!({
                "id": leg_id.to_string(),
                "originLocationCode": req.destination,
                "destinationLocationCode": req.origin,
                "departureDateTimeRange": {
                    "date": return_date
                }
            }));
            leg_id += 1;
        }
    }

    // Add additional legs for multi-city search
    if let Some(ref additional_legs) = req.additional_legs {
        for leg in additional_legs {
            origin_destinations.push(serde_json::json!({
                "id": leg_id.to_string(),
                "originLocationCode": leg.origin,
                "destinationLocationCode": leg.destination,
                "departureDateTimeRange": {
                    "date": leg.departure_date
                }
            }));
            leg_id += 1;
        }
    }

    // Build search criteria
    // Amadeus allows up to 250 results per request
    let mut search_criteria = serde_json::json!({
        "maxFlightOffers": req.max_results.unwrap_or(250)
    });

    // Add flight filters if specified
    let mut flight_filters = serde_json::Map::new();

    if let Some(non_stop) = req.non_stop {
        if non_stop {
            flight_filters.insert(
                "connectionRestriction".to_string(),
                serde_json::json!({
                    "maxNumberOfConnections": 0
                }),
            );
        }
    }

    if let Some(ref included) = req.included_airline_codes {
        if !included.is_empty() {
            flight_filters.insert(
                "carrierRestrictions".to_string(),
                serde_json::json!({
                    "includedCarrierCodes": included
                }),
            );
        }
    } else if let Some(ref excluded) = req.excluded_airline_codes {
        if !excluded.is_empty() {
            flight_filters.insert(
                "carrierRestrictions".to_string(),
                serde_json::json!({
                    "excludedCarrierCodes": excluded
                }),
            );
        }
    }

    if let Some(ref travel_class) = req.travel_class {
        // Build origin destination IDs based on trip type
        let mut od_ids = vec!["1".to_string()];
        if req.return_date.is_some() {
            od_ids.push("2".to_string());
        }
        // Add IDs for additional legs in multi-city
        if let Some(ref legs) = req.additional_legs {
            for i in 0..legs.len() {
                od_ids.push((i + 2).to_string());
            }
        }

        flight_filters.insert(
            "cabinRestrictions".to_string(),
            serde_json::json!([{
                "cabin": travel_class,
                "coverage": "ALL_SEGMENTS",
                "originDestinationIds": od_ids
            }]),
        );
    }

    if let Some(max_price) = req.max_price {
        flight_filters.insert("maxPrice".to_string(), serde_json::json!(max_price));
    }

    if !flight_filters.is_empty() {
        search_criteria["flightFilters"] = serde_json::Value::Object(flight_filters);
    }

    let body = serde_json::json!({
        "currencyCode": req.currency.clone().unwrap_or_else(|| "EUR".to_string()),
        "originDestinations": origin_destinations,
        "travelers": travelers,
        "sources": ["GDS"],
        "searchCriteria": search_criteria
    });

    debug!(
        "Searching flights: {} -> {}, date: {}",
        req.origin, req.destination, req.departure_date
    );

    // Retry loop for 429 Too Many Requests
    let max_retries = 3;
    let mut retry_count = 0;

    loop {
        let response = client
            .post(format!("{}/v2/shopping/flight-offers", get_base_url()))
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await?;

        if response.status().is_success() {
            // Parse the full response into our typed structs
            let response_text = response.text().await?;
            debug!(
                "Amadeus response (first 500 chars): {}",
                &response_text[..response_text.len().min(500)]
            );

            let amadeus_resp: FlightOffersResponse =
                serde_json::from_str(&response_text).map_err(|e| {
                    error!(
                        "Failed to parse Amadeus response: {}. Response: {}",
                        e,
                        &response_text[..response_text.len().min(1000)]
                    );
                    anyhow!("Failed to parse Amadeus response: {}", e)
                })?;

            info!("Flight search returned {} offers", amadeus_resp.data.len());
            return Ok(amadeus_resp);
        } else if response.status() == 429 {
            // Too Many Requests - Retry logic
            if retry_count >= max_retries {
                let error_text = response.text().await.unwrap_or_default();
                error!(
                    "Amadeus API 429 Quota Exceeded after {} retries: {}",
                    max_retries, error_text
                );
                return Err(anyhow!(
                    "Flight search rate limit exceeded after retries. Quota might be exhausted."
                ));
            }

            retry_count += 1;
            let wait_time = if let Some(retry_after) = response.headers().get("Retry-After") {
                retry_after.to_str().unwrap_or("1").parse().unwrap_or(1)
            } else {
                // Exponential backoff: 1, 2, 4 seconds
                1 << (retry_count - 1)
            };

            warn!(
                "Amadeus API 429 Too Many Requests. Retrying in {} seconds (attempt {}/{})",
                wait_time, retry_count, max_retries
            );
            tokio::time::sleep(Duration::from_secs(wait_time)).await;
            continue;
        } else {
            // Other error
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();

            error!(
                "Amadeus API error response: status={}, body={}",
                status, error_text
            );

            // Try to parse as Amadeus error response for better logging
            if let Ok(error_resp) = serde_json::from_str::<AmadeusErrorResponse>(&error_text) {
                for err in &error_resp.errors {
                    error!(
                        "Amadeus API error: code={:?}, title={:?}, detail={:?}",
                        err.code, err.title, err.detail
                    );
                }
            }

            return Err(anyhow!(
                "Flight search failed with status {}: {}",
                status,
                error_text
            ));
        }
    }
}

/// Price flight offers - confirms price and gets detailed pricing info
/// POST /v1/shopping/flight-offers/pricing
pub async fn price_flight_offers(
    client: &Client,
    token: &str,
    flight_offers: &[FlightOffer],
    include_bags: bool,
) -> Result<FlightPriceResponse> {
    let body = serde_json::json!({
        "data": {
            "type": "flight-offers-pricing",
            "flightOffers": flight_offers
        }
    });

    // Build URL with optional include parameter
    let mut url = format!("{}/v1/shopping/flight-offers/pricing", get_base_url());
    if include_bags {
        url.push_str("?include=bags");
    }

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("X-HTTP-Method-Override", "GET")
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Flight pricing failed with status {}: {}",
            status,
            error_text
        ));
    }

    let price_resp: FlightPriceResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse pricing response: {}", e))?;

    Ok(price_resp)
}

/// Create a flight order (booking)
/// POST /v1/booking/flight-orders
pub async fn create_flight_order(
    client: &Client,
    token: &str,
    order_request: &FlightOrderRequest,
) -> Result<FlightOrderResponse> {
    let mut data = serde_json::json!({
        "type": "flight-order",
        "flightOffers": order_request.flight_offers,
        "travelers": order_request.travelers,
        "remarks": order_request.remarks,
        "ticketingAgreement": order_request.ticketing_agreement,
        "contacts": order_request.contacts
    });

    // Add formOfPayment if provided
    if let Some(ref fop) = order_request.form_of_payment {
        data["formOfPayment"] = serde_json::to_value(fop).unwrap_or_default();
    }

    let body = serde_json::json!({
        "data": data
    });

    info!(
        "Creating flight order for {} travelers",
        order_request.travelers.len()
    );

    let response = client
        .post(format!("{}/v1/booking/flight-orders", get_base_url()))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();

        // Try to parse as Amadeus error response for better logging
        if let Ok(error_resp) = serde_json::from_str::<AmadeusErrorResponse>(&error_text) {
            for err in &error_resp.errors {
                // Check for common sandbox errors
                if err.code == Some(crate::models::error_codes::SEGMENT_SELL_FAILURE) {
                    warn!("Segment sell failure (common in sandbox): {:?}", err.detail);
                } else {
                    error!(
                        "Amadeus booking error: code={:?}, title={:?}, detail={:?}",
                        err.code, err.title, err.detail
                    );
                }
            }
        }

        return Err(anyhow!(
            "Flight order creation failed with status {}: {}",
            status,
            error_text
        ));
    }

    let order_resp: FlightOrderResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse order response: {}", e))?;

    info!(
        "Flight order created successfully: id={}",
        order_resp.data.id
    );
    Ok(order_resp)
}

/// Get a flight order by ID
/// GET /v1/booking/flight-orders/{id}
pub async fn get_flight_order(
    client: &Client,
    token: &str,
    order_id: &str,
) -> Result<FlightOrderResponse> {
    let response = client
        .get(format!(
            "{}/v1/booking/flight-orders/{}",
            get_base_url(),
            order_id
        ))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get flight order failed with status {}: {}",
            status,
            error_text
        ));
    }

    let order_resp: FlightOrderResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse order response: {}", e))?;

    Ok(order_resp)
}

/// Delete (cancel) a flight order by ID
/// DELETE /v1/booking/flight-orders/{id}
pub async fn delete_flight_order(client: &Client, token: &str, order_id: &str) -> Result<()> {
    let response = client
        .delete(format!(
            "{}/v1/booking/flight-orders/{}",
            get_base_url(),
            order_id
        ))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Delete flight order failed with status {}: {}",
            status,
            error_text
        ));
    }

    Ok(())
}

/// Get seatmap for flight offers
/// POST /v1/shopping/seatmaps
pub async fn get_seatmaps(
    client: &Client,
    token: &str,
    flight_offers: &[FlightOffer],
) -> Result<SeatmapResponse> {
    let body = serde_json::json!({
        "data": flight_offers
    });

    tracing::debug!("Sending seatmap request for {} offers", flight_offers.len());

    let response = client
        .post(format!("{}/v1/shopping/seatmaps", get_base_url()))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        tracing::error!("Seatmap API error: status={}, body={}", status, error_text);
        return Err(anyhow!(
            "Get seatmaps failed with status {}: {}",
            status,
            error_text
        ));
    }

    // Get the raw response text first for debugging
    let response_text = response.text().await?;
    tracing::debug!("Seatmap raw response length: {} bytes", response_text.len());

    let seatmap_resp: SeatmapResponse = serde_json::from_str(&response_text).map_err(|e| {
        tracing::error!(
            "Failed to parse seatmap response: {}. Response preview: {}...",
            e,
            &response_text[..response_text.len().min(500)]
        );
        anyhow!("Failed to parse seatmap response: {}", e)
    })?;

    tracing::debug!("Parsed {} seatmaps successfully", seatmap_resp.data.len());
    Ok(seatmap_resp)
}

/// Get seatmap by flight order ID
/// GET /v1/shopping/seatmaps?flight-orderId={id}
pub async fn get_seatmaps_by_order(
    client: &Client,
    token: &str,
    order_id: &str,
) -> Result<SeatmapResponse> {
    let response = client
        .get(format!(
            "{}/v1/shopping/seatmaps?flight-orderId={}",
            get_base_url(),
            order_id
        ))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get seatmaps by order failed with status {}: {}",
            status,
            error_text
        ));
    }

    let seatmap_resp: SeatmapResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse seatmap response: {}", e))?;

    Ok(seatmap_resp)
}

/// Get branded fares upsell options
/// POST /v1/shopping/flight-offers/upselling
pub async fn get_upsell_offers(
    client: &Client,
    token: &str,
    flight_offers: &[FlightOffer],
) -> Result<FlightOffersResponse> {
    let body = serde_json::json!({
        "data": {
            "type": "flight-offers-upselling",
            "flightOffers": flight_offers
        }
    });

    tracing::info!(
        "Upsell request body: {}",
        serde_json::to_string(&body).unwrap_or_default()
    );

    let response = client
        .post(format!(
            "{}/v1/shopping/flight-offers/upselling",
            get_base_url()
        ))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();

        // Check if this is a "no upsell offers found" error (code 39397)
        // In this case, return an empty response instead of an error
        if status.as_u16() == 400 && error_text.contains("39397") {
            tracing::info!("No upsell offers available for this flight");
            return Ok(FlightOffersResponse {
                data: vec![],
                dictionaries: None,
            });
        }

        tracing::error!(
            "Upsell API error - Status: {}, Response: {}",
            status,
            error_text
        );
        return Err(anyhow!(
            "Get upsell offers failed with status {}: {}",
            status,
            error_text
        ));
    }

    let response_text = response.text().await?;
    tracing::debug!(
        "Upsell API response: {}",
        &response_text[..std::cmp::min(500, response_text.len())]
    );

    let upsell_resp: FlightOffersResponse = serde_json::from_str(&response_text)
        .map_err(|e| anyhow!("Failed to parse upsell response: {}", e))?;

    Ok(upsell_resp)
}

/// Get flight availabilities by booking class
/// POST /v1/shopping/availability/flight-availabilities
pub async fn get_flight_availabilities(
    client: &Client,
    token: &str,
    request: &FlightAvailabilityRequest,
) -> Result<FlightAvailabilityResponse> {
    let body = serde_json::json!({
        "originDestinations": request.origin_destinations,
        "travelers": request.travelers,
        "sources": request.sources
    });

    let response = client
        .post(format!(
            "{}/v1/shopping/availability/flight-availabilities",
            get_base_url()
        ))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get flight availabilities failed with status {}: {}",
            status,
            error_text
        ));
    }

    let availability_resp: FlightAvailabilityResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse availability response: {}", e))?;

    Ok(availability_resp)
}

/// Get flight destinations (inspiration search)
/// GET /v1/shopping/flight-destinations
pub async fn get_flight_destinations(
    client: &Client,
    token: &str,
    origin: &str,
    max_price: Option<i32>,
) -> Result<FlightDestinationsResponse> {
    let mut url = format!(
        "{}/v1/shopping/flight-destinations?origin={}",
        get_base_url(),
        origin
    );
    if let Some(price) = max_price {
        url.push_str(&format!("&maxPrice={}", price));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get flight destinations failed with status {}: {}",
            status,
            error_text
        ));
    }

    let destinations_resp: FlightDestinationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse destinations response: {}", e))?;

    Ok(destinations_resp)
}

/// Get cheapest flight dates
/// GET /v1/shopping/flight-dates
pub async fn get_flight_dates(
    client: &Client,
    token: &str,
    origin: &str,
    destination: &str,
) -> Result<FlightDatesResponse> {
    let url = format!(
        "{}/v1/shopping/flight-dates?origin={}&destination={}",
        get_base_url(),
        origin,
        destination
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get flight dates failed with status {}: {}",
            status,
            error_text
        ));
    }

    let dates_resp: FlightDatesResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse dates response: {}", e))?;

    Ok(dates_resp)
}

/// Get itinerary price metrics (historical price analysis)
/// GET /v1/analytics/itinerary-price-metrics
pub async fn get_itinerary_price_metrics(
    client: &Client,
    token: &str,
    origin: &str,
    destination: &str,
    departure_date: &str,
    currency_code: Option<&str>,
    one_way: Option<bool>,
) -> Result<ItineraryPriceMetricsResponse> {
    let mut url = format!(
        "{}/v1/analytics/itinerary-price-metrics?originIataCode={}&destinationIataCode={}&departureDate={}",
        get_base_url(),
        origin,
        destination,
        departure_date
    );
    if let Some(currency) = currency_code {
        url.push_str(&format!("&currencyCode={}", currency));
    }
    if let Some(is_one_way) = one_way {
        url.push_str(&format!("&oneWay={}", is_one_way));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get itinerary price metrics failed with status {}: {}",
            status,
            error_text
        ));
    }

    let metrics_resp: ItineraryPriceMetricsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse price metrics response: {}", e))?;

    Ok(metrics_resp)
}

/// Predict flight delay probability
/// GET /v1/travel/predictions/flight-delay
pub async fn predict_flight_delay(
    client: &Client,
    token: &str,
    origin: &str,
    destination: &str,
    departure_date: &str,
    departure_time: &str,
    arrival_date: &str,
    arrival_time: &str,
    aircraft_code: &str,
    carrier_code: &str,
    flight_number: &str,
    duration: &str,
) -> Result<FlightDelayPredictionResponse> {
    let url = format!(
        "{}/v1/travel/predictions/flight-delay?originLocationCode={}&destinationLocationCode={}&departureDate={}&departureTime={}&arrivalDate={}&arrivalTime={}&aircraftCode={}&carrierCode={}&flightNumber={}&duration={}",
        get_base_url(),
        origin,
        destination,
        departure_date,
        departure_time,
        arrival_date,
        arrival_time,
        aircraft_code,
        carrier_code,
        flight_number,
        duration
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Predict flight delay failed with status {}: {}",
            status,
            error_text
        ));
    }

    let delay_resp: FlightDelayPredictionResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse delay prediction response: {}", e))?;

    Ok(delay_resp)
}

/// Predict flight choice probability
/// POST /v2/shopping/flight-offers/prediction
pub async fn predict_flight_choice(
    client: &Client,
    token: &str,
    flight_offers: &[FlightOffer],
) -> Result<FlightOffersResponse> {
    let body = serde_json::json!({
        "data": flight_offers
    });

    let response = client
        .post(format!(
            "{}/v2/shopping/flight-offers/prediction",
            get_base_url()
        ))
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Predict flight choice failed with status {}: {}",
            status,
            error_text
        ));
    }

    let prediction_resp: FlightOffersResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse choice prediction response: {}", e))?;

    Ok(prediction_resp)
}

/// Get airport direct destinations
/// GET /v1/airport/direct-destinations
pub async fn get_airport_direct_destinations(
    client: &Client,
    token: &str,
    departure_airport_code: &str,
    max: Option<i32>,
) -> Result<DirectDestinationsResponse> {
    let mut url = format!(
        "{}/v1/airport/direct-destinations?departureAirportCode={}",
        get_base_url(),
        departure_airport_code
    );
    if let Some(max_val) = max {
        url.push_str(&format!("&max={}", max_val));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get airport direct destinations failed with status {}: {}",
            status,
            error_text
        ));
    }

    let destinations_resp: DirectDestinationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse direct destinations response: {}", e))?;

    Ok(destinations_resp)
}

/// Get airline destinations
/// GET /v1/airline/destinations
pub async fn get_airline_destinations(
    client: &Client,
    token: &str,
    airline_code: &str,
    max: Option<i32>,
) -> Result<AirlineDestinationsResponse> {
    let mut url = format!(
        "{}/v1/airline/destinations?airlineCode={}",
        get_base_url(),
        airline_code
    );
    if let Some(max_val) = max {
        url.push_str(&format!("&max={}", max_val));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get airline destinations failed with status {}: {}",
            status,
            error_text
        ));
    }

    let destinations_resp: AirlineDestinationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse airline destinations response: {}", e))?;

    Ok(destinations_resp)
}

/// Get flight status
/// GET /v2/schedule/flights
pub async fn get_flight_status(
    client: &Client,
    token: &str,
    carrier_code: &str,
    flight_number: &str,
    scheduled_departure_date: &str,
) -> Result<FlightStatusResponse> {
    let url = format!(
        "{}/v2/schedule/flights?carrierCode={}&flightNumber={}&scheduledDepartureDate={}",
        get_base_url(),
        carrier_code,
        flight_number,
        scheduled_departure_date
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get flight status failed with status {}: {}",
            status,
            error_text
        ));
    }

    let status_resp: FlightStatusResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse flight status response: {}", e))?;

    Ok(status_resp)
}

/// Get check-in links
/// GET /v2/reference-data/urls/checkin-links
pub async fn get_checkin_links(
    client: &Client,
    token: &str,
    airline_code: &str,
    language: Option<&str>,
) -> Result<CheckinLinksResponse> {
    let mut url = format!(
        "{}/v2/reference-data/urls/checkin-links?airlineCode={}",
        get_base_url(),
        airline_code
    );
    if let Some(lang) = language {
        url.push_str(&format!("&language={}", lang));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get checkin links failed with status {}: {}",
            status,
            error_text
        ));
    }

    let checkin_resp: CheckinLinksResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse checkin links response: {}", e))?;

    Ok(checkin_resp)
}

/// Search locations (airports/cities)
/// GET /v1/reference-data/locations
pub async fn search_locations(
    client: &Client,
    token: &str,
    keyword: &str,
    subtype: Option<&str>,
    page_limit: Option<i32>,
) -> Result<LocationsResponse> {
    // subType is required by Amadeus API - default to AIRPORT,CITY
    let sub_type = subtype.unwrap_or("AIRPORT,CITY");
    // URL-encode the keyword to handle special characters and spaces
    let encoded_keyword = urlencoding::encode(keyword);
    // Use view=FULL for more complete data and sort by traveler score for relevance
    let mut url = format!(
        "{}/v1/reference-data/locations?keyword={}&subType={}&view=FULL&sort=analytics.travelers.score",
        get_base_url(),
        encoded_keyword,
        sub_type
    );
    if let Some(limit) = page_limit {
        url.push_str(&format!("&page[limit]={}", limit));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Search locations failed with status {}: {}",
            status,
            error_text
        ));
    }

    let locations_resp: LocationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse locations response: {}", e))?;

    Ok(locations_resp)
}

/// Get airports by geo coordinates
/// GET /v1/reference-data/locations/airports
pub async fn get_airports_by_geocode(
    client: &Client,
    token: &str,
    latitude: f64,
    longitude: f64,
    radius: Option<i32>,
    page_limit: Option<i32>,
) -> Result<LocationsResponse> {
    let mut url = format!(
        "{}/v1/reference-data/locations/airports?latitude={}&longitude={}",
        get_base_url(),
        latitude,
        longitude
    );
    if let Some(r) = radius {
        url.push_str(&format!("&radius={}", r));
    }
    if let Some(limit) = page_limit {
        url.push_str(&format!("&page[limit]={}", limit));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get airports failed with status {}: {}",
            status,
            error_text
        ));
    }

    let airports_resp: LocationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse airports response: {}", e))?;

    Ok(airports_resp)
}

/// Get airline info
/// GET /v1/reference-data/airlines
pub async fn get_airlines(
    client: &Client,
    token: &str,
    airline_codes: Option<&str>,
) -> Result<AirlinesResponse> {
    let mut url = format!("{}/v1/reference-data/airlines", get_base_url());
    if let Some(codes) = airline_codes {
        url.push_str(&format!("?airlineCodes={}", codes));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get airlines failed with status {}: {}",
            status,
            error_text
        ));
    }

    let airlines_resp: AirlinesResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse airlines response: {}", e))?;

    Ok(airlines_resp)
}

/// Get busiest travel period
/// GET /v1/travel/analytics/air-traffic/busiest-period
pub async fn get_busiest_period(
    client: &Client,
    token: &str,
    city_code: &str,
    period: &str,
    direction: Option<&str>,
) -> Result<BusiestPeriodResponse> {
    let mut url = format!(
        "{}/v1/travel/analytics/air-traffic/busiest-period?cityCode={}&period={}",
        get_base_url(),
        city_code,
        period
    );
    if let Some(dir) = direction {
        url.push_str(&format!("&direction={}", dir));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get busiest period failed with status {}: {}",
            status,
            error_text
        ));
    }

    let busiest_resp: BusiestPeriodResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse busiest period response: {}", e))?;

    Ok(busiest_resp)
}

/// Get air traffic booked
/// GET /v1/travel/analytics/air-traffic/booked
pub async fn get_air_traffic_booked(
    client: &Client,
    token: &str,
    origin_city_code: &str,
    period: &str,
    max: Option<i32>,
) -> Result<AirTrafficBookedResponse> {
    let mut url = format!(
        "{}/v1/travel/analytics/air-traffic/booked?originCityCode={}&period={}",
        get_base_url(),
        origin_city_code,
        period
    );
    if let Some(max_val) = max {
        url.push_str(&format!("&max={}", max_val));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get air traffic booked failed with status {}: {}",
            status,
            error_text
        ));
    }

    let booked_resp: AirTrafficBookedResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse air traffic booked response: {}", e))?;

    Ok(booked_resp)
}

/// Get recommended locations based on traveler history
/// GET /v1/reference-data/recommended-locations
pub async fn get_recommended_locations(
    client: &Client,
    token: &str,
    city_codes: &str,
    traveler_country_code: Option<&str>,
) -> Result<RecommendedLocationsResponse> {
    let mut url = format!(
        "{}/v1/reference-data/recommended-locations?cityCodes={}",
        get_base_url(),
        city_codes
    );
    if let Some(country) = traveler_country_code {
        url.push_str(&format!("&travelerCountryCode={}", country));
    }

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get recommended locations failed with status {}: {}",
            status,
            error_text
        ));
    }

    let resp: RecommendedLocationsResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse recommended locations response: {}", e))?;

    Ok(resp)
}

/// Get location score (category rated areas)
/// GET /v1/location/analytics/category-rated-areas
pub async fn get_location_score(
    client: &Client,
    token: &str,
    latitude: f64,
    longitude: f64,
) -> Result<LocationScoreResponse> {
    let url = format!(
        "{}/v1/location/analytics/category-rated-areas?latitude={}&longitude={}",
        get_base_url(),
        latitude,
        longitude
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow!(
            "Get location score failed with status {}: {}",
            status,
            error_text
        ));
    }

    let resp: LocationScoreResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse location score response: {}", e))?;

    Ok(resp)
}
