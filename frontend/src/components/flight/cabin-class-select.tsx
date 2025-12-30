import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelClass } from '@/types/flight';

// ============================================================================
// Cabin Class Select Component - Custom dropdown with proper styling
// ============================================================================

interface CabinClassSelectProps {
  value: TravelClass;
  onChange: (value: TravelClass) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

const CABIN_CLASSES: { value: TravelClass; label: string }[] = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
  { value: 'BUSINESS', label: 'Business Class' },
  { value: 'FIRST', label: 'First Class' },
];

export function CabinClassSelect({
  value,
  onChange,
  label,
  className,
  compact = false,
}: CabinClassSelectProps) {
  const selectedCabin = CABIN_CLASSES.find((c) => c.value === value) || CABIN_CLASSES[0];

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}

      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <ListboxButton
            className={cn(
              'relative w-full cursor-pointer text-left text-sm transition-all duration-150',
              compact
                ? 'rounded-lg border-0 bg-white/60 dark:bg-neutral-700/40 pl-3 pr-8 py-2 hover:bg-white hover:shadow-sm dark:hover:bg-neutral-700 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:focus:bg-neutral-700'
                : 'rounded-lg border border-neutral-300 bg-white pl-3 pr-10 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-neutral-600 dark:bg-neutral-900',
              'focus:outline-none dark:text-white'
            )}
          >
            <span className="block truncate">{selectedCabin.label}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className={cn(
                'text-neutral-400',
                compact ? 'h-4 w-4' : 'h-5 w-5'
              )} />
            </span>
          </ListboxButton>

          <ListboxOptions
            anchor="bottom end"
            className="z-50 mt-1 max-h-60 min-w-max overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-neutral-800 dark:ring-white/10 [--anchor-gap:4px] [--anchor-padding:8px]"
          >
            {CABIN_CLASSES.map((cabin) => (
              <ListboxOption
                key={cabin.value}
                value={cabin.value}
                className={({ focus, selected }) =>
                  cn(
                    'cursor-pointer select-none px-4 py-2.5 transition-colors',
                    focus && 'bg-pink-50 dark:bg-pink-900/30',
                    selected ? 'text-pink-600 font-medium dark:text-pink-400' : 'text-neutral-700 dark:text-neutral-200'
                  )
                }
              >
                {cabin.label}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
}

