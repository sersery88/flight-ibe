//! NDC XML Models for Amadeus Enterprise SOAP APIs
//! 
//! These structs map to the XML structures used in NDC SOAP requests/responses.
//! Uses quick-xml with serde for (de)serialization.

use serde::{Deserialize, Serialize};

// ============================================================================
// Common NDC Types
// ============================================================================

/// NDC Offer identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOfferId {
    pub owner: String,      // Airline code (e.g., "LH")
    pub offer_id: String,   // Offer identifier
    pub offer_item_ids: Vec<String>, // Individual offer items
}

/// NDC Price
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcPrice {
    pub total_amount: String,
    pub base_amount: Option<String>,
    pub tax_amount: Option<String>,
    pub currency_code: String,
}

/// NDC Traveler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcTraveler {
    pub traveler_id: String,
    pub ptc: String,  // PTC: ADT, CHD, INF
    pub given_name: Option<String>,
    pub surname: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub contact: Option<NdcContact>,
    pub documents: Vec<NdcDocument>,
}

/// NDC Contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcContact {
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub phone_country_code: Option<String>,
}

/// NDC Travel document (passport, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcDocument {
    pub document_type: String,  // PT (passport), ID, etc.
    pub document_number: String,
    pub issuing_country: String,
    pub expiry_date: String,
    pub nationality: String,
}

// ============================================================================
// Travel_OfferPrice (NDC Pricing)
// ============================================================================

/// NDC OfferPrice Request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename = "AirShoppingRQ")]
pub struct NdcOfferPriceRequest {
    pub offer: NdcOfferId,
    pub travelers: Vec<NdcTraveler>,
}

/// NDC OfferPrice Response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename = "OfferPriceRS")]
pub struct NdcOfferPriceResponse {
    pub priced_offer: Option<NdcPricedOffer>,
    pub errors: Vec<NdcError>,
    pub warnings: Vec<NdcWarning>,
}

/// NDC Priced Offer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcPricedOffer {
    pub offer_id: NdcOfferId,
    pub total_price: NdcPrice,
    pub offer_items: Vec<NdcOfferItem>,
}

/// NDC Offer Item (flight segment + services)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOfferItem {
    pub offer_item_id: String,
    pub price: NdcPrice,
    pub services: Vec<NdcService>,
    pub fare_basis: Option<String>,
    pub fare_rules: Option<NdcFareRules>,
}

// ============================================================================
// Travel_ServiceList (Ancillaries)
// ============================================================================

/// NDC Service (ancillary)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcService {
    pub service_id: String,
    pub name: String,
    pub description: Option<String>,
    pub service_code: String,  // RFIC code
    pub price: NdcPrice,
    pub included: bool,
    pub media: Vec<NdcMediaLink>,
}

/// NDC Media Link (rich content)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcMediaLink {
    pub media_type: String,  // IMAGE, VIDEO
    pub url: String,
    pub description: Option<String>,
}

// ============================================================================
// Travel_OrderCreate
// ============================================================================

/// NDC Order Create Request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOrderCreateRequest {
    pub offer: NdcOfferId,
    pub travelers: Vec<NdcTraveler>,
    pub payment: NdcPayment,
    pub remarks: Vec<String>,
}

/// NDC Payment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcPayment {
    pub payment_type: NdcPaymentType,
    pub amount: NdcPrice,
}

/// NDC Payment types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NdcPaymentType {
    Cash,
    CreditCard(NdcCreditCard),
    AgencyPayment,
    Other(String),
}

/// NDC Credit Card
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcCreditCard {
    pub card_code: String,      // VI, CA, AX, etc.
    pub card_number: String,
    pub expiry_date: String,    // MMYY
    pub cvv: Option<String>,
    pub holder_name: String,
}

/// NDC Order Create Response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOrderCreateResponse {
    pub order_id: String,
    pub booking_references: Vec<NdcBookingReference>,
    pub order_items: Vec<NdcOrderItem>,
    pub total_price: NdcPrice,
    pub errors: Vec<NdcError>,
    pub warnings: Vec<NdcWarning>,
}

