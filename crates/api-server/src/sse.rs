//! Server-Sent Events (SSE) endpoints for streaming flight pricing and upsells
//!
//! These endpoints allow progressive loading of pricing data with rate limiting
//! to respect Amadeus API quotas (10 TPS in test environment).

use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::sse::{Event, Sse},
};
use futures::stream::{self, Stream, StreamExt};
use redis::AsyncCommands;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info, warn};

use crate::rate_limiter::RateLimiter;
use crate::{
    AppState, amadeus,
    models::{FlightOffer, FlightPriceResponse, FlightSearchRequest, PriceMatrixRequest},
};

/// Request payload for pricing stream
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PricingStreamRequest {
    pub flight_offers: Vec<FlightOffer>,
    pub include_bags: bool,
}

/// Request payload for upsell stream
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsellStreamRequest {
    pub flight_offers: Vec<FlightOffer>,
}

/// SSE event for pricing result
#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
#[allow(dead_code)]
pub enum PricingEvent {
    /// Pricing succeeded for an offer
    Success {
        offer_id: String,
        result: FlightPriceResponse,
    },
    /// Pricing failed for an offer
    Error { offer_id: String, error: String },
    /// Progress update
    Progress { current: usize, total: usize },
    /// Stream completed
    Complete {
        total: usize,
        successful: usize,
        failed: usize,
    },
}

/// SSE event for price matrix result
#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
#[allow(dead_code)]
pub enum PriceMatrixEvent {
    /// Price found for a date combination
    Price {
        outbound_date: String,
        inbound_date: String,
        price: Option<String>,
        currency: String,
    },
    /// Progress update
    Progress { current: usize, total: usize },
    /// Stream completed
    Complete {
        total: usize,
        successful: usize,
        failed: usize,
    },
}

/// Stream flight pricing results with rate limiting
pub async fn flight_price_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PricingStreamRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, StatusCode> {
    info!(
        "Pricing stream started for {} offers",
        payload.flight_offers.len()
    );

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let total = payload.flight_offers.len();

    // Create rate limiter (10 TPS for test environment)
    let rate_limiter = RateLimiter::new(10);

    // Clone data for the stream
    let client = state.amadeus_client.clone();
    let offers = payload.flight_offers;
    let include_bags = payload.include_bags;

    let stream = stream::iter(offers.into_iter().enumerate())
        .then(move |(index, offer)| {
            let client = client.clone();
            let token = token.clone();
            let limiter = rate_limiter.clone();

            async move {
                // Wait for rate limiter
                limiter.wait().await;

                let offer_id = offer.id.clone();

                // Send progress event
                let progress_event = PricingEvent::Progress {
                    current: index + 1,
                    total,
                };

                let progress_json = serde_json::to_string(&progress_event).unwrap_or_default();
                let progress = Event::default().data(progress_json);

                // Price the offer
                match amadeus::price_flight_offers(&client, &token, &[offer], include_bags).await {
                    Ok(result) => {
                        let event = PricingEvent::Success { offer_id, result };
                        let json = serde_json::to_string(&event).unwrap_or_default();
                        vec![Ok(progress), Ok(Event::default().data(json))]
                    }
                    Err(e) => {
                        let event = PricingEvent::Error {
                            offer_id,
                            error: e.to_string(),
                        };
                        let json = serde_json::to_string(&event).unwrap_or_default();
                        vec![Ok(progress), Ok(Event::default().data(json))]
                    }
                }
            }
        })
        .flat_map(stream::iter);

    Ok(Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(1))
            .text("keep-alive"),
    ))
}

/// SSE event for upsell result
#[derive(Debug, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
#[allow(dead_code)]
pub enum UpsellEvent {
    /// Upsell succeeded for an offer
    Success {
        offer_id: String,
        upsells: Vec<FlightOffer>,
    },
    /// Upsell failed for an offer
    Error { offer_id: String, error: String },
    /// Progress update
    Progress { current: usize, total: usize },
}

