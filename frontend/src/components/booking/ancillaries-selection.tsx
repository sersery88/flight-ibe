import { useState, useMemo, useRef, useEffect } from 'react';
import { Luggage, Check, Plus, Plane, Briefcase, Coffee, Tv, Zap, Wifi, Crown, UtensilsCrossed, ChevronDown, Minus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge } from '@/components/ui';
import { cn, formatCurrency } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking-store';
import type { FlightOffer } from '@/types/flight';

// Amenities to EXCLUDE from display (fare rules, not bookable extras)
const EXCLUDED_AMENITY_KEYWORDS = [
  'REFUND', 'CHANGE', 'TICKET', 'SEAT', 'LEGROOM', 'MILEAGE', 'MILES', 'ACCRUAL',
  'PREMIUM SEAT', 'PRE-RESERVED', 'SELECTION', 'ASSIGNMENT', 'BRANDED FARES'
];

// Map amenity types to icons
const getAmenityIcon = (amenityType: string | undefined, description?: string) => {
  const type = (amenityType || '').toUpperCase();
  const desc = (description || '').toUpperCase();
  if (type.includes('BAGGAGE') || type.includes('BAG') || desc.includes('BAG')) return <Luggage className="h-5 w-5" />;
  if (type.includes('MEAL') || type.includes('FOOD') || type.includes('SNACK') || desc.includes('MEAL')) return <UtensilsCrossed className="h-5 w-5" />;
  if (type.includes('WIFI') || type.includes('INTERNET') || desc.includes('WI-FI')) return <Wifi className="h-5 w-5" />;
  if (type.includes('ENTERTAINMENT') || desc.includes('ENTERTAINMENT')) return <Tv className="h-5 w-5" />;
  if (type.includes('BEVERAGE') || desc.includes('BEVERAGE') || desc.includes('DRINK')) return <Coffee className="h-5 w-5" />;
  if (type.includes('STREAMING') || desc.includes('STREAMING')) return <Tv className="h-5 w-5" />;
  if (type.includes('POWER') || desc.includes('USB') || desc.includes('POWER')) return <Zap className="h-5 w-5" />;
  if (type.includes('LOUNGE') || desc.includes('LOUNGE')) return <Crown className="h-5 w-5" />;
  if (type.includes('PRIORITY') || desc.includes('PRIORITY')) return <Zap className="h-5 w-5" />;
  if (desc.includes('CARRY') || desc.includes('CABIN') || desc.includes('PERSONAL')) return <Briefcase className="h-5 w-5" />;
  return <Check className="h-5 w-5" />;
};

// Check if amenity should be excluded
const shouldExcludeAmenity = (description: string, amenityType?: string): boolean => {
  const desc = (description || '').toUpperCase();
  const type = (amenityType || '').toUpperCase();
  return EXCLUDED_AMENITY_KEYWORDS.some(keyword => desc.includes(keyword) || type.includes(keyword));
};

// Translate amenity descriptions to German
const translateAmenity = (description: string, _amenityType?: string): string => {
  const desc = description.toUpperCase();
  // Baggage
  if (desc.includes('CHECKED BAG') || desc.includes('HOLD BAGGAGE')) {
    if (desc.includes('NOT INCLUDED') || desc.includes('NOT OFFERED')) return 'Aufgabegepäck nicht inkludiert';
    return 'Aufgabegepäck';
  }
  if (desc.includes('CARRY-ON') || desc.includes('CABIN BAG')) return 'Handgepäck';
  if (desc.includes('PERSONAL ITEM')) return 'Persönlicher Gegenstand';
  // Meals
  if (desc.includes('MEAL') || desc.includes('SNACK')) {
    if (desc.includes('NOT INCLUDED') || desc.includes('NOT OFFERED') || desc.includes('FOR PURCHASE'))
      return 'Bordverpflegung (gegen Gebühr)';
    return 'Bordverpflegung';
  }
  if (desc.includes('BEVERAGE') || desc.includes('DRINK')) return 'Getränke';
  // Entertainment
  if (desc.includes('ENTERTAINMENT') || desc.includes('IFE')) return 'Bordunterhaltung';
  if (desc.includes('STREAMING')) return 'Streaming';
  // WiFi
  if (desc.includes('WIFI') || desc.includes('WI-FI')) return 'WLAN an Bord';
  // Power
  if (desc.includes('USB') || desc.includes('POWER')) return 'Strom/USB';
  // Lounge
  if (desc.includes('LOUNGE')) return 'Lounge-Zugang';
  // Priority
  if (desc.includes('PRIORITY')) return 'Priority Boarding';
  // Return original if no translation found
  return description;
};

