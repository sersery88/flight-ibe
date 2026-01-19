//! Amadeus API Response Models
//! Based on Amadeus Flight Offers Search API v2

use serde::{Deserialize, Serialize};

/// Request for flight search
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightSearchRequest {
    pub origin: String,
    pub destination: String,
    pub departure_date: String,
    pub return_date: Option<String>,
    pub adults: u32,
    #[serde(default)]
    pub children: u32,
    #[serde(default)]
    pub infants: u32,
    pub currency: Option<String>,
    pub travel_class: Option<String>,
    pub non_stop: Option<bool>,
    pub max_price: Option<i32>,
    pub max_results: Option<i32>,
    pub included_airline_codes: Option<Vec<String>>,
    pub excluded_airline_codes: Option<Vec<String>>,
    /// Additional legs for multi-city search
    pub additional_legs: Option<Vec<FlightLegRequest>>,
}

/// A single leg for multi-city search
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightLegRequest {
    pub origin: String,
    pub destination: String,
    pub departure_date: String,
}

/// Request for batch price matrix search
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMatrixRequest {
    pub origin: String,
    pub destination: String,
    pub outbound_dates: Vec<String>,
    pub inbound_dates: Vec<String>,
    pub adults: u32,
    #[serde(default)]
    pub children: u32,
    #[serde(default)]
    pub infants: u32,
    pub currency: Option<String>,
}

/// Response for batch price matrix search
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMatrixResponse {
    pub prices: Vec<PriceMatrixEntry>,
}

/// A single price entry in the matrix
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMatrixEntry {
    pub outbound_date: String,
    pub inbound_date: String,
    pub price: Option<String>,
    pub currency: String,
}

/// Root response from Flight Offers Search API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightOffersResponse {
    pub data: Vec<FlightOffer>,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// A single flight offer
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightOffer {
    pub id: String,
    #[serde(rename = "type")]
    pub offer_type: String,
    pub source: String,
    #[serde(default)]
    pub instant_ticketing_required: bool,
    #[serde(default)]
    pub non_homogeneous: bool,
    #[serde(default)]
    pub one_way: bool,
    #[serde(default)]
    pub is_upsell_offer: bool,
    pub last_ticketing_date: Option<String>,
    pub last_ticketing_date_time: Option<String>,
    pub number_of_bookable_seats: Option<i32>,
    pub itineraries: Vec<Itinerary>,
    pub price: Price,
    pub pricing_options: Option<PricingOptions>,
    pub validating_airline_codes: Vec<String>,
    pub traveler_pricings: Vec<TravelerPricing>,
}

/// An itinerary (outbound or return leg)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Itinerary {
    pub duration: Option<String>,
    pub segments: Vec<Segment>,
}

/// A flight segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub id: String,
    pub departure: FlightEndpoint,
    pub arrival: FlightEndpoint,
    pub carrier_code: String,
    pub number: String,
    pub aircraft: Aircraft,
    pub operating: Option<OperatingFlight>,
    pub duration: Option<String>,
    #[serde(default)]
    pub number_of_stops: i32,
    #[serde(default)]
    pub blacklisted_in_eu: bool,
    #[serde(default)]
    pub co2_emissions: Vec<Co2Emission>,
    #[serde(default)]
    pub stops: Vec<FlightStop>,
}

/// Departure or arrival endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightEndpoint {
    pub iata_code: String,
    pub terminal: Option<String>,
    pub at: String, // ISO 8601 datetime
}

/// Aircraft information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Aircraft {
    pub code: String,
}

/// Operating flight (codeshare)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperatingFlight {
    pub carrier_code: Option<String>,
    pub number: Option<String>,  // Flight number (per Amadeus API)
    pub suffix: Option<String>,  // Flight number suffix (per Amadeus API)
}

/// CO2 emissions data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Co2Emission {
    pub weight: f64,
    pub weight_unit: String,
    pub cabin: String,
}

/// Flight stop information (per Amadeus API FlightStop model)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightStop {
    pub iata_code: String,
    pub duration: Option<String>,
    pub arrival_at: Option<String>,
    pub departure_at: Option<String>,
    pub new_aircraft: Option<bool>,  // Whether aircraft changes at this stop
}

/// Price information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Price {
    pub currency: String,
    pub total: String,
    pub base: String,
    #[serde(default)]
    pub fees: Vec<Fee>,
    pub grand_total: Option<String>,
    #[serde(default)]
    pub taxes: Vec<Tax>,
    pub refundable_taxes: Option<String>,
    pub billing_currency: Option<String>,
}

/// Fee information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fee {
    pub amount: String,
    #[serde(rename = "type")]
    pub fee_type: String,
}

/// Tax information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tax {
    pub amount: String,
    pub code: String,
}

/// Pricing options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PricingOptions {
    #[serde(default)]
    pub fare_type: Vec<String>,
    #[serde(default)]
    pub included_checked_bags_only: bool,
}

