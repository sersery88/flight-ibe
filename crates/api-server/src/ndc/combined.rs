//! Combined GDS + NDC Provider
//! 
//! This provider combines results from both Self-Service (GDS) and 
//! Enterprise (NDC) APIs, providing unified access to all content.

use anyhow::Result;
use async_trait::async_trait;
use tracing::{info, warn, instrument};

use super::traits::*;
use super::self_service::SelfServiceProvider;
use super::enterprise::EnterpriseNdcClient;
use crate::models::{
    FlightSearchRequest, FlightOffersResponse, FlightOffer, FlightPriceResponse,
    FlightOrderRequest, FlightOrderResponse, SeatmapResponse,
};

/// Combined GDS + NDC Flight Provider
/// 
/// Searches both Self-Service (GDS) and Enterprise (NDC) APIs,
/// combining results for maximum content coverage.
pub struct CombinedProvider {
    gds_provider: SelfServiceProvider,
    ndc_provider: Option<EnterpriseNdcClient>,
}

impl CombinedProvider {
    /// Create a new combined provider (GDS only)
    pub fn gds_only() -> Self {
        Self {
            gds_provider: SelfServiceProvider::new(),
            ndc_provider: None,
        }
    }
    
    /// Create with both GDS and NDC
    pub fn with_ndc(ndc_client: EnterpriseNdcClient) -> Self {
        Self {
            gds_provider: SelfServiceProvider::new(),
            ndc_provider: Some(ndc_client),
        }
    }
    
    /// Check if NDC is available
    pub fn has_ndc(&self) -> bool {
        self.ndc_provider.is_some()
    }
}

#[async_trait]
impl FlightSearchProvider for CombinedProvider {
    #[instrument(skip(self, request))]
    async fn search(&self, request: &FlightSearchRequest) -> Result<FlightOffersResponse> {
        info!("Combined search: {} -> {} (NDC: {})", 
            request.origin, request.destination, self.has_ndc());
        
        // Always search GDS
        let gds_result = self.gds_provider.search(request).await;
        
        // If NDC is available, search it too
        let ndc_result = if let Some(ref ndc) = self.ndc_provider {
            match ndc.search(request).await {
                Ok(result) => Some(result),
                Err(e) => {
                    warn!("NDC search failed, using GDS only: {}", e);
                    None
                }
            }
        } else {
            None
        };
        
        // Combine results
        match (gds_result, ndc_result) {
            (Ok(mut gds), Some(ndc)) => {
                // Merge NDC offers into GDS response
                info!("Combining {} GDS + {} NDC offers", gds.data.len(), ndc.data.len());
                gds.data.extend(ndc.data);
                // Sort by price
                gds.data.sort_by(|a, b| {
                    let price_a: f64 = a.price.total.parse().unwrap_or(f64::MAX);
                    let price_b: f64 = b.price.total.parse().unwrap_or(f64::MAX);
                    price_a.partial_cmp(&price_b).unwrap_or(std::cmp::Ordering::Equal)
                });
                Ok(gds)
            }
            (Ok(gds), None) => Ok(gds),
            (Err(e), Some(ndc)) => {
                warn!("GDS search failed, using NDC only: {}", e);
                Ok(ndc)
            }
            (Err(e), None) => Err(e),
        }
    }
    
    fn content_source(&self) -> ContentSource {
        if self.has_ndc() {
            ContentSource::Combined
        } else {
            ContentSource::Gds
        }
    }
}

#[async_trait]
impl FlightPricingProvider for CombinedProvider {
    async fn price(&self, offers: &[FlightOffer], include_bags: bool) -> Result<FlightPriceResponse> {
        // Route to appropriate provider based on offer source
        // For now, use GDS pricing
        self.gds_provider.price(offers, include_bags).await
    }
    
    async fn get_upsell_options(&self, offer: &FlightOffer) -> Result<FlightOffersResponse> {
        self.gds_provider.get_upsell_options(offer).await
    }
}

#[async_trait]
impl FlightBookingProvider for CombinedProvider {
    async fn create_order(&self, request: &FlightOrderRequest) -> Result<FlightOrderResponse> {
        self.gds_provider.create_order(request).await
    }
    
    async fn get_order(&self, order_id: &str) -> Result<FlightOrderResponse> {
        self.gds_provider.get_order(order_id).await
    }
    
    async fn cancel_order(&self, order_id: &str) -> Result<()> {
        self.gds_provider.cancel_order(order_id).await
    }
    
    fn supports_modification(&self) -> bool {
        self.ndc_provider.is_some()
    }
}

#[async_trait]
impl SeatmapProvider for CombinedProvider {
    async fn get_seatmaps(&self, offers: &[FlightOffer]) -> Result<SeatmapResponse> {
        self.gds_provider.get_seatmaps(offers).await
    }
    
    async fn get_seatmaps_by_order(&self, order_id: &str) -> Result<SeatmapResponse> {
        self.gds_provider.get_seatmaps_by_order(order_id).await
    }
}

