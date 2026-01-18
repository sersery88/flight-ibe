import { memo, useMemo } from 'react';
import { TrendingUp, Loader2, Plane, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrendingDestinations } from '@/hooks/use-flights';

// ============================================================================
// Trending Destinations - Shows most popular destinations
// ============================================================================

interface TrendingDestinationsProps {
  originCityCode: string;
  period?: string;
  onSelectDestination?: (destinationCode: string) => void;
  className?: string;
}

// City names for common IATA codes
const cityNames: Record<string, string> = {
  BCN: 'Barcelona',
  CDG: 'Paris',
  PAR: 'Paris',
  FCO: 'Rom',
  ROM: 'Rom',
  LHR: 'London',
  LON: 'London',
  AMS: 'Amsterdam',
  MAD: 'Madrid',
  LIS: 'Lissabon',
  ATH: 'Athen',
  PMI: 'Palma de Mallorca',
  VIE: 'Wien',
  PRG: 'Prag',
  BUD: 'Budapest',
  DUB: 'Dublin',
  CPH: 'Kopenhagen',
  OSL: 'Oslo',
  ARN: 'Stockholm',
  STO: 'Stockholm',
  HEL: 'Helsinki',
  IST: 'Istanbul',
  ZRH: 'Zürich',
  MXP: 'Mailand',
  MIL: 'Mailand',
  NCE: 'Nizza',
  TFS: 'Teneriffa',
  LPA: 'Gran Canaria',
  AGP: 'Málaga',
  NYC: 'New York',
  JFK: 'New York',
  LAX: 'Los Angeles',
  MIA: 'Miami',
  DXB: 'Dubai',
  BKK: 'Bangkok',
  SIN: 'Singapur',
};

function getCityName(code: string): string {
  return cityNames[code] || code;
}

// Generate a gradient based on ranking position
function getGradient(position: number): string {
  const gradients = [
    'from-amber-500 to-orange-600',    // 1st - Gold
    'from-gray-400 to-gray-500',       // 2nd - Silver
    'from-amber-700 to-amber-800',     // 3rd - Bronze
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-pink-500 to-pink-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-rose-500 to-rose-600',
  ];
  return gradients[position] || gradients[gradients.length - 1];
}

export const TrendingDestinations = memo(function TrendingDestinations({
  originCityCode,
  period,
  onSelectDestination,
  className,
}: TrendingDestinationsProps) {
  // Use current month if no period specified
  const currentPeriod = useMemo(() => {
    if (period) return period;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [period]);

  const { data, isLoading, error } = useTrendingDestinations(originCityCode, currentPeriod);

  const destinations = useMemo(() => {
    if (!data?.data) return [];
    // Sort by travelers score (highest first)
    return [...data.data].sort((a, b) =>
      (b.analytics?.travelers?.score || 0) - (a.analytics?.travelers?.score || 0)
    );
  }, [data]);

  // Get max score for normalization
  const maxScore = useMemo(() => {
    if (destinations.length === 0) return 100;
    return Math.max(...destinations.map(d => d.analytics?.travelers?.score || 0));
  }, [destinations]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Lade beliebte Reiseziele...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-6', className)}>
        <p className="text-red-600 dark:text-red-400">
          Trending-Daten konnten nicht geladen werden.
        </p>
      </div>
    );
  }

  // No data
  if (destinations.length === 0) {
    return (
      <div className={cn('rounded-xl border p-6 text-center', className)}>
        <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Keine Trending-Daten verfügbar.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary/10 to-transparent border-b">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-lg">Beliebte Reiseziele</h3>
            <p className="text-sm text-gray-500">
              Top-Destinationen ab {getCityName(originCityCode)}
            </p>
          </div>
        </div>
      </div>

      {/* Destination list */}
      <div className="divide-y">
        {destinations.map((dest, index) => {
          const cityName = getCityName(dest.destination);
          const score = dest.analytics?.travelers?.score || 0;
          const flightScore = dest.analytics?.flights?.score || 0;
          const scorePercent = maxScore > 0 ? (score / maxScore) * 100 : 0;

          return (
            <button
              key={dest.destination}
              onClick={() => onSelectDestination?.(dest.destination)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              {/* Rank badge */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br',
                  getGradient(index)
                )}
              >
                {index + 1}
              </div>

              {/* Destination info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{cityName}</span>
                  <span className="text-xs text-gray-400">({dest.destination})</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r',
                      getGradient(index)
                    )}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>{score.toLocaleString('de-DE')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Plane className="h-3 w-3" />
                  <span>{flightScore.toLocaleString('de-DE')} Flüge</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
        Basierend auf Buchungsdaten für {currentPeriod}
      </div>
    </div>
  );
});

export default TrendingDestinations;
