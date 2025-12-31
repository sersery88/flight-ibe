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
  grandTotal: string;
  additionalServices?: AdditionalService[];
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
  number?: string;
  aircraft?: { code?: string };
  departure?: { iataCode?: string; at?: string };
  arrival?: { iataCode?: string };
  decks: Deck[];
  availableSeatsCounters?: AvailableSeatsCounter[];
}

export interface Deck {
  deckType?: string;
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
  row?: number;
  column?: string;
  position?: string;
  coordinates?: {
    x?: number;
    y?: number;
  };
}

export interface Seat {
  cabin?: string;
  number: string;
  characteristicsCodes?: string[];
  coordinates?: SeatCoordinates;
  travelerPricing?: SeatTravelerPricing[];
}

export interface SeatCoordinates {
  x?: number;
  y?: number;
}

export interface SeatTravelerPricing {
  travelerId?: string;
  seatAvailabilityStatus?: string;
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
