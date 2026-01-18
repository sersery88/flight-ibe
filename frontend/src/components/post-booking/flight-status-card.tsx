import { memo, useMemo } from 'react';
import {
  Plane,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightStatus } from '@/hooks/use-flights';

// ============================================================================
// Flight Status Card - Shows real-time flight status
// ============================================================================

interface FlightStatusCardProps {
  carrierCode: string;
  flightNumber: string;
  scheduledDepartureDate: string;
  className?: string;
}

type FlightStatusType = 'scheduled' | 'boarding' | 'departed' | 'in-air' | 'landed' | 'arrived' | 'delayed' | 'cancelled' | 'unknown';

interface StatusInfo {
  type: FlightStatusType;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function getStatusInfo(flightData: {
  flightPoints?: Array<{
    departure?: {
      timings?: Array<{ qualifier: string; value: string }>;
    };
    arrival?: {
      timings?: Array<{ qualifier: string; value: string }>;
    };
  }>;
} | null): StatusInfo {
  if (!flightData || !flightData.flightPoints || flightData.flightPoints.length === 0) {
    return {
      type: 'unknown',
      label: 'Status unbekannt',
      icon: <Clock className="h-4 w-4" />,
      colorClass: 'text-gray-500',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
    };
  }

  const departurePoint = flightData.flightPoints[0];
  const arrivalPoint = flightData.flightPoints[flightData.flightPoints.length - 1];

  // Check for actual times vs scheduled
  const hasActualDeparture = departurePoint?.departure?.timings?.some(
    t => t.qualifier === 'ATD' || t.qualifier === 'TKO'
  );
  const hasActualArrival = arrivalPoint?.arrival?.timings?.some(
    t => t.qualifier === 'ATA' || t.qualifier === 'LND'
  );

  // Check for delays
  const scheduledDep = departurePoint?.departure?.timings?.find(t => t.qualifier === 'STD');
  const estimatedDep = departurePoint?.departure?.timings?.find(t => t.qualifier === 'ETD');

  const isDelayed = scheduledDep && estimatedDep &&
    new Date(estimatedDep.value).getTime() > new Date(scheduledDep.value).getTime() + 15 * 60 * 1000;

  if (hasActualArrival) {
    return {
      type: 'arrived',
      label: 'Gelandet',
      icon: <CheckCircle2 className="h-4 w-4" />,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-900/20',
    };
  }

  if (hasActualDeparture) {
    return {
      type: 'in-air',
      label: 'In der Luft',
      icon: <Plane className="h-4 w-4" />,
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    };
  }

  if (isDelayed) {
    return {
      type: 'delayed',
      label: 'Verspätet',
      icon: <AlertTriangle className="h-4 w-4" />,
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    };
  }

  return {
    type: 'scheduled',
    label: 'Planmäßig',
    icon: <Clock className="h-4 w-4" />,
    colorClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-50 dark:bg-gray-800',
  };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

export const FlightStatusCard = memo(function FlightStatusCard({
  carrierCode,
  flightNumber,
  scheduledDepartureDate,
  className,
}: FlightStatusCardProps) {
  const { data, isLoading, error } = useFlightStatus(
    carrierCode,
    flightNumber,
    scheduledDepartureDate
  );

  const flightData = data?.data?.[0] ?? null;
  const statusInfo = useMemo(() => getStatusInfo(flightData), [flightData]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border p-4 animate-pulse', className)}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4', className)}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">Flugstatus nicht verfügbar</span>
        </div>
        <p className="text-sm text-red-500 mt-1">
          Der Status für {carrierCode}{flightNumber} konnte nicht abgerufen werden.
        </p>
      </div>
    );
  }

