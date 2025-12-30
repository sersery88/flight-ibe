//! NDC (New Distribution Capability) Integration Module
//! 
//! This module provides NDC integration via Amadeus Enterprise SOAP APIs.
//! NDC enables direct airline distribution with rich content, dynamic pricing,
//! and personalized offers.
//! 
//! ## Architecture
//! 
//! The NDC module uses a trait-based architecture that unifies Self-Service (REST)
//! and Enterprise (SOAP) APIs behind common interfaces:
//! 
//! - `FlightSearchProvider` - Unified flight search
//! - `FlightPricingProvider` - Pricing and fare quotes
//! - `FlightBookingProvider` - Order creation and management
//! - `SeatmapProvider` - Seat availability and selection
//! - `AncillaryProvider` - Additional services (bags, meals, etc.)
//! 
//! ## Supported Airlines (via Amadeus Enterprise NDC)
//! 
//! - Lufthansa Group (LH, LX, OS, SN, EW)
//! - Air France-KLM (AF, KL)
//! - British Airways (BA)
//! - American Airlines (AA)
//! - United Airlines (UA)
//! - Singapore Airlines (SQ)
//! - Qantas (QF)
//! - Qatar Airways (QR)
//! - And 10+ more...

pub mod client;
pub mod models;
pub mod traits;
pub mod enterprise;
pub mod self_service;
pub mod combined;

pub use client::*;
pub use models::*;
pub use traits::*;
pub use enterprise::EnterpriseNdcClient;
pub use self_service::SelfServiceProvider;
pub use combined::CombinedProvider;

