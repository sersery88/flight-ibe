import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  searchFlights,
  priceFlightOffers,
  searchLocations,
  getSeatmaps,
  createBooking,
  getBooking,
  getFlightDates,
  getPriceMetrics,
  getDelayPrediction,
  getFlightDestinations,
  getAirportDirectDestinations,
  getAirTrafficBooked,
  getFlightStatus,
  getCheckinLinks,
  getAirportsByGeocode,
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
  // Price Intelligence
  flightDates: (origin: string, destination: string) => [...flightKeys.all, 'dates', origin, destination] as const,
  priceMetrics: (origin: string, destination: string, date: string) => [...flightKeys.all, 'metrics', origin, destination, date] as const,
  delayPrediction: (flightKey: string) => [...flightKeys.all, 'delay', flightKey] as const,
  // Inspiration
  destinations: (origin: string, maxPrice?: number) => [...flightKeys.all, 'destinations', origin, maxPrice] as const,
  directDestinations: (airportCode: string) => [...flightKeys.all, 'direct', airportCode] as const,
  trending: (cityCode: string, period: string) => [...flightKeys.all, 'trending', cityCode, period] as const,
  // Post-Booking
  flightStatus: (carrier: string, flight: string, date: string) => [...flightKeys.all, 'status', carrier, flight, date] as const,
  checkinLinks: (airlineCode: string) => [...flightKeys.all, 'checkin', airlineCode] as const,
  // Geo
  nearbyAirports: (lat: number, lng: number) => [...flightKeys.all, 'nearby', lat, lng] as const,
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

// ============================================================================
// Price Intelligence Hooks
// ============================================================================

/**
 * Hook to get cheapest flight dates for a route (Price Calendar)
 */
export function useFlightDates(origin: string, destination: string) {
  return useQuery({
    queryKey: flightKeys.flightDates(origin, destination),
    queryFn: () => getFlightDates(origin, destination),
    enabled: !!origin && !!destination && origin.length === 3 && destination.length === 3,
    staleTime: 30 * 60 * 1000, // 30 minutes - prices don't change that fast
  });
}

/**
 * Hook to get historical price metrics (Good Deal Indicator)
 */
export function usePriceMetrics(
  origin: string,
  destination: string,
  departureDate: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: flightKeys.priceMetrics(origin, destination, departureDate),
    queryFn: () => getPriceMetrics(origin, destination, departureDate),
    enabled: (options?.enabled ?? true) && !!origin && !!destination && !!departureDate,
    staleTime: 60 * 60 * 1000, // 1 hour - historical data doesn't change often
  });
}

/**
 * Hook to predict flight delay probability
 */
export function useDelayPrediction(params: {
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
} | null) {
  const flightKey = params ? `${params.carrierCode}${params.flightNumber}-${params.departureDate}` : '';

  return useQuery({
    queryKey: flightKeys.delayPrediction(flightKey),
    queryFn: () => getDelayPrediction(params!),
    enabled: !!params,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// Inspiration & Discovery Hooks
// ============================================================================

/**
 * Hook to get flight destinations by budget (Inspiration Search)
 */
export function useFlightInspiration(origin: string, maxPrice?: number) {
  return useQuery({
    queryKey: flightKeys.destinations(origin, maxPrice),
    queryFn: () => getFlightDestinations(origin, maxPrice),
    enabled: !!origin && origin.length === 3,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to get direct destinations from an airport
 */
export function useDirectDestinations(airportCode: string) {
  return useQuery({
    queryKey: flightKeys.directDestinations(airportCode),
    queryFn: () => getAirportDirectDestinations(airportCode),
    enabled: !!airportCode && airportCode.length === 3,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - routes don't change often
  });
}

/**
 * Hook to get trending destinations (most booked)
 */
export function useTrendingDestinations(originCityCode: string, period: string = '2024-01') {
  return useQuery({
    queryKey: flightKeys.trending(originCityCode, period),
    queryFn: () => getAirTrafficBooked(originCityCode, period, 10),
    enabled: !!originCityCode && originCityCode.length === 3,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ============================================================================
// Post-Booking Hooks
// ============================================================================

/**
 * Hook to get real-time flight status
 */
export function useFlightStatus(
  carrierCode: string,
  flightNumber: string,
  scheduledDepartureDate: string
) {
  return useQuery({
    queryKey: flightKeys.flightStatus(carrierCode, flightNumber, scheduledDepartureDate),
    queryFn: () => getFlightStatus(carrierCode, flightNumber, scheduledDepartureDate),
    enabled: !!carrierCode && !!flightNumber && !!scheduledDepartureDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - flight status can change
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

/**
 * Hook to get airline check-in links
 */
export function useCheckinLinks(airlineCode: string) {
  return useQuery({
    queryKey: flightKeys.checkinLinks(airlineCode),
    queryFn: () => getCheckinLinks(airlineCode),
    enabled: !!airlineCode && airlineCode.length === 2,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days - checkin links rarely change
  });
}

// ============================================================================
// Geo Hooks
// ============================================================================

/**
 * Hook to get nearby airports based on geolocation
 */
export function useNearbyAirports(latitude: number | null, longitude: number | null, radius = 500) {
  return useQuery({
    queryKey: flightKeys.nearbyAirports(latitude ?? 0, longitude ?? 0),
    queryFn: () => getAirportsByGeocode(latitude!, longitude!, radius),
    enabled: latitude !== null && longitude !== null,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

