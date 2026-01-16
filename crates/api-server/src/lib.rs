//! Flight IBE API Server
//!
//! This crate provides the backend API for the Flight Internet Booking Engine,
//! integrating with Amadeus Self-Service APIs for flight search, pricing, and booking.

pub mod models;
pub mod amadeus;

pub use models::*;
