'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plane, AlertCircle, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FlightCard } from './flight-card';
import type { FlightOffer } from '@/types/flight';

// ============================================================================
// Skeleton Flight Card - Loading placeholder
// ============================================================================

function SkeletonFlightCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Flight path */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
          <div className="flex-1">
            <Skeleton className="mx-auto h-0.5 w-full" />
            <div className="mt-2 flex justify-center">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex-1 text-right">
            <Skeleton className="ml-auto h-6 w-16" />
            <Skeleton className="ml-auto mt-1 h-3 w-12" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Flight List Component - Display list of flight offers with loading state
// ============================================================================

interface FlightListProps {
  offers: FlightOffer[];
  isLoading?: boolean;
  error?: Error | null;
  selectedOfferId?: string;
  onSelectOffer: (offer: FlightOffer) => void;
  showPriceCalendar?: boolean;
  onTogglePriceCalendar?: () => void;
  priceCalendarContent?: React.ReactNode;
  className?: string;
}

export function FlightList({
  offers,
  isLoading,
  error,
  selectedOfferId,
  onSelectOffer,
  showPriceCalendar,
  onTogglePriceCalendar,
  priceCalendarContent,
  className,
}: FlightListProps) {
  // Loading State
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Plane className="h-4 w-4" />
          </motion.div>
          Suche nach Flügen...
        </div>
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
          className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h3 className="mb-1 font-semibold text-destructive">
            Fehler bei der Suche
          </h3>
          <p className="text-sm text-destructive/80">
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
          className="rounded-xl border border-border bg-muted/50 p-12 text-center"
        >
          <Plane className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
            Keine Flüge gefunden
          </h3>
          <p className="text-sm text-muted-foreground">
            Versuchen Sie andere Daten oder Flughäfen für mehr Ergebnisse.
          </p>
        </motion.div>
      </div>
    );
  }

  // Results
  return (
    <div className={className}>
      {/* Header with flight count and calendar button (desktop only) */}
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <div className="text-xs text-muted-foreground sm:text-sm">
          {offers.length} {offers.length === 1 ? 'Flug' : 'Flüge'} gefunden
        </div>
        {onTogglePriceCalendar && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePriceCalendar}
            className="hidden md:flex gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Kalender</span>
          </Button>
        )}
      </div>

      {/* Price Calendar (desktop only) */}
      {showPriceCalendar && priceCalendarContent && (
        <div className="mb-4 hidden md:block">
          {priceCalendarContent}
        </div>
      )}

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
