'use client';

import { useState, useMemo } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, Luggage, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, parseDuration, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import type { FlightOffer } from '@/types/flight';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';

// ============================================================================
// Filter Sidebar Component - Filter flight results
// ============================================================================

export interface FlightFilters {
  stops: number[];         // 0 = direct, 1 = 1 stop, 2 = 2+ stops
  airlines: string[];      // Carrier codes
  priceRange: [number, number];
  outboundDepartureTime: [number, number]; // Hours 0-24 for outbound
  outboundArrivalTime: [number, number];   // Hours 0-24 for outbound
  returnDepartureTime: [number, number];   // Hours 0-24 for return
  returnArrivalTime: [number, number];     // Hours 0-24 for return
  durationRange: [number, number];         // Minutes
  transitAirports: string[];               // Via airports
}

// Format hour as time string
const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

// ============================================================================
// Dual Range Slider Component using Base UI
// ============================================================================

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
}

function DualRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel = (v) => v.toString(),
}: DualRangeSliderProps) {
  return (
    <div className="space-y-3">
      <Slider
        value={value}
        onValueChange={(val) => onChange(val as [number, number])}
        min={min}
        max={max}
        step={step}
      />
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatLabel(value[0])}</span>
        <span>bis {formatLabel(value[1])}</span>
      </div>
    </div>
  );
}

interface FilterSidebarProps {
  offers: FlightOffer[];
  filters: FlightFilters;
  onFiltersChange: (filters: FlightFilters) => void;
  className?: string;
}

const DEFAULT_FILTERS: FlightFilters = {
  stops: [],
  airlines: [],
  priceRange: [0, 10000],
  outboundDepartureTime: [0, 24],
  outboundArrivalTime: [0, 24],
  returnDepartureTime: [0, 24],
  returnArrivalTime: [0, 24],
  durationRange: [0, 2880],
  transitAirports: [],
};

// Check if offer has checked baggage included
function hasCheckedBaggage(offer: FlightOffer): boolean {
  const fareDetails = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
  const bags = fareDetails?.includedCheckedBags;
  return !!(bags?.weight || bags?.quantity);
}

