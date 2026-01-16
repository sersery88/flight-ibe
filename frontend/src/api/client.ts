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
  return apiClient.post('/book', request);
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