/// Stream upsell options with rate limiting
pub async fn upsell_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpsellStreamRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, StatusCode> {
    info!(
        "Upsell stream started for {} offers",
        payload.flight_offers.len()
    );

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let total = payload.flight_offers.len();

    // Create rate limiter (10 TPS for test environment)
    let rate_limiter = RateLimiter::new(10);

    // Clone data for the stream
    let client = state.amadeus_client.clone();
    let offers = payload.flight_offers;

    let stream = stream::iter(offers.into_iter().enumerate())
        .then(move |(index, offer)| {
            let client = client.clone();
            let token = token.clone();
            let limiter = rate_limiter.clone();

            async move {
                // Wait for rate limiter
                limiter.wait().await;

                let offer_id = offer.id.clone();

                // Send progress event
                let progress_event = UpsellEvent::Progress {
                    current: index + 1,
                    total,
                };

                let progress_json = serde_json::to_string(&progress_event).unwrap_or_default();
                let progress = Event::default().data(progress_json);

                // Get upsell options
                match amadeus::get_upsell_offers(&client, &token, &[offer]).await {
                    Ok(result) => {
                        let event = UpsellEvent::Success {
                            offer_id,
                            upsells: result.data,
                        };
                        let json = serde_json::to_string(&event).unwrap_or_default();
                        vec![Ok(progress), Ok(Event::default().data(json))]
                    }
                    Err(e) => {
                        let event = UpsellEvent::Error {
                            offer_id,
                            error: e.to_string(),
                        };
                        let json = serde_json::to_string(&event).unwrap_or_default();
                        vec![Ok(progress), Ok(Event::default().data(json))]
                    }
                }
            }
        })
        .flat_map(stream::iter);

    Ok(Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(1))
            .text("keep-alive"),
    ))
}