/// Traveler pricing details
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerPricing {
    pub traveler_id: String,
    pub fare_option: String,
    pub traveler_type: String,
    pub price: TravelerPrice,
    pub fare_details_by_segment: Vec<FareDetailsBySegment>,
}

/// Traveler-specific price
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerPrice {
    pub currency: String,
    pub total: String,
    pub base: String,
    #[serde(default)]
    pub taxes: Vec<Tax>,
    pub refundable_taxes: Option<String>,
}

/// Fare details for a specific segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FareDetailsBySegment {
    pub segment_id: String,
    pub cabin: String,
    pub fare_basis: String,
    pub branded_fare: Option<String>,
    pub branded_fare_label: Option<String>,
    #[serde(rename = "class")]
    pub booking_class: String,
    pub included_checked_bags: Option<BaggageAllowance>,
    #[serde(default)]
    pub amenities: Vec<Amenity>,
    #[serde(default)]
    pub is_allotment: bool,
    pub allotment_details: Option<AllotmentDetails>,
    pub slice_dice_indicator: Option<String>,
    /// Additional services (bags, seats) for booking
    pub additional_services: Option<AdditionalServices>,
}

/// Additional services for booking (bags, seats, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdditionalServices {
    pub chargeable_checked_bags: Option<ChargeableCheckedBags>,
    pub chargeable_seat_number: Option<String>,
}

/// Chargeable checked bags
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChargeableCheckedBags {
    pub weight: Option<i32>,
    pub weight_unit: Option<String>,
    pub quantity: Option<i32>,
}

/// Baggage allowance
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaggageAllowance {
    pub weight: Option<i32>,
    pub weight_unit: Option<String>,
    pub quantity: Option<i32>,
}

/// Amenity information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Amenity {
    pub description: String,
    #[serde(default)]
    pub is_chargeable: bool,
    pub amenity_type: Option<String>,
    pub amenity_provider: Option<AmenityProvider>,
}

/// Amenity provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmenityProvider {
    pub name: Option<String>,
}

/// Allotment details
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllotmentDetails {
    pub tour_name: Option<String>,
    pub tour_reference: Option<String>,
}

/// Dictionaries for code lookups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dictionaries {
    #[serde(default)]
    pub carriers: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub aircraft: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub currencies: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub locations: std::collections::HashMap<String, LocationValue>,
    // Seatmap-specific dictionaries (per Amadeus API)
    #[serde(default)]
    pub facilities: std::collections::HashMap<String, String>,  // Facility code to name mapping
    #[serde(default)]
    pub seat_characteristics: std::collections::HashMap<String, String>,  // Seat characteristic code to description
}

/// Location dictionary value
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationValue {
    pub city_code: Option<String>,
    pub country_code: Option<String>,
}

// ============================================================================
// Flight Offers Price API Models
// ============================================================================

/// Request for flight pricing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightPriceRequest {
    pub flight_offer: FlightOffer,
    #[serde(default)]
    pub include_bags: bool,
}

/// Response from Flight Offers Price API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightPriceResponse {
    pub data: FlightPriceData,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
    /// Included additional services (bags, seats, etc.) when include=bags is used
    #[serde(default)]
    pub included: Option<IncludedServices>,
}

/// Included additional services from pricing API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncludedServices {
    /// Baggage options catalog - key is the bag option ID
    #[serde(default)]
    pub bags: std::collections::HashMap<String, BagOption>,
}

/// Baggage option from pricing API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BagOption {
    /// Number of bags
    pub quantity: Option<i32>,
    /// Weight of bags
    pub weight: Option<i32>,
    /// Weight unit (KG, LB)
    pub weight_unit: Option<String>,
    /// Name of the bag type (CHECKED_BAG, CARRY_ON, etc.)
    pub name: Option<String>,
    /// Price of the bag option
    pub price: Option<BagPrice>,
    /// Whether this can be booked per itinerary
    #[serde(default)]
    pub bookable_by_itinerary: bool,
    /// Segment IDs this bag option applies to
    #[serde(default)]
    pub segment_ids: Vec<String>,
    /// Traveler IDs this bag option applies to
    #[serde(default)]
    pub traveler_ids: Vec<String>,
}

/// Price for a bag option
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BagPrice {
    pub amount: String,
    pub currency_code: String,
}

/// Flight price data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightPriceData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub flight_offers: Vec<FlightOffer>,
    #[serde(default)]
    pub booking_requirements: Option<BookingRequirements>,
}

/// Booking requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookingRequirements {
    #[serde(default)]
    pub email_address_required: bool,
    #[serde(default)]
    pub mobile_phone_number_required: bool,
    #[serde(default)]
    pub traveler_requirements: Vec<TravelerRequirement>,
}

/// Traveler-specific requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerRequirement {
    pub traveler_id: String,
    #[serde(default)]
    pub date_of_birth_required: bool,
    #[serde(default)]
    pub gender_required: bool,
    #[serde(default)]
    pub document_required: bool,
    #[serde(default)]
    pub document_issuance_city_required: bool,
    #[serde(default)]
    pub redress_required: bool,
    #[serde(default)]
    pub residence_required: bool,
}