export function FilterSidebar({ offers, filters, onFiltersChange, className }: FilterSidebarProps) {
  // Check if we have return flights
  const hasReturnFlight = offers.length > 0 && offers[0].itineraries.length > 1;

  // Helper to get main carrier for an offer
  const getMainCarrier = (offer: FlightOffer): string => {
    // First check validatingAirlineCodes
    if (offer.validatingAirlineCodes && offer.validatingAirlineCodes.length > 0) {
      return offer.validatingAirlineCodes[0];
    }
    // Fallback to first segment carrier
    return offer.itineraries[0].segments[0].carrierCode;
  };

  // Extract airlines with min price - track by offer ID to avoid counting same offer multiple times
  const airlines = useMemo(() => {
    const airlineMap = new Map<string, { offerIds: Set<string>; minPrice: number }>();
    offers.forEach((offer) => {
      const price = parseFloat(offer.price.total);
      const mainCarrier = getMainCarrier(offer);
      const existing = airlineMap.get(mainCarrier);
      if (!existing) {
        airlineMap.set(mainCarrier, { offerIds: new Set([offer.id]), minPrice: price });
      } else {
        existing.offerIds.add(offer.id);
        existing.minPrice = Math.min(existing.minPrice, price);
      }
    });
    const result = Array.from(airlineMap.entries())
      .map(([code, data]) => ({ code, count: data.offerIds.size, minPrice: data.minPrice }))
      .sort((a, b) => a.minPrice - b.minPrice);

    return result;
  }, [offers]);

  // Extract stop counts
  const stopOptions = useMemo(() => {
    const stopSet = new Map<number, number>();
    offers.forEach((offer) => {
      const stops = offer.itineraries[0].segments.length - 1;
      const category = stops >= 2 ? 2 : stops;
      stopSet.set(category, (stopSet.get(category) || 0) + 1);
    });
    return Array.from(stopSet.entries()).sort((a, b) => a[0] - b[0]);
  }, [offers]);

  // Extract transit airports (stopover locations) - track by offer ID
  const transitAirports = useMemo(() => {
    const transitMap = new Map<string, { offerIds: Set<string>; minPrice: number }>();
    offers.forEach((offer) => {
      const price = parseFloat(offer.price.total);
      const transitCodes = new Set<string>();
      offer.itineraries.forEach((itinerary) => {
        itinerary.segments.slice(0, -1).forEach((segment) => {
          transitCodes.add(segment.arrival.iataCode);
        });
      });
      transitCodes.forEach((code) => {
        const existing = transitMap.get(code);
        if (!existing) {
          transitMap.set(code, { offerIds: new Set([offer.id]), minPrice: price });
        } else {
          existing.offerIds.add(offer.id);
          existing.minPrice = Math.min(existing.minPrice, price);
        }
      });
    });
    return Array.from(transitMap.entries())
      .map(([code, data]) => ({ code, count: data.offerIds.size, minPrice: data.minPrice }))
      .sort((a, b) => b.count - a.count);
  }, [offers]);

  // Baggage stats
  const baggageStats = useMemo(() => {
    let withBaggage = 0;
    let withoutBaggage = 0;
    offers.forEach((offer) => {
      if (hasCheckedBaggage(offer)) {
        withBaggage++;
      } else {
        withoutBaggage++;
      }
    });
    return { withBaggage, withoutBaggage };
  }, [offers]);

  // Price and duration stats
  const priceStats = useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 10000, currency: 'EUR' };
    const prices = offers.map((o) => parseFloat(o.price.total));
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
      currency: offers[0]?.price.currency || 'EUR',
    };
  }, [offers]);

  const durationStats = useMemo(() => {
    if (offers.length === 0) return { min: 0, max: 2880 };
    const durations = offers.flatMap((o) =>
      o.itineraries.map((it) => parseDuration(it.duration))
    );
    return {
      min: Math.floor(Math.min(...durations)),
      max: Math.ceil(Math.max(...durations)),
    };
  }, [offers]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.stops.length > 0) count++;
    if (filters.airlines.length > 0) count++;
    if (filters.transitAirports.length > 0) count++;
    if (filters.priceRange[0] > priceStats.min || filters.priceRange[1] < priceStats.max) count++;
    if (filters.durationRange[0] > durationStats.min || filters.durationRange[1] < durationStats.max) count++;
    if (filters.outboundDepartureTime[0] > 0 || filters.outboundDepartureTime[1] < 24) count++;
    if (filters.outboundArrivalTime[0] > 0 || filters.outboundArrivalTime[1] < 24) count++;
    if (hasReturnFlight && (filters.returnDepartureTime[0] > 0 || filters.returnDepartureTime[1] < 24)) count++;
    if (hasReturnFlight && (filters.returnArrivalTime[0] > 0 || filters.returnArrivalTime[1] < 24)) count++;
    return count;
  }, [filters, priceStats, durationStats, hasReturnFlight]);

  const clearFilters = () => {
    onFiltersChange({
      ...DEFAULT_FILTERS,
      priceRange: [priceStats.min, priceStats.max],
      durationRange: [durationStats.min, durationStats.max],
    });
  };

  const toggleStop = (stop: number) => {
    const newStops = filters.stops.includes(stop)
      ? filters.stops.filter((s) => s !== stop)
      : [...filters.stops, stop];
    onFiltersChange({ ...filters, stops: newStops });
  };

  const toggleAirline = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    onFiltersChange({ ...filters, airlines: newAirlines });
  };

  const toggleTransitAirport = (code: string) => {
    const newTransit = filters.transitAirports.includes(code)
      ? filters.transitAirports.filter((a) => a !== code)
      : [...filters.transitAirports, code];
    onFiltersChange({ ...filters, transitAirports: newTransit });
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="default">{activeFilterCount}</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Stops Filter */}
      {stopOptions.length > 0 && (
        <FilterSection title="Stopps">
          <div className="space-y-2">
            {stopOptions.map(([stop, count]) => (
              <label
                key={stop}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={filters.stops.includes(stop)}
                  onChange={() => toggleStop(stop)}
                  className="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
                />
                <span className="flex-1">
                  {stop === 0 ? 'Direkt' : stop === 1 ? '1 Stopp' : '2+ Stopps'}
                </span>
                <span className="text-muted-foreground">({count})</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Baggage Info */}
      {(baggageStats.withBaggage > 0 || baggageStats.withoutBaggage > 0) && (
        <FilterSection title="Gepäck">
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              <Luggage className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>
                Gepäck-Optionen variieren je nach Tarif. Klicken Sie auf "Weitere Tarife" bei einem Flug,
                um alle Tarife mit/ohne Freigepäck zu sehen.
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Luggage className="h-3 w-3 text-green-500" />
                <span>{baggageStats.withBaggage} Angebote mit Freigepäck im Basistarif</span>
              </div>
              <div className="flex items-center gap-2">
                <Luggage className="h-3 w-3 text-muted-foreground" />
                <span>{baggageStats.withoutBaggage} Angebote nur mit Handgepäck im Basistarif</span>
              </div>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Hinflug Zeiten */}
      <FilterSection title="Hinflug Zeiten" defaultOpen={false}>
        <div className="space-y-4">
          {/* Outbound Departure */}
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Abflug</div>
            <DualRangeSlider
              min={0}
              max={24}
              step={1}
              value={filters.outboundDepartureTime}
              onChange={(val) => onFiltersChange({ ...filters, outboundDepartureTime: val })}
              formatLabel={formatHour}
            />
          </div>
          {/* Outbound Arrival */}
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Ankunft</div>
            <DualRangeSlider
              min={0}
              max={24}
              step={1}
              value={filters.outboundArrivalTime}
              onChange={(val) => onFiltersChange({ ...filters, outboundArrivalTime: val })}
              formatLabel={formatHour}
            />
          </div>
        </div>
      </FilterSection>

      {/* Rückflug Zeiten - nur bei Hin- und Rückflug */}
      {hasReturnFlight && (
        <FilterSection title="Rückflug Zeiten" defaultOpen={false}>
          <div className="space-y-4">
            {/* Return Departure */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Abflug</div>
              <DualRangeSlider
                min={0}
                max={24}
                step={1}
                value={filters.returnDepartureTime}
                onChange={(val) => onFiltersChange({ ...filters, returnDepartureTime: val })}
                formatLabel={formatHour}
              />
            </div>
            {/* Return Arrival */}
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Ankunft</div>
              <DualRangeSlider
                min={0}
                max={24}
                step={1}
                value={filters.returnArrivalTime}
                onChange={(val) => onFiltersChange({ ...filters, returnArrivalTime: val })}
                formatLabel={formatHour}
              />
            </div>
          </div>
        </FilterSection>
      )}

      {/* Transit Airports Filter */}
      {transitAirports.length > 0 && (
        <FilterSection title="Umstieg via" defaultOpen={false}>
          <div className="space-y-2">
            {transitAirports.map((airport) => (
              <label key={airport.code} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.transitAirports.includes(airport.code)}
                  onChange={() => toggleTransitAirport(airport.code)}
                  className="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
                />
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="flex-1">
                  <span className="font-medium">{airport.code}</span>
                  <span className="ml-1.5 text-muted-foreground">{formatAirportName(airport.code, 'both')}</span>
                </span>
                <span className="text-muted-foreground">({airport.count})</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Duration Filter */}
      {durationStats.max > durationStats.min && (
        <FilterSection title="Flugdauer" defaultOpen={false}>
          <div className="space-y-3">
            <Slider
              min={durationStats.min}
              max={durationStats.max}
              value={[filters.durationRange[1]]}
              onValueChange={(val) => {
                const newVal = Array.isArray(val) ? val[0] : val;
                onFiltersChange({
                  ...filters,
                  durationRange: [filters.durationRange[0], newVal]
                });
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatDuration(`PT${Math.floor(filters.durationRange[0] / 60)}H${filters.durationRange[0] % 60}M`)}</span>
              <span>max. {formatDuration(`PT${Math.floor(filters.durationRange[1] / 60)}H${filters.durationRange[1] % 60}M`)}</span>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Airlines Filter */}
      {airlines.length > 0 && (
        <FilterSection title="Airlines" defaultOpen={false}>
          <div className="space-y-2">
            {airlines.map((airline) => (
              <label key={airline.code} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.airlines.includes(airline.code)}
                  onChange={() => toggleAirline(airline.code)}
                  className="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
                />
                <span className="flex-1">
                  {formatAirlineName(airline.code)}
                </span>
                <span className="whitespace-nowrap text-xs text-primary">
                  ab {formatCurrency(airline.minPrice, priceStats.currency)}
                </span>
                <span className="text-muted-foreground">({airline.count})</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price Range */}
      {priceStats.max > priceStats.min && (
        <FilterSection title="Preis">
          <div className="space-y-3">
            <Slider
              min={priceStats.min}
              max={priceStats.max}
              value={[filters.priceRange[1]]}
              onValueChange={(val) => {
                const newVal = Array.isArray(val) ? val[0] : val;
                onFiltersChange({ ...filters, priceRange: [filters.priceRange[0], newVal] });
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(filters.priceRange[0], priceStats.currency)}</span>
              <span>max. {formatCurrency(filters.priceRange[1], priceStats.currency)}</span>
            </div>
          </div>
        </FilterSection>
      )}
    </div>
  );
}

// Collapsible Filter Section
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-border py-4">
      <button
        className="flex w-full items-center justify-between text-left font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
