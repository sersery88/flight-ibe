/**
 * Flight IBE TypeScript Types
 * Generated from Rust models in crates/api-server/src/models.rs
 */

// ============================================================================
// Search Request/Response
// ============================================================================

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  currency?: string;
  travelClass?: TravelClass;
  nonStop?: boolean;
  maxPrice?: number;
  maxResults?: number;
  includedAirlineCodes?: string[];
  excludedAirlineCodes?: string[];
  additionalLegs?: FlightLegRequest[];
}

export interface FlightLegRequest {
  origin: string;
  destination: string;
  departureDate: string;
}

export type TravelClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export interface FlightOffersResponse {
  data: FlightOffer[];
  dictionaries?: Dictionaries;
}

// ============================================================================
// Flight Offer
// ============================================================================

export interface FlightOffer {
  id: string;
  type: string; // Required by Amadeus API, should be "flight-offer"
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  isUpsellOffer?: boolean;
  lastTicketingDate?: string;
  lastTicketingDateTime?: string;
  numberOfBookableSeats?: number;
  itineraries: Itinerary[];
  price: Price;
  pricingOptions: PricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
  choiceProbability?: string;
}

export interface Itinerary {
  duration: string;
  segments: Segment[];
}

export interface Segment {
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  carrierCode: string;
  number: string;
  aircraft: Aircraft;
  operating?: OperatingFlight;
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
  co2Emissions?: Co2Emission[];
  stops?: FlightStop[];  // Intermediate stops (per Amadeus API)
}

