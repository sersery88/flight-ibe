import { memo, useMemo, useState } from 'react';
import { Plane, Loader2, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDirectDestinations } from '@/hooks/use-flights';

// ============================================================================
// Direct Destinations - Shows all airports with direct flights
// ============================================================================

interface DirectDestinationsProps {
  airportCode: string;
  onSelectDestination?: (destinationCode: string, destinationName: string) => void;
  className?: string;
}

export const DirectDestinations = memo(function DirectDestinations({
  airportCode,
  onSelectDestination,
  className,
}: DirectDestinationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error } = useDirectDestinations(airportCode);

  const destinations = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.name.toLowerCase().includes(query) ||
          d.iataCode.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [data, searchQuery]);

  // Group destinations by first letter
  const groupedDestinations = useMemo(() => {
    const groups: Record<string, typeof destinations> = {};
    destinations.forEach(dest => {
      const letter = dest.name[0].toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(dest);
    });
    return groups;
  }, [destinations]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Lade Direktverbindungen...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-6', className)}>
        <p className="text-red-600 dark:text-red-400">
          Direktverbindungen konnten nicht geladen werden.
        </p>
      </div>
    );
  }

  const totalCount = data?.data?.length || 0;

  return (
    <div className={cn('rounded-xl border overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-transparent border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Direktflüge ab {airportCode}</h3>
            <p className="text-sm text-gray-500">
              {totalCount} Ziele ohne Umsteigen erreichbar
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Stadt oder Flughafencode suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* No results */}
      {destinations.length === 0 && (
        <div className="p-8 text-center">
          <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchQuery
              ? `Keine Ergebnisse für "${searchQuery}"`
              : 'Keine Direktverbindungen gefunden'
            }
          </p>
        </div>
      )}

      {/* Results */}
      {destinations.length > 0 && (
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedDestinations).map(([letter, dests]) => (
            <div key={letter}>
              {/* Letter header */}
              <div className="sticky top-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-sm text-gray-600 dark:text-gray-400">
                {letter}
              </div>

              {/* Destinations */}
              {dests.map((dest) => (
                <button
                  key={dest.iataCode}
                  onClick={() => onSelectDestination?.(dest.iataCode, dest.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border-b last:border-0"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {dest.iataCode}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{dest.name}</span>
                    <span className="text-xs text-gray-400 capitalize">
                      {dest.subtype?.toLowerCase().replace('_', ' ') || 'Airport'}
                    </span>
                  </div>
                  <Plane className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {destinations.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 border-t">
          {destinations.length === totalCount
            ? `${totalCount} Direktverbindungen`
            : `${destinations.length} von ${totalCount} Verbindungen angezeigt`
          }
        </div>
      )}
    </div>
  );
});

export default DirectDestinations;