// ============================================================================
// Flight Create Orders API Models
// ============================================================================

/// Request for creating a flight order (booking)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightOrderRequest {
    pub flight_offers: Vec<FlightOffer>,
    pub travelers: Vec<Traveler>,
    pub remarks: Option<Remarks>,
    pub ticketing_agreement: Option<TicketingAgreement>,
    pub contacts: Option<Vec<Contact>>,
    pub form_of_payment: Option<FormOfPayment>,
}

/// Form of payment for booking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormOfPayment {
    pub other: Option<OtherPayment>,
    pub credit_card: Option<CreditCard>,
}

/// Other payment method (cash, invoice, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtherPayment {
    pub method: String,
    pub flight_offer_ids: Option<Vec<String>>,
}

/// Credit card payment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditCard {
    pub brand: String,
    pub bin_number: String,
    pub holder: String,
    pub number: Option<String>,
    pub expiry_date: Option<String>,
    pub security_code: Option<String>,
    pub flight_offer_ids: Option<Vec<String>>,
}

/// Traveler information for booking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Traveler {
    pub id: String,
    pub date_of_birth: String,
    pub gender: Option<String>,
    pub name: TravelerName,
    pub contact: Option<TravelerContact>,
    pub documents: Option<Vec<TravelerDocument>>,
    /// Special Service Requests (SSR) - wheelchair, meals, etc.
    pub special_services: Option<SpecialServices>,
    /// Loyalty program information
    pub loyalty_programs: Option<Vec<LoyaltyProgram>>,
}

/// Special Service Requests (SSR)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialServices {
    pub requests: Option<Vec<SpecialServiceRequest>>,
}

/// Individual Special Service Request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialServiceRequest {
    /// SSR code: WCHR (wheelchair), MEAL, BLND (blind), DEAF, etc.
    pub ssr_code: String,
    pub text: Option<String>,
}

/// Loyalty program (frequent flyer)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoyaltyProgram {
    pub program_owner: String,
    pub id: String,
}

/// Traveler name
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerName {
    pub first_name: String,
    pub last_name: String,
    pub middle_name: Option<String>,
    pub second_last_name: Option<String>,
}

/// Traveler contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerContact {
    pub email_address: Option<String>,
    pub phones: Option<Vec<Phone>>,
    pub company_name: Option<String>,
    pub purpose: Option<String>,
}

/// Phone number
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Phone {
    pub device_type: String,
    pub country_calling_code: String,
    pub number: String,
}

/// Traveler document (passport, ID, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerDocument {
    pub document_type: String,
    pub birth_place: Option<String>,
    pub issuance_location: Option<String>,
    pub issuance_date: Option<String>,
    pub number: String,
    pub expiry_date: String,
    pub issuance_country: String,
    pub validity_country: Option<String>,
    pub nationality: String,
    pub holder: Option<bool>,
}

/// Remarks for the booking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remarks {
    pub general: Option<Vec<GeneralRemark>>,
}

/// General remark
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneralRemark {
    pub subtype: String,
    pub text: String,
}

/// Ticketing agreement
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketingAgreement {
    pub option: String,
    pub date_time: Option<String>,
}

/// Contact for the booking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contact {
    pub address_ee_name: Option<String>,
    pub company_name: Option<String>,
    pub purpose: String,
    pub phones: Option<Vec<Phone>>,
    pub email_address: Option<String>,
    pub address: Option<Address>,
}

/// Address
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Address {
    pub lines: Vec<String>,
    pub postal_code: Option<String>,
    pub city_name: String,
    pub country_code: String,
}

/// Response from Flight Create Orders API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightOrderResponse {
    pub data: FlightOrderData,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// Flight order data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightOrderData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub id: String,
    pub queuing_office_id: Option<String>,
    pub associated_records: Vec<AssociatedRecord>,
    pub travelers: Vec<Traveler>,
    pub flight_offers: Vec<FlightOffer>,
    pub ticketing_agreement: Option<TicketingAgreement>,
    pub contacts: Option<Vec<Contact>>,
}

/// Associated record (PNR reference)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssociatedRecord {
    pub reference: String,
    pub creation_date: Option<String>,
    pub origin_system_code: String,
    pub flight_offer_id: Option<String>,
}

// ============================================================================
// Seatmap Display API Models
// ============================================================================

/// Request for seatmap by flight offer
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatmapRequest {
    pub flight_offers: Vec<FlightOffer>,
}

/// Response from Seatmap Display API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatmapResponse {
    pub data: Vec<SeatmapData>,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// Seatmap data for a flight segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatmapData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub flight_offer_id: Option<String>,
    pub segment_id: Option<String>,
    pub carrier_code: Option<String>,
    pub number: Option<String>,
    #[serde(rename = "class")]
    pub cabin_class: Option<String>,  // Cabin class (per Amadeus API)
    pub aircraft: Option<SeatmapAircraft>,
    pub departure: Option<SeatmapDeparture>,
    pub arrival: Option<SeatmapArrival>,
    pub decks: Vec<Deck>,
    #[serde(default)]
    pub available_seats_counters: Vec<AvailableSeatsCounter>,
    pub aircraft_cabin_amenities: Option<AircraftCabinAmenities>,  // Cabin amenities (per Amadeus API)
}