// Special meal options (SSR codes)
const SPECIAL_MEAL_OPTIONS = [
  { code: 'VGML', name: 'Vegetarisch' },
  { code: 'VLML', name: 'Vegetarisch (Lacto-Ovo)' },
  { code: 'AVML', name: 'Hindu (Vegetarisch)' },
  { code: 'HNML', name: 'Hindu (Non-Veg)' },
  { code: 'MOML', name: 'Muslimisch/Halal' },
  { code: 'KSML', name: 'Koscher' },
  { code: 'GFML', name: 'Glutenfrei' },
  { code: 'DBML', name: 'Diabetiker' },
  { code: 'LFML', name: 'Fettarm' },
  { code: 'LSML', name: 'Natriumarm' },
  { code: 'BLML', name: 'Schonkost' },
  { code: 'CHML', name: 'Kindermenü' },
  { code: 'BBML', name: 'Babynahrung' },
  { code: 'SFML', name: 'Meeresfrüchte' },
];

interface DynamicAncillaryOption {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  basePrice: number;
  /** How the ancillary is priced/booked */
  pricingUnit: 'per-booking' | 'per-od' | 'per-segment';
  maxQuantity: number;
  isFromApi: boolean;
  isIncluded: boolean;
  isChargeable: boolean;
  hasSubTypes?: boolean;
  subType?: string;
}

interface AncillariesSelectionProps {
  offer: FlightOffer;
  className?: string;
}

