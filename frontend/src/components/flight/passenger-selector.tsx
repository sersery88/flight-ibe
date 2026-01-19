'use client';

import { Users, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverPositioner,
} from '@/components/ui/popover';

// ============================================================================
// Passenger Selector Component
// ============================================================================

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface PassengerSelectorProps {
  value: PassengerCount;
  onChange: (value: PassengerCount) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

const PASSENGER_TYPES = [
  { key: 'adults' as const, label: 'Erwachsene', description: 'Ab 12 Jahren', min: 1, max: 9 },
  { key: 'children' as const, label: 'Kinder', description: '2-11 Jahre', min: 0, max: 8 },
  { key: 'infants' as const, label: 'Babys', description: 'Unter 2 Jahren', min: 0, max: 4 },
];

export function PassengerSelector({
  value,
  onChange,
  label,
  className,
  compact = false,
}: PassengerSelectorProps) {
  const totalPassengers = value.adults + value.children + value.infants;

  const updateCount = (key: keyof PassengerCount, delta: number) => {
    const type = PASSENGER_TYPES.find((t) => t.key === key)!;
    const newValue = Math.max(type.min, Math.min(type.max, value[key] + delta));

    // Infants can't exceed adults
    if (key === 'infants' && newValue > value.adults) return;
    if (key === 'adults' && newValue < value.infants) {
      onChange({ ...value, adults: newValue, infants: newValue });
      return;
    }

    // Max 9 passengers total
    const newTotal = totalPassengers + delta;
    if (newTotal > 9) return;

    onChange({ ...value, [key]: newValue });
  };

  const getDisplayText = () => {
    const parts: string[] = [];
    if (value.adults > 0) {
      parts.push(`${value.adults} Erw.`);
    }
    if (value.children > 0) {
      parts.push(`${value.children} Kind${value.children > 1 ? 'er' : ''}`);
    }
    if (value.infants > 0) {
      parts.push(`${value.infants} Baby${value.infants > 1 ? 's' : ''}`);
    }
    return parts.join(', ') || '1 Erw.';
  };

  return (
    <div className={cn('relative', className)}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <Popover>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-2 text-left text-sm transition-all duration-150 cursor-pointer',
            compact
              ? 'w-[190px] rounded-lg border-0 bg-background/60 py-3 px-3 hover:bg-background hover:shadow-sm focus:bg-background focus:shadow-md focus:ring-2 focus:ring-primary/50 sm:py-2.5'
              : 'w-full rounded-lg border border-border bg-background px-3 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20',
            'focus:outline-none'
          )}
        >
          <Users className={cn('text-muted-foreground shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          <span className="whitespace-nowrap">{getDisplayText()}</span>
        </PopoverTrigger>

        <PopoverPositioner sideOffset={4}>
          <PopoverContent
            className={cn(
              'z-50 w-72 rounded-xl border bg-popover p-4 shadow-xl'
            )}
          >
            <div className="space-y-4">
              {PASSENGER_TYPES.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      {type.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 sm:h-8 sm:w-8"
                      onClick={() => updateCount(type.key, -1)}
                      disabled={value[type.key] <= type.min}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <span className="w-8 text-center font-medium">
                      {value[type.key]}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 sm:h-8 sm:w-8"
                      onClick={() => updateCount(type.key, 1)}
                      disabled={value[type.key] >= type.max || totalPassengers >= 9}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                Maximal 9 Passagiere. Babys müssen auf dem Schoss eines Erwachsenen reisen.
              </div>
            </div>
          </PopoverContent>
        </PopoverPositioner>
      </Popover>
    </div>
  );
}