/// Aircraft info for seatmap
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatmapAircraft {
    pub code: Option<String>,
}

/// Departure info for seatmap
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatmapDeparture {
    pub iata_code: Option<String>,
    pub at: Option<String>,
}

/// Arrival info for seatmap
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatmapArrival {
    pub iata_code: Option<String>,
}

/// Deck in the aircraft
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub deck_type: Option<String>,
    pub deck_configuration: Option<DeckConfiguration>,
    pub seats: Vec<Seat>,
    #[serde(default)]
    pub facilities: Option<Vec<Facility>>,
}

/// Facility in the aircraft (per Amadeus Seatmap API)
/// Examples: LA = Lavatory, GA = Galley, ST = Stairs, CL = Closet, etc.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Facility {
    /// Facility code (e.g., "LA" for lavatory, "GA" for galley)
    pub code: Option<String>,
    /// Column designation (e.g., "A", "B", "C")
    pub column: Option<String>,
    /// Row designation (e.g., "40", "41")
    pub row: Option<String>,
    /// Position relative to seats: FRONT, REAR, or SEAT
    pub position: Option<String>,
    /// Coordinates for positioning
    pub coordinates: Option<FacilityCoordinates>,
}

/// Facility coordinates (per Amadeus API)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacilityCoordinates {
    /// X coordinate (Length/row position)
    pub x: Option<i32>,
    /// Y coordinate (Width/column position)
    pub y: Option<i32>,
}

/// Deck configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckConfiguration {
    pub width: Option<i32>,
    pub length: Option<i32>,
    pub start_seat_row: Option<i32>,
    pub end_seat_row: Option<i32>,
    pub start_wings_row: Option<i32>,
    pub end_wings_row: Option<i32>,
    pub start_wings_x: Option<i32>,
    pub end_wings_x: Option<i32>,
    pub exit_rows_x: Option<Vec<i32>>,
}

/// Seat information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Seat {
    pub cabin: Option<String>,
    pub number: String,
    pub characteristics_codes: Option<Vec<String>>,
    pub coordinates: Option<SeatCoordinates>,
    pub traveler_pricing: Option<Vec<SeatTravelerPricing>>,
    pub medias: Option<Vec<Media>>,  // Rich content media (per Amadeus API)
    pub amenities: Option<Vec<SeatAmenityDetail>>,  // Seat-specific amenities (per Amadeus API)
}

/// Seat coordinates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatCoordinates {
    pub x: Option<i32>,
    pub y: Option<i32>,
}

/// Seat pricing per traveler
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatTravelerPricing {
    pub traveler_id: Option<String>,
    pub seat_availability_status: Option<String>,
    pub price: Option<SeatPrice>,
}

/// Seat price
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeatPrice {
    pub currency: Option<String>,
    pub total: Option<String>,
    pub base: Option<String>,
    pub taxes: Option<Vec<Tax>>,
}

/// Available seats counter
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableSeatsCounter {
    pub traveler_id: Option<String>,
    pub value: Option<i32>,
}

// ============================================================================
// Media (per Amadeus API Media model)
// ============================================================================

/// Media content (per Amadeus API Media model)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
    pub title: Option<String>,
    pub href: Option<String>,  // URI to display the original media
    pub description: Option<QualifiedFreeText>,
    pub media_type: Option<String>,  // application, audio, font, example, image, message, model, multipart, text, video
}

/// Qualified free text (per Amadeus API)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualifiedFreeText {
    pub text: Option<String>,
    pub lang: Option<String>,  // Language code per RFC 5646
}

/// Seat amenity detail (per Amadeus API)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatAmenityDetail {
    pub is_chargeable: Option<bool>,
    pub amenity_type: Option<String>,  // SEAT
    pub medias: Option<Vec<Media>>,
}

// ============================================================================
// Aircraft Cabin Amenities (per Amadeus API)
// ============================================================================

/// Aircraft cabin amenities (per Amadeus API AircraftCabinAmenities model)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AircraftCabinAmenities {
    pub power: Option<CabinAmenity>,
    pub wifi: Option<WifiAmenity>,
    pub entertainment: Option<EntertainmentAmenity>,
    pub food: Option<FoodAmenity>,
    pub beverage: Option<BeverageAmenity>,
    pub seat: Option<SeatAmenityInfo>,
}

/// Generic cabin amenity with power info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CabinAmenity {
    pub is_chargeable: Option<bool>,
    pub power_type: Option<String>,  // PLUG, USB_PORT, ADAPTOR, PLUG_OR_USB_PORT
    pub usb_type: Option<String>,    // USB_A, USB_C, USB_A_AND_USB_C
}

