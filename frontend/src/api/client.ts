/**
 * API Client for Flight IBE Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiError {
  message: string;
  code?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      };
      
      try {
        const errorData = await response.json();
        error.message = errorData.message || errorData.error || error.message;
        error.code = errorData.code;
      } catch {
        // Ignore JSON parse errors
      }
      
      throw error;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// ============================================================================
// API Endpoints
// ============================================================================

import type {
  FlightSearchRequest,
  FlightOffersResponse,
  FlightOffer,
  Traveler,
  TravelerContact,
} from '@/types/flight';

// Flight Search
export async function searchFlights(request: FlightSearchRequest): Promise<FlightOffersResponse> {
  return apiClient.post<FlightOffersResponse>('/flight-search', request);
}

// Flight Price
import type { FlightPriceResponse } from '@/types/flight';

export async function priceFlightOffers(
  offers: FlightOffer[],
  includeBags = true
): Promise<FlightPriceResponse> {
  // API expects a single flight_offer (uses camelCase in JSON)
  return apiClient.post('/flight-price', {
    flightOffer: offers[0],
    includeBags: includeBags,
  });
}

// Location Search (for airport autocomplete)
export interface LocationResult {
  iataCode: string;
  name: string;
  cityCode?: string;
  countryCode?: string;
  subType: 'AIRPORT' | 'CITY';
}

// Backend Location type (camelCase from Rust with serde rename_all)
interface BackendLocation {
  iataCode?: string;
  name?: string;
  detailedName?: string;
  subtype?: string | null;
  type?: string;
  address?: {
    cityCode?: string;
    cityName?: string;
    countryCode?: string;
    countryName?: string;
  };
}

export async function searchLocations(keyword: string): Promise<{ data: LocationResult[] }> {
  const response = await apiClient.get<{ data: BackendLocation[] }>('/locations', { keyword, pageLimit: 10 });

  // Transform backend response to frontend format
  const transformed: LocationResult[] = response.data
    .filter((loc): loc is BackendLocation & { iataCode: string } => !!loc.iataCode)
    .map((loc) => ({
      iataCode: loc.iataCode,
      name: loc.name || loc.detailedName || loc.iataCode,
      cityCode: loc.address?.cityCode,
      countryCode: loc.address?.countryCode,
      // Determine type from 'type' field (location vs airport) or subtype
      subType: (loc.type === 'location' && loc.name?.toUpperCase() === loc.address?.cityName?.toUpperCase() ? 'CITY' : 'AIRPORT') as 'AIRPORT' | 'CITY',
    }));

  return { data: transformed };
}

// Seatmaps
import type { SeatmapData } from '@/types/flight';

export async function getSeatmaps(offers: FlightOffer[]): Promise<{ data: SeatmapData[] }> {
  return apiClient.post('/seatmaps', { flightOffers: offers });
}

// Create Booking

/** Payment method types */
export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'INVOICE';

/** Payment information for booking */
export interface PaymentInfo {
  method: PaymentMethod;
  cardNumber?: string;
  expiryDate?: string;
  cardHolderName?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

export interface BookingRequest {
  flightOffers: FlightOffer[];
  travelers: Traveler[];
  contact?: TravelerContact;
  payment?: PaymentInfo;
}

export interface BookingResponse {
  id: string;
  associatedRecords: Array<{ reference: string }>;
}

export async function createBooking(request: BookingRequest): Promise<{ data: BookingResponse }> {
  return apiClient.post('/flight-order', request);
}

// Get Booking
export async function getBooking(orderId: string): Promise<{ data: BookingResponse }> {
  return apiClient.get(`/flight-order/${orderId}`);
}

// Cancel Booking
export async function cancelBooking(orderId: string): Promise<void> {
  return apiClient.delete(`/flight-order/${orderId}`);
}

// Get Branded Fares / Upsell Options
export async function getUpsellOffers(offers: FlightOffer[]): Promise<FlightOffersResponse> {
  return apiClient.post('/upsell', { flightOffers: offers });
}

// ============================================================================
// Price Intelligence APIs
// ============================================================================

/** Flight dates response for cheapest dates calendar */
export interface FlightDate {
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
    currency: string;
  };
}

