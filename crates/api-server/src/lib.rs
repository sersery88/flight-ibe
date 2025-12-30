//! Flight IBE API Server
//!
//! This crate provides the backend API for the Flight Internet Booking Engine,
//! integrating with Amadeus APIs for flight search, pricing, and booking.
//!
//! ## Architecture
//!
//! The API server supports two content sources:
//!
//! 1. **Self-Service APIs** (REST/JSON) - GDS content via Amadeus Self-Service
//! 2. **Enterprise APIs** (SOAP/XML) - NDC content via Amadeus Enterprise
//!
//! The NDC module provides a unified trait-based abstraction that allows
//! seamless switching between GDS and NDC content sources.

pub mod models;
pub mod amadeus;
pub mod ndc;

pub use models::*;
pub use ndc::traits::*;
