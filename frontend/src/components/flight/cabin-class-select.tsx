'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelClass } from '@/types/flight';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPositioner,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// ============================================================================
// Cabin Class Select Component - Using Base UI Select
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
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <Select value={value} onValueChange={(val) => onChange(val as TravelClass)}>
        <SelectTrigger
          size={compact ? 'sm' : 'default'}
          className={cn(
            'w-[175px]',
            compact
              ? 'border-0 bg-background/60 hover:bg-background hover:shadow-sm focus:bg-background focus:shadow-md'
              : ''
          )}
        >
          <SelectValue placeholder="Klasse wählen">
            {selectedCabin.label}
          </SelectValue>
        </SelectTrigger>

        <SelectPositioner>
          <SelectContent>
            {CABIN_CLASSES.map((cabin) => (
              <SelectItem key={cabin.value} value={cabin.value}>
                {cabin.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectPositioner>
      </Select>
    </div>
  );
}
