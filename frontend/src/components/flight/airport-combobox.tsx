import { useState, useCallback, useRef, useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Plane, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocationSearch } from '@/hooks/use-flights';
import type { LocationResult } from '@/api/client';

// ============================================================================
// Airport Combobox - Autocomplete for airports and cities
// ============================================================================

interface AirportComboboxProps {
  value: string;
  valueName: string;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
  label?: string;
  icon?: 'departure' | 'arrival';
  className?: string;
  compact?: boolean;
}

export function AirportCombobox({
  value,
  valueName,
  onChange,
  placeholder = 'Flughafen suchen...',
  label,
  icon = 'departure',
  className,
  compact = false,
}: AirportComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search locations with debounce
  const { data, isLoading } = useLocationSearch(query);
  const locations = data?.data ?? [];

  // Click outside and Escape key handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = useCallback((location: LocationResult | null) => {
    if (location) {
      onChange(location.iataCode, location.name);
      setQuery('');
      setIsOpen(false);
    }
  }, [onChange]);

  const displayValue = valueName || value;

  // Only show locations from API when user types at least 2 characters
  const displayLocations = query.length >= 2 ? locations : [];

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <Combobox value={null} onChange={handleSelect}>
        <div className="relative">
          <div className={cn(
            'pointer-events-none absolute inset-y-0 left-0 flex items-center',
            compact ? 'pl-3' : 'pl-3'
          )}>
            {icon === 'departure' ? (
              <Plane className={cn('rotate-45 text-neutral-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
            ) : (
              <MapPin className={cn('text-neutral-400', compact ? 'h-4 w-4' : 'h-5 w-5')} />
            )}
          </div>

          <ComboboxInput
            ref={inputRef}
            className={cn(
              'w-full text-sm transition-all duration-150 cursor-pointer truncate',
              compact
                ? 'rounded-lg border-0 bg-white/60 dark:bg-neutral-700/40 py-3 pl-9 pr-3 hover:bg-white hover:shadow-sm dark:hover:bg-neutral-700 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:focus:bg-neutral-700 sm:py-2.5'
                : 'rounded-lg border border-neutral-300 bg-white py-3 pl-10 pr-4 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-neutral-600 dark:bg-neutral-900',
              'placeholder:text-neutral-400 focus:outline-none dark:text-white dark:placeholder:text-neutral-500'
            )}
            placeholder={placeholder}
            displayValue={() => displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />

          {isLoading && (
            <div className={cn('absolute inset-y-0 right-0 flex items-center', compact ? 'pr-2' : 'pr-3')}>
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        {isOpen && (
          <ComboboxOptions
            static
            anchor="bottom start"
            className={cn(
              'z-50 mt-1 min-w-[280px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg',
              'dark:border-neutral-700 dark:bg-neutral-900',
              '[--anchor-gap:4px] [--anchor-padding:8px]'
            )}
          >
            {query.length < 2 ? (
              <div className="px-4 py-3 text-sm text-neutral-500">
                Mindestens 2 Zeichen eingeben...
              </div>
            ) : displayLocations.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-500">
                Keine Ergebnisse gefunden
              </div>
            ) : (
              displayLocations.map((location, index) => (
                <ComboboxOption
                  key={`${location.iataCode}-${location.name}-${index}`}
                  value={location}
                  className={({ focus }) =>
                    cn(
                      'flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-pink-100 dark:active:bg-pink-900/40 sm:px-3 sm:py-2',
                      focus ? 'bg-pink-50 dark:bg-pink-900/30' : ''
                    )
                  }
                >
                  <div className="flex h-10 w-12 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 sm:h-9">
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      {location.iataCode}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {location.name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {location.subType === 'CITY' ? 'Stadt' : 'Flughafen'}
                    </div>
                  </div>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        )}
      </Combobox>
    </div>
  );
}

