'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchFlights,
  priceFlightOffers,
  searchLocations,
  getSeatmaps,
  createBooking,
  getBooking,
  getFlightDates,
  type BookingRequest,
} from '@/lib/api-client';
import type { FlightSearchRequest, FlightOffer } from '@/types/flight';
import { useSearchStore } from '@/stores/search-store';
import { useBookingStore } from '@/stores/booking-store';

// ============================================================================
// Query Keys
// ============================================================================

export const flightKeys = {
  all: ['flights'] as const,
  search: (params: FlightSearchRequest) => [...flightKeys.all, 'search', params] as const,
  price: (offerIds: string[]) => [...flightKeys.all, 'price', offerIds] as const,
  seatmaps: (offerIds: string[]) => [...flightKeys.all, 'seatmaps', offerIds] as const,
  booking: (orderId: string) => [...flightKeys.all, 'booking', orderId] as const,
  locations: (keyword: string) => ['locations', keyword] as const,
  dates: (origin: string, destination: string) => [...flightKeys.all, 'dates', origin, destination] as const,
};

// ============================================================================
// Search Flights Mutation Hook
// ============================================================================

export function useFlightSearch() {
  const { setSearchResults, setIsSearching } = useSearchStore();

  return useMutation({
    mutationFn: async (request: FlightSearchRequest) => {
      setIsSearching(true);
      try {
        const response = await searchFlights(request);
        setSearchResults(response.data);
        return response;
      } finally {
        setIsSearching(false);
      }
    },
  });
}

// ============================================================================
// Price Flight Mutation
// ============================================================================

export function usePriceFlights() {
  const { setPricedOffer, setIsPricing, setAvailableBagOptions } = useBookingStore();

  return useMutation({
    mutationFn: async (offers: FlightOffer[]) => {
      setIsPricing(true);
      try {
        const response = await priceFlightOffers(offers);
        if (response.data?.flightOffers && response.data.flightOffers.length > 0) {
          setPricedOffer(response.data.flightOffers[0]);
        }
        // Store available bag options from the pricing response
        if (response.included?.bags) {
          setAvailableBagOptions(response.included.bags);
        }
        return response;
      } catch (error) {
        console.warn('Pricing API failed, using original offer:', error);
        // Fallback: Use the original offer if pricing fails
        setPricedOffer(offers[0]);
        throw error;
      } finally {
        setIsPricing(false);
      }
    },
  });
}

// ============================================================================
// Location Search Hook
// ============================================================================

export function useLocationSearch(keyword: string) {
  return useQuery({
    queryKey: flightKeys.locations(keyword),
    queryFn: () => searchLocations(keyword),
    enabled: keyword.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Seatmaps Hook
// ============================================================================

export function useSeatmaps(offers: FlightOffer[]) {
  const offerIds = offers.map(o => o.id);

  return useQuery({
    queryKey: flightKeys.seatmaps(offerIds),
    queryFn: () => getSeatmaps(offers),
    enabled: offers.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Booking Mutation
// ============================================================================

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { setBookingResult, setIsBooking } = useBookingStore();

  return useMutation({
    mutationFn: async (request: BookingRequest) => {
      setIsBooking(true);
      try {
        const response = await createBooking(request);
        const pnr = response.data.associatedRecords?.[0]?.reference || '';
        setBookingResult(response.data.id, pnr);
        return response;
      } finally {
        setIsBooking(false);
      }
    },
    onSuccess: (data) => {
      // Invalidate booking cache
      queryClient.invalidateQueries({ queryKey: flightKeys.booking(data.data.id) });
    },
  });
}

// ============================================================================
// Get Booking Hook
// ============================================================================

export function useBooking(orderId: string) {
  return useQuery({
    queryKey: flightKeys.booking(orderId),
    queryFn: () => getBooking(orderId),
    enabled: !!orderId,
  });
}

// ============================================================================
// Flight Cheapest Date Search Hook
// ============================================================================

export function useFlightDates(origin: string, destination: string, enabled = true) {
  return useQuery({
    queryKey: flightKeys.dates(origin, destination),
    queryFn: () => getFlightDates(origin, destination),
    enabled: enabled && !!origin && !!destination,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Stub Hooks (TODO: Implement these)
// ============================================================================

export function useDirectDestinations(_origin: string) {
  return useQuery({
    queryKey: ['direct-destinations', _origin],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}

export function useFlightInspiration(_origin: string) {
  return useQuery({
    queryKey: ['flight-inspiration', _origin],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}

export function useTrendingDestinations() {
  return useQuery({
    queryKey: ['trending-destinations'],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}

export function useCheckinLinks(_airlineCode: string) {
  return useQuery({
    queryKey: ['checkin-links', _airlineCode],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}

export function useFlightStatus(_carrierCode: string, _flightNumber: string, _date: string) {
  return useQuery({
    queryKey: ['flight-status', _carrierCode, _flightNumber, _date],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}

export function usePriceMetrics(_origin: string, _destination: string, _date: string) {
  return useQuery({
    queryKey: ['price-metrics', _origin, _destination, _date],
    queryFn: () => Promise.resolve({ data: [] }),
    enabled: false,
  });
}
