'use client';

import { cn } from '@/lib/utils';

// ============================================================================
// Trip Type Toggle Component
// ============================================================================

export type TripType = 'roundtrip' | 'oneway' | 'multicity';

interface TripTypeToggleProps {
  value: TripType;
  onChange: (value: TripType) => void;
  className?: string;
}

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'roundtrip', label: 'Hin & Zurück' },
  { value: 'oneway', label: 'Nur Hinflug' },
  { value: 'multicity', label: 'Gabelflug' },
];

export function TripTypeToggle({ value, onChange, className }: TripTypeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-full bg-muted p-1',
        className
      )}
    >
      {TRIP_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            value === type.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