export interface FlightEndpoint {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface Aircraft {
  code: string;
}

export interface OperatingFlight {
  carrierCode: string;
  number?: string;  // Flight number (per Amadeus API)
  suffix?: string;  // Flight number suffix (per Amadeus API)
}

// Flight stop for intermediate stops (per Amadeus API FlightStop model)
export interface FlightStop {
  iataCode: string;
  duration?: string;  // Stop duration in ISO 8601 format
  arrivalAt?: string;  // Arrival time at stop
  departureAt?: string;  // Departure time from stop
  newAircraft?: boolean;  // Whether aircraft changes at this stop
}

export interface Co2Emission {
  weight: number;
  weightUnit: string;
  cabin: string;
}

export interface Price {
  currency: string;
  total: string;
  base: string;
  fees?: Fee[];
  taxes?: Tax[];  // Tax breakdown (per Amadeus API)
  grandTotal: string;
  additionalServices?: AdditionalService[];
}

// Tax information (per Amadeus API Tax model)
export interface Tax {
  amount: string;  // Tax amount
  code?: string;  // Tax code (e.g., "MX")
}

export interface Fee {
  amount: string;
  type: string;
}

export interface AdditionalService {
  amount?: string;
  type?: string;
}

export interface PricingOptions {
  fareType: string[];
  includedCheckedBagsOnly: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: TravelerType;
  price: TravelerPrice;
  fareDetailsBySegment: FareDetailsBySegment[];
}

export type TravelerType = 'ADULT' | 'CHILD' | 'SEATED_INFANT' | 'HELD_INFANT';

export interface TravelerPrice {
  currency: string;
  total: string;
  base: string;
}

export interface FareDetailsBySegment {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  brandedFare?: string;
  brandedFareLabel?: string;
  class: string;
  includedCheckedBags?: BaggageAllowance;
  amenities?: Amenity[];
}

export interface BaggageAllowance {
  weight?: number;
  weightUnit?: string;
  quantity?: number;
}

export interface Amenity {
  description: string;
  isChargeable: boolean;
  amenityType: string;
  amenityProvider?: AmenityProvider;
}

export interface AmenityProvider {
  name: string;
}

export interface Dictionaries {
  locations?: Record<string, LocationValue>;
  aircraft?: Record<string, string>;
  currencies?: Record<string, string>;
  carriers?: Record<string, string>;
  // Seatmap-specific dictionaries (per Amadeus API)
  facilities?: Record<string, string>;  // Facility code to name mapping
  seatCharacteristics?: Record<string, string>;  // Seat characteristic code to description
}

export interface LocationValue {
  cityCode: string;
  countryCode: string;
}

// ============================================================================
// Seatmap Types
// ============================================================================

export interface SeatmapResponse {
  data: SeatmapData[];
  dictionaries?: Dictionaries;
}

export interface SeatmapData {
  type: string;
  flightOfferId?: string;
  segmentId?: string;
  carrierCode?: string;
  number?: string;  // Flight number
  class?: TravelClass;  // Cabin class (per Amadeus API)
  aircraft?: { code?: string };
  departure?: { iataCode?: string; at?: string };
  arrival?: { iataCode?: string };
  decks: Deck[];
  availableSeatsCounters?: AvailableSeatsCounter[];
  aircraftCabinAmenities?: AircraftCabinAmenities;  // Cabin amenities (per Amadeus API)
}

// Deck type enum (per Amadeus API)
export type DeckType = 'UPPER' | 'MAIN' | 'LOWER';

export interface Deck {
  deckType?: DeckType;  // Type of deck (per Amadeus API enum)
  deckConfiguration?: DeckConfiguration;
  seats: Seat[];
  facilities?: Facility[];
}

export interface DeckConfiguration {
  width?: number;
  length?: number;
  startSeatRow?: number;
  endSeatRow?: number;
  startWingsRow?: number;
  endWingsRow?: number;
  startWingsX?: number;
  endWingsX?: number;
  exitRowsX?: number[];
}

export interface Facility {
  code?: string;
  name?: string;
  row?: string;  // Row designation (e.g., "40", "41") - string per Amadeus API
  column?: string;  // Column designation (e.g., "A", "B", "C") - string per Amadeus API
  position?: string;  // Position relative to seats: FRONT, REAR, or SEAT (uppercase from Amadeus API)
  coordinates?: {
    x?: number;  // Coordinate for the Length (row position)
    y?: number;  // Coordinate for the Width (column position)
  };
}

export interface Seat {
  cabin?: string;
  number: string;
  characteristicsCodes?: string[];
  coordinates?: SeatCoordinates;
  travelerPricing?: SeatTravelerPricing[];
  medias?: Media[];  // Rich content media (per Amadeus API)
  amenities?: SeatAmenity[];  // Seat-specific amenities (per Amadeus API)
}

export interface SeatCoordinates {
  x?: number;
  y?: number;
}

// Seat availability status enum (per Amadeus API)
export type SeatAvailabilityStatus = 'AVAILABLE' | 'BLOCKED' | 'OCCUPIED';

export interface SeatTravelerPricing {
  travelerId?: string;
  seatAvailabilityStatus?: SeatAvailabilityStatus;  // Enum per Amadeus API
  price?: SeatPrice;
}

export interface SeatPrice {
  currency?: string;
  total?: string;
  base?: string;
}

export interface AvailableSeatsCounter {
  travelerId?: string;
  value?: number;
}

// ============================================================================
// Aircraft Cabin Amenities (per Amadeus API AircraftCabinAmenities model)
// ============================================================================

// Power type enum (per Amadeus API)
export type PowerType = 'PLUG' | 'USB_PORT' | 'ADAPTOR' | 'PLUG_OR_USB_PORT';

// USB type enum (per Amadeus API)
export type UsbType = 'USB_A' | 'USB_C' | 'USB_A_AND_USB_C';

// WiFi coverage enum (per Amadeus API)
export type WifiCoverage = 'FULL' | 'PARTIAL' | 'NONE';

// Entertainment type enum (per Amadeus API)
export type EntertainmentType = 'LIVE_TV' | 'MOVIES' | 'AUDIO_VIDEO_ON_DEMAND' | 'TV_SHOWS' | 'IP_TV';

// Food type enum (per Amadeus API)
export type FoodType = 'MEAL' | 'FRESH_MEAL' | 'SNACK' | 'FRESH_SNACK';

// Beverage type enum (per Amadeus API)
export type BeverageType = 'ALCOHOLIC' | 'NON_ALCOHOLIC' | 'ALCOHOLIC_AND_NON_ALCOHOLIC';

// Seat tilt enum (per Amadeus API)
export type SeatTilt = 'FULL_FLAT' | 'ANGLE_FLAT' | 'NORMAL';

export interface CabinAmenity {
  isChargeable?: boolean;  // Whether traveler needs to pay extra
  powerType?: PowerType;
  usbType?: UsbType;
}

export interface WifiAmenity {
  isChargeable?: boolean;
  wifiCoverage?: WifiCoverage;
}

export interface EntertainmentAmenity {
  isChargeable?: boolean;
  entertainmentType?: EntertainmentType;
}

export interface FoodAmenity {
  isChargeable?: boolean;
  foodType?: FoodType;
}

export interface BeverageAmenity {
  isChargeable?: boolean;
  beverageType?: BeverageType;
}

export interface SeatAmenity {
  isChargeable?: boolean;
  seatTilt?: SeatTilt;
  legSpace?: number;  // Leg space in inches
  spaceUnit?: string;  // Unit for leg space (e.g., "INCHES")
  medias?: Media[];  // Rich content for seat
}

export interface AircraftCabinAmenities {
  power?: CabinAmenity;
  wifi?: WifiAmenity;
  entertainment?: EntertainmentAmenity;
  food?: FoodAmenity;
  beverage?: BeverageAmenity;
  seat?: SeatAmenity;
}

// ============================================================================
// Media (per Amadeus API Media model)
// ============================================================================

// Media type enum (per Amadeus API)
export type MediaType = 'application' | 'audio' | 'font' | 'example' | 'image' | 'message' | 'model' | 'multipart' | 'text' | 'video';

export interface QualifiedFreeText {
  text?: string;
  lang?: string;  // Language code per RFC 5646
}

export interface Media {
  title?: string;  // Media title
  href?: string;  // URI to display the original media
  description?: QualifiedFreeText;
  mediaType?: MediaType;
}

// ============================================================================
// Upsell / Branded Fares Types
// ============================================================================

export interface UpsellResponse {
  data: FlightOffer[];
  dictionaries?: Dictionaries;
}

// ============================================================================
// Flight Price Response Types (with bags)
// ============================================================================

export interface FlightPriceResponse {
  data: FlightPriceData;
  dictionaries?: Dictionaries;
  included?: IncludedServices;
}

export interface FlightPriceData {
  type: string;
  flightOffers: FlightOffer[];
  bookingRequirements?: BookingRequirements;
}

export interface BookingRequirements {
  emailAddressRequired?: boolean;
  mobilePhoneNumberRequired?: boolean;
  travelerRequirements?: TravelerRequirement[];
}

export interface TravelerRequirement {
  travelerId: string;
  dateOfBirthRequired?: boolean;
  genderRequired?: boolean;
  documentRequired?: boolean;
}

export interface IncludedServices {
  bags?: Record<string, BagOption>;
}

export interface BagOption {
  quantity?: number;
  weight?: number;
  weightUnit?: string;
  name?: string;
  price?: BagPrice;
  bookableByItinerary?: boolean;
  segmentIds?: string[];
  travelerIds?: string[];
}

export interface BagPrice {
  amount: string;
  currencyCode: string;
}

// ============================================================================
// Booking Types (per Amadeus API Flight Create Orders)
// ============================================================================

// Gender enum (per Amadeus API)
export type Gender = 'MALE' | 'FEMALE';

// Document type enum (per Amadeus API)
export type DocumentType = 'PASSPORT' | 'IDENTITY_CARD' | 'VISA' | 'KNOWN_TRAVELER' | 'REDRESS';

// Phone device type enum (per Amadeus API)
export type PhoneDeviceType = 'MOBILE' | 'LANDLINE' | 'FAX';

// Purpose enum (per Amadeus API)
export type ContactPurpose = 'STANDARD' | 'INVOICE' | 'STANDARD_WITHOUT_EMAIL';

export interface TravelerName {
  firstName: string;
  lastName: string;
  middleName?: string;
  secondLastName?: string;
}

export interface TravelerDocument {
  documentType: DocumentType;
  number: string;
  expiryDate?: string;  // ISO 8601 date
  issuanceCountry?: string;  // ISO 3166-1 alpha-2 country code
  issuanceDate?: string;  // ISO 8601 date
  issuanceLocation?: string;
  nationality?: string;  // ISO 3166-1 alpha-2 country code
  holder?: boolean;  // Whether this traveler is the document holder
  birthPlace?: string;
}

export interface Phone {
  deviceType?: PhoneDeviceType;
  countryCallingCode?: string;  // Country calling code (e.g., "49" for Germany)
  number: string;
}

export interface TravelerContact {
  emailAddress?: string;
  phones?: Phone[];
  companyName?: string;
  purpose?: ContactPurpose;
}

export interface Traveler {
  id: string;  // Traveler ID (e.g., "1", "2")
  dateOfBirth?: string;  // ISO 8601 date (YYYY-MM-DD)
  gender?: Gender;
  name: TravelerName;
  contact?: TravelerContact;
  documents?: TravelerDocument[];
}

// ============================================================================
// Flight Dates (Cheapest Date Search) Types
// ============================================================================

export interface FlightDatesResponse {
  data: FlightDate[];
  dictionaries?: Dictionaries;
}

export interface FlightDate {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: FlightDestinationPrice;
}

export interface FlightDestinationPrice {
  total: string;
  currency?: string;
}

// ============================================================================
// Amadeus Error Types (per Amadeus API Error Response)
// ============================================================================

export interface AmadeusErrorSource {
  parameter?: string;
  pointer?: string;
  example?: string;
}

export interface AmadeusError {
  status?: number;
  code?: number;
  title?: string;
  detail?: string;
  source?: AmadeusErrorSource;
}

export interface AmadeusErrorResponse {
  errors: AmadeusError[];
}