/// WiFi amenity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiAmenity {
    pub is_chargeable: Option<bool>,
    pub wifi_coverage: Option<String>,  // FULL, PARTIAL, NONE
}

/// Entertainment amenity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntertainmentAmenity {
    pub is_chargeable: Option<bool>,
    pub entertainment_type: Option<String>,  // LIVE_TV, MOVIES, AUDIO_VIDEO_ON_DEMAND, TV_SHOWS, IP_TV
}

/// Food amenity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FoodAmenity {
    pub is_chargeable: Option<bool>,
    pub food_type: Option<String>,  // MEAL, FRESH_MEAL, SNACK, FRESH_SNACK
}

/// Beverage amenity
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeverageAmenity {
    pub is_chargeable: Option<bool>,
    pub beverage_type: Option<String>,  // ALCOHOLIC, NON_ALCOHOLIC, ALCOHOLIC_AND_NON_ALCOHOLIC
}

/// Seat amenity info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeatAmenityInfo {
    pub is_chargeable: Option<bool>,
    pub seat_tilt: Option<String>,  // FULL_FLAT, ANGLE_FLAT, NORMAL
    pub leg_space: Option<i32>,     // Leg space in inches
    pub space_unit: Option<String>, // Unit for leg space
}

// ============================================================================
// Branded Fares Upsell API Models
// ============================================================================

/// Request for branded fares upselling
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsellRequest {
    pub flight_offers: Vec<FlightOffer>,
}

// Response uses FlightOffersResponse (same format)

// ============================================================================
// Flight Availabilities API Models
// ============================================================================

/// Request for flight availabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightAvailabilityRequest {
    pub origin_destinations: Vec<OriginDestination>,
    pub travelers: Vec<TravelerInfo>,
    pub sources: Vec<String>,
}

/// Origin-destination for availability search
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OriginDestination {
    pub id: String,
    pub origin_location_code: String,
    pub destination_location_code: String,
    pub departure_date_time_range: DateTimeRange,
}

/// Date time range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateTimeRange {
    pub date: String,
    pub time: Option<String>,
}

/// Traveler info for availability
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TravelerInfo {
    pub id: String,
    pub traveler_type: String,
}

/// Response from Flight Availabilities API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightAvailabilityResponse {
    pub data: Vec<FlightAvailability>,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// Flight availability
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightAvailability {
    #[serde(rename = "type")]
    pub data_type: String,
    pub id: String,
    pub source: String,
    pub instantaneous_ticketing_required: Option<bool>,
    pub non_homogeneous: Option<bool>,
    pub segments: Vec<AvailabilitySegment>,
}

/// Availability segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailabilitySegment {
    pub id: Option<String>,
    pub number_of_stops: Option<i32>,
    pub blacklisted_in_eu: Option<bool>,
    pub departure: Option<FlightEndpoint>,
    pub arrival: Option<FlightEndpoint>,
    pub carrier_code: Option<String>,
    pub number: Option<String>,
    pub aircraft: Option<Aircraft>,
    pub operating: Option<OperatingFlight>,
    pub duration: Option<String>,
    pub availability_classes: Vec<AvailabilityClass>,
    pub co2_emissions: Option<Vec<Co2Emission>>,
}

/// Availability class (booking class)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailabilityClass {
    pub number_of_bookable_seats: Option<i32>,
    #[serde(rename = "class")]
    pub segment_class: Option<String>,
    pub closed_status: Option<String>,
}

// ============================================================================
// Flight Inspiration & Cheapest Date Search API Models
// ============================================================================

/// Response from Flight Destinations (Inspiration) API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightDestinationsResponse {
    pub data: Vec<FlightDestination>,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// Flight destination (inspiration search result)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightDestination {
    #[serde(rename = "type")]
    pub data_type: String,
    pub origin: String,
    pub destination: String,
    pub departure_date: Option<String>,
    pub return_date: Option<String>,
    pub price: FlightDestinationPrice,
}

/// Price for flight destination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightDestinationPrice {
    pub total: String,
}

/// Response from Flight Dates (Cheapest Date) API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightDatesResponse {
    pub data: Vec<FlightDate>,
    #[serde(default)]
    pub dictionaries: Option<Dictionaries>,
}

/// Flight date (cheapest date search result)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightDate {
    #[serde(rename = "type")]
    pub data_type: String,
    pub origin: String,
    pub destination: String,
    pub departure_date: String,
    pub return_date: Option<String>,
    pub price: FlightDestinationPrice,
}

// ============================================================================
// Flight Price Analysis API Models
// ============================================================================

/// Response from Itinerary Price Metrics API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItineraryPriceMetricsResponse {
    pub data: Vec<ItineraryPriceMetric>,
}

/// Itinerary price metric
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItineraryPriceMetric {
    #[serde(rename = "type")]
    pub data_type: String,
    pub origin: PriceMetricLocation,
    pub destination: PriceMetricLocation,
    pub departure_date: String,
    pub transport_type: Option<String>,
    pub currency_code: String,
    pub one_way: Option<bool>,
    pub price_metrics: Vec<PriceMetrics>,
}

