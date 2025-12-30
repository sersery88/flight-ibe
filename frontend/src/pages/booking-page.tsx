import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { BookingWizard, TravelerForm, PaymentForm, BookingSummary, ConfirmationPage, AncillariesSelection } from '@/components/booking';
import { SeatmapDisplay } from '@/components/flight';
import { useBookingStore } from '@/stores/booking-store';
import { useSearchStore } from '@/stores/search-store';
import { useSeatmaps, useCreateBooking } from '@/hooks/use-flights';
import { formatCurrency } from '@/lib/utils';

// ============================================================================
// Booking Page - Multi-Step Booking Flow
// ============================================================================

interface BookingPageProps {
  onBack: () => void;
  onComplete: () => void;
}

export function BookingPage({ onBack, onComplete }: BookingPageProps) {
  const {
    currentStep,
    selectedOffer,
    pricedOffer,
    travelers,
    selectedSeats,
    selectedAncillaries,
    initializeTravelers,
    nextStep,
    prevStep,
    setStep,
  } = useBookingStore();

  const { adults, children, infants } = useSearchStore();

  // Calculate total price reactively
  const totalPrice = (() => {
    const offer = pricedOffer || selectedOffer;
    let total = offer ? parseFloat(offer.price.grandTotal) : 0;
    total += selectedSeats.reduce((sum, s) => sum + (s.price ?? 0), 0);
    total += selectedAncillaries.reduce((sum, a) => sum + a.price, 0);
    return total;
  })();
  
  // Initialize travelers when component mounts
  useEffect(() => {
    if (travelers.length === 0 && selectedOffer) {
      initializeTravelers(adults, children, infants);
    }
  }, [selectedOffer, travelers.length, adults, children, infants, initializeTravelers]);

  // Seatmap data
  const { data: seatmapData, isLoading: seatmapLoading } = useSeatmaps(
    selectedOffer ? [selectedOffer] : []
  );

  // Create booking mutation
  const createBookingMutation = useCreateBooking();

  const handleConfirmBooking = async () => {
    if (!selectedOffer) return;
    
    // Call booking API
    createBookingMutation.mutate({
      flightOffers: [selectedOffer],
      travelers: travelers.map((t, idx) => ({
        id: String(idx + 1),
        dateOfBirth: t.dateOfBirth,
        gender: t.gender,
        name: { firstName: t.firstName, lastName: t.lastName },
        contact: t.email ? {
          emailAddress: t.email,
          phones: t.phone ? [{ deviceType: 'MOBILE', countryCallingCode: '49', number: t.phone }] : [],
        } : undefined,
        documents: t.document ? [{
          documentType: t.document.type,
          number: t.document.number,
          expiryDate: t.document.expiryDate,
          issuanceCountry: t.document.issuanceCountry,
          nationality: t.document.nationality,
          holder: true,
        }] : undefined,
      })),
    });
  };

  if (!selectedOffer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Kein Flug ausgewählt.</p>
          <Button onClick={onBack} className="mt-4">Zurück zur Suche</Button>
        </Card>
      </div>
    );
  }

  // Confirmation step
  if (currentStep === 'confirmation') {
    return <ConfirmationPage onNewSearch={onComplete} />;
  }

  return (
    <div className="w-full overflow-x-hidden" style={{ maxWidth: '100vw' }}>
      <div className="container mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Buchung abschließen</h1>
          <p className="truncate text-sm text-gray-500 sm:text-base">
            Gesamtpreis: <span className="font-semibold text-pink-500">
              {formatCurrency(Number(totalPrice), (pricedOffer || selectedOffer).price.currency)}
            </span>
          </p>
        </div>
      </div>

      {/* Progress Wizard */}
      <BookingWizard className="mb-6 sm:mb-8" />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full overflow-x-hidden"
        >
          {/* Travelers Step */}
          {currentStep === 'travelers' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Reisende</h2>
              {travelers
                .filter((t) => t.type !== 'HELD_INFANT') // Don't show infants separately
                .map((traveler, idx) => {
                  // Find associated infant for this adult
                  const associatedInfant = traveler.type === 'ADULT'
                    ? travelers.find((t) => t.type === 'HELD_INFANT' && t.associatedAdultId === traveler.id)
                    : undefined;
                  const infantIndex = associatedInfant
                    ? travelers.findIndex((t) => t.id === associatedInfant.id)
                    : undefined;
                  const travelerIndex = travelers.findIndex((t) => t.id === traveler.id);

                  return (
                    <TravelerForm
                      key={traveler.id}
                      index={travelerIndex}
                      traveler={traveler}
                      isLead={idx === 0}
                      associatedInfant={associatedInfant}
                      infantIndex={infantIndex}
                    />
                  );
                })}
              <div className="flex justify-end">
                <Button onClick={nextStep} size="lg" className="gap-2">
                  Weiter zu Sitzplätzen <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Seats Step */}
          {currentStep === 'seats' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Sitzplatzauswahl</h2>
              {seatmapLoading ? (
                <Card className="p-8 text-center"><p>Lade Sitzplan...</p></Card>
              ) : seatmapData?.data && seatmapData.data.length > 0 ? (
                <SeatmapDisplay
                  seatmaps={seatmapData.data}
                  selectedSeats={selectedSeats}
                  onSeatSelect={(seat) => {
                    const store = useBookingStore.getState();
                    const isSelected = selectedSeats.some(
                      s => s.seatNumber === seat.seatNumber && s.segmentId === seat.segmentId
                    );

                    if (isSelected) {
                      // Deselect seat
                      store.removeSeat(seat.segmentId, seat.travelerId);
                    } else {
                      // Select seat
                      store.addSeat({
                        segmentId: seat.segmentId,
                        travelerId: seat.travelerId,
                        seatNumber: seat.seatNumber,
                        price: seat.price,
                      });
                    }
                  }}
                  maxSelections={travelers.length}
                />
              ) : (
                <Card className="p-8 text-center"><p>Kein Sitzplan verfügbar</p></Card>
              )}
              <StepNavigation onBack={prevStep} onNext={nextStep} />
            </div>
          )}

          {/* Ancillaries Step */}
          {currentStep === 'ancillaries' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Zusatzleistungen</h2>
              <AncillariesSelection offer={selectedOffer} />
              <StepNavigation onBack={prevStep} onNext={nextStep} />
            </div>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Zahlungsinformationen</h2>
              <PaymentForm onSubmit={nextStep} />
              <Button variant="ghost" onClick={prevStep}>Zurück</Button>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Buchung überprüfen</h2>
              <BookingSummary onConfirm={handleConfirmBooking} onEdit={setStep}
                isLoading={createBookingMutation.isPending} />
              <Button variant="ghost" onClick={prevStep}>Zurück</Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}

// Step Navigation Helper
function StepNavigation({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between">
      <Button variant="ghost" onClick={onBack}>Zurück</Button>
      <Button onClick={onNext} size="lg" className="gap-2">
        Weiter <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

