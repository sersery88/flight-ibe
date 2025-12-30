import { X, Plane, Clock, Luggage, Leaf, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Badge, Card } from '@/components/ui';
import { formatCurrency, formatDuration, formatDateTime, formatDate, getCabinLabel } from '@/lib/utils';
import type { FlightOffer, Segment } from '@/types/flight';

// ============================================================================
// Flight Details Modal - Detailed view of a flight offer
// ============================================================================

interface FlightDetailsModalProps {
  offer: FlightOffer | null;
  isOpen: boolean;
  onClose: () => void;
  onContinue: (offer: FlightOffer) => void;
}

export function FlightDetailsModal({ offer, isOpen, onClose, onContinue }: FlightDetailsModalProps) {
  if (!offer) return null;

  const fareDetails = offer.travelerPricings[0]?.fareDetailsBySegment[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 z-50 mx-auto my-auto max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-bold">Flugdetails</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6">
              {/* Itineraries */}
              {offer.itineraries.map((itinerary, idx) => (
                <div key={idx} className="mb-6">
                  <h3 className="mb-4 text-sm font-medium uppercase text-gray-500">
                    {idx === 0 ? 'Hinflug' : 'Rückflug'} • {formatDate(itinerary.segments[0].departure.at)}
                  </h3>
                  
                  <div className="space-y-4">
                    {itinerary.segments.map((segment) => (
                      <SegmentCard key={segment.id} segment={segment} />
                    ))}
                  </div>
                  
                  {/* Layover indicator */}
                  {itinerary.segments.length > 1 && (
                    <div className="mt-2 text-center text-sm text-gray-500">
                      Gesamtdauer: {formatDuration(itinerary.duration)}
                    </div>
                  )}
                </div>
              ))}

              {/* Fare Info */}
              {fareDetails && (
                <Card className="mb-6 p-4">
                  <h4 className="mb-3 font-semibold">Tarifdetails</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Kabine:</span>
                      <span className="ml-2 font-medium">{getCabinLabel(fareDetails.cabin)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Buchungsklasse:</span>
                      <span className="ml-2 font-medium">{fareDetails.class}</span>
                    </div>
                    {fareDetails.brandedFareLabel && (
                      <div className="col-span-2">
                        <Badge variant="secondary">{fareDetails.brandedFareLabel}</Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Baggage */}
                  {fareDetails.includedCheckedBags && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <Luggage className="h-5 w-5 text-pink-500" />
                      <span>
                        Inkl. Freigepäck: {fareDetails.includedCheckedBags.weight 
                          ? `${fareDetails.includedCheckedBags.weight} kg` 
                          : `${fareDetails.includedCheckedBags.quantity || 0} Stück`}
                      </span>
                    </div>
                  )}

                  {/* Amenities */}
                  {fareDetails.amenities && fareDetails.amenities.length > 0 && (
                    <div className="mt-4">
                      <h5 className="mb-2 text-sm font-medium text-gray-500">Leistungen</h5>
                      <div className="flex flex-wrap gap-2">
                        {fareDetails.amenities.map((amenity, i) => (
                          <Badge key={i} variant={amenity.isChargeable ? 'outline' : 'secondary'}>
                            {amenity.description}
                            {amenity.isChargeable && ' (€)'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Price Summary */}
              <div className="rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-80">Gesamtpreis</div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(parseFloat(offer.price.total), offer.price.currency)}
                    </div>
                    <div className="text-sm opacity-80">
                      {offer.travelerPricings.length} Reisende(r) inkl. Steuern & Gebühren
                    </div>
                  </div>
                  <Button size="lg" variant="secondary" onClick={() => onContinue(offer)} className="gap-2">
                    Weiter zur Buchung <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Segment Card - Single flight segment details
// ============================================================================

function SegmentCard({ segment }: { segment: Segment }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch">
        {/* Airline */}
        <div className="flex w-20 flex-col items-center justify-center border-r border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-bold shadow dark:bg-gray-700">
            {segment.carrierCode}
          </div>
          <div className="mt-1 text-xs text-gray-500">{segment.carrierCode}{segment.number}</div>
        </div>
        
        {/* Flight Info */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between">
            {/* Departure */}
            <div>
              <div className="text-2xl font-bold">{formatDateTime(segment.departure.at, 'time')}</div>
              <div className="text-sm text-gray-500">{segment.departure.iataCode}</div>
              {segment.departure.terminal && (
                <div className="text-xs text-gray-400">Terminal {segment.departure.terminal}</div>
              )}
            </div>
            
            {/* Duration */}
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {formatDuration(segment.duration)}
              </div>
              <div className="my-1 h-0.5 w-24 bg-gray-200 dark:bg-gray-700" />
              <Plane className="h-4 w-4 rotate-90 text-pink-500" />
            </div>
            
            {/* Arrival */}
            <div className="text-right">
              <div className="text-2xl font-bold">{formatDateTime(segment.arrival.at, 'time')}</div>
              <div className="text-sm text-gray-500">{segment.arrival.iataCode}</div>
              {segment.arrival.terminal && (
                <div className="text-xs text-gray-400">Terminal {segment.arrival.terminal}</div>
              )}
            </div>
          </div>
          
          {/* CO2 */}
          {segment.co2Emissions && segment.co2Emissions.length > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
              <Leaf className="h-3 w-3" />
              {segment.co2Emissions[0].weight} {segment.co2Emissions[0].weightUnit} CO₂
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

