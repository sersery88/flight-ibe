'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Plane, Clock, Luggage, ChevronRight, ChevronDown, ChevronUp, Check, X, Loader2, Leaf, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn, formatCurrency, formatDuration, formatDateTime, getStopsLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getUpsellOffers } from '@/lib/api-client';
import { formatBrandedFareName, translateAmenity } from '@/lib/amenities';
import { formatAircraftType } from '@/lib/aircraft';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';
import type { FlightOffer, Segment } from '@/types/flight';

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
  const airlineName = formatAirlineName(carrierCode);

  const logoElement = hasError ? (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-muted text-xs font-bold',
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
    <Tooltip>
      <TooltipTrigger>
        <span className="cursor-help">{logoElement}</span>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{airlineName}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Flight Card Component - Display a single flight offer (memoized)
// ============================================================================

interface FlightCardProps {
  offer: FlightOffer;
  onSelect: (offer: FlightOffer) => void;
  isSelected?: boolean;
  className?: string;
}

export const FlightCard = memo(function FlightCard({ offer, onSelect, isSelected, className }: FlightCardProps) {
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
  const allFareOptions = useMemo(() => {
    if (upsellOffers.length === 0) return [offer];

    const fareMap = new Map<string, FlightOffer>();
    const originalFare = offer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || 'ORIGINAL';
    fareMap.set(originalFare, offer);

    for (const upsellOffer of upsellOffers) {
      const fareCode = upsellOffer.travelerPricings[0]?.fareDetailsBySegment[0]?.brandedFare || upsellOffer.id;
      const existing = fareMap.get(fareCode);

      if (!existing || parseFloat(upsellOffer.price.total) < parseFloat(existing.price.total)) {
        fareMap.set(fareCode, upsellOffer);
      }
    }

    return Array.from(fareMap.values()).sort(
      (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
    );
  }, [offer, upsellOffers]);

  return (
    <div className="w-full">
      <Card
        className={cn(
          'w-full cursor-pointer transition-all hover:shadow-lg',
          isSelected && 'ring-2 ring-primary',
          isExpanded && 'ring-1 ring-border',
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
              <div className="my-4 border-t border-dashed border-border" />
              <FlightSegmentRow
                segments={returnFlight.segments}
                duration={returnFlight.duration}
                label="Rückflug"
                fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(outboundSegmentCount)}
              />
            </>
          )}

          {/* Expanded Flight Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="mt-6 space-y-6 rounded-2xl bg-muted/30 p-4 sm:p-6 border border-border/50">
                  {/* Outbound Details */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 border-b border-border/50 pb-2">
                      <h5 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wider text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        Hinflug
                      </h5>
                      <span className="text-base font-normal">{formattedDepartureDate}</span>
                    </div>
                    <FlightDetailsSection
                      segments={outbound.segments}
                      fareDetails={selectedTravelerPricing?.fareDetailsBySegment?.slice(0, outboundSegmentCount)}
                    />
                  </div>

                  {/* Return Details */}
                  {returnFlight && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-border/50 pb-2 pt-2">
                        <h5 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wider text-muted-foreground">
                          <Plane className="h-4 w-4 rotate-180" />
                          Rückflug
                        </h5>
                        <span className="text-base font-normal">
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
                    <div className="flex gap-2">
                      {totalJourneyCo2 > 0 && (
                        <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          <Leaf className="mr-1 h-3 w-3" />
                          Gesamt {totalJourneyCo2.toFixed(0)} kg CO₂
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer: Fare Type, CO2, Price & Action */}
          <div
            data-footer-section
            className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:mt-4 sm:gap-3 sm:pt-4 md:mt-6 md:flex-row md:items-center md:justify-between cursor-pointer"
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
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground sm:gap-1 sm:text-xs">
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
                const selectedAdultPricing = selectedFareOffer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
                const selectedPricePerPerson = selectedAdultPricing?.price?.total
                  ? parseFloat(selectedAdultPricing.price.total)
                  : parseFloat(selectedFareOffer.price.total) / selectedFareOffer.travelerPricings.length;
                const selectedPassengerCount = selectedFareOffer.travelerPricings.length;
                const currency = selectedFareOffer.price.currency;

                return (
                  <div className="min-w-0 text-right">
                    <div className="text-lg font-bold sm:text-xl md:text-2xl">
                      {formatCurrency(selectedPricePerPerson, currency)}
                    </div>
                    <div className="text-[9px] text-muted-foreground sm:text-[10px] md:text-xs">pro Person</div>
                    {selectedPassengerCount > 1 && (
                      <div className="truncate text-[9px] text-muted-foreground sm:text-[10px] md:text-xs">
                        Gesamt: {formatCurrency(parseFloat(selectedFareOffer.price.total), currency)}
                      </div>
                    )}
                  </div>
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

          {/* Fare Selection Section */}
          {showFareSelection && (
            <div data-fare-section className="mt-3 w-full overflow-hidden border-t border-border pt-3 sm:mt-4 sm:pt-4">
              <h4 className="mb-2 text-xs font-semibold sm:mb-3 sm:text-sm">
                Tarif wählen
              </h4>

              {isLoadingUpsell ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary sm:h-6 sm:w-6" />
                  <span className="ml-2 text-xs text-muted-foreground sm:text-sm">Tarife werden geladen...</span>
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
                <p className="py-2 text-xs text-muted-foreground sm:text-sm">
                  Keine weiteren Tarife für diesen Flug verfügbar.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});

// ============================================================================
// Fare Tile - Individual branded fare option tile (memoized)
// ============================================================================

interface FareTileProps {
  offer: FlightOffer;
  isSelected: boolean;
  onSelect: () => void;
}

const FareTile = memo(function FareTile({ offer, isSelected, onSelect }: FareTileProps) {
  const fareDetails = offer.travelerPricings[0]?.fareDetailsBySegment[0];
  const brandedFare = fareDetails?.brandedFareLabel || fareDetails?.brandedFare;
  const cabin = fareDetails?.cabin || 'ECONOMY';
  const checkedBags = fareDetails?.includedCheckedBags;
  const amenities = fareDetails?.amenities || [];

  const getAmenityStatus = (keywords: string[]): { available: boolean; chargeable: boolean } => {
    const amenity = amenities.find((a) =>
      keywords.some((kw) => a.description?.toUpperCase().includes(kw.toUpperCase()))
    );
    if (!amenity) return { available: false, chargeable: false };
    return { available: true, chargeable: amenity.isChargeable };
  };

  const hasBaggage = !!checkedBags?.weight || !!checkedBags?.quantity;
  const seatStatus = getAmenityStatus(['SEAT', 'PRE RESERVED']);
  const hasFreeSeat = seatStatus.available && !seatStatus.chargeable;
  const changeStatus = getAmenityStatus(['CHANGEABLE', 'CHANGE', 'REBOOKING', 'REBOOK']);
  const isChangeable = changeStatus.available;
  const isChangeableFree = changeStatus.available && !changeStatus.chargeable;
  const refundStatus = getAmenityStatus(['REFUNDABLE', 'REFUND', 'CANCELLATION']);
  const isRefundable = refundStatus.available;
  const isRefundableFree = refundStatus.available && !refundStatus.chargeable;

  const getFareName = () => {
    if (brandedFare) return formatBrandedFareName(brandedFare);
    return getCabinLabel(cabin);
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
        'border-border bg-card',
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'hover:border-border/80'
      )}
    >
      <div className="relative">
        {/* Fare Name with badge */}
        <div className="mb-1.5 flex items-center justify-between sm:mb-2">
          <div className="text-xs font-semibold sm:text-sm">
            {getFareName()}
          </div>
          {isSelected && (
            <div className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
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
                isSelected ? "text-primary" : ""
              )}>
                {formatCurrency(tilePricePerPerson, offer.price.currency)}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground sm:ml-1 sm:text-xs">p.P.</span>
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
        <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-primary" />
      )}
    </div>
  );
});

type FeatureStatus = 'included' | 'chargeable' | 'not-available';

const FeatureItem = memo(function FeatureItem({ status, label }: { status: FeatureStatus; label: string }) {
  const getIcon = () => {
    switch (status) {
      case 'included':
      case 'chargeable':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'not-available':
        return <X className="h-3 w-3 text-muted-foreground/30" />;
    }
  };

  const getTextClass = () => {
    switch (status) {
      case 'included':
      case 'chargeable':
        return 'text-foreground/80';
      case 'not-available':
        return 'text-muted-foreground/50';
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
      <span className="shrink-0">{getIcon()}</span>
      <span className={cn("min-w-0 truncate", getTextClass())}>{label}</span>
      {status === 'chargeable' && (
        <span className="shrink-0 text-[9px] font-medium text-foreground/70 sm:text-[10px]">€</span>
      )}
    </div>
  );
});

// ============================================================================
// Flight Segment Row - Shows departure -> arrival with duration (memoized)
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

const FlightSegmentRow = memo(function FlightSegmentRow({ segments, duration, label, fareDetails }: FlightSegmentRowProps) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const stops = segments.length - 1;

  const firstFareDetail = fareDetails?.[0];
  const checkedBags = firstFareDetail?.includedCheckedBags;

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

  const hasAnyAirportChange = stopInfo.some(s => s.hasAirportChange);

  const departureDate = new Date(first.departure.at);
  const arrivalDate = new Date(last.arrival.at);
  const formattedDepartureDate = departureDate.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const isDifferentDay = departureDate.toDateString() !== arrivalDate.toDateString();

  return (
    <div>
      {/* Label with Date and Airline Logos - Full width on mobile */}
      {label && (
        <div className="mb-2 sm:hidden">
          <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">{formattedDepartureDate}</div>
            <div className="flex items-center gap-1">
              {segments.map((seg) => (
                <div key={seg.id} className="flex items-center gap-0.5">
                  <AirlineLogo carrierCode={seg.carrierCode} size={16} showTooltip={true} />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {seg.carrierCode}{seg.number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-[60px] items-center gap-2 sm:min-h-[72px] sm:gap-4">
        {/* Label with Date and Airline Logos - Side on desktop */}
        {label && (
          <div className="hidden shrink-0 sm:flex sm:items-start sm:gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">{formattedDepartureDate}</div>
            </div>
            <div className="flex flex-col gap-0.5 min-h-[48px] justify-start">
              {segments.map((seg) => (
                <div key={seg.id} className="flex items-center gap-1">
                  <AirlineLogo carrierCode={seg.carrierCode} size={20} showTooltip={true} />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {seg.carrierCode}{seg.number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Departure */}
        <div className="w-14 shrink-0 text-left sm:w-20 sm:text-right">
          <div className="text-base font-bold sm:text-lg md:text-xl">
            {formatDateTime(first.departure.at, 'time')}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <div className="text-xs text-muted-foreground sm:text-xs md:text-sm cursor-help hover:text-foreground">
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
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary sm:h-2 sm:w-2" />
            <div className="relative h-0.5 min-w-0 flex-1 bg-border">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "bg-background text-[10px] sm:text-xs",
                    hasAnyAirportChange && "border-destructive/50"
                  )}
                >
                  {stops > 0 ? (
                    <>
                      {hasAnyAirportChange && <AlertTriangle className="mr-0.5 h-2.5 w-2.5 text-destructive sm:mr-1 sm:h-3 sm:w-3" />}
                      {getStopsLabel(stops)}
                    </>
                  ) : (
                    'Direkt'
                  )}
                </Badge>
              </div>
            </div>
            <Plane className="h-3 w-3 shrink-0 rotate-90 text-primary sm:h-4 sm:w-4" />
          </div>
          {/* Show layover time for stops, total duration for direct */}
          <div className="mt-1.5 flex items-center gap-0.5 text-[9px] sm:mt-2 sm:gap-1 sm:text-[10px] md:text-xs">
            <Clock className="h-2.5 w-2.5 shrink-0 text-muted-foreground sm:h-3 sm:w-3" />
            {stops > 0 ? (
              <span className={cn(
                "min-w-0 truncate text-muted-foreground",
                hasAnyAirportChange && "text-destructive"
              )}>
                {stopInfo.map(s => {
                  if (s.hasAirportChange) {
                    return `${s.layover} Wechsel ${s.arrivalAirport}→${s.departureAirport}`;
                  }
                  return `${s.layover} in ${s.arrivalAirport}`;
                }).join(', ')}
              </span>
            ) : (
              <span className="text-muted-foreground">{formatDuration(duration)}</span>
            )}
          </div>
        </div>

        {/* Arrival */}
        <div className="w-14 shrink-0 sm:w-20">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-base font-bold sm:text-lg md:text-xl">
              {formatDateTime(last.arrival.at, 'time')}
            </span>
            {isDifferentDay && (
              <span className="text-[10px] text-orange-500 sm:text-xs" title={arrivalDate.toLocaleDateString('de-DE')}>
                +1
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <div className="text-xs text-muted-foreground sm:text-xs md:text-sm cursor-help hover:text-foreground">
                {last.arrival.iataCode}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatAirportName(last.arrival.iataCode)}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* RBD/Baggage - vertical stack */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex w-10 flex-col items-center gap-1 sm:w-12">
            {firstFareDetail?.class && (
              <Badge variant="outline" className="text-[9px] font-semibold sm:text-[10px] md:text-xs">
                {firstFareDetail.class}
              </Badge>
            )}
            {checkedBags && (
              <Badge variant="secondary" className="gap-0.5 text-[9px] sm:gap-1 sm:text-[10px] md:text-xs">
                <Luggage className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {checkedBags.weight || checkedBags.quantity || 0}
                {checkedBags.weight ? 'kg' : 'x'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

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

const FlightDetailsSection = memo(function FlightDetailsSection({ segments, fareDetails }: FlightDetailsSectionProps) {
  return (
    <div className="space-y-4">
      {segments.map((seg, idx) => (
        <div key={seg.id} className="relative">
          {/* Segment Info Header */}
          <div className="flex items-start gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border">
              <AirlineLogo carrierCode={seg.carrierCode} size={24} showTooltip={false} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-normal leading-tight">
                {formatAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.number}
              </span>
              <div className="flex flex-col mt-0.5">
                {seg.aircraft?.code && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatAircraftType(seg.aircraft.code)}
                    {fareDetails?.[idx] && (
                      <span className="ml-1">
                        • {getCabinLabel(fareDetails[idx].cabin || 'ECONOMY')} ({fareDetails[idx].class})
                      </span>
                    )}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-xs font-normal text-muted-foreground">
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

          {/* Vertical Timeline */}
          <div className="relative ml-[15.5px] border-l border-border pl-6 py-1 space-y-4">
            {/* Departure */}
            <div className="relative">
              <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full border-2 border-background bg-muted-foreground" />
              <div className="flex items-baseline gap-2">
                <span className="text-base font-normal">{formatDateTime(seg.departure.at, 'time')}</span>
                <span className="text-base font-bold">
                  {seg.departure.iataCode}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {formatAirportName(seg.departure.iataCode, 'full')}
                </span>
                {seg.departure.terminal && (
                  <span className="text-[11px] text-muted-foreground font-normal px-1.5 py-0.5 bg-muted rounded">
                    Terminal {seg.departure.terminal}
                  </span>
                )}
              </div>
            </div>

            {/* Arrival */}
            <div className="relative">
              <div className="absolute -left-[30px] top-1.5 h-2 w-2 rounded-full border-2 border-background bg-muted-foreground" />
              <div className="flex items-baseline gap-2">
                <span className="text-base font-normal">{formatDateTime(seg.arrival.at, 'time')}</span>
                <span className="text-base font-bold">
                  {seg.arrival.iataCode}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {formatAirportName(seg.arrival.iataCode, 'full')}
                </span>
                {seg.arrival.terminal && (
                  <span className="text-[11px] text-muted-foreground font-normal px-1.5 py-0.5 bg-muted rounded">
                    Terminal {seg.arrival.terminal}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Operating Info */}
          {seg.operating && seg.operating.carrierCode !== seg.carrierCode && (
            <div className="ml-[15.5px] pl-6 mt-1 text-xs font-normal text-muted-foreground italic">
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
              <div className="ml-[15.5px] border-l border-dashed border-border pl-6 py-4 my-1">
                <div className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal shadow-sm border transition-colors",
                  hasAirportChange
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-muted text-muted-foreground border-border"
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
});
