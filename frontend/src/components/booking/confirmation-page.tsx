import { CheckCircle, Plane, Download, Mail, Calendar, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card, Badge } from '@/components/ui';
import { cn, formatDateTime, formatCurrency } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking-store';

// ============================================================================
// Confirmation Page - Booking Success Display
// ============================================================================

interface ConfirmationPageProps {
  onNewSearch: () => void;
  className?: string;
}

export function ConfirmationPage({ onNewSearch, className }: ConfirmationPageProps) {
  const { 
    bookingReference, 
    pnr, 
    selectedOffer, 
    pricedOffer, 
    travelers, 
    getTotalPrice 
  } = useBookingStore();

  const offer = pricedOffer || selectedOffer;
  if (!offer) return null;

  return (
    <div className={cn('mx-auto max-w-2xl space-y-8', className)}>
      {/* Success Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
        >
          <CheckCircle className="h-12 w-12 text-green-600" />
        </motion.div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Buchung erfolgreich!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vielen Dank für Ihre Buchung. Eine Bestätigung wurde an Ihre E-Mail gesendet.
        </p>
      </motion.div>

      {/* Booking Reference */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-6 text-center text-white">
            <div className="text-sm opacity-80">Buchungsreferenz</div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-wider">
              {pnr || bookingReference || 'ABC123'}
            </div>
          </div>
          <div className="p-6">
            <p className="text-center text-sm text-gray-500">
              Bitte bewahren Sie diese Referenz für Check-in und Anfragen auf.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Flight Details */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <div className="border-b border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-pink-500" />
              <h2 className="font-semibold">Ihre Flugdetails</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {offer.itineraries.map((itinerary, idx) => {
              const first = itinerary.segments[0];
              const last = itinerary.segments[itinerary.segments.length - 1];
              return (
                <div key={idx} className="p-4">
                  <Badge variant="secondary" className="mb-3">
                    {idx === 0 ? 'Hinflug' : 'Rückflug'}
                  </Badge>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{first.departure.iataCode}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{last.arrival.iataCode}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateTime(first.departure.at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{first.carrierCode} {first.number}</div>
                      <div className="text-sm text-gray-500">
                        {itinerary.segments.length === 1 ? 'Direktflug' : `${itinerary.segments.length - 1} Stopp(s)`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Travelers */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Reisende</h3>
          <div className="space-y-2">
            {travelers.map((traveler) => (
              <div key={traveler.id} className="flex items-center justify-between text-sm">
                <span>{traveler.firstName} {traveler.lastName}</span>
                <Badge variant="outline">
                  {traveler.type === 'ADULT' ? 'Erwachsener' : traveler.type === 'CHILD' ? 'Kind' : 'Baby'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Total Price */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Gesamtpreis</span>
            <span className="text-2xl font-bold text-pink-500">
              {formatCurrency(getTotalPrice(), offer.price.currency)}
            </span>
          </div>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button variant="outline" className="flex-1 gap-2">
          <Download className="h-4 w-4" />
          E-Ticket herunterladen
        </Button>
        <Button variant="outline" className="flex-1 gap-2">
          <Mail className="h-4 w-4" />
          Bestätigung erneut senden
        </Button>
        <Button onClick={onNewSearch} className="flex-1">
          Neue Suche
        </Button>
      </motion.div>
    </div>
  );
}

