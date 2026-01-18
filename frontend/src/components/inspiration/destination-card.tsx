import { memo } from 'react';
import { Plane, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlightDestination } from '@/api/client';

// ============================================================================
// Destination Card - Shows a flight destination with price
// ============================================================================

interface DestinationCardProps {
  destination: FlightDestination;
  onSelect?: (destination: FlightDestination) => void;
  className?: string;
}

// Airport/City name mapping for common destinations
const cityNames: Record<string, string> = {
  BCN: 'Barcelona',
  CDG: 'Paris',
  FCO: 'Rom',
  LHR: 'London',
  AMS: 'Amsterdam',
  MAD: 'Madrid',
  LIS: 'Lissabon',
  ATH: 'Athen',
  PMI: 'Mallorca',
  VIE: 'Wien',
  PRG: 'Prag',
  BUD: 'Budapest',
  DUB: 'Dublin',
  CPH: 'Kopenhagen',
  OSL: 'Oslo',
  ARN: 'Stockholm',
  HEL: 'Helsinki',
  IST: 'Istanbul',
  ZRH: 'Zürich',
  MXP: 'Mailand',
  NCE: 'Nizza',
  TFS: 'Teneriffa',
  LPA: 'Gran Canaria',
  AGP: 'Málaga',
  FUE: 'Fuerteventura',
  IBZ: 'Ibiza',
  DXB: 'Dubai',
  BKK: 'Bangkok',
  JFK: 'New York',
  LAX: 'Los Angeles',
  SFO: 'San Francisco',
  MIA: 'Miami',
  SIN: 'Singapur',
  HKG: 'Hong Kong',
  NRT: 'Tokyo',
  SYD: 'Sydney',
};

function getCityName(iataCode: string): string {
  return cityNames[iataCode] || iataCode;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
  });
}

function formatPrice(price: { total: string; currency: string }): string {
  const amount = parseFloat(price.total);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const DestinationCard = memo(function DestinationCard({
  destination,
  onSelect,
  className,
}: DestinationCardProps) {
  const cityName = getCityName(destination.destination);
  const price = formatPrice(destination.price);
  const departureDate = formatDate(destination.departureDate);
  const returnDate = destination.returnDate ? formatDate(destination.returnDate) : null;

  return (
    <button
      onClick={() => onSelect?.(destination)}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white dark:bg-gray-900',
        'transition-all duration-300 hover:shadow-lg hover:border-primary/50',
        'text-left w-full',
        className
      )}
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-4">
        {/* Route */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-500">{destination.origin}</span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-bold text-primary">{destination.destination}</span>
        </div>

        {/* City name */}
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {cityName}
        </h3>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Calendar className="h-4 w-4" />
          <span>
            {departureDate}
            {returnDate && <span> - {returnDate}</span>}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Plane className="h-4 w-4" />
            <span className="text-xs">{returnDate ? 'Hin & Zurück' : 'Nur Hinflug'}</span>
          </div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {price}
          </div>
        </div>
      </div>
    </button>
  );
});

export default DestinationCard;
