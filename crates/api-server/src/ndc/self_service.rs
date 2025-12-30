//! Self-Service (GDS) Implementation of Flight Provider Traits
//! 
//! This module wraps the existing Amadeus Self-Service REST APIs
//! behind the unified trait interfaces.

use reqwest::Client;
use anyhow::Result;
use async_trait::async_trait;
use tracing::{info, instrument};

use super::traits::*;
use crate::amadeus;
use crate::models::{
    FlightSearchRequest, FlightOffersResponse, FlightOffer, FlightPriceResponse,
    FlightOrderRequest, FlightOrderResponse, SeatmapResponse,
    FlightAvailabilityRequest, FlightAvailabilityResponse,
};

/// Self-Service (GDS) Flight Provider
/// 
/// This wraps the existing Amadeus Self-Service REST APIs and implements
/// the unified trait interfaces for seamless integration with NDC.
pub struct SelfServiceProvider {
    client: Client,
}

impl SelfServiceProvider {
    /// Create a new Self-Service provider
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
    
    /// Create with custom client
    pub fn with_client(client: Client) -> Self {
        Self { client }
    }
}

impl Default for SelfServiceProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl FlightSearchProvider for SelfServiceProvider {
    #[instrument(skip(self, request))]
    async fn search(&self, request: &FlightSearchRequest) -> Result<FlightOffersResponse> {
        info!("GDS search: {} -> {}", request.origin, request.destination);
        
        // Get token
        let token = amadeus::get_token(&self.client).await?;
        
        // Use existing search implementation
        amadeus::search_flights(&self.client, &token, request).await
    }
    
    fn content_source(&self) -> ContentSource {
        ContentSource::Gds
    }
}

#[async_trait]
impl FlightPricingProvider for SelfServiceProvider {
    async fn price(&self, offers: &[FlightOffer], include_bags: bool) -> Result<FlightPriceResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::price_flight_offers(&self.client, &token, offers, include_bags).await
    }
    
    async fn get_upsell_options(&self, offer: &FlightOffer) -> Result<FlightOffersResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::get_upsell_offers(&self.client, &token, &[offer.clone()]).await
    }
}

#[async_trait]
impl FlightBookingProvider for SelfServiceProvider {
    async fn create_order(&self, request: &FlightOrderRequest) -> Result<FlightOrderResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::create_flight_order(&self.client, &token, request).await
    }
    
    async fn get_order(&self, order_id: &str) -> Result<FlightOrderResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::get_flight_order(&self.client, &token, order_id).await
    }
    
    async fn cancel_order(&self, order_id: &str) -> Result<()> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::delete_flight_order(&self.client, &token, order_id).await
    }
    
    fn supports_modification(&self) -> bool {
        false // Self-Service does not support order modification
    }
}

#[async_trait]
impl SeatmapProvider for SelfServiceProvider {
    async fn get_seatmaps(&self, offers: &[FlightOffer]) -> Result<SeatmapResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::get_seatmaps(&self.client, &token, offers).await
    }
    
    async fn get_seatmaps_by_order(&self, order_id: &str) -> Result<SeatmapResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::get_seatmaps_by_order(&self.client, &token, order_id).await
    }
}

#[async_trait]
impl FlightAvailabilityProvider for SelfServiceProvider {
    async fn get_availabilities(&self, request: &FlightAvailabilityRequest) -> Result<FlightAvailabilityResponse> {
        let token = amadeus::get_token(&self.client).await?;
        amadeus::get_flight_availabilities(&self.client, &token, request).await
    }
}

