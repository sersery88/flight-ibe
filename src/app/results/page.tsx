'use client';

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Plane as PlaneIcon, Search, ArrowRightLeft, Edit2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FlightList } from '@/components/flight/flight-list';
import { FilterSidebar, type FlightFilters } from '@/components/flight/filter-sidebar';
import { SortTabs, type SortTabOption, calculateBestScore } from '@/components/flight/sort-tabs';
import { AirportCombobox } from '@/components/flight/airport-combobox';
import { SingleFlightDatePicker, FlightDatePicker, type DateRange } from '@/components/flight/flight-date-picker';
import { PassengerSelector } from '@/components/flight/passenger-selector';
import { CabinClassSelect } from '@/components/flight/cabin-class-select';
import { SearchForm } from '@/components/flight/search-form';
import { useSearchStore } from '@/stores/search-store';
import { useBookingStore } from '@/stores/booking-store';
import { useFlightSearch } from '@/hooks/use-flights';
import type { FlightOffer } from '@/types/flight';
import { cn, parseDuration } from '@/lib/utils';
import { formatAirportName } from '@/lib/airports';

// Helper to format date
function formatSearchDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

// ============================================================================
// Results Page Content
// ============================================================================

function ResultsContent() {
  const router = useRouter();
  const store = useSearchStore();
  const {
    searchResults,
    isSearching,
    origin,
    destination,
    originName,
    destinationName,
    departureDate,
    returnDate,
    adults,
    children,
    infants,
    travelClass,
    tripType,
  } = store;
  const { setSelectedOffer: setBookingOffer, reset: resetBooking } = useBookingStore();
  const { mutate: searchFlights, isPending: isSearchPending } = useFlightSearch();

  // State for mobile search form popup
  const [showSearchForm, setShowSearchForm] = useState(false);
  // State for mobile filter sheet
  const [showFilters, setShowFilters] = useState(false);

  // Block body scroll when popup is open
  useEffect(() => {
    if (showSearchForm || showFilters) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showSearchForm, showFilters]);

  // Date range for picker (Desktop only)
  const dateRangeValue = useMemo<DateRange | undefined>(() => ({
    from: departureDate ?? undefined,
    to: returnDate ?? undefined,
  }), [departureDate, returnDate]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    store.setDepartureDate(range?.from);
    store.setReturnDate(range?.to);
  }, [store]);

  const handleSwapLocations = () => {
    store.swapLocations();
  };

  const handleSearch = () => {
    const request = store.getSearchRequest();
    if (!request) return;
    searchFlights(request, {
      onSuccess: (data) => {
        store.setSearchResults(data.data);
      },
    });
    setShowSearchForm(false); // Close mobile popup after search
  };

  const [sortBy, setSortBy] = useState<SortTabOption>('best');
  const [filters, setFilters] = useState<FlightFilters>({
    stops: [],
    airlines: [],
    priceRange: [0, 10000],
    outboundDepartureTime: [0, 24],
    outboundArrivalTime: [0, 24],
    returnDepartureTime: [0, 24],
    returnArrivalTime: [0, 24],
    durationRange: [0, 2880],
    transitAirports: [],
  });
  const [selectedOfferId, setSelectedOfferId] = useState<string>();

  // Filter offers
  const filteredOffers = useMemo(() => {
    return searchResults.filter((offer) => {
      // Filter by stops
      if (filters.stops.length > 0) {
        const stops = offer.itineraries[0].segments.length - 1;
        const stopCategory = stops >= 2 ? 2 : stops;
        if (!filters.stops.includes(stopCategory)) return false;
      }

      // Filter by airlines (main carrier)
      if (filters.airlines.length > 0) {
        const mainCarrier = offer.validatingAirlineCodes?.[0] || offer.itineraries[0].segments[0].carrierCode;
        if (!filters.airlines.includes(mainCarrier)) return false;
      }

      // Filter by price
      const price = parseFloat(offer.price.total);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

      // Filter by outbound departure time
      if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) {
        const depTime = new Date(offer.itineraries[0].segments[0].departure.at);
        const hour = depTime.getHours();
        if (hour < filters.outboundDepartureTime[0] || hour >= filters.outboundDepartureTime[1]) {
          return false;
        }
      }

      // Filter by outbound arrival time
      if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) {
        const lastSegment = offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];
        const arrTime = new Date(lastSegment.arrival.at);
        const hour = arrTime.getHours();
        if (hour < filters.outboundArrivalTime[0] || hour >= filters.outboundArrivalTime[1]) {
          return false;
        }
      }

      // Filter by return departure time
      if (offer.itineraries.length > 1 && (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24)) {
        const depTime = new Date(offer.itineraries[1].segments[0].departure.at);
        const hour = depTime.getHours();
        if (hour < filters.returnDepartureTime[0] || hour >= filters.returnDepartureTime[1]) {
          return false;
        }
      }

      // Filter by return arrival time
      if (offer.itineraries.length > 1 && (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24)) {
        const lastSegment = offer.itineraries[1].segments[offer.itineraries[1].segments.length - 1];
        const arrTime = new Date(lastSegment.arrival.at);
        const hour = arrTime.getHours();
        if (hour < filters.returnArrivalTime[0] || hour >= filters.returnArrivalTime[1]) {
          return false;
        }
      }

      // Filter by duration
      if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) {
        const duration = parseDuration(offer.itineraries[0].duration);
        if (duration < filters.durationRange[0] || duration > filters.durationRange[1]) {
          return false;
        }
      }

      // Filter by transit airports
      if (filters.transitAirports.length > 0) {
        const transitCodes = offer.itineraries.flatMap((it) =>
          it.segments.slice(0, -1).map((s) => s.arrival.iataCode)
        );
        if (!filters.transitAirports.some((a) => transitCodes.includes(a))) return false;
      }

      return true;
    });
  }, [searchResults, filters]);

  // Sort offers using Kayak-style sorting
  const sortedOffers = useMemo(() => {
    const sorted = [...filteredOffers];

    // Calculate min/max for "best" score normalization
    const prices = sorted.map((o) => parseFloat(o.price.total));
    const durations = sorted.map((o) =>
      o.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0)
    );
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

    switch (sortBy) {
      case 'cheapest':
        sorted.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
        break;
      case 'fastest':
        sorted.sort((a, b) => {
          const durationA = a.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
          const durationB = b.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
          return durationA - durationB;
        });
        break;
      case 'best':
        sorted.sort((a, b) => {
          const scoreA = calculateBestScore(a, minPrice, maxPrice, minDuration, maxDuration);
          const scoreB = calculateBestScore(b, minPrice, maxPrice, minDuration, maxDuration);
          return scoreA - scoreB;
        });
        break;
    }

    return sorted;
  }, [filteredOffers, sortBy]);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.stops.length > 0) count++;
    if (filters.airlines.length > 0) count++;
    if (filters.transitAirports.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
    if (filters.durationRange[0] > 0 || filters.durationRange[1] < 2880) count++;
    if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) count++;
    if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) count++;
    if (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24) count++;
    if (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24) count++;
    return count;
  }, [filters]);

  const handleSelectOffer = (offer: FlightOffer) => {
    setSelectedOfferId(offer.id);
    resetBooking();
    setBookingOffer(offer);
    store.setSelectedOffer(offer);
    // Navigate to booking page
    router.push('/booking');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Compact Search Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">

            {/* MOBILE: Compact Search Summary - Click to open popup */}
            <button
              onClick={() => setShowSearchForm(true)}
              className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2 text-left transition-all hover:bg-muted lg:hidden overflow-hidden"
            >
              {/* Top Row: Route and Edit Icon */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <PlaneIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {originName || formatAirportName(origin) || '???'} → {destinationName || formatAirportName(destination) || '???'}
                  </span>
                </div>
                <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              {/* Bottom Row: Dates, Passengers, and Cabin Class */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {departureDate && (
                  <>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {formatSearchDate(departureDate)}
                        {returnDate && ` - ${formatSearchDate(returnDate)}`}
                      </span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                  </>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{adults + children + infants}</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <span className="capitalize">{travelClass?.toLowerCase() || 'Economy'}</span>
              </div>
            </button>

            {/* DESKTOP: Inline Search pill container */}
            <div className="hidden lg:flex flex-1 items-center rounded-xl border border-border bg-muted/50 p-1.5 gap-1">
              {/* Origin */}
              <AirportCombobox
                value={origin}
                valueName={originName}
                onChange={(code, name) => {
                  store.setOrigin(code);
                  store.setOriginName(name);
                }}
                placeholder="Von"
                compact
                className="flex-1"
              />

              {/* Swap button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-7 w-7 rounded-full hover:bg-background transition-all"
                onClick={handleSwapLocations}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </Button>

              {/* Destination */}
              <AirportCombobox
                value={destination}
                valueName={destinationName}
                onChange={(code, name) => {
                  store.setDestination(code);
                  store.setDestinationName(name);
                }}
                placeholder="Nach"
                compact
                className="flex-1"
              />

              {/* Divider */}
              <div className="h-7 w-px bg-border shrink-0" />

              {/* Date Range */}
              {tripType === 'oneway' ? (
                <SingleFlightDatePicker
                  value={departureDate ?? undefined}
                  onChange={(date) => store.setDepartureDate(date)}
                  placeholder="Datum"
                  compact
                  className="flex-1"
                />
              ) : (
                <FlightDatePicker
                  value={dateRangeValue}
                  onChange={handleDateRangeChange}
                  origin={origin}
                  destination={destination}
                  compact
                  className="flex-1"
                />
              )}

              {/* Divider */}
              <div className="h-7 w-px bg-border shrink-0" />

              {/* Passengers */}
              <PassengerSelector
                value={{
                  adults,
                  children,
                  infants,
                }}
                onChange={(passengers) => {
                  store.setAdults(passengers.adults);
                  store.setChildren(passengers.children);
                  store.setInfants(passengers.infants);
                }}
                compact
                className="shrink-0"
              />

              {/* Divider */}
              <div className="h-7 w-px bg-border shrink-0" />

              {/* Cabin Class */}
              <CabinClassSelect
                value={travelClass}
                onChange={(value) => store.setTravelClass(value)}
                compact
                className="shrink-0"
              />

              {/* Search button */}
              <Button
                size="sm"
                className="shrink-0 gap-1.5 rounded-lg"
                onClick={handleSearch}
                disabled={isSearchPending || !origin || !destination || !departureDate}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE: Search Form Popup */}
      {showSearchForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setShowSearchForm(false)}
          />

          {/* Popup Container */}
          <div className="fixed inset-0 z-50 overflow-y-auto lg:hidden">
            <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-8">
              <div className="w-full max-w-4xl rounded-2xl bg-background shadow-2xl my-8">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border px-6 py-4 rounded-t-2xl">
                  <h2 className="text-lg font-semibold">
                    Suche anpassen
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearchForm(false)}
                    className="shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Search Form */}
                <div className="p-6 pb-48">
                  <SearchForm onSearch={handleSearch} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="hidden w-72 shrink-0 lg:block">
              <FilterSidebar
                offers={searchResults}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </aside>

            {/* Results */}
            <main className="flex-1">
              {/* Sort Tabs */}
              <SortTabs
                value={sortBy}
                onChange={setSortBy}
                offers={filteredOffers}
                className="mb-4 rounded-lg bg-card border border-border overflow-hidden"
              />

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="lg:hidden mb-4 w-full gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              <FlightList
                offers={sortedOffers}
                isLoading={isSearching}
                selectedOfferId={selectedOfferId}
                onSelectOffer={handleSelectOffer}
              />
            </main>
          </div>
        </div>
      </div>

      {/* MOBILE: Filter Sheet */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setShowFilters(false)}
          />

          {/* Filter Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
            <div className="flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-2xl">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default">{activeFilterCount}</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <FilterSidebar
                  offers={searchResults}
                  filters={filters}
                  onFiltersChange={setFilters}
                  className="border-0 p-0"
                />
              </div>

              {/* Footer with Apply Button */}
              <div className="shrink-0 border-t border-border p-4">
                <Button
                  className="w-full"
                  onClick={() => setShowFilters(false)}
                >
                  {filteredOffers.length} Ergebnisse anzeigen
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Results Page
// ============================================================================

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
          <Skeleton className="h-14 w-full" />
          <div className="flex gap-6">
            <Skeleton className="hidden lg:block w-72 h-96 shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