  // No data
  if (!flightData) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <p className="text-gray-500 text-sm">
          Keine Flugdaten für {carrierCode}{flightNumber} gefunden.
        </p>
      </div>
    );
  }

  const departurePoint = flightData.flightPoints?.[0];
  const arrivalPoint = flightData.flightPoints?.[flightData.flightPoints.length - 1];

  const scheduledDeparture = departurePoint?.departure?.timings?.find(t => t.qualifier === 'STD');
  const estimatedDeparture = departurePoint?.departure?.timings?.find(t => t.qualifier === 'ETD');
  const actualDeparture = departurePoint?.departure?.timings?.find(t => t.qualifier === 'ATD' || t.qualifier === 'TKO');

  const scheduledArrival = arrivalPoint?.arrival?.timings?.find(t => t.qualifier === 'STA');
  const estimatedArrival = arrivalPoint?.arrival?.timings?.find(t => t.qualifier === 'ETA');
  const actualArrival = arrivalPoint?.arrival?.timings?.find(t => t.qualifier === 'ATA' || t.qualifier === 'LND');

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center justify-between', statusInfo.bgClass)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full', statusInfo.bgClass)}>
            {statusInfo.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {carrierCode} {flightNumber}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(scheduledDepartureDate)}</span>
            </div>
          </div>
        </div>
        <div className={cn('px-3 py-1 rounded-full text-sm font-medium', statusInfo.bgClass, statusInfo.colorClass)}>
          {statusInfo.label}
        </div>
      </div>

      {/* Flight details */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="text-center">
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <MapPin className="h-3 w-3" />
              <span>{departurePoint?.iataCode || '---'}</span>
            </div>
            <div className="text-2xl font-bold">
              {actualDeparture
                ? formatTime(actualDeparture.value)
                : estimatedDeparture
                  ? formatTime(estimatedDeparture.value)
                  : scheduledDeparture
                    ? formatTime(scheduledDeparture.value)
                    : '--:--'
              }
            </div>
            {scheduledDeparture && (estimatedDeparture || actualDeparture) && (
              <div className="text-xs text-gray-400 line-through">
                {formatTime(scheduledDeparture.value)}
              </div>
            )}
            {departurePoint?.departure?.terminal && (
              <div className="text-xs text-gray-500 mt-1">
                Terminal {departurePoint.departure.terminal.code}
              </div>
            )}
            {departurePoint?.departure?.gate && (
              <div className="text-xs text-gray-500">
                Gate {departurePoint.departure.gate.mainGate}
              </div>
            )}
          </div>

          {/* Flight path */}
          <div className="flex-1 mx-4">
            <div className="relative">
              <div className="h-0.5 bg-gray-200 dark:bg-gray-700 w-full" />
              <Plane className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5',
                statusInfo.colorClass
              )} />
            </div>
            {flightData.legs?.[0]?.scheduledLegDuration && (
              <div className="text-center text-xs text-gray-500 mt-2">
                {flightData.legs[0].scheduledLegDuration.replace('PT', '').toLowerCase()}
              </div>
            )}
          </div>

          {/* Arrival */}
          <div className="text-center">
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <MapPin className="h-3 w-3" />
              <span>{arrivalPoint?.iataCode || '---'}</span>
            </div>
            <div className="text-2xl font-bold">
              {actualArrival
                ? formatTime(actualArrival.value)
                : estimatedArrival
                  ? formatTime(estimatedArrival.value)
                  : scheduledArrival
                    ? formatTime(scheduledArrival.value)
                    : '--:--'
              }
            </div>
            {scheduledArrival && (estimatedArrival || actualArrival) && (
              <div className="text-xs text-gray-400 line-through">
                {formatTime(scheduledArrival.value)}
              </div>
            )}
            {arrivalPoint?.arrival?.terminal && (
              <div className="text-xs text-gray-500 mt-1">
                Terminal {arrivalPoint.arrival.terminal.code}
              </div>
            )}
          </div>
        </div>

        {/* Aircraft info */}
        {flightData.legs?.[0]?.aircraftEquipment && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-gray-500">
            <span>Flugzeug: {flightData.legs[0].aircraftEquipment.aircraftType}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default FlightStatusCard;
