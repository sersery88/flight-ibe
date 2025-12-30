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
        'inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800',
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
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

