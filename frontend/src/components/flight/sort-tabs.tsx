'use client';

import { cn, formatCurrency, parseDuration } from '@/lib/utils';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Sort Tabs Component - Kayak-style sorting with preview
// ============================================================================

export type SortTabOption = 'cheapest' | 'best' | 'fastest';

interface SortTabsProps {
  value: SortTabOption;
  onChange: (value: SortTabOption) => void;
  offers: FlightOffer[];
  className?: string;
}

/**
 * Calculate the "Best" score for a flight offer
 * Lower score = better option
 * Factors:
 * - Price (normalized to 0-100)
 * - Duration (normalized to 0-100)
 * - Number of stops (0 stops = 0, 1 stop = 25, 2+ stops = 50)
 */
export function calculateBestScore(
  offer: FlightOffer,
  minPrice: number,
  maxPrice: number,
  minDuration: number,
  maxDuration: number
): number {
  const price = parseFloat(offer.price.total);
  const totalDuration = offer.itineraries.reduce(
    (sum, it) => sum + parseDuration(it.duration),
    0
  );

  // Calculate total stops across all itineraries
  const totalStops = offer.itineraries.reduce(
    (sum, it) => sum + (it.segments.length - 1),
    0
  );

  // Normalize price (0-100)
  const priceRange = maxPrice - minPrice;
  const priceScore = priceRange > 0 ? ((price - minPrice) / priceRange) * 100 : 0;

  // Normalize duration (0-100)
  const durationRange = maxDuration - minDuration;
  const durationScore = durationRange > 0 ? ((totalDuration - minDuration) / durationRange) * 100 : 0;

  // Stops score
  const stopsScore = totalStops === 0 ? 0 : totalStops === 1 ? 15 : 30;

  // Weighted score: Price 45%, Duration 40%, Stops 15%
  return priceScore * 0.45 + durationScore * 0.40 + stopsScore * 0.15;
}

/**
 * Get the best offer for each category
 */
function getPreviewData(offers: FlightOffer[]) {
  if (offers.length === 0) {
    return { cheapest: null, best: null, fastest: null };
  }

  // Cheapest
  const cheapest = [...offers].sort(
    (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
  )[0];

  // Fastest (by total duration of all itineraries)
  const fastest = [...offers].sort((a, b) => {
    const durationA = a.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
    const durationB = b.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0);
    return durationA - durationB;
  })[0];

  // Best (calculate scores)
  const prices = offers.map((o) => parseFloat(o.price.total));
  const durations = offers.map((o) =>
    o.itineraries.reduce((sum, it) => sum + parseDuration(it.duration), 0)
  );
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const best = [...offers].sort((a, b) => {
    const scoreA = calculateBestScore(a, minPrice, maxPrice, minDuration, maxDuration);
    const scoreB = calculateBestScore(b, minPrice, maxPrice, minDuration, maxDuration);
    return scoreA - scoreB;
  })[0];

  return { cheapest, best, fastest };
}

function getTotalDuration(offer: FlightOffer): string {
  const totalMinutes = offer.itineraries.reduce(
    (sum, it) => sum + parseDuration(it.duration),
    0
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')} Std.`;
}

export function SortTabs({ value, onChange, offers, className }: SortTabsProps) {
  const { cheapest, best, fastest } = getPreviewData(offers);

  const tabs: { id: SortTabOption; label: string; price: string; duration: string }[] = [
    {
      id: 'cheapest',
      label: 'Günstigster Preis',
      price: cheapest ? formatCurrency(cheapest.price.total, cheapest.price.currency) : '-',
      duration: cheapest ? getTotalDuration(cheapest) : '-',
    },
    {
      id: 'best',
      label: 'Beste Option',
      price: best ? formatCurrency(best.price.total, best.price.currency) : '-',
      duration: best ? getTotalDuration(best) : '-',
    },
    {
      id: 'fastest',
      label: 'Schnellste Option',
      price: fastest ? formatCurrency(fastest.price.total, fastest.price.currency) : '-',
      duration: fastest ? getTotalDuration(fastest) : '-',
    },
  ];

  return (
    <div className={cn('flex w-full overflow-x-auto border-b border-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative min-w-0 flex-1 px-2 py-2 text-left transition-colors sm:px-3 sm:py-2.5 md:px-4 md:py-3',
            'hover:bg-muted/50',
            value === tab.id && 'bg-primary/10'
          )}
        >
          {/* Active indicator */}
          {value === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}

          {/* Label */}
          <span className={cn(
            'block truncate text-xs font-medium sm:text-sm',
            value === tab.id
              ? 'text-primary'
              : 'text-muted-foreground'
          )}>
            {tab.label}
          </span>

          {/* Price and duration preview */}
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground sm:gap-1.5 sm:text-xs">
            <span className="shrink-0 font-medium text-foreground">{tab.price}</span>
            <span className="shrink-0">•</span>
            <span className="truncate">{tab.duration}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