/// Location for price metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMetricLocation {
    pub iata_code: String,
}

/// Price metrics with quartiles
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceMetrics {
    pub amount: String,
    pub quartile_ranking: String,
}

// ============================================================================
// Flight Delay Prediction API Models
// ============================================================================

/// Response from Flight Delay Prediction API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightDelayPredictionResponse {
    pub data: Vec<DelayPrediction>,
}

/// Delay prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelayPrediction {
    pub id: String,
    #[serde(rename = "type")]
    pub data_type: String,
    pub sub_type: Option<String>,
    pub result: DelayPredictionResult,
}

/// Delay prediction result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DelayPredictionResult {
    #[serde(rename = "LESS_THAN_30_MINUTES")]
    pub less_than_30_minutes: Option<f64>,
    #[serde(rename = "BETWEEN_30_AND_60_MINUTES")]
    pub between_30_and_60_minutes: Option<f64>,
    #[serde(rename = "BETWEEN_60_AND_120_MINUTES")]
    pub between_60_and_120_minutes: Option<f64>,
    #[serde(rename = "OVER_120_MINUTES_OR_CANCELLED")]
    pub over_120_minutes_or_cancelled: Option<f64>,
}

// ============================================================================
// Flight Choice Prediction API Models
// ============================================================================

/// Request for flight choice prediction (uses flight offers from search)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightChoicePredictionRequest {
    pub data: Vec<FlightOffer>,
}

// Response uses FlightOffersResponse - each offer gets a choiceProbability field added

// ============================================================================
// Airport & Airline Routes API Models
// ============================================================================

/// Response from Airport Direct Destinations API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectDestinationsResponse {
    pub data: Vec<Destination>,
}

/// Destination
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Destination {
    #[serde(rename = "type")]
    pub data_type: String,
    pub subtype: Option<String>,
    pub name: Option<String>,
    pub iata_code: Option<String>,
}

/// Response from Airline Destinations API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirlineDestinationsResponse {
    pub data: Vec<Destination>,
}

// ============================================================================
// Flight Status API Models
// ============================================================================

/// Response from Flight Status API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightStatusResponse {
    pub data: Vec<DatedFlight>,
}

/// Dated flight (flight status)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatedFlight {
    #[serde(rename = "type")]
    pub data_type: String,
    pub scheduled_departure_date: Option<String>,
    pub flight_designator: Option<FlightDesignator>,
    pub flight_points: Option<Vec<FlightPoint>>,
    pub segments: Option<Vec<FlightStatusSegment>>,
    pub legs: Option<Vec<FlightLeg>>,
}

/// Flight designator
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightDesignator {
    pub carrier_code: Option<String>,
    pub flight_number: Option<i32>,
    pub operational_suffix: Option<String>,
}

/// Flight point (departure/arrival)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightPoint {
    pub iata_code: Option<String>,
    pub departure: Option<FlightTiming>,
    pub arrival: Option<FlightTiming>,
}

/// Flight timing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightTiming {
    pub terminal: Option<FlightTerminal>,
    pub gate: Option<FlightGate>,
    pub timings: Option<Vec<TimingDetail>>,
}

/// Flight terminal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightTerminal {
    pub code: Option<String>,
}

/// Flight gate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightGate {
    pub main_gate: Option<String>,
}

/// Timing detail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimingDetail {
    pub qualifier: Option<String>,
    pub value: Option<String>,
    pub delays: Option<Vec<DelayInfo>>,
}

/// Delay info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelayInfo {
    pub duration: Option<String>,
}

/// Flight status segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightStatusSegment {
    pub board_point_iata_code: Option<String>,
    pub off_point_iata_code: Option<String>,
    pub scheduled_segment_duration: Option<String>,
}

/// Flight leg
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlightLeg {
    pub board_point_iata_code: Option<String>,
    pub off_point_iata_code: Option<String>,
    pub scheduled_leg_duration: Option<String>,
    pub aircraft_equipment: Option<AircraftEquipment>,
}

/// Aircraft equipment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AircraftEquipment {
    pub aircraft_type: Option<String>,
}

// ============================================================================
// Check-in Links API Models
// ============================================================================

/// Response from Check-in Links API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckinLinksResponse {
    pub data: Vec<CheckinLink>,
}

/// Check-in link
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckinLink {
    #[serde(rename = "type")]
    pub data_type: String,
    pub id: Option<String>,
    pub href: Option<String>,
    pub channel: Option<String>,
}

// ============================================================================
// Reference Data API Models
// ============================================================================

/// Response from Locations API (airports/cities)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationsResponse {
    pub data: Vec<Location>,
}

/// Location (airport or city)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    #[serde(rename = "type")]
    pub data_type: String,
    pub subtype: Option<String>,
    pub name: Option<String>,
    pub detailed_name: Option<String>,
    pub id: Option<String>,
    pub iata_code: Option<String>,
    pub address: Option<LocationAddress>,
    pub geo_code: Option<GeoCode>,
    pub time_zone_offset: Option<String>,
}

