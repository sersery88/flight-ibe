import { useState, useEffect, useMemo } from 'react';
import { Plane, Clock, Luggage, ChevronRight, ChevronDown, ChevronUp, Check, X, Loader2, Leaf, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn, formatCurrency, formatDuration, formatDateTime, getStopsLabel } from '@/lib/utils';
import { Badge, Button, Card, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui';
import { getUpsellOffers } from '@/api/client';
import { formatBrandedFareName, translateAmenity } from '@/lib/amenities';
import { formatAircraftType } from '@/lib/aircraft';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';
import type { FlightOffer, Segment } from '@/types/flight';

// ============================================================================

// ============================================================================
// Airline Logo Component - Displays airline logo from pics.avs.io with tooltip
// ============================================================================

interface AirlineLogoProps {
  carrierCode: string;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

function AirlineLogo({ carrierCode, size = 32, className, showTooltip = true }: AirlineLogoProps) {
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

// ============================================================================
// Flight Card Component - Display a single flight offer
// ============================================================================

interface FlightCardProps {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  isSelected?: boolean;
  className?: string;
}

export function FlightCard({ offer, onSelect, isSelected, className }: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFareSelection, setShowFareSelection] = useState(false);
  const [upsellOffers, setUpsellOffers] = useState<FlightOffer[]>([]);
  const [isLoadingUpsell, setIsLoadingUpsell] = useState(false);
  const [upsellFailed, setUpsellFailed] = useState(false);
  const [selectedFareOffer, setSelectedFareOffer] = useState<FlightOffer>(offer);

  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries[1];

  // Format outbound date for details
  const formattedDepartureDate = new Date(outbound.segments[0]?.departure.at).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // Collect all segments for detail view
  const allSegments = [
    ...outbound.segments,
    ...(returnFlight?.segments || [])
  ];

  // Calculate total CO2 for entire journey
  const totalJourneyCo2 = allSegments.reduce((sum, seg) => {
    const segmentCo2 = seg.co2Emissions?.reduce((s, e) => s + e.weight, 0) || 0;
    return sum + segmentCo2;
  }, 0);

  const outboundSegmentCount = outbound.segments.length;

  // Get baggage and fare info from SELECTED fare offer (not original)
  const selectedTravelerPricing = selectedFareOffer.travelerPricings[0];

  // Get branded fare info from first segment of selected fare
  const selectedFareDetail = selectedTravelerPricing?.fareDetailsBySegment?.[0];
  const brandedFareName = selectedFareDetail?.brandedFareLabel || selectedFareDetail?.brandedFare;
  const cabinClass = selectedFareDetail?.cabin || 'ECONOMY';

  // Check if multiple fare options are available
  const hasMultipleFares = upsellOffers.length > 1;


  // Load upsell offers when fare selection is opened
  useEffect(() => {
    if (showFareSelection && upsellOffers.length === 0 && !isLoadingUpsell && !upsellFailed) {
      setIsLoadingUpsell(true);
      getUpsellOffers([offer])
        .then((response) => {
          if (response.data && response.data.length > 1) {
            setUpsellOffers(response.data);
          } else {
            setUpsellFailed(true);
          }
        })
        .catch((error) => {
          console.error('Failed to load upsell offers:', error);
          setUpsellFailed(true);
        })
        .finally(() => {
          setIsLoadingUpsell(false);
        });
    }
  }, [showFareSelection, offer, upsellOffers.length, isLoadingUpsell, upsellFailed]);

  // Click on card toggles flight details
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on a button, fare tile, fare selection area, or footer
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('[data-fare-tile]') ||
      (e.target as HTMLElement).closest('[data-fare-section]') ||
      (e.target as HTMLElement).closest('[data-footer-section]')
    ) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleSelectFare = (fareOffer: FlightOffer) => {
    setSelectedFareOffer(fareOffer);
  };

  const handleConfirmSelection = () => {
    onSelect(selectedFareOffer);
  };

  const handleOpenFareSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFareSelection(!showFareSelection);
  };

  // Combine original offer with upsell offers for fare selection
  // Always include the original offer first, then add upsell offers
  // Deduplicate by brandedFare, keeping the cheaper one
  const allFareOptions = useMemo(() => {
    if (upsellOffers.length === 0) return [offer];

    // Start with original offer
    const fareMap = new Map<string, FlightOffer>();
    const originalFare = offer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || 'ORIGINAL';
    fareMap.set(originalFare, offer);

    // Add upsell offers, keeping the cheaper one for duplicate fares
    for (const upsellOffer of upsellOffers) {
      const fareCode = upsellOffer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || upsellOffer.id;
      const existing = fareMap.get(fareCode);

      if (!existing || parseFloat(upsellOffer.price.total) < parseFloat(existing.price.total)) {
        fareMap.set(fareCode, upsellOffer);
      }
    }

    // Sort by price ascending
    return Array.from(fareMap.values()).sort(
      (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
    );
  }, [offer, upsellOffers]);

  return (
    <div className="w-full">
      <Card
        className={cn(
          'w-full cursor-pointer transition-all hover:shadow-lg',
          isSelected && 'ring-2 ring-pink-500',
          isExpanded && 'ring-1 ring-neutral-300 dark:ring-neutral-600',
          className
        )}
        onClick={handleCardClick}
      >
        <div className="p-3 sm:p-4 md:p-6">
          {/* Outbound Flight */}
          <FlightSegmentRow
            segments={outbound.segments}
            duration={outbound.duration}
            label="Hinflug"
            fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(0, outboundSegmentCount)}
          />

          {/* Return Flight */}
          {returnFlight && (
            <>
              <div className="my-4 border-t border-dashed border-gray-200 dark:border-gray-700" />
              <FlightSegmentRow
                segments={returnFlight.segments}
                duration={returnFlight.duration}
                label="Rückflug"
                fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(outboundSegmentCount)}
              />
            </>
          )}

          {/* Expanded Flight Details - shown when card is clicked */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-6 space-y-6 rounded-2xl bg-slate-50/50 dark:bg-neutral-800/30 p-4 sm:p-6 border border-slate-100 dark:border-neutral-700/50 backdrop-blur-sm">
                  {/* Outbound Details */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-neutral-700/50 pb-2">
                      <h5 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                        <Plane className="h-4 w-4 text-slate-400" />
                        Hinflug
                      </h5>
                      <span className="text-base font-normal text-slate-800 dark:text-slate-200">{formattedDepartureDate}</span>
                    </div>
                    <FlightDetailsSection
                      segments={outbound.segments}
                      fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(0, outboundSegmentCount)}
                    />
                  </div>

                  {/* Return Details */}
                  {returnFlight && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-neutral-700/50 pb-2 pt-2">
                        <h5 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                          <Plane className="h-4 w-4 rotate-180 text-slate-400" />
                          Rückflug
                        </h5>
                        <span className="text-base font-normal text-slate-800 dark:text-slate-200">
                          {new Date(returnFlight.segments[0].departure.at).toLocaleDateString('de-DE', {
                            weekday: 'short', day: 'numeric', month: 'short'
                          })}
                        </span>
                      </div>
                      <FlightDetailsSection
                        segments={returnFlight.segments}
                        fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(outboundSegmentCount)}
                      />
                    </div>
                  )}

                  {/* Journey Summary Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/50 dark:border-neutral-700/50 pt-4">
                    <div className="flex gap-2">
                      {totalJourneyCo2 > 0 && (
                        <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          <Leaf className="mr-1 h-3 w-3" />
                          Gesamt {totalJourneyCo2.toFixed(0)} kg CO₂
                        </Badge>
                      )}
                    </div>
                    {brandedFareName && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Tarif: {brandedFareName}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer: Fare Type, CO2, Price & Action - clicking opens fare selection */}
          <div
            data-footer-section
            className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 sm:mt-4 sm:gap-3 sm:pt-4 md:mt-6 md:flex-row md:items-center md:justify-between cursor-pointer"
            onClick={handleOpenFareSelection}
          >
            {/* Left: Fare Badge, CO2, Tarife Button */}
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="flex flex-col gap-1">
                {brandedFareName ? (
                  <Badge variant="secondary" className="w-fit text-[10px] font-medium sm:text-xs">
                    {brandedFareName}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit text-[10px] sm:text-xs">
                    {getCabinLabel(cabinClass)}
                  </Badge>
                )}
              </div>
              {/* CO2 Badge */}
              {totalJourneyCo2 > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400 sm:gap-1 sm:text-xs md:text-sm">
                  <Leaf className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                  <span>{totalJourneyCo2.toFixed(0)} kg</span>
                </div>
              )}
              {/* Weitere Tarife indicator */}
              {!upsellFailed && (
                <div className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 sm:gap-1 sm:text-xs">
                  Weitere Tarife
                  {showFareSelection ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              )}
            </div>

            {/* Price & Select */}
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3 md:gap-4">
              {(() => {
                // Calculate price per person for selected fare
                const selectedAdultPricing = selectedFareOffer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
                const selectedPricePerPerson = selectedAdultPricing?.price?.total
                  ? parseFloat(selectedAdultPricing.price.total)
                  : parseFloat(selectedFareOffer.price.total) / selectedFareOffer.travelerPricings.length;
                const selectedPassengerCount = selectedFareOffer.travelerPricings.length;
                const currency = selectedFareOffer.price.currency;

                // Group travelers by type for tooltip
                const travelerTypeLabels: Record<string, string> = {
                  'ADULT': 'Erwachsener',
                  'CHILD': 'Kind',
                  'SEATED_INFANT': 'Kleinkind (Sitz)',
                  'HELD_INFANT': 'Baby',
                };
                const typeGroups = selectedFareOffer.travelerPricings.reduce((acc, tp) => {
                  const type = tp.travelerType;
                  if (!acc[type]) {
                    acc[type] = { count: 0, pricePerPerson: parseFloat(tp.price.total) };
                  }
                  acc[type].count++;
                  return acc;
                }, {} as Record<string, { count: number; pricePerPerson: number }>);

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="min-w-0 cursor-help text-right">
                        <div className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl md:text-2xl">
                          {formatCurrency(selectedPricePerPerson, currency)}
                        </div>
                        <div className="text-[9px] text-gray-500 sm:text-[10px] md:text-xs">pro Person</div>
                        {selectedPassengerCount > 1 && (
                          <div className="truncate text-[9px] text-gray-400 sm:text-[10px] md:text-xs">
                            Gesamt: {formatCurrency(parseFloat(selectedFareOffer.price.total), currency)}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="p-3">
                      <div className="space-y-1.5 text-sm">
                        <div className="font-semibold border-b pb-1 mb-1">Preisaufschlüsselung</div>
                        {Object.entries(typeGroups).map(([type, data]) => (
                          <div key={type} className="flex justify-between gap-4">
                            <span>{data.count}x {travelerTypeLabels[type] || type}</span>
                            <span className="font-medium">{formatCurrency(data.pricePerPerson * data.count, currency)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-4 border-t pt-1 mt-1 font-semibold">
                          <span>Gesamt</span>
                          <span>{formatCurrency(parseFloat(selectedFareOffer.price.total), currency)}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}
              <Button
                size="sm"
                className="shrink-0 gap-1 h-9 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm md:h-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmSelection();
                }}
              >
                <span className="hidden sm:inline">Auswählen</span>
                <span className="sm:hidden">Wählen</span>
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Fare Selection Section - below footer */}
          {showFareSelection && (
            <div data-fare-section className="mt-3 w-full overflow-hidden border-t border-gray-200 pt-3 dark:border-gray-700 sm:mt-4 sm:pt-4">
              <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300 sm:mb-3 sm:text-sm">
                Tarif wählen
              </h4>

              {isLoadingUpsell ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-pink-500 sm:h-6 sm:w-6" />
                  <span className="ml-2 text-xs text-gray-500 sm:text-sm">Tarife werden geladen...</span>
                </div>
              ) : hasMultipleFares ? (
                <div className="grid w-full grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {allFareOptions.map((fareOffer) => (
                    <FareTile
                      key={fareOffer.id}
                      offer={fareOffer}
                      isSelected={selectedFareOffer.id === fareOffer.id}
                      onSelect={() => handleSelectFare(fareOffer)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-2 text-xs text-gray-500 sm:text-sm">
                  Keine weiteren Tarife für diesen Flug verfügbar.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Fare Tile - Individual branded fare option tile
// ============================================================================

interface FareTileProps {
  offer: FlightOffer;
  isSelected: boolean;
  onSelect: () => void;
}

function FareTile({ offer, isSelected, onSelect }: FareTileProps) {
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
}

type FeatureStatus = 'included' | 'chargeable' | 'not-available';

function FeatureItem({ status, label }: { status: FeatureStatus; label: string }) {
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
}

// ============================================================================
// Baggage Tooltip Component - Click-based on mobile, hover on desktop
// ============================================================================

interface BaggageTooltipProps {
  checkedBags: {
    weight?: number;
    quantity?: number;
  };
}

function BaggageTooltip({ checkedBags }: BaggageTooltipProps) {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const tooltipText = checkedBags.weight
    ? `${checkedBags.weight}kg Freigepäck inklusive`
    : `${checkedBags.quantity || 0} Gepäckstück${(checkedBags.quantity || 0) !== 1 ? 'e' : ''} inklusive`;

  return (
    <div className="relative inline-block">
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="secondary"
            className="gap-0.5 text-[9px] cursor-help sm:gap-1 sm:text-[10px] md:text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileTooltip(!showMobileTooltip);
            }}
          >
            <Luggage className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {checkedBags.weight || checkedBags.quantity || 0}
            {checkedBags.weight ? 'kg' : 'x'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{tooltipText}</p>
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
              {tooltipText}
              <div className="absolute left-full top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-100" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// RBD Tooltip Component - Click-based on mobile, hover on desktop
// ============================================================================

interface RBDTooltipProps {
  bookingClass: string;
  cabin?: string;
}

function RBDTooltip({ bookingClass, cabin }: RBDTooltipProps) {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  // Map cabin to German labels
  const cabinLabels: Record<string, string> = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium Economy',
    BUSINESS: 'Business',
    FIRST: 'First Class',
  };

  const tooltipText = cabin
    ? `Buchungsklasse ${bookingClass} (${cabinLabels[cabin] || cabin})`
    : `Buchungsklasse ${bookingClass}`;

  return (
    <div className="relative inline-block">
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="outline"
            className="text-[9px] font-semibold cursor-help sm:text-[10px] md:text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileTooltip(!showMobileTooltip);
            }}
          >
            {bookingClass}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{tooltipText}</p>
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
              {tooltipText}
              <div className="absolute left-full top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-100" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Flight Segment Row - Shows departure -> arrival with duration
// ============================================================================

interface FareDetailsBySegment {
  segmentId: string;
  cabin?: string;
  fareBasis?: string;
  brandedFare?: string;
  brandedFareLabel?: string;
  class?: string;
  includedCheckedBags?: {
    weight?: number;
    weightUnit?: string;
    quantity?: number;
  };
}

interface FlightSegmentRowProps {
  segments: Segment[];
  duration: string;
  label?: string;
  fareDetails?: FareDetailsBySegment[];
}

function FlightSegmentRow({ segments, duration, label, fareDetails }: FlightSegmentRowProps) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const stops = segments.length - 1;

  // Get baggage info from first segment's fare details
  const firstFareDetail = fareDetails?.[0];
  const checkedBags = firstFareDetail?.includedCheckedBags;

  // Get stop airports and calculate layover times, check for airport changes
  const stopInfo = segments.slice(0, -1).map((seg, idx) => {
    const nextSeg = segments[idx + 1];
    const layoverMs = new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
    const hours = Math.floor(layoverMs / (1000 * 60 * 60));
    const minutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));
    const hasAirportChange = seg.arrival.iataCode !== nextSeg.departure.iataCode;
    return {
      arrivalAirport: seg.arrival.iataCode,
      departureAirport: nextSeg.departure.iataCode,
      layover: `${hours}h ${minutes}m`,
      hasAirportChange
    };
  });

  // Check if any connection has an airport change
  const hasAnyAirportChange = stopInfo.some(s => s.hasAirportChange);

  // Format date for display (e.g., "Mo, 25. Dez")
  const departureDate = new Date(first.departure.at);
  const arrivalDate = new Date(last.arrival.at);
  const formattedDepartureDate = departureDate.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // Check if arrival is on a different day
  const isDifferentDay = departureDate.toDateString() !== arrivalDate.toDateString();

  return (
    <div>
      {/* Label with Date - Full width on mobile */}
      {label && (
        <div className="mb-2 sm:hidden">
          <div className="text-xs font-medium uppercase text-gray-400">{label}</div>
          <div className="text-xs text-gray-500">{formattedDepartureDate}</div>
        </div>
      )}

      <div className="flex min-h-[60px] items-center gap-2 sm:min-h-[72px] sm:gap-4">
        {/* Label with Date - Side on desktop */}
        {label && (
          <div className="hidden w-24 shrink-0 sm:block">
            <div className="text-xs font-medium uppercase text-gray-400">{label}</div>
            <div className="text-xs text-gray-500">{formattedDepartureDate}</div>
          </div>
        )}

        {/* Departure */}
        <div className="w-14 shrink-0 text-left sm:w-20 sm:text-right">
          <div className="text-base font-bold text-gray-900 dark:text-white sm:text-lg md:text-xl">
            {formatDateTime(first.departure.at, 'time')}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-gray-500 sm:text-xs md:text-sm cursor-help hover:text-gray-700 dark:hover:text-gray-300">
                {first.departure.iataCode}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatAirportName(first.departure.iataCode)}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Flight Path */}
        <div className="flex min-w-0 flex-1 flex-col items-center px-1 sm:px-2 md:px-4">
          <div className="flex w-full items-center">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:h-2 sm:w-2" />
            <div className="relative h-0.5 min-w-0 flex-1 bg-gray-200 dark:bg-gray-700">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "bg-white text-[10px] dark:bg-gray-900 sm:text-xs",
                    hasAnyAirportChange && "border-red-300 dark:border-red-700"
                  )}
                >
                  {stops > 0 ? (
                    <>
                      {hasAnyAirportChange && <AlertTriangle className="mr-0.5 h-2.5 w-2.5 text-red-500 sm:mr-1 sm:h-3 sm:w-3" />}
                      {getStopsLabel(stops)}
                    </>
                  ) : (
                    'Direkt'
                  )}
                </Badge>
              </div>
            </div>
            <Plane className="h-3 w-3 shrink-0 rotate-90 text-pink-500 sm:h-4 sm:w-4" />
          </div>
          {/* Show layover time for stops, total duration for direct */}
          <div className="mt-1.5 flex items-center gap-0.5 text-[9px] sm:mt-2 sm:gap-1 sm:text-[10px] md:text-xs">
            <Clock className="h-2.5 w-2.5 shrink-0 text-gray-400 sm:h-3 sm:w-3" />
            {stops > 0 ? (
              <span className={cn(
                "min-w-0 truncate text-gray-400",
                hasAnyAirportChange && "text-red-500"
              )}>
                {stopInfo.map(s => {
                  if (s.hasAirportChange) {
                    return `${s.layover} Wechsel ${s.arrivalAirport}→${s.departureAirport}`;
                  }
                  return `${s.layover} in ${s.arrivalAirport}`;
                }).join(', ')}
              </span>
            ) : (
              <span className="text-gray-400">{formatDuration(duration)}</span>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="w-14 shrink-0 sm:w-20">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-base font-bold text-gray-900 dark:text-white sm:text-lg md:text-xl">
              {formatDateTime(last.arrival.at, 'time')}
            </span>
            {isDifferentDay && (
              <span className="text-[10px] text-orange-500 sm:text-xs" title={arrivalDate.toLocaleDateString('de-DE')}>
                +1
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-gray-500 sm:text-xs md:text-sm cursor-help hover:text-gray-700 dark:hover:text-gray-300">
                {last.arrival.iataCode}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatAirportName(last.arrival.iataCode)}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Airline Logo + RBD/Baggage - horizontal layout with fixed widths */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Flight numbers - vertical stack */}
          <div className="flex w-[68px] flex-col gap-0.5 sm:w-[76px]">
            {segments.map((seg) => (
              <div key={seg.id} className="flex items-center gap-1">
                <AirlineLogo carrierCode={seg.carrierCode} size={16} className="shrink-0 sm:h-5 sm:w-5" />
                <span className="text-[10px] text-gray-500 sm:text-xs">
                  {seg.carrierCode}{seg.number}
                </span>
              </div>
            ))}
          </div>
          {/* RBD above Baggage - vertical stack */}
          <div className="flex w-10 flex-col items-center gap-1 sm:w-12">
            {firstFareDetail?.class && (
              <RBDTooltip bookingClass={firstFareDetail.class} cabin={firstFareDetail.cabin} />
            )}
            {checkedBags && <BaggageTooltip checkedBags={checkedBags} />}
          </div>
        </div>
      </div>
    </div>
  );
}


// Format cabin class for display
const getCabinLabel = (cabin: string) => {
  const labels: Record<string, string> = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium Economy',
    BUSINESS: 'Business',
    FIRST: 'First',
  };
  return labels[cabin] || cabin;
};

// ============================================================================
// Flight Details Section - Shows detailed segment info when card is expanded
// ============================================================================

interface FlightDetailsSectionProps {
  segments: Segment[];
  fareDetails?: FareDetailsBySegment[];
}

function FlightDetailsSection({ segments, fareDetails }: FlightDetailsSectionProps) {
  return (
    <div className="space-y-4">
      {segments.map((seg, idx) => (
        <div key={seg.id} className="relative">
          {/* Segment Info Header - Left Aligned */}
          <div className="flex items-start gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100 dark:bg-neutral-800 dark:ring-neutral-700">
              <AirlineLogo carrierCode={seg.carrierCode} size={24} showTooltip={false} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-normal text-slate-900 dark:text-white leading-tight">
                {formatAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.number}
              </span>
              <div className="flex flex-col mt-0.5">
                {seg.aircraft?.code && (
                  <span className="text-xs font-normal text-slate-400">
                    {formatAircraftType(seg.aircraft.code)}
                    {fareDetails?.[idx] && (
                      <span className="ml-1">
                        • {getCabinLabel(fareDetails[idx].cabin || 'ECONOMY')} ({fareDetails[idx].class})
                      </span>
                    )}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-xs font-normal text-slate-400">
                    Flugdauer: {formatDuration(seg.duration)}
                  </span>
                  {seg.co2Emissions?.[0] && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal whitespace-nowrap">
                      • {seg.co2Emissions[0].weight} {seg.co2Emissions[0].weightUnit} CO₂
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Timeline - Minimalist & Left Aligned */}
          <div className="relative ml-[15.5px] border-l border-slate-200 dark:border-neutral-700 pl-6 py-1 space-y-4">
            {/* Departure */}
            <div className="relative">
              <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-slate-400 dark:border-neutral-900" />
              <div className="flex items-baseline gap-2">
                <span className="text-base font-normal text-slate-900 dark:text-white">{formatDateTime(seg.departure.at, 'time')}</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {seg.departure.iataCode}
                </span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {formatAirportName(seg.departure.iataCode, 'full')}
                </span>
                {seg.departure.terminal && (
                  <span className="text-[11px] text-slate-500 font-normal px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 rounded">
                    Terminal {seg.departure.terminal}
                  </span>
                )}
              </div>
            </div>

            {/* Arrival */}
            <div className="relative">
              <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-slate-400 dark:border-neutral-900" />
              <div className="flex items-baseline gap-2">
                <span className="text-base font-normal text-slate-900 dark:text-white">{formatDateTime(seg.arrival.at, 'time')}</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {seg.arrival.iataCode}
                </span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {formatAirportName(seg.arrival.iataCode, 'full')}
                </span>
                {seg.arrival.terminal && (
                  <span className="text-[11px] text-slate-500 font-normal px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 rounded">
                    Terminal {seg.arrival.terminal}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Operating Info */}
          {seg.operating && seg.operating.carrierCode !== seg.carrierCode && (
            <div className="ml-[15.5px] pl-6 mt-1 text-xs font-normal text-slate-400 italic">
              *Durchgeführt von {formatAirlineName(seg.operating.carrierCode)}
            </div>
          )}

          {/* Connection / Layover */}
          {idx < segments.length - 1 && (() => {
            const nextSeg = segments[idx + 1];
            const hasAirportChange = seg.arrival.iataCode !== nextSeg.departure.iataCode;
            const layoverMs = new Date(nextSeg.departure.at).getTime() - new Date(seg.arrival.at).getTime();
            const hours = Math.floor(layoverMs / (1000 * 60 * 60));
            const minutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));

            return (
              <div className="ml-[15.5px] border-l border-dashed border-slate-300 dark:border-neutral-700 pl-6 py-4 my-1">
                <div className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal shadow-sm border transition-colors",
                  hasAirportChange
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50"
                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
                )}>
                  {hasAirportChange ? (
                    <>
                      <AlertTriangle className="h-5 w-5" />
                      <span>Flughafenwechsel erforderlich: {formatAirportName(seg.arrival.iataCode)} → {formatAirportName(nextSeg.departure.iataCode)} ({hours}h {minutes}m)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5" />
                      <span>{hours}h {minutes}m Aufenthalt in {formatAirportName(seg.arrival.iataCode)}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

