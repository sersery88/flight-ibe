import { memo } from 'react';
import { Check, X } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { formatBrandedFareName, translateAmenity } from '@/lib/amenities';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Fare Tile - Individual branded fare option tile (memoized for performance)
// ============================================================================

export interface FareTileProps {
  offer: FlightOffer;
  isSelected: boolean;
  onSelect: () => void;
}

export const FareTile = memo(function FareTile({ offer, isSelected, onSelect }: FareTileProps) {
  const fareDetails = offer.travelerPricings[0]?.fareDetailsBySegment[0];
  const brandedFare = fareDetails?.brandedFareLabel || fareDetails?.brandedFare;
  const cabin = fareDetails?.cabin || 'ECONOMY';
  const checkedBags = fareDetails?.includedCheckedBags;
  const amenities = fareDetails?.amenities || [];

  // Helper to check amenity status
  const getAmenityStatus = (keywords: string[]): { available: boolean; chargeable: boolean } => {
    const amenity = amenities.find((a) =>
      keywords.some((kw) => a.description?.toUpperCase().includes(kw.toUpperCase()))
    );
    if (!amenity) return { available: false, chargeable: false };
    return { available: true, chargeable: amenity.isChargeable };
  };

  // Determine fare features from amenities
  const hasBaggage = !!checkedBags?.weight || !!checkedBags?.quantity;

  // Check seat reservation from amenities
  const seatStatus = getAmenityStatus(['SEAT', 'PRE RESERVED']);
  const hasFreeSeat = seatStatus.available && !seatStatus.chargeable;

  // Check changeability from amenities - "CHANGEABLE TICKET"
  const changeStatus = getAmenityStatus(['CHANGEABLE', 'CHANGE', 'REBOOKING', 'REBOOK']);
  const isChangeable = changeStatus.available;
  const isChangeableFree = changeStatus.available && !changeStatus.chargeable;

  // Check refundability from amenities - "REFUNDABLE TICKET", "REFUND"
  const refundStatus = getAmenityStatus(['REFUNDABLE', 'REFUND', 'CANCELLATION']);
  const isRefundable = refundStatus.available;
  const isRefundableFree = refundStatus.available && !refundStatus.chargeable;

  const getCabinLabel = (cabinCode: string) => {
    const labels: Record<string, string> = {
      ECONOMY: 'Economy',
      PREMIUM_ECONOMY: 'Premium Eco',
      BUSINESS: 'Business',
      FIRST: 'First',
    };
    return labels[cabinCode] || cabinCode;
  };

  const getFareName = () => {
    if (brandedFare) return formatBrandedFareName(brandedFare);
    return getCabinLabel(cabin);
  };

  // Determine color scheme - keep it subtle
  const getFareColorClass = () => {
    return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
  };

  return (
    <div
      data-fare-tile
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'group relative w-full cursor-pointer rounded-xl border-2 p-2.5 transition-all duration-300 hover:shadow-lg active:scale-[0.98] sm:p-3 md:p-4',
        getFareColorClass(),
        isSelected
          ? 'border-pink-500 bg-gradient-to-br from-pink-50/50 to-transparent shadow-lg shadow-pink-500/20 dark:from-pink-950/20 dark:shadow-pink-500/10'
          : 'hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      {/* Animated gradient border overlay for selected state */}
      {isSelected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-20" />
      )}

      {/* Content wrapper */}
      <div className="relative">
        {/* Fare Name with badge */}
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <div className="text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
            {getFareName()}
          </div>
          {isSelected && (
            <div className="flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
              <Check className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Ausgewählt</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-2 sm:mb-3">
          {(() => {
            const tileAdultPricing = offer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
            const tilePricePerPerson = tileAdultPricing?.price?.total
              ? parseFloat(tileAdultPricing.price.total)
              : parseFloat(offer.price.total) / offer.travelerPricings.length;
            return (
              <div className={cn(
                "text-base font-bold transition-colors sm:text-lg",
                isSelected ? "text-pink-600 dark:text-pink-400" : "text-gray-900 dark:text-white"
              )}>
                {formatCurrency(tilePricePerPerson, offer.price.currency)}
                <span className="ml-0.5 text-[10px] font-normal text-gray-500 sm:ml-1 sm:text-xs">p.P.</span>
              </div>
            );
          })()}
        </div>

        {/* Features */}
        <div className="space-y-1 text-[10px] sm:space-y-1.5 sm:text-xs">
          <FeatureItem
            status={hasBaggage ? 'included' : 'not-available'}
            label={hasBaggage
              ? `${checkedBags?.weight ? `${checkedBags.weight}kg` : `${checkedBags?.quantity}x`} Gepäck`
              : 'Kein Gepäck'
            }
          />
          <FeatureItem
            status={hasFreeSeat ? 'included' : seatStatus.available ? 'chargeable' : 'not-available'}
            label={translateAmenity('Sitzplatzwahl', 'PRE_RESERVED_SEAT')}
          />
          <FeatureItem
            status={isChangeableFree ? 'included' : isChangeable ? 'chargeable' : 'not-available'}
            label={translateAmenity('Umbuchbar', 'CHANGEABLE_TICKET')}
          />
          <FeatureItem
            status={isRefundableFree ? 'included' : isRefundable ? 'chargeable' : 'not-available'}
            label={translateAmenity('Erstattbar', 'REFUNDABLE_TICKET')}
          />
        </div>
      </div>

      {/* Bottom accent line for selected state */}
      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />
      )}
    </div>
  );
});

// ============================================================================
// Feature Item - Single feature row in fare tile (memoized for performance)
// ============================================================================

export type FeatureStatus = 'included' | 'chargeable' | 'not-available';

export interface FeatureItemProps {
  status: FeatureStatus;
  label: string;
}

export const FeatureItem = memo(function FeatureItem({ status, label }: FeatureItemProps) {
  const getIcon = () => {
    switch (status) {
      case 'included':
      case 'chargeable':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'not-available':
        return <X className="h-3 w-3 text-gray-300" />;
    }
  };

  const getTextClass = () => {
    switch (status) {
      case 'included':
      case 'chargeable':
        return 'text-gray-700 dark:text-gray-300';
      case 'not-available':
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
      <span className="shrink-0">{getIcon()}</span>
      <span className={cn("min-w-0 truncate", getTextClass())}>{label}</span>
      {status === 'chargeable' && (
        <span className="shrink-0 text-[9px] font-medium text-gray-700 dark:text-gray-300 sm:text-[10px]">€</span>
      )}
    </div>
  );
});