/// Location address
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationAddress {
    pub city_name: Option<String>,
    pub city_code: Option<String>,
    pub country_name: Option<String>,
    pub country_code: Option<String>,
    pub region_code: Option<String>,
}

/// Geo code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoCode {
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// Response from Airlines API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirlinesResponse {
    pub data: Vec<Airline>,
}

/// Airline
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Airline {
    #[serde(rename = "type")]
    pub data_type: String,
    pub iata_code: Option<String>,
    pub icao_code: Option<String>,
    pub business_name: Option<String>,
    pub common_name: Option<String>,
}

// ============================================================================
// Travel Analytics API Models
// ============================================================================

/// Response from Air Traffic Busiest Period API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusiestPeriodResponse {
    pub data: Vec<BusiestPeriod>,
}

/// Busiest period
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusiestPeriod {
    #[serde(rename = "type")]
    pub data_type: String,
    pub period: Option<String>,
    pub analytics: Option<BusiestPeriodAnalytics>,
}

/// Busiest period analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusiestPeriodAnalytics {
    pub travelers: Option<TravelersScore>,
}

/// Travelers score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TravelersScore {
    pub score: Option<i32>,
}

/// Response from Air Traffic Booked API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirTrafficBookedResponse {
    pub data: Vec<AirTrafficData>,
}

/// Air traffic data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AirTrafficData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub subtype: Option<String>,
    pub destination: Option<String>,
    pub analytics: Option<AirTrafficAnalytics>,
}

/// Air traffic analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirTrafficAnalytics {
    pub flights: Option<FlightsAnalytics>,
    pub travelers: Option<TravelersAnalytics>,
}

/// Flights analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightsAnalytics {
    pub score: Option<i32>,
}

/// Travelers analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TravelersAnalytics {
    pub score: Option<i32>,
}

/// Response from Recommended Locations API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedLocationsResponse {
    pub data: Vec<RecommendedLocation>,
}

/// Recommended location
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendedLocation {
    #[serde(rename = "type")]
    pub data_type: String,
    pub subtype: Option<String>,
    pub name: Option<String>,
    pub iata_code: Option<String>,
    pub geo_code: Option<GeoCode>,
    pub relevance: Option<f64>,
}

/// Response from Location Score API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationScoreResponse {
    pub data: Vec<ScoredLocation>,
}

/// Scored location with category scores
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoredLocation {
    #[serde(rename = "type")]
    pub data_type: Option<String>,
    pub geo_code: Option<GeoCode>,
    pub radius: Option<i32>,
    pub category_scores: Option<CategoryScores>,
}

/// Category scores for a location
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryScores {
    pub sight: Option<CategoryScore>,
    pub restaurant: Option<CategoryScore>,
    pub shopping: Option<CategoryScore>,
    pub night_life: Option<CategoryScore>,
}

/// Individual category score
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryScore {
    pub overall: Option<i32>,
    pub historical: Option<i32>,
    pub beach_and_park: Option<i32>,
}

// ============================================================================
// Amadeus Error Response Models
// ============================================================================

/// Amadeus API error response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmadeusErrorResponse {
    pub errors: Vec<AmadeusError>,
}

/// Individual Amadeus API error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AmadeusError {
    pub status: Option<i32>,
    pub code: Option<i32>,
    pub title: Option<String>,
    pub detail: Option<String>,
    pub source: Option<ErrorSource>,
}

/// Error source information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorSource {
    pub parameter: Option<String>,
    pub pointer: Option<String>,
    pub example: Option<String>,
}

/// Common Amadeus error codes for Sandbox/Test environment
pub mod error_codes {
    /// Segment sell failure - common in sandbox when booking
    pub const SEGMENT_SELL_FAILURE: i32 = 34651;
    /// Unable to process - generic error
    pub const UNABLE_TO_PROCESS: i32 = 141;
    /// Invalid format
    pub const INVALID_FORMAT: i32 = 477;
    /// Resource not found
    pub const RESOURCE_NOT_FOUND: i32 = 1797;
    /// Unauthorized
    pub const UNAUTHORIZED: i32 = 38190;
    /// Rate limit exceeded
    pub const RATE_LIMIT_EXCEEDED: i32 = 38194;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flight_search_request_deserialization() {
        let json = r#"{
            "origin": "FRA",
            "destination": "LHR",
            "departureDate": "2024-06-15",
            "adults": 2,
            "children": 1,
            "infants": 0
        }"#;

