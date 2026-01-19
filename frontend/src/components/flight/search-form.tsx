'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Search, Plus, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { AirportCombobox } from './airport-combobox';
import { FlightDatePicker, SingleFlightDatePicker, type DateRange } from './flight-date-picker';
import { PassengerSelector } from './passenger-selector';
import { CabinClassSelect } from './cabin-class-select';
import { TripTypeToggle, type TripType } from './trip-type-toggle';
import { useSearchStore } from '@/stores/search-store';
import { useFlightSearch } from '@/hooks/use-flights';
import { cn } from '@/lib/utils';

// ============================================================================
// Search Form Component - Complete Flight Search
// ============================================================================

interface SearchFormProps {
  onSearch?: () => void;
  onSearchComplete?: () => void;
  className?: string;
}

export function SearchForm({ onSearch, onSearchComplete, className }: SearchFormProps) {
  const store = useSearchStore();
  const router = useRouter();
  const { mutate: searchFlights, isPending } = useFlightSearch();

  // Memoize the date range value to prevent re-renders
  const dateRangeValue = useMemo<DateRange | undefined>(() => ({
    from: store.departureDate ?? undefined,
    to: store.returnDate ?? undefined,
  }), [store.departureDate, store.returnDate]);

  // Memoize the onChange handler
  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    store.setDepartureDate(range?.from);
    store.setReturnDate(range?.to);
  }, [store]);

  const handleSearch = () => {
    const request = store.getSearchRequest();
    if (!request) return;

    // Call onSearch immediately to navigate to results page
    onSearch?.();

    // Navigate to results page
    router.push('/results');

    searchFlights(request, {
      onSuccess: (data) => {
        store.setSearchResults(data.data);
        onSearchComplete?.();
      },
    });
  };

  const handleSwapLocations = () => {
    store.swapLocations();
  };

  // Initialize with one additional leg when switching to multicity
  useEffect(() => {
    if (store.tripType === 'multicity' && store.additionalLegs.length === 0) {
      store.addLeg();
    }
  }, [store.tripType, store.additionalLegs.length, store]);

  return (
    <div className={cn('space-y-5', className)}>
      {/* Top Row: Trip Type + Passengers + Class */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex justify-center">
          <TripTypeToggle
            value={store.tripType}
            onChange={(type) => store.setTripType(type as TripType)}
          />
        </div>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex items-center justify-center gap-2">
          <PassengerSelector
            value={{
              adults: store.adults,
              children: store.children,
              infants: store.infants,
            }}
            onChange={(passengers) => {
              store.setAdults(passengers.adults);
              store.setChildren(passengers.children);
              store.setInfants(passengers.infants);
            }}
            compact
          />
          <CabinClassSelect
            value={store.travelClass}
            onChange={(value) => store.setTravelClass(value)}
            compact
          />
        </div>
      </div>

      {/* Main Search Bar - Modern unified design */}
      {store.tripType !== 'multicity' ? (
        // Standard layout for roundtrip/oneway
        <div className="relative rounded-2xl bg-muted p-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
            {/* Origin & Destination Group */}
            <div className="relative flex flex-1 flex-col gap-3 md:flex-row md:gap-0">
              <div className="flex-1">
                <AirportCombobox
                  value={store.origin}
                  valueName={store.originName}
                  onChange={(code, name) => {
                    store.setOrigin(code);
                    store.setOriginName(name);
                  }}
                  placeholder="Von wo?"
                  icon="departure"
                  compact
                />
              </div>

              {/* Swap Button - Between fields on mobile, inline on desktop */}
              <div className="flex justify-center md:px-1">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-all active:scale-95 hover:bg-accent hover:shadow"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1">
                <AirportCombobox
                  value={store.destination}
                  valueName={store.destinationName}
                  onChange={(code, name) => {
                    store.setDestination(code);
                    store.setDestinationName(name);
                  }}
                  placeholder="Wohin?"
                  icon="arrival"
                  compact
                />
              </div>
            </div>

            <div className="hidden h-10 w-px bg-border md:mx-2 md:block" />

            <div className="flex-1 md:max-w-xs">
              <FlightDatePicker
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                tripType={store.tripType as 'roundtrip' | 'oneway'}
                onTripTypeChange={(type) => store.setTripType(type)}
                origin={store.origin}
                destination={store.destination}
                showTripTypeSelector
                compact
              />
            </div>

            <div className="md:ml-2">
              <Button
                size="lg"
                className="w-full gap-2 rounded-xl bg-primary px-6 hover:bg-primary/90 md:w-auto"
                onClick={handleSearch}
                disabled={isPending || !store.origin || !store.destination || !store.departureDate}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <span className="md:hidden lg:inline">Suchen</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Multi-City layout
        <div className="space-y-3">
          {/* First Segment (main) */}
          <div className="relative rounded-2xl bg-muted p-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
              <div className="relative flex flex-1 flex-col gap-3 md:flex-row md:gap-0">
                <div className="flex-1">
                  <AirportCombobox
                    value={store.origin}
                    valueName={store.originName}
                    onChange={(code, name) => {
                      store.setOrigin(code);
                      store.setOriginName(name);
                    }}
                    placeholder="Von wo?"
                    icon="departure"
                    compact
                  />
                </div>

                <div className="flex justify-center md:px-1">
                  <div className="flex h-8 w-8 items-center justify-center text-base text-muted-foreground">
                    →
                  </div>
                </div>

                <div className="flex-1">
                  <AirportCombobox
                    value={store.destination}
                    valueName={store.destinationName}
                    onChange={(code, name) => {
                      store.setDestination(code);
                      store.setDestinationName(name);
                    }}
                    placeholder="Wohin?"
                    icon="arrival"
                    compact
                  />
                </div>
              </div>

              <div className="hidden h-10 w-px bg-border md:mx-2 md:block" />

              <div className="w-full md:w-40">
                <SingleFlightDatePicker
                  value={store.departureDate ?? undefined}
                  onChange={(date) => store.setDepartureDate(date)}
                  placeholder="Datum"
                  compact
                />
              </div>

              {/* Placeholder for alignment */}
              <div className="hidden w-10 md:block" />
            </div>
          </div>

          {/* Additional Segments */}
          <AnimatePresence>
            {store.additionalLegs.map((leg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative rounded-2xl bg-muted p-2"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
                  <div className="relative flex flex-1 flex-col gap-3 md:flex-row md:gap-0">
                    <div className="flex-1">
                      <AirportCombobox
                        value={leg.origin}
                        valueName={leg.originName}
                        onChange={(code, name) => store.updateLeg(index, { origin: code, originName: name })}
                        placeholder="Von wo?"
                        icon="departure"
                        compact
                      />
                    </div>

                    <div className="flex justify-center md:px-1">
                      <div className="flex h-8 w-8 items-center justify-center text-base text-muted-foreground">
                        →
                      </div>
                    </div>

                    <div className="flex-1">
                      <AirportCombobox
                        value={leg.destination}
                        valueName={leg.destinationName}
                        onChange={(code, name) => store.updateLeg(index, { destination: code, destinationName: name })}
                        placeholder="Wohin?"
                        icon="arrival"
                        compact
                      />
                    </div>
                  </div>

                  <div className="hidden h-10 w-px bg-border md:mx-2 md:block" />

                  <div className="w-full md:w-40">
                    <SingleFlightDatePicker
                      value={leg.departureDate ?? undefined}
                      onChange={(date) => store.updateLeg(index, { departureDate: date ?? null })}
                      placeholder="Datum"
                      compact
                    />
                  </div>

                  {/* Remove button (show only if more than 1 additional leg) */}
                  <div className="flex w-full items-center justify-center md:w-10">
                    {store.additionalLegs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => store.removeLeg(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors active:scale-95 hover:bg-accent hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Segment + Search Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => store.addLeg()}
              className="flex items-center justify-center gap-2 rounded-full bg-muted px-5 py-2 text-sm font-medium text-muted-foreground transition-colors active:scale-95 hover:bg-accent hover:text-foreground sm:justify-start"
            >
              <Plus className="h-4 w-4" />
              Flug hinzufügen
            </button>

            <Button
              size="lg"
              className="w-full gap-2 rounded-xl bg-primary px-8 hover:bg-primary/90 sm:w-auto"
              onClick={handleSearch}
              disabled={isPending || !store.origin || !store.destination || !store.departureDate}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Suchen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