export function AncillariesSelection({ offer, className }: AncillariesSelectionProps) {
  const { travelers, selectedAncillaries, addAncillary, removeAncillary, availableBagOptions } = useBookingStore();
  const [selectedTraveler, setSelectedTraveler] = useState(0);
  const [specialMealDropdownOpen, setSpecialMealDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSpecialMealDropdownOpen(false);
      }
    };

    if (specialMealDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [specialMealDropdownOpen]);

  const currency = offer.price.currency;
  const segments = offer.itineraries.flatMap(it => it.segments);
  const segmentCount = segments.length;
  const airline = offer.validatingAirlineCodes?.[0] || 'XX';

  // Collect and filter relevant amenities from all segments
  const includedAmenities = useMemo(() => {
    const amenityMap = new Map<string, { name: string; icon: React.ReactNode }>();

    offer.travelerPricings?.forEach(tp => {
      tp.fareDetailsBySegment?.forEach(fd => {
        fd.amenities?.forEach(amenity => {
          // Skip excluded amenities
          if (shouldExcludeAmenity(amenity.description, amenity.amenityType)) return;
          // Only include non-chargeable amenities
          if (amenity.isChargeable) return;

          const translatedName = translateAmenity(amenity.description, amenity.amenityType);
          // Avoid duplicates by translated name
          if (!amenityMap.has(translatedName)) {
            amenityMap.set(translatedName, {
              name: translatedName,
              icon: getAmenityIcon(amenity.amenityType, amenity.description),
            });
          }
        });
      });
    });

    return Array.from(amenityMap.values());
  }, [offer]);

  // Get included checked bags info
  const fareDetails = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
  const includedBags = fareDetails?.includedCheckedBags;

  // Count itineraries (O/D = Origin/Destination, e.g. outbound + return)
  const itineraryCount = offer.itineraries.length;

  // Build itinerary labels for direction selection
  const itineraryLabels = useMemo(() => {
    return offer.itineraries.map((it, idx) => {
      const firstSeg = it.segments[0];
      const lastSeg = it.segments[it.segments.length - 1];
      const from = firstSeg?.departure?.iataCode || '???';
      const to = lastSeg?.arrival?.iataCode || '???';
      return {
        id: idx,
        label: `${from} → ${to}`,
        short: idx === 0 ? 'Hinflug' : 'Rückflug',
      };
    });
  }, [offer]);

  // Build purchasable ancillary options - only show what can actually be booked
  // Note: The Amadeus API provides baggage info through amenities and additionalServices
  // We show special meals which are free SSR requests
  const purchasableOptions = useMemo((): DynamicAncillaryOption[] => {
    const options: DynamicAncillaryOption[] = [];

    // Add dynamic baggage options from the pricing API
    if (availableBagOptions && Object.keys(availableBagOptions).length > 0) {
      Object.entries(availableBagOptions).forEach(([bagId, bagOption]) => {
        const price = bagOption.price ? parseFloat(bagOption.price.amount) : 0;
        const quantity = bagOption.quantity || 1;
        const weight = bagOption.weight;
        const weightUnit = bagOption.weightUnit || 'KG';

        // Determine if this is per-itinerary or per-segment
        const isPerItinerary = bagOption.bookableByItinerary;

        // Build description
        let description = '';
        if (weight) {
          description = `${quantity}x Gepäckstück (${weight}${weightUnit})`;
        } else {
          description = `${quantity}x Aufgabegepäck`;
        }

        // Add segment info if available
        if (bagOption.segmentIds && bagOption.segmentIds.length > 0) {
          const segmentLabels = bagOption.segmentIds.map(segId => {
            const seg = segments.find(s => s.id === segId);
            if (seg) {
              return `${seg.departure.iataCode}→${seg.arrival.iataCode}`;
            }
            return segId;
          });
          description += ` (${segmentLabels.join(', ')})`;
        }

        options.push({
          id: `bag-${bagId}`,
          type: `CHECKED_BAG_${bagId}`,
          name: `Zusatzgepäck (${quantity} ${quantity === 1 ? 'Stück' : 'Stücke'})`,
          description,
          icon: <Luggage className="h-5 w-5" />,
          basePrice: price,
          pricingUnit: isPerItinerary ? 'per-od' : 'per-booking',
          maxQuantity: 1,
          isFromApi: true,
          isIncluded: false,
          isChargeable: true,
          hasSubTypes: false,
        });
      });
    }

    return options;
  }, [availableBagOptions, currency, segments]);

  // Only show chargeable options from API
  const chargeableOptions = purchasableOptions.filter(o => o.isChargeable);

  const getAncillaryCount = (type: string, travelerId: string, subType?: string) => {
    return selectedAncillaries.filter(a =>
      a.type === type &&
      a.travelerId === travelerId &&
      (!subType || a.subType === subType)
    ).length;
  };

  // Check if a specific itinerary direction is selected for an ancillary
  const isItinerarySelected = (type: string, travelerId: string, itineraryIdx: number): boolean => {
    return selectedAncillaries.some(a =>
      a.type === type &&
      a.travelerId === travelerId &&
      a.itineraryId === itineraryIdx
    );
  };

  const getSelectedMealSubType = (travelerId: string) => {
    const meal = selectedAncillaries.find(a => a.type === 'MEAL_SPECIAL' && a.travelerId === travelerId);
    return meal?.subType || null;
  };

  // Calculate price based on pricing unit - for per-od with single direction, just base price
  const calculatePrice = (option: DynamicAncillaryOption, forSingleDirection?: boolean): number => {
    switch (option.pricingUnit) {
      case 'per-segment':
        return option.basePrice * segmentCount;
      case 'per-od':
        // If calculating for single direction, use base price
        if (forSingleDirection) return option.basePrice;
        return option.basePrice * itineraryCount;
      case 'per-booking':
      default:
        return option.basePrice;
    }
  };

  // Get pricing unit label
  const getPricingUnitLabel = (option: DynamicAncillaryOption): string => {
    switch (option.pricingUnit) {
      case 'per-segment':
        return `${formatCurrency(option.basePrice, currency)}/Segment`;
      case 'per-od':
        return `${formatCurrency(option.basePrice, currency)}/Richtung`;
      case 'per-booking':
      default:
        return '';
    }
  };

  const handleAdd = (option: DynamicAncillaryOption, subType?: string) => {
    const travelerId = `traveler-${selectedTraveler + 1}`;
    const price = calculatePrice(option);

    if (option.hasSubTypes) {
      removeAncillary(option.type, travelerId);
    }

    addAncillary({
      type: option.type,
      subType,
      travelerId,
      price,
    });

    if (option.hasSubTypes) {
      setSpecialMealDropdownOpen(false);
    }
  };

  // Handle add for specific itinerary direction
  const handleAddForItinerary = (option: DynamicAncillaryOption, itineraryIdx: number) => {
    const travelerId = `traveler-${selectedTraveler + 1}`;
    const price = option.basePrice; // Single direction price

    addAncillary({
      type: option.type,
      travelerId,
      itineraryId: itineraryIdx,
      price,
    });
  };

  // Handle remove for specific itinerary direction
  const handleRemoveForItinerary = (option: DynamicAncillaryOption, itineraryIdx: number) => {
    const travelerId = `traveler-${selectedTraveler + 1}`;
    removeAncillary(option.type, travelerId, itineraryIdx);
  };

  const handleRemove = (option: DynamicAncillaryOption) => {
    const travelerId = `traveler-${selectedTraveler + 1}`;
    removeAncillary(option.type, travelerId);
  };

  const totalAncillariesPrice = selectedAncillaries.reduce((sum, a) => sum + a.price, 0);

  // Render a single ancillary option card
  const renderAncillaryCard = (option: DynamicAncillaryOption) => {
    const count = getAncillaryCount(option.type, `traveler-${selectedTraveler + 1}`);
    const price = calculatePrice(option);
    const unitLabel = getPricingUnitLabel(option);

    return (
      <Card
        key={option.id}
        className={cn(
          'relative transition-all',
          count > 0 && 'ring-2 ring-primary',
          option.isIncluded && 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg shrink-0',
              option.isIncluded
                ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-400'
                : count > 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}>
              {option.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{option.name}</h3>
                {option.isIncluded && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300">
                    <Check className="h-3 w-3 mr-1" />
                    Inklusive
                  </Badge>
                )}
                {option.isFromApi && !option.isIncluded && (
                  <Badge variant="outline" className="text-xs">{airline}</Badge>
                )}
                {option.hasSubTypes && count > 0 && (
                  <Badge variant="default" className="text-xs">
                    {SPECIAL_MEAL_OPTIONS.find(m => m.code === getSelectedMealSubType(`traveler-${selectedTraveler + 1}`))?.name}
                  </Badge>
                )}
              </div>

              {!option.isIncluded && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{option.description}</p>
              )}

              {/* Special Meal Dropdown */}
              {option.hasSubTypes && !option.isIncluded && (
                <div ref={dropdownRef} className="mt-3 relative">
                  <button
                    type="button"
                    onClick={() => setSpecialMealDropdownOpen(!specialMealDropdownOpen)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-sm',
                      count > 0
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                    )}
                  >
                    <span className={count > 0 ? 'text-primary font-medium' : 'text-gray-500'}>
                      {count > 0
                        ? SPECIAL_MEAL_OPTIONS.find(m => m.code === getSelectedMealSubType(`traveler-${selectedTraveler + 1}`))?.name || 'Ausgewählt'
                        : 'Menü auswählen...'}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', specialMealDropdownOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {specialMealDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
                      >
                        {SPECIAL_MEAL_OPTIONS.map((meal) => (
                          <button
                            key={meal.code}
                            type="button"
                            onClick={() => handleAdd(option, meal.code)}
                            className={cn(
                              'w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                              getSelectedMealSubType(`traveler-${selectedTraveler + 1}`) === meal.code && 'bg-primary/10'
                            )}
                          >
                            <div className="font-medium text-sm">{meal.name}</div>
                            <div className="text-xs text-gray-500">{meal.code}</div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {count > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemove(option)}
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Entfernen
                    </Button>
                  )}
                </div>
              )}

              {/* Price and Controls for purchasable items */}
              {!option.hasSubTypes && !option.isIncluded && option.isChargeable && option.basePrice > 0 && (
                <>
                  {/* Per-direction selection for round trips */}
                  {option.pricingUnit === 'per-od' && itineraryCount > 1 ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Richtung auswählen:
                      </div>
                      {itineraryLabels.map((itinerary) => {
                        const isSelected = isItinerarySelected(option.type, `traveler-${selectedTraveler + 1}`, itinerary.id);
                        return (
                          <div
                            key={itinerary.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border transition-all',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Plane className={cn('h-4 w-4', itinerary.id === 1 && 'rotate-180')} />
                              <span className="font-medium">{itinerary.short}</span>
                              <span className="text-sm text-gray-500">{itinerary.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{formatCurrency(option.basePrice, currency)}</span>
                              <Button
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => isSelected
                                  ? handleRemoveForItinerary(option, itinerary.id)
                                  : handleAddForItinerary(option, itinerary.id)
                                }
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Ausgewählt
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Hinzufügen
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Standard add/remove controls for non per-od options */
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold">{formatCurrency(price, currency)}</span>
                        {unitLabel && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({unitLabel})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {count > 0 && (
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRemove(option)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                        {count > 0 && <span className="w-8 text-center font-semibold">{count}</span>}
                        <Button
                          variant={count > 0 ? 'outline' : 'default'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleAdd(option)}
                          disabled={count >= option.maxQuantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selected indicator */}
        <AnimatePresence>
          {count > 0 && !option.isIncluded && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute right-2 top-2"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Airline info */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Plane className="h-4 w-4" />
        <span>Zusatzleistungen für {airline} Flug</span>
        <span className="text-gray-400">•</span>
        <span>{segmentCount} Segment{segmentCount > 1 ? 'e' : ''}</span>
      </div>

      {/* Traveler selector (if multiple travelers) */}
      {travelers.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {travelers.map((t, idx) => (
            <Button
              key={idx}
              variant={selectedTraveler === idx ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTraveler(idx)}
            >
              {t.firstName || `Reisender ${idx + 1}`}
            </Button>
          ))}
        </div>
      )}

      {/* Included amenities section - compact display from API */}
      {(includedAmenities.length > 0 || includedBags) && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20">
          <div className="p-4">
            <h3 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
              <Check className="h-5 w-5" />
              Im Tarif enthalten
            </h3>
            <div className="flex flex-wrap gap-3">
              {/* Baggage info */}
              {includedBags && (includedBags.weight || includedBags.quantity) && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
                  <Luggage className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    Freigepäck: {includedBags.weight
                      ? `${includedBags.weight}${includedBags.weightUnit || 'KG'}`
                      : `${includedBags.quantity} Stück`
                    }
                  </span>
                </div>
              )}
              {/* Dynamic amenities from API */}
              {includedAmenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700"
                >
                  <span className="text-green-600">{amenity.icon}</span>
                  <span className="text-sm font-medium">{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Info about additional services - only show if no bag options from API */}
      {chargeableOptions.length === 0 && (
        <Card className="border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/20">
          <div className="p-4">
            <h3 className="font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-2 mb-2">
              <Info className="h-5 w-5" />
              Zusatzgepäck & Extras
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Zusätzliches Gepäck, Priority Boarding und weitere Extras können nach Abschluss der Buchung
              direkt bei der Fluggesellschaft ({airline}) hinzugebucht werden. Die Preise und Verfügbarkeit
              variieren je nach Strecke und Tarif.
            </p>
          </div>
        </Card>
      )}

      {/* Purchasable extras section - only show if there are chargeable options */}
      {chargeableOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Luggage className="h-5 w-5" />
            Zusatzgepäck buchen
          </h3>
          <p className="text-sm text-muted-foreground">
            Buchen Sie jetzt zusätzliches Gepäck zu Ihrem Flug. Die Preise werden direkt von der Fluggesellschaft bereitgestellt.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {chargeableOptions.map(renderAncillaryCard)}
          </div>
        </div>
      )}

      {/* Total */}
      {totalAncillariesPrice > 0 && (
        <Card className="border-primary bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Zusatzleistungen gesamt</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(totalAncillariesPrice, currency)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

