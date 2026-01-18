import { memo, useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePriceMetrics } from '@/hooks/use-flights';

// ============================================================================
// Deal Indicator - Shows if current price is a good deal
// ============================================================================

interface DealIndicatorProps {
  origin: string;
  destination: string;
  departureDate: string;
  currentPrice: number;
  currency?: string;
  className?: string;
  variant?: 'badge' | 'full';
}

type DealLevel = 'great' | 'good' | 'fair' | 'high' | 'unknown';

interface DealInfo {
  level: DealLevel;
  label: string;
  description: string;
  percentDiff: number | null;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function getDealInfo(
  currentPrice: number,
  metrics: { amount: string; quartileRanking: string }[] | undefined
): DealInfo {
  if (!metrics || metrics.length === 0) {
    return {
      level: 'unknown',
      label: 'Preis',
      description: 'Keine historischen Daten verfügbar',
      percentDiff: null,
      icon: <Minus className="h-3 w-3" />,
      colorClass: 'text-gray-500',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
    };
  }

  // Find the MEDIUM quartile as baseline
  const mediumMetric = metrics.find(m => m.quartileRanking === 'MEDIUM');
  const minMetric = metrics.find(m => m.quartileRanking === 'MINIMUM');
  const firstQuartile = metrics.find(m => m.quartileRanking === 'FIRST');

  const medianPrice = mediumMetric ? parseFloat(mediumMetric.amount) : null;
  const minPrice = minMetric ? parseFloat(minMetric.amount) : null;
  const firstQuartilePrice = firstQuartile ? parseFloat(firstQuartile.amount) : null;

  if (medianPrice === null) {
    return {
      level: 'unknown',
      label: 'Preis',
      description: 'Keine Vergleichsdaten',
      percentDiff: null,
      icon: <Minus className="h-3 w-3" />,
      colorClass: 'text-gray-500',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
    };
  }

  const percentDiff = ((currentPrice - medianPrice) / medianPrice) * 100;

  // Determine deal level based on where current price falls
  if (minPrice && currentPrice <= minPrice * 1.1) {
    return {
      level: 'great',
      label: 'Top-Preis',
      description: `${Math.abs(Math.round(percentDiff))}% unter Durchschnitt`,
      percentDiff,
      icon: <Sparkles className="h-3 w-3" />,
      colorClass: 'text-green-700 dark:text-green-400',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
    };
  }

  if (firstQuartilePrice && currentPrice <= firstQuartilePrice) {
    return {
      level: 'good',
      label: 'Guter Preis',
      description: `${Math.abs(Math.round(percentDiff))}% unter Durchschnitt`,
      percentDiff,
      icon: <TrendingDown className="h-3 w-3" />,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-900/20',
    };
  }

  if (percentDiff <= 10) {
    return {
      level: 'fair',
      label: 'Normaler Preis',
      description: 'Im üblichen Bereich',
      percentDiff,
      icon: <Minus className="h-3 w-3" />,
      colorClass: 'text-yellow-600 dark:text-yellow-400',
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    };
  }

  return {
    level: 'high',
    label: 'Hoher Preis',
    description: `${Math.round(percentDiff)}% über Durchschnitt`,
    percentDiff,
    icon: <TrendingUp className="h-3 w-3" />,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
  };
}

export const DealIndicator = memo(function DealIndicator({
  origin,
  destination,
  departureDate,
  currentPrice,
  currency: _currency = 'EUR', // Reserved for future use
  className,
  variant = 'badge',
}: DealIndicatorProps) {
  // Fetch price metrics
  const { data, isLoading } = usePriceMetrics(origin, destination, departureDate, {
    enabled: !!origin && !!destination && !!departureDate,
  });

  // Calculate deal info
  const dealInfo = useMemo(() => {
    if (isLoading || !data?.data?.[0]?.priceMetrics) {
      return null;
    }
    return getDealInfo(currentPrice, data.data[0].priceMetrics);
  }, [data, currentPrice, isLoading]);

  // Don't render anything while loading or if no data
  if (isLoading || !dealInfo || dealInfo.level === 'unknown') {
    return null;
  }

  // Badge variant - compact display
  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          dealInfo.bgClass,
          dealInfo.colorClass,
          className
        )}
        title={dealInfo.description}
      >
        {dealInfo.icon}
        <span>{dealInfo.label}</span>
      </div>
    );
  }

  // Full variant - detailed display
  return (
    <div
      className={cn(
        'rounded-lg p-3',
        dealInfo.bgClass,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('rounded-full p-1', dealInfo.bgClass)}>
          {dealInfo.icon}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', dealInfo.colorClass)}>
            {dealInfo.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {dealInfo.description}
          </p>
        </div>
      </div>

      {/* Price comparison bar */}
      {dealInfo.percentDiff !== null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Min</span>
            <span>Durchschnitt</span>
            <span>Max</span>
          </div>
          <div className="relative mt-1 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400">
            {/* Current price marker */}
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-gray-900 dark:bg-white"
              style={{
                left: `${Math.max(0, Math.min(100, 50 + dealInfo.percentDiff / 2))}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default DealIndicator;
