'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plane, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocationSearch } from '@/hooks/use-flights';
import type { LocationResult } from '@/lib/api-client';

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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search locations with debounce
  const { data, isLoading } = useLocationSearch(query);
  const locations = data?.data ?? [];

  // Only show locations from API when user types at least 2 characters
  const displayLocations = query.length >= 2 ? locations : [];

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

  // Reset highlighted index when locations change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [displayLocations.length]);

  const handleSelect = useCallback((location: LocationResult) => {
    onChange(location.iataCode, location.name);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || displayLocations.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, displayLocations.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (displayLocations[highlightedIndex]) {
          handleSelect(displayLocations[highlightedIndex]);
        }
        break;
    }
  }, [isOpen, displayLocations, highlightedIndex, handleSelect]);

  const displayValue = valueName || value;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <div className={cn(
          'pointer-events-none absolute inset-y-0 left-0 flex items-center',
          compact ? 'pl-3' : 'pl-3'
        )}>
          {icon === 'departure' ? (
            <Plane className={cn('rotate-45 text-muted-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          ) : (
            <MapPin className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          className={cn(
            'w-full text-sm transition-all duration-150 cursor-text truncate',
            compact
              ? 'rounded-lg border-0 bg-background/60 py-3 pl-9 pr-3 hover:bg-background hover:shadow-sm focus:bg-background focus:shadow-md focus:ring-2 focus:ring-primary/50 sm:py-2.5'
              : 'rounded-lg border border-border bg-background py-3 pl-10 pr-4 focus:border-primary focus:ring-2 focus:ring-primary/20',
            'placeholder:text-muted-foreground focus:outline-none'
          )}
          placeholder={placeholder}
          value={isOpen ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
        />

        {isLoading && (
          <div className={cn('absolute inset-y-0 right-0 flex items-center', compact ? 'pr-2' : 'pr-3')}>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className={cn(
            'absolute left-0 right-0 z-50 mt-1 min-w-[280px] max-h-[300px] overflow-y-auto overflow-x-hidden rounded-lg border bg-popover py-1 shadow-lg'
          )}
        >
          {query.length < 2 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Mindestens 2 Zeichen eingeben...
            </div>
          ) : displayLocations.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {isLoading ? 'Suche...' : 'Keine Ergebnisse gefunden'}
            </div>
          ) : (
            displayLocations.map((location, index) => (
              <div
                key={`${location.iataCode}-${location.name}-${index}`}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors sm:px-3 sm:py-2',
                  index === highlightedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => handleSelect(location)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex h-10 w-12 flex-shrink-0 items-center justify-center rounded-md bg-muted sm:h-9">
                  <span className="text-xs font-bold text-muted-foreground">
                    {location.iataCode}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {location.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {location.subType === 'CITY' ? 'Stadt' : 'Flughafen'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