/// NDC Booking Reference (PNR)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcBookingReference {
    pub reference_id: String,
    pub reference_type: String,  // PNR, AIRLINE_CONFIRMATION, etc.
    pub airline_id: Option<String>,
}

/// NDC Order Item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOrderItem {
    pub order_item_id: String,
    pub flight_refs: Vec<String>,
    pub service_refs: Vec<String>,
    pub price: NdcPrice,
    pub status: NdcOrderItemStatus,
}

/// NDC Order Item Status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NdcOrderItemStatus {
    Confirmed,
    Pending,
    Cancelled,
    Waitlisted,
}

// ============================================================================
// Travel_SeatAvailability
// ============================================================================

/// NDC Seat Availability Request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcSeatAvailabilityRequest {
    pub offer_id: NdcOfferId,
    pub segment_refs: Vec<String>,
}

/// NDC Seat Availability Response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcSeatAvailabilityResponse {
    pub cabin_layouts: Vec<NdcCabinLayout>,
    pub errors: Vec<NdcError>,
}

/// NDC Cabin Layout
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcCabinLayout {
    pub cabin_type: String,  // M (Economy), C (Business), F (First)
    pub rows: Vec<NdcSeatRow>,
    pub column_headers: Vec<String>,  // A, B, C, D, E, F...
}

/// NDC Seat Row
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcSeatRow {
    pub row_number: u32,
    pub seats: Vec<NdcSeat>,
    pub characteristics: Vec<String>,  // EXIT_ROW, OVERWING, etc.
}

/// NDC Seat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcSeat {
    pub column: String,
    pub available: bool,
    pub price: Option<NdcPrice>,
    pub characteristics: Vec<String>,  // WINDOW, AISLE, LEGROOM, etc.
    pub traveler_ref: Option<String>,  // If already assigned
}

// ============================================================================
// Travel_OrderReshop / Travel_OrderChange
// ============================================================================

/// NDC Order Reshop Request (check change options)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOrderReshopRequest {
    pub order_id: String,
    pub reshop_type: NdcReshopType,
    pub new_itinerary: Option<NdcItinerary>,
}

/// NDC Reshop Type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NdcReshopType {
    Cancel,
    Rebook,
    DateChange,
    RouteChange,
}

/// NDC Itinerary (for reshop)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcItinerary {
    pub origin_destination: Vec<NdcOriginDestination>,
}

/// NDC Origin-Destination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOriginDestination {
    pub departure: NdcFlightPoint,
    pub arrival: NdcFlightPoint,
    pub marketing_carrier: Option<String>,
    pub flight_number: Option<String>,
}

/// NDC Flight Point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcFlightPoint {
    pub airport_code: String,
    pub date: String,
    pub time: Option<String>,
}

/// NDC Order Reshop Response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcOrderReshopResponse {
    pub reshop_offers: Vec<NdcReshopOffer>,
    pub penalties: Option<NdcPenalties>,
    pub errors: Vec<NdcError>,
}

/// NDC Reshop Offer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcReshopOffer {
    pub offer_id: NdcOfferId,
    pub price_difference: NdcPrice,
    pub new_total: NdcPrice,
}

/// NDC Penalties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcPenalties {
    pub change_fee: Option<NdcPrice>,
    pub cancellation_fee: Option<NdcPrice>,
    pub refund_amount: Option<NdcPrice>,
}

// ============================================================================
// Fare Rules
// ============================================================================

/// NDC Fare Rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcFareRules {
    pub rules: Vec<NdcFareRule>,
}

/// NDC Fare Rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcFareRule {
    pub category: String,  // REFUND, CHANGE, BAGGAGE, etc.
    pub text: String,
    pub penalty: Option<NdcPrice>,
}

// ============================================================================
// Error/Warning Types
// ============================================================================

/// NDC Error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcError {
    pub code: String,
    pub description: String,
    pub owner: Option<String>,
}

/// NDC Warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NdcWarning {
    pub code: String,
    pub description: String,
}

