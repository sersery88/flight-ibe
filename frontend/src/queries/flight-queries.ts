import { queryOptions } from '@tanstack/react-query';
import {
  searchLocations,
  getSeatmaps,
  getBooking,
  getFlightDates,
} from '@/lib/api-client';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Query Keys (centralized)
// ============================================================================

export const flightKeys = {
  all: ['flights'] as const,
  search: (params: unknown) => [...flightKeys.all, 'search', params] as const,
  price: (offerIds: string[]) => [...flightKeys.all, 'price', offerIds] as const,
  seatmaps: (offerIds: string[]) => [...flightKeys.all, 'seatmaps', offerIds] as const,
  booking: (orderId: string) => [...flightKeys.all, 'booking', orderId] as const,
  locations: (keyword: string) => ['locations', keyword] as const,
  dates: (origin: string, destination: string) => [...flightKeys.all, 'dates', origin, destination] as const,
};

// ============================================================================
// Type-safe queryOptions factories
// ============================================================================

export const flightQueries = {
  locations: (keyword: string) =>
    queryOptions({
      queryKey: flightKeys.locations(keyword),
      queryFn: () => searchLocations(keyword),
      enabled: keyword.length >= 2,
      staleTime: 60_000,
    }),

  seatmaps: (offers: FlightOffer[]) =>
    queryOptions({
      queryKey: flightKeys.seatmaps(offers.map((o) => o.id)),
      queryFn: () => getSeatmaps(offers),
      enabled: offers.length > 0,
      staleTime: 5 * 60_000,
    }),

  booking: (orderId: string) =>
    queryOptions({
      queryKey: flightKeys.booking(orderId),
      queryFn: () => getBooking(orderId),
      enabled: !!orderId,
    }),

  dates: (origin: string, destination: string, enabled = true) =>
    queryOptions({
      queryKey: flightKeys.dates(origin, destination),
      queryFn: () => getFlightDates(origin, destination),
      enabled: enabled && !!origin && !!destination,
      staleTime: 5 * 60_000,
    }),

  // Stub queries (TODO: implement)
  directDestinations: (origin: string) =>
    queryOptions({
      queryKey: ['direct-destinations', origin] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),

  flightInspiration: (origin: string) =>
    queryOptions({
      queryKey: ['flight-inspiration', origin] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),

  trendingDestinations: () =>
    queryOptions({
      queryKey: ['trending-destinations'] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),

  checkinLinks: (airlineCode: string) =>
    queryOptions({
      queryKey: ['checkin-links', airlineCode] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),

  flightStatus: (carrierCode: string, flightNumber: string, date: string) =>
    queryOptions({
      queryKey: ['flight-status', carrierCode, flightNumber, date] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),

  priceMetrics: (origin: string, destination: string, date: string) =>
    queryOptions({
      queryKey: ['price-metrics', origin, destination, date] as const,
      queryFn: () => Promise.resolve({ data: [] }),
      enabled: false,
    }),
};
