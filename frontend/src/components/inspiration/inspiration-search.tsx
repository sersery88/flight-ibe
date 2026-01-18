import { memo, useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Loader2,
  MapPin,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightInspiration } from '@/hooks/use-flights';
import { DestinationCard } from './destination-card';
import type { FlightDestination } from '@/api/client';

// ============================================================================
// Inspiration Search - Find destinations by budget
// ============================================================================

interface InspirationSearchProps {
  defaultOrigin?: string;
  onSelectDestination?: (destination: FlightDestination) => void;
  className?: string;
}

const BUDGET_OPTIONS = [
  { value: 100, label: 'Bis 100€' },
  { value: 200, label: 'Bis 200€' },
  { value: 300, label: 'Bis 300€' },
  { value: 500, label: 'Bis 500€' },
  { value: 1000, label: 'Bis 1.000€' },
  { value: undefined, label: 'Alle' },
];

const POPULAR_ORIGINS = [
  { code: 'FRA', name: 'Frankfurt' },
  { code: 'MUC', name: 'München' },
  { code: 'BER', name: 'Berlin' },
  { code: 'DUS', name: 'Düsseldorf' },
  { code: 'HAM', name: 'Hamburg' },
  { code: 'STR', name: 'Stuttgart' },
  { code: 'CGN', name: 'Köln' },
  { code: 'VIE', name: 'Wien' },
  { code: 'ZRH', name: 'Zürich' },
];

export const InspirationSearch = memo(function InspirationSearch({
  defaultOrigin = 'FRA',
  onSelectDestination,
  className,
}: InspirationSearchProps) {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(300);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useFlightInspiration(origin, maxPrice);

  const destinations = useMemo(() => {
    if (!data?.data) return [];
    // Sort by price (lowest first)
    return [...data.data].sort((a, b) =>
      parseFloat(a.price.total) - parseFloat(b.price.total)
    );
  }, [data]);

  const handleOriginChange = useCallback((newOrigin: string) => {
    setOrigin(newOrigin);
  }, []);

  const handleBudgetChange = useCallback((newBudget: number | undefined) => {
    setMaxPrice(newBudget);
  }, []);

  const currentOriginName = POPULAR_ORIGINS.find(o => o.code === origin)?.name || origin;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Wohin soll es gehen?</h2>
            <p className="text-sm text-gray-500">
              Finde günstige Flüge ab {currentOriginName}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
            showFilters
              ? 'bg-primary text-white border-primary'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border bg-gray-50 dark:bg-gray-800/50 p-4 space-y-4">
          {/* Origin selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Abflughafen
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ORIGINS.map((airport) => (
                <button
                  key={airport.code}
                  onClick={() => handleOriginChange(airport.code)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    origin === airport.code
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-700 border hover:border-primary'
                  )}
                >
                  {airport.name}
                </button>
              ))}
            </div>
          </div>

          {/* Budget selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Budget (pro Person)
            </label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleBudgetChange(option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    maxPrice === option.value
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-700 border hover:border-green-600'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowFilters(false)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Filter schließen
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-500">Suche günstige Flüge...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-red-600 dark:text-red-400">
            Flugziele konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && destinations.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            {destinations.length} Reiseziele gefunden
            {maxPrice && ` unter ${maxPrice}€`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {destinations.map((destination, index) => (
              <DestinationCard
                key={`${destination.destination}-${destination.departureDate}-${index}`}
                destination={destination}
                onSelect={onSelectDestination}
              />
            ))}
          </div>
        </>
      )}

      {/* No results */}
      {!isLoading && !error && destinations.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Keine Flugziele für dieses Budget gefunden.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Versuchen Sie einen höheren Budgetrahmen.
          </p>
        </div>
      )}
    </div>
  );
});

export default InspirationSearch;
