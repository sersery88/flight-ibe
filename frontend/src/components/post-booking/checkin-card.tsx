import { memo } from 'react';
import {
  ExternalLink,
  Smartphone,
  Monitor,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckinLinks } from '@/hooks/use-flights';

// ============================================================================
// Check-in Card - Shows airline check-in links
// ============================================================================

interface CheckinCardProps {
  airlineCode: string;
  airlineName?: string;
  className?: string;
}

interface ChannelInfo {
  icon: React.ReactNode;
  label: string;
}

function getChannelInfo(channel: string): ChannelInfo {
  switch (channel.toUpperCase()) {
    case 'MOBILE':
      return {
        icon: <Smartphone className="h-4 w-4" />,
        label: 'Mobile Check-in',
      };
    case 'WEB':
    case 'WEBSITE':
      return {
        icon: <Monitor className="h-4 w-4" />,
        label: 'Online Check-in',
      };
    default:
      return {
        icon: <ExternalLink className="h-4 w-4" />,
        label: 'Check-in',
      };
  }
}

export const CheckinCard = memo(function CheckinCard({
  airlineCode,
  airlineName,
  className,
}: CheckinCardProps) {
  const { data, isLoading, error } = useCheckinLinks(airlineCode);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Check-in Links werden geladen...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 p-4', className)}>
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Check-in Links nicht verfügbar</span>
        </div>
        <p className="text-sm text-orange-500 mt-1">
          Bitte besuchen Sie die Website der Fluggesellschaft direkt.
        </p>
      </div>
    );
  }

  const links = data?.data ?? [];

  // No links available
  if (links.length === 0) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <p className="text-gray-500 text-sm">
          Keine Check-in Links für {airlineName || airlineCode} verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
        <h3 className="font-semibold">
          Online Check-in
          {airlineName && <span className="font-normal text-gray-500"> - {airlineName}</span>}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Checken Sie bequem online ein und sparen Sie Zeit am Flughafen.
        </p>
      </div>

      {/* Check-in links */}
      <div className="divide-y">
        {links.map((link) => {
          const channelInfo = getChannelInfo(link.channel);

          return (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  {channelInfo.icon}
                </div>
                <div>
                  <span className="font-medium">{channelInfo.label}</span>
                  <p className="text-xs text-gray-500">{link.channel}</p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          <strong>Tipp:</strong> Online Check-in ist in der Regel 24-48 Stunden vor Abflug möglich.
        </p>
      </div>
    </div>
  );
});

export default CheckinCard;
