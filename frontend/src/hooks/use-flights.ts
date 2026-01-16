import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  searchFlights,
  priceFlightOffers,
  searchLocations,
  getSeatmaps,
  createBooking,
  getBooking,
  type BookingRequest,
} from '@/api/client';
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
// Prefetch Hooks - For improved UX with data prefetching
// ============================================================================

/**
 * Hook to prefetch seatmaps when hovering over flight offers
 * This provides instant seat selection when user selects a flight
 */
export function usePrefetchSeatmaps() {
  const queryClient = useQueryClient();

  return useCallback((offers: FlightOffer[]) => {
    const offerIds = offers.map(o => o.id);
    queryClient.prefetchQuery({
      queryKey: flightKeys.seatmaps(offerIds),
      queryFn: () => getSeatmaps(offers),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient]);
}

/**
 * Hook to prefetch flight pricing
 * Useful when user hovers over "Select" button
 */
export function usePrefetchPricing() {
  const queryClient = useQueryClient();

  return useCallback((offers: FlightOffer[]) => {
    const offerIds = offers.map(o => o.id);
    queryClient.prefetchQuery({
      queryKey: flightKeys.price(offerIds),
      queryFn: () => priceFlightOffers(offers),
      staleTime: 2 * 60 * 1000, // 2 minutes (pricing changes more frequently)
    });
  }, [queryClient]);
}

/**
 * Standalone prefetch function for use outside React components
 */
export function prefetchSeatmaps(queryClient: QueryClient, offers: FlightOffer[]) {
  const offerIds = offers.map(o => o.id);
  return queryClient.prefetchQuery({
    queryKey: flightKeys.seatmaps(offerIds),
    queryFn: () => getSeatmaps(offers),
    staleTime: 5 * 60 * 1000,
  });
}