/// Stream price matrix results with rate limiting
pub async fn price_matrix_stream(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PriceMatrixRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, StatusCode> {
    info!(
        "Price matrix stream started: {} -> {}, {} outbound x {} inbound dates",
        payload.origin,
        payload.destination,
        payload.outbound_dates.len(),
        payload.inbound_dates.len()
    );

    // Get token (cached)
    let token = match amadeus::get_token(&state.amadeus_client).await {
        Ok(t) => t,
        Err(e) => {
            error!("Amadeus token error: {:?}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Generate all valid combinations (inbound must be after outbound)
    let mut combinations = Vec::new();
    for outbound in &payload.outbound_dates {
        for inbound in &payload.inbound_dates {
            if inbound > outbound {
                combinations.push((outbound.clone(), inbound.clone()));
            }
        }
    }

    let total = combinations.len();
    info!("🔍 Searching {} valid date combinations", total);

    // Create rate limiter - 4 TPS to be extra safe (Amadeus allows 10 TPS but we want margin)
    let rate_limiter = RateLimiter::new(4);

    // Clone data for the stream
    let client = state.amadeus_client.clone();
    let redis_client = state.redis_client.clone();
    let currency = payload.currency.unwrap_or_else(|| "EUR".to_string());
    let origin = payload.origin;
    let destination = payload.destination;
    let adults = payload.adults;
    let children = payload.children;
    let infants = payload.infants;

    let stream = stream::iter(combinations.into_iter().enumerate())
        .map(move |(index, (outbound, inbound))| {
            let client = client.clone();
            let redis_client = redis_client.clone();
            let token = token.clone();
            let limiter = rate_limiter.clone();
            let currency = currency.clone();
            let origin = origin.clone();
            let destination = destination.clone();

            async move {
                // Wait for rate limiter (only if we need to call API)
                // We'll check cache first, then wait if needed.
                // But to avoid complex flow, we can just wait.
                // Or better: check cache, if hit, skip wait.

                let req = FlightSearchRequest {
                    origin: origin.clone(),
                    destination: destination.clone(),
                    departure_date: outbound.clone(),
                    return_date: Some(inbound.clone()),
                    adults,
                    children,
                    infants,
                    currency: Some(currency.clone()),
                    travel_class: None,
                    non_stop: None,
                    max_price: None,
                    max_results: Some(250),
                    included_airline_codes: None,
                    excluded_airline_codes: None,
                    additional_legs: None,
                };

                // Generate cache key
                let cache_key = format!(
                    "flight_search:{}:{}:{}:{}:{}:{}:{}:{}:{}:{}",
                    req.origin,
                    req.destination,
                    req.departure_date,
                    req.return_date.as_deref().unwrap_or(""),
                    req.adults,
                    req.children,
                    req.infants,
                    req.travel_class.as_deref().unwrap_or("ECONOMY"),
                    req.non_stop.unwrap_or(false),
                    req.max_results.unwrap_or(50)
                );

                // Try to get from cache first
                let cached_result = if let Some(ref r_client) = redis_client {
                    match r_client.get_multiplexed_async_connection().await {
                        Ok(mut conn) => match conn.get::<_, String>(&cache_key).await {
                            Ok(cached) => {
                                match serde_json::from_str::<crate::models::FlightOffersResponse>(
                                    &cached,
                                ) {
                                    Ok(resp) => Some(resp),
                                    Err(_) => None,
                                }
                            }
                            Err(_) => None,
                        },
                        Err(_) => None,
                    }
                } else {
                    None
                };

                let price = if let Some(resp) = cached_result {
                    debug!("Cache hit for {} -> {}", outbound, inbound);
                    resp.data.first().map(|offer| offer.price.total.clone())
                } else {
                    // Not in cache, proceed with API call
                    limiter.wait().await;

                    match amadeus::search_flights(&client, &token, &req).await {
                        Ok(resp) => {
                            // Cache success response
                            if let Some(ref r_client) = redis_client {
                                if let Ok(mut conn) =
                                    r_client.get_multiplexed_async_connection().await
                                {
                                    if let Ok(json) = serde_json::to_string(&resp) {
                                        // 300 seconds TTL (5 mins)
                                        let _: Result<(), _> =
                                            conn.set_ex(&cache_key, json, 300).await;
                                    }
                                }
                            }

                            if resp.data.is_empty() {
                                warn!("⚠️ No flights found for {} -> {}", outbound, inbound);
                                None
                            } else {
                                info!(
                                    "✅ Found {} flights for {} -> {}, cheapest: {}",
                                    resp.data.len(),
                                    outbound,
                                    inbound,
                                    resp.data
                                        .first()
                                        .map(|o| o.price.total.as_str())
                                        .unwrap_or("N/A")
                                );
                                resp.data.first().map(|offer| offer.price.total.clone())
                            }
                        }
                        Err(e) => {
                            error!(
                                "❌ Failed to get price for {} -> {}: {:?}",
                                outbound, inbound, e
                            );
                            None
                        }
                    }
                };

                // Send price event
                let price_event = PriceMatrixEvent::Price {
                    outbound_date: outbound.clone(),
                    inbound_date: inbound.clone(),
                    price,
                    currency: currency.clone(),
                };

                let mut events = vec![
                    Event::default()
                        .json_data(&price_event)
                        .unwrap_or_else(|_| Event::default().data("error")),
                ];

                // Send progress event every 5 items
                if (index + 1) % 5 == 0 || index + 1 == total {
                    let progress_event = PriceMatrixEvent::Progress {
                        current: index + 1,
                        total,
                    };
                    events.push(
                        Event::default()
                            .json_data(&progress_event)
                            .unwrap_or_else(|_| Event::default().data("error")),
                    );
                }

                // Send complete event on last item
                if index + 1 == total {
                    let complete_event = PriceMatrixEvent::Complete {
                        total,
                        successful: total, // We don't track failures separately for now
                        failed: 0,
                    };
                    events.push(
                        Event::default()
                            .json_data(&complete_event)
                            .unwrap_or_else(|_| Event::default().data("error")),
                    );
                }

                stream::iter(events.into_iter().map(Ok))
            }
        })
        .buffer_unordered(4) // Process up to 4 requests in parallel (matches rate limiter)
        .flatten();

    Ok(Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(1))
            .text("keep-alive"),
    ))
}
