import { Check, X, Luggage, Armchair, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency, getCabinLabel } from '@/lib/utils';
import { formatBrandedFareName, translateAmenity } from '@/lib/amenities';
import { Button, Card } from '@/components/ui';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Fare Comparison Component - Compare different fare options
// ============================================================================

interface FareOption {
  id: string;
  name: string;
  brandedFare?: string;
  cabin: string;
  price: number;
  currency: string;
  features: FareFeature[];
  isRecommended?: boolean;
}

interface FareFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface FareComparisonProps {
  offers: FlightOffer[];
  selectedOfferId?: string;
  onSelectOffer: (offer: FlightOffer) => void;
  className?: string;
}

export function FareComparison({ offers, selectedOfferId, onSelectOffer, className }: FareComparisonProps) {
  // Transform offers into fare options
  const fareOptions: (FareOption & { offer: FlightOffer })[] = offers.map((offer) => {
    const fareDetails = offer.travelerPricings[0]?.fareDetailsBySegment[0];
    const amenities = fareDetails?.amenities || [];

    // Calculate price per person (use first adult's price)
    const adultPricing = offer.travelerPricings.find(tp => tp.travelerType === 'ADULT');
    const pricePerPerson = adultPricing?.price?.total
      ? parseFloat(adultPricing.price.total)
      : parseFloat(offer.price.total) / offer.travelerPricings.length;

    return {
      id: offer.id,
      name: fareDetails?.brandedFareLabel ? formatBrandedFareName(fareDetails.brandedFareLabel) : getCabinLabel(fareDetails?.cabin || 'ECONOMY'),
      brandedFare: fareDetails?.brandedFare,
      cabin: fareDetails?.cabin || 'ECONOMY',
      price: pricePerPerson,
      currency: offer.price.currency,
      isRecommended: fareDetails?.brandedFare?.includes('CLASSIC'),
      features: [
        {
          name: 'Handgepäck',
          included: true,
          description: '1x max. 8kg'
        },
        {
          name: 'Aufgabegepäck',
          included: !!fareDetails?.includedCheckedBags?.weight || !!fareDetails?.includedCheckedBags?.quantity,
          description: fareDetails?.includedCheckedBags?.weight
            ? `${fareDetails.includedCheckedBags.weight}kg`
            : fareDetails?.includedCheckedBags?.quantity
              ? `${fareDetails.includedCheckedBags.quantity}x`
              : undefined
        },
        {
          name: translateAmenity('Sitzplatzwahl', 'PRE_RESERVED_SEAT'),
          included: amenities.some(a => a.amenityType === 'PRE_RESERVED_SEAT' && !a.isChargeable) ?? false,
        },
        {
          name: translateAmenity('Umbuchbar', 'CHANGEABLE_TICKET'),
          included: fareDetails?.cabin !== 'ECONOMY' || (fareDetails?.brandedFare?.includes('FLEX') ?? false),
        },
        {
          name: translateAmenity('Priority Boarding', 'PRIORITY_BOARDING'),
          included: fareDetails?.cabin === 'BUSINESS' || fareDetails?.cabin === 'FIRST',
        },
        {
          name: translateAmenity('Lounge-Zugang', 'LOUNGE'),
          included: fareDetails?.cabin === 'BUSINESS' || fareDetails?.cabin === 'FIRST',
        },
      ],
      offer,
    };
  });

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {fareOptions.map((fare, index) => (
        <motion.div
          key={fare.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={cn(
              'relative cursor-pointer overflow-hidden transition-all hover:shadow-lg',
              selectedOfferId === fare.id && 'ring-2 ring-pink-500',
              fare.isRecommended && 'border-pink-500'
            )}
            onClick={() => onSelectOffer(fare.offer)}
          >
            {/* Recommended Badge */}
            {fare.isRecommended && (
              <div className="absolute right-0 top-0 rounded-bl-lg bg-pink-500 px-3 py-1 text-xs font-medium text-white">
                Empfohlen
              </div>
            )}

            {/* Header */}
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FareIcon cabin={fare.cabin} />
                <div>
                  <h3 className="font-semibold">{fare.name}</h3>
                  <p className="text-xs text-gray-500">{getCabinLabel(fare.cabin)}</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="p-4">
              <ul className="space-y-2">
                {fare.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300" />
                    )}
                    <span className={feature.included ? '' : 'text-gray-400'}>
                      {feature.name}
                      {feature.description && feature.included && (
                        <span className="ml-1 text-gray-500">({feature.description})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price & Action */}
            <div className="border-t border-gray-100 p-4 dark:border-gray-800">
              <div className="mb-3 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(fare.price, fare.currency)}
                </div>
                <div className="text-xs text-gray-500">pro Person</div>
              </div>
              <Button
                className="w-full"
                variant={selectedOfferId === fare.id ? 'default' : 'outline'}
              >
                {selectedOfferId === fare.id ? 'Ausgewählt' : 'Auswählen'}
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function FareIcon({ cabin }: { cabin: string }) {
  const iconClass = 'h-8 w-8 p-1.5 rounded-lg';

  switch (cabin) {
    case 'FIRST':
      return <Crown className={cn(iconClass, 'bg-amber-100 text-amber-600 dark:bg-amber-900/30')} />;
    case 'BUSINESS':
      return <Armchair className={cn(iconClass, 'bg-purple-100 text-purple-600 dark:bg-purple-900/30')} />;
    case 'PREMIUM_ECONOMY':
      return <Armchair className={cn(iconClass, 'bg-pink-100 text-pink-500 dark:bg-pink-900/30')} />;
    default:
      return <Luggage className={cn(iconClass, 'bg-gray-100 text-gray-600 dark:bg-gray-800')} />;
  }
}

