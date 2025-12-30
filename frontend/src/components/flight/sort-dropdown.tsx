import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Sort Dropdown Component - Sort flight results
// ============================================================================

export type SortOption = 
  | 'price_asc' 
  | 'price_desc' 
  | 'duration_asc' 
  | 'departure_asc' 
  | 'arrival_asc';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'price_asc', label: 'Preis (niedrigster zuerst)' },
  { value: 'price_desc', label: 'Preis (höchster zuerst)' },
  { value: 'duration_asc', label: 'Dauer (kürzeste zuerst)' },
  { value: 'departure_asc', label: 'Abflugzeit (früheste zuerst)' },
  { value: 'arrival_asc', label: 'Ankunftszeit (früheste zuerst)' },
];

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  const selected = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={cn('relative', className)}>
        <ListboxButton
          className={cn(
            'flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500',
            'dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
          )}
        >
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <span>Sortieren: {selected.label}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </ListboxButton>
        
        <ListboxOptions
          className={cn(
            'absolute right-0 z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white py-1 shadow-xl',
            'dark:border-gray-700 dark:bg-gray-900'
          )}
        >
          {SORT_OPTIONS.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={({ focus, selected }) =>
                cn(
                  'flex cursor-pointer items-center justify-between px-4 py-2 text-sm',
                  focus && 'bg-pink-50 dark:bg-pink-900/30',
                  selected && 'text-pink-500 dark:text-pink-400'
                )
              }
            >
              {({ selected }) => (
                <>
                  <span>{option.label}</span>
                  {selected && <Check className="h-4 w-4" />}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