export interface FlightDatesResponse {
  data: FlightDate[];
}

/** Get cheapest flight dates for price calendar */
export async function getFlightDates(
  origin: string,
  destination: string
): Promise<FlightDatesResponse> {
  return apiClient.get('/flight-dates', { origin, destination });
}

/** Price metrics for "Good Deal" indicator */
export interface PriceMetrics {
  priceMetrics: Array<{
    amount: string;
    quartileRanking: 'MINIMUM' | 'FIRST' | 'MEDIUM' | 'THIRD' | 'MAXIMUM';
  }>;
}

export interface PriceMetricsResponse {
  data: PriceMetrics[];
}

/** Get historical price metrics for deal indicator */
export async function getPriceMetrics(
  origin: string,
  destination: string,
  departureDate: string,
  currencyCode = 'EUR',
  oneWay = false
): Promise<PriceMetricsResponse> {
  return apiClient.get('/price-metrics', {
    originIataCode: origin,
    destinationIataCode: destination,
    departureDate,
    currencyCode,
    oneWay,
  });
}

/** Flight delay prediction */
export interface DelayPrediction {
  id: string;
  probability: string;
  result: 'LESS_THAN_30_MINUTES' | 'BETWEEN_30_AND_60_MINUTES' | 'BETWEEN_60_AND_120_MINUTES' | 'OVER_120_MINUTES_OR_CANCELLED';
  subType: string;
}

export interface DelayPredictionResponse {
  data: DelayPrediction[];
}

/** Predict flight delay probability */
export async function getDelayPrediction(params: {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  aircraftCode: string;
  carrierCode: string;
  flightNumber: string;
  duration: string;
}): Promise<DelayPredictionResponse> {
  return apiClient.get('/flight-delay-prediction', params);
}

// ============================================================================
// Inspiration & Discovery APIs
// ============================================================================

/** Flight destination for inspiration search */
export interface FlightDestination {
  type: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  price: {
    total: string;
    currency: string;
  };
}

export interface FlightDestinationsResponse {
  data: FlightDestination[];
}

/** Get flight destinations by budget (Inspiration Search) */
export async function getFlightDestinations(
  origin: string,
  maxPrice?: number
): Promise<FlightDestinationsResponse> {
  return apiClient.get('/flight-destinations', { origin, maxPrice });
}

/** Direct destination from airport */
export interface DirectDestination {
  type: string;
  subtype: string;
  name: string;
  iataCode: string;
}

export interface DirectDestinationsResponse {
  data: DirectDestination[];
}

/** Get airports with direct flights */
export async function getAirportDirectDestinations(
  departureAirportCode: string,
  max?: number
): Promise<DirectDestinationsResponse> {
  return apiClient.get('/airport-direct-destinations', { departureAirportCode, max });
}

/** Get airline destinations */
export async function getAirlineDestinations(
  airlineCode: string,
  max?: number
): Promise<DirectDestinationsResponse> {
  return apiClient.get('/airline-destinations', { airlineCode, max });
}

// ============================================================================
// Analytics & Intelligence APIs
// ============================================================================

/** Busiest travel period data */
export interface BusiestPeriod {
  type: string;
  period: string;
  analytics: {
    travelers: {
      score: number;
    };
  };
}

export interface BusiestPeriodResponse {
  data: BusiestPeriod[];
}

/** Get busiest travel periods for a city */
export async function getBusiestPeriod(
  cityCode: string,
  period: string,
  direction?: 'ARRIVING' | 'DEPARTING'
): Promise<BusiestPeriodResponse> {
  return apiClient.get('/busiest-period', { cityCode, period, direction });
}

/** Air traffic analytics */
export interface AirTrafficData {
  type: string;
  destination: string;
  analytics: {
    travelers: {
      score: number;
    };
    flights: {
      score: number;
    };
  };
}

export interface AirTrafficResponse {
  data: AirTrafficData[];
}

/** Get trending destinations (air traffic booked) */
export async function getAirTrafficBooked(
  originCityCode: string,
  period: string,
  max?: number
): Promise<AirTrafficResponse> {
  return apiClient.get('/air-traffic-booked', { originCityCode, period, max });
}

