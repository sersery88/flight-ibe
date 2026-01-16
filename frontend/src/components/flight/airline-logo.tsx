import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui';
import { formatAirlineName } from '@/lib/airlines';

// ============================================================================
// Airline Logo Component - Displays airline logo from pics.avs.io with tooltip
// ============================================================================

export interface AirlineLogoProps {
  carrierCode: string;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export function AirlineLogo({ carrierCode, size = 32, className, showTooltip = true }: AirlineLogoProps) {
  const [hasError, setHasError] = useState(false);
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const airlineName = formatAirlineName(carrierCode);

  const logoElement = hasError ? (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-gray-100 text-xs font-bold dark:bg-gray-800',
        className
      )}
      style={{ width: size, height: size }}
    >
      {carrierCode}
    </div>
  ) : (
    <img
      src={`https://pics.avs.io/al_square/${size}/${size}/${carrierCode}@2x.webp`}
      alt={airlineName}
      width={size}
      height={size}
      className={cn('rounded-lg object-contain', className)}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );

  if (!showTooltip) {
    return logoElement;
  }

  return (
    <div className="relative inline-block">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-help"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileTooltip(!showMobileTooltip);
            }}
          >
            {logoElement}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{airlineName}</p>
        </TooltipContent>
      </Tooltip>

      {/* Mobile Click Tooltip */}
      {showMobileTooltip && (
        <>
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileTooltip(false);
            }}
          />
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 sm:hidden">
            <div className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-md dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap">
              {airlineName}
              <div className="absolute left-full top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-100" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
