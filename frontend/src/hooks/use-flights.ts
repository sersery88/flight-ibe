'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchFlights,
  priceFlightOffers,
  createBooking,
  type BookingRequest,
} from '@/lib/api-client';
import type { FlightSearchRequest, FlightOffer } from '@/types/flight';
import { useSearchStore } from '@/stores/search-store';
import { useBookingStore } from '@/stores/booking-store';
import { flightKeys, flightQueries } from '@/queries/flight-queries';

// Re-export keys for backward compatibility
export { flightKeys };

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
// Location Search Hook (uses queryOptions)
// ============================================================================

export function useLocationSearch(keyword: string) {
  return useQuery(flightQueries.locations(keyword));
}

// ============================================================================
// Seatmaps Hook (uses queryOptions)
// ============================================================================

export function useSeatmaps(offers: FlightOffer[]) {
  return useQuery(flightQueries.seatmaps(offers));
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
// Get Booking Hook (uses queryOptions)
// ============================================================================

export function useBooking(orderId: string) {
  return useQuery(flightQueries.booking(orderId));
}

// ============================================================================
// Flight Cheapest Date Search Hook (uses queryOptions)
// ============================================================================

export function useFlightDates(origin: string, destination: string, enabled = true) {
  return useQuery(flightQueries.dates(origin, destination, enabled));
}

// ============================================================================
// Stub Hooks (use queryOptions)
// ============================================================================

export function useDirectDestinations(origin: string) {
  return useQuery(flightQueries.directDestinations(origin));
}

export function useFlightInspiration(origin: string) {
  return useQuery(flightQueries.flightInspiration(origin));
}

export function useTrendingDestinations() {
  return useQuery(flightQueries.trendingDestinations());
}

export function useCheckinLinks(airlineCode: string) {
  return useQuery(flightQueries.checkinLinks(airlineCode));
}

export function useFlightStatus(carrierCode: string, flightNumber: string, date: string) {
  return useQuery(flightQueries.flightStatus(carrierCode, flightNumber, date));
}

export function usePriceMetrics(origin: string, destination: string, date: string) {
  return useQuery(flightQueries.priceMetrics(origin, destination, date));
}
