import { AnimatePresence, motion } from 'motion/react';
import { Plane, AlertCircle } from 'lucide-react';
import { SkeletonFlightCard } from '@/components/ui';
import { FlightCard } from './flight-card';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Flight List Component - Display list of flight offers with loading state
// ============================================================================

interface FlightListProps {
  offers: FlightOffer[];
  isLoading?: boolean;
  error?: Error | null;
  selectedOfferId?: string;
  onSelectOffer: (offer: FlightOffer) => void;
  className?: string;
}

export function FlightList({
  offers,
  isLoading,
  error,
  selectedOfferId,
  onSelectOffer,
  className,
}: FlightListProps) {
  // Loading State
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Plane className="h-4 w-4" />
          </motion.div>
          Suche nach Flügen...
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SkeletonFlightCard />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
        >
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h3 className="mb-1 font-semibold text-red-800 dark:text-red-300">
            Fehler bei der Suche
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
          </p>
        </motion.div>
      </div>
    );
  }

  // Empty State
  if (offers.length === 0) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50"
        >
          <Plane className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Keine Flüge gefunden
          </h3>
          <p className="text-sm text-gray-500">
            Versuchen Sie andere Daten oder Flughäfen für mehr Ergebnisse.
          </p>
        </motion.div>
      </div>
    );
  }

  // Results
  return (
    <div className={className}>
      <div className="mb-3 text-xs text-gray-500 sm:mb-4 sm:text-sm">
        {offers.length} {offers.length === 1 ? 'Flug' : 'Flüge'} gefunden
      </div>

      <AnimatePresence mode="popLayout">
        <div className="w-full space-y-3 sm:space-y-4">
          {offers.map((offer, index) => (
            <motion.div
              key={offer.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="w-full"
            >
              <FlightCard
                offer={offer}
                onSelect={onSelectOffer}
                isSelected={offer.id === selectedOfferId}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