        let request: FlightSearchRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.origin, "FRA");
        assert_eq!(request.destination, "LHR");
        assert_eq!(request.departure_date, "2024-06-15");
        assert_eq!(request.adults, 2);
        assert_eq!(request.children, 1);
        assert_eq!(request.infants, 0);
        assert!(request.return_date.is_none());
    }

    #[test]
    fn test_flight_search_request_with_optional_fields() {
        let json = r#"{
            "origin": "FRA",
            "destination": "LHR",
            "departureDate": "2024-06-15",
            "returnDate": "2024-06-22",
            "adults": 1,
            "travelClass": "BUSINESS",
            "nonStop": true,
            "maxPrice": 1000
        }"#;

        let request: FlightSearchRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.return_date, Some("2024-06-22".to_string()));
        assert_eq!(request.travel_class, Some("BUSINESS".to_string()));
        assert_eq!(request.non_stop, Some(true));
        assert_eq!(request.max_price, Some(1000));
    }

    #[test]
    fn test_flight_offer_serialization() {
        let offer = FlightOffer {
            id: "1".to_string(),
            offer_type: "flight-offer".to_string(),
            source: "GDS".to_string(),
            instant_ticketing_required: false,
            non_homogeneous: false,
            one_way: false,
            is_upsell_offer: false,
            last_ticketing_date: Some("2024-06-14".to_string()),
            last_ticketing_date_time: None,
            number_of_bookable_seats: Some(9),
            itineraries: vec![],
            price: Price {
                currency: "EUR".to_string(),
                total: "299.00".to_string(),
                base: "250.00".to_string(),
                fees: vec![],
                taxes: vec![],
                grand_total: Some("299.00".to_string()),
                refundable_taxes: None,
                billing_currency: None,
            },
            pricing_options: Some(PricingOptions {
                fare_type: vec!["PUBLISHED".to_string()],
                included_checked_bags_only: true,
            }),
            validating_airline_codes: vec!["LH".to_string()],
            traveler_pricings: vec![],
        };

        let json = serde_json::to_string(&offer).unwrap();
        assert!(json.contains("\"id\":\"1\""));
        assert!(json.contains("\"source\":\"GDS\""));
    }

    #[test]
    fn test_price_structure() {
        let price = Price {
            currency: "EUR".to_string(),
            total: "299.00".to_string(),
            base: "250.00".to_string(),
            fees: vec![Fee {
                amount: "10.00".to_string(),
                fee_type: "SUPPLIER".to_string(),
            }],
            taxes: vec![Tax {
                amount: "39.00".to_string(),
                code: "MX".to_string(),
            }],
            grand_total: Some("299.00".to_string()),
            refundable_taxes: None,
            billing_currency: None,
        };

        // Parse amounts
        let base: f64 = price.base.parse().unwrap();
        let total: f64 = price.total.parse().unwrap();
        let grand_total: f64 = price.grand_total.unwrap().parse().unwrap();

        assert_eq!(base, 250.0);
        assert_eq!(total, 299.0);
        assert_eq!(grand_total, 299.0);
        assert_eq!(price.fees.len(), 1);
        assert_eq!(price.taxes.len(), 1);
    }

    #[test]
    fn test_segment_deserialization() {
        let json = r#"{
            "id": "1",
            "departure": {
                "iataCode": "FRA",
                "terminal": "1",
                "at": "2024-06-15T10:00:00"
            },
            "arrival": {
                "iataCode": "LHR",
                "terminal": "5",
                "at": "2024-06-15T11:30:00"
            },
            "carrierCode": "LH",
            "number": "900",
            "aircraft": { "code": "320" },
            "duration": "PT1H30M",
            "numberOfStops": 0,
            "blacklistedInEU": false
        }"#;

        let segment: Segment = serde_json::from_str(json).unwrap();
        assert_eq!(segment.id, "1");
        assert_eq!(segment.departure.iata_code, "FRA");
        assert_eq!(segment.arrival.iata_code, "LHR");
        assert_eq!(segment.carrier_code, "LH");
        assert_eq!(segment.number, "900");
        assert_eq!(segment.duration, Some("PT1H30M".to_string()));
        assert_eq!(segment.number_of_stops, 0);
    }

    #[test]
    fn test_traveler_pricing() {
        let json = r#"{
            "travelerId": "1",
            "fareOption": "STANDARD",
            "travelerType": "ADULT",
            "price": {
                "currency": "EUR",
                "total": "299.00",
                "base": "250.00"
            },
            "fareDetailsBySegment": [{
                "segmentId": "1",
                "cabin": "ECONOMY",
                "fareBasis": "YOWEU",
                "class": "Y"
            }]
        }"#;

        let pricing: TravelerPricing = serde_json::from_str(json).unwrap();
        assert_eq!(pricing.traveler_id, "1");
        assert_eq!(pricing.traveler_type, "ADULT");
        assert_eq!(pricing.price.total, "299.00");
        assert_eq!(pricing.fare_details_by_segment.len(), 1);
        assert_eq!(pricing.fare_details_by_segment[0].cabin, "ECONOMY");
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(error_codes::INVALID_FORMAT, 477);
        assert_eq!(error_codes::RESOURCE_NOT_FOUND, 1797);
        assert_eq!(error_codes::UNAUTHORIZED, 38190);
        assert_eq!(error_codes::RATE_LIMIT_EXCEEDED, 38194);
    }
}
