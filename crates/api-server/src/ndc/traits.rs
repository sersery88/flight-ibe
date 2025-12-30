//! Unified Traits for GDS + NDC Abstraction
//! 
//! These traits provide a common interface for both Self-Service (REST/GDS)
//! and Enterprise (SOAP/NDC) implementations.

use async_trait::async_trait;
use anyhow::Result;
use crate::models::{
    FlightSearchRequest, FlightOffersResponse, FlightOffer, FlightPriceResponse,
    FlightOrderRequest, FlightOrderResponse, SeatmapResponse,
    FlightAvailabilityRequest, FlightAvailabilityResponse,
};

/// Content source identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContentSource {
    /// GDS content via Self-Service APIs
    Gds,
    /// NDC content via Enterprise APIs
    Ndc,
    /// Combined GDS + NDC content
    Combined,
}

/// Flight search provider trait
#[async_trait]
pub trait FlightSearchProvider: Send + Sync {
    /// Search for flight offers
    async fn search(&self, request: &FlightSearchRequest) -> Result<FlightOffersResponse>;
    
    /// Get the content source for this provider
    fn content_source(&self) -> ContentSource;
    
    /// Check if provider supports NDC content
    fn supports_ndc(&self) -> bool {
        matches!(self.content_source(), ContentSource::Ndc | ContentSource::Combined)
    }
}

/// Flight pricing provider trait
#[async_trait]
pub trait FlightPricingProvider: Send + Sync {
    /// Price one or more flight offers
    async fn price(&self, offers: &[FlightOffer], include_bags: bool) -> Result<FlightPriceResponse>;
    
    /// Get upsell/branded fare options
    async fn get_upsell_options(&self, offer: &FlightOffer) -> Result<FlightOffersResponse>;
}

/// Flight booking provider trait
#[async_trait]
pub trait FlightBookingProvider: Send + Sync {
    /// Create a flight order (booking)
    async fn create_order(&self, request: &FlightOrderRequest) -> Result<FlightOrderResponse>;
    
    /// Retrieve an existing order
    async fn get_order(&self, order_id: &str) -> Result<FlightOrderResponse>;
    
    /// Cancel an order
    async fn cancel_order(&self, order_id: &str) -> Result<()>;
    
    /// Check if order modification is supported
    fn supports_modification(&self) -> bool;
}

/// Seatmap provider trait
#[async_trait]
pub trait SeatmapProvider: Send + Sync {
    /// Get seatmaps for flight offers
    async fn get_seatmaps(&self, offers: &[FlightOffer]) -> Result<SeatmapResponse>;
    
    /// Get seatmaps by order ID
    async fn get_seatmaps_by_order(&self, order_id: &str) -> Result<SeatmapResponse>;
}

/// Ancillary services provider trait
#[async_trait]
pub trait AncillaryProvider: Send + Sync {
    /// Get available ancillary services for an offer
    async fn get_services(&self, offer: &FlightOffer) -> Result<AncillaryServicesResponse>;
    
    /// Add ancillary service to order
    async fn add_service(&self, order_id: &str, service_id: &str) -> Result<FlightOrderResponse>;
}

/// Flight availability provider trait
#[async_trait]
pub trait FlightAvailabilityProvider: Send + Sync {
    /// Get flight availabilities
    async fn get_availabilities(&self, request: &FlightAvailabilityRequest) -> Result<FlightAvailabilityResponse>;
}

/// Ancillary services response
#[derive(Debug, Clone)]
pub struct AncillaryServicesResponse {
    pub services: Vec<AncillaryService>,
}

/// Single ancillary service
#[derive(Debug, Clone)]
pub struct AncillaryService {
    pub id: String,
    pub service_type: AncillaryServiceType,
    pub name: String,
    pub description: Option<String>,
    pub price: ServicePrice,
    pub included: bool,
}

/// Ancillary service types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AncillaryServiceType {
    Baggage,
    Seat,
    Meal,
    WiFi,
    Lounge,
    PriorityBoarding,
    Insurance,
    CarbonOffset,
    Other,
}

/// Service price
#[derive(Debug, Clone)]
pub struct ServicePrice {
    pub amount: String,
    pub currency: String,
}