/** Recommended location */
export interface RecommendedLocation {
  type: string;
  subtype: string;
  name: string;
  iataCode: string;
  relevance: number;
}

export interface RecommendedLocationsResponse {
  data: RecommendedLocation[];
}

/** Get personalized location recommendations */
export async function getRecommendedLocations(
  cityCodes: string,
  travelerCountryCode?: string
): Promise<RecommendedLocationsResponse> {
  return apiClient.get('/recommended-locations', { cityCodes, travelerCountryCode });
}

/** Location score data */
export interface LocationScore {
  categoryScores: Array<{
    categoryName: string;
    score: number;
  }>;
}

export interface LocationScoreResponse {
  data: LocationScore[];
}

/** Get location quality score */
export async function getLocationScore(
  latitude: number,
  longitude: number
): Promise<LocationScoreResponse> {
  return apiClient.get('/location-score', { latitude, longitude });
}

// ============================================================================
// Post-Booking APIs
// ============================================================================

/** Flight status data */
export interface FlightStatus {
  type: string;
  flightDesignator: {
    carrierCode: string;
    flightNumber: string;
  };
  scheduledDepartureDate: string;
  flightPoints: Array<{
    iataCode: string;
    departure?: {
      timings: Array<{ qualifier: string; value: string }>;
      terminal?: { code: string };
      gate?: { mainGate: string };
    };
    arrival?: {
      timings: Array<{ qualifier: string; value: string }>;
      terminal?: { code: string };
    };
  }>;
  legs: Array<{
    boardPointIataCode: string;
    offPointIataCode: string;
    aircraftEquipment: { aircraftType: string };
    scheduledLegDuration: string;
  }>;
}

export interface FlightStatusResponse {
  data: FlightStatus[];
}

/** Get real-time flight status */
export async function getFlightStatus(
  carrierCode: string,
  flightNumber: string,
  scheduledDepartureDate: string
): Promise<FlightStatusResponse> {
  return apiClient.get('/flight-status', {
    carrierCode,
    flightNumber,
    scheduledDepartureDate,
  });
}

/** Check-in link */
export interface CheckinLink {
  type: string;
  id: string;
  href: string;
  channel: string;
}

export interface CheckinLinksResponse {
  data: CheckinLink[];
}

/** Get airline check-in links */
export async function getCheckinLinks(
  airlineCode: string,
  language = 'de-DE'
): Promise<CheckinLinksResponse> {
  return apiClient.get('/checkin-links', { airlineCode, language });
}

// ============================================================================
// Geo & Reference Data APIs
// ============================================================================

/** Airport by geocode */
export interface Airport {
  type: string;
  subType: string;
  name: string;
  detailedName: string;
  iataCode: string;
  address: {
    cityName: string;
    cityCode: string;
    countryName: string;
    countryCode: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
  distance?: {
    value: number;
    unit: string;
  };
}

export interface AirportsResponse {
  data: Airport[];
}

/** Get airports by geographic coordinates */
export async function getAirportsByGeocode(
  latitude: number,
  longitude: number,
  radius?: number,
  pageLimit?: number
): Promise<AirportsResponse> {
  return apiClient.get('/airports', { latitude, longitude, radius, pageLimit });
}

/** Airline info */
export interface Airline {
  type: string;
  iataCode: string;
  icaoCode?: string;
  businessName: string;
  commonName?: string;
}

export interface AirlinesResponse {
  data: Airline[];
}

/** Get airline information */
export async function getAirlines(airlineCodes?: string): Promise<AirlinesResponse> {
  return apiClient.get('/airlines', { airlineCodes });
}

/** Flight availability (advanced search) */
export async function getFlightAvailabilities(params: {
  originDestinations: Array<{
    id: string;
    originLocationCode: string;
    destinationLocationCode: string;
    departureDateTime: { date: string };
  }>;
  travelers: Array<{ id: string; travelerType: string }>;
  sources: string[];
}): Promise<FlightOffersResponse> {
  return apiClient.post('/flight-availabilities', params);
}

/** Flight choice prediction (AI-powered ranking) */
export async function getFlightChoicePrediction(
  offers: FlightOffer[]
): Promise<FlightOffersResponse> {
  return apiClient.post('/flight-choice-prediction', { data: offers });
}

