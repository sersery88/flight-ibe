'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, Users, Calendar, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookingStore, type TravelerData } from '@/stores/booking-store';
import { useSearchStore } from '@/stores/search-store';
import { formatCurrency, formatDuration, formatDateTime } from '@/lib/utils';
import { formatAirlineName } from '@/lib/airlines';
import { formatAirportName } from '@/lib/airports';

// ============================================================================
// Booking Steps
// ============================================================================

type BookingStep = 'travelers' | 'review' | 'confirmation';

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 'travelers', label: 'Passagiere' },
  { id: 'review', label: 'Überprüfung' },
  { id: 'confirmation', label: 'Bestätigung' },
];

// ============================================================================
// Booking Content
// ============================================================================

function BookingContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<BookingStep>('travelers');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingReference, setBookingReference] = useState<string>('');

  const {
    selectedOffer,
    travelers,
    initializeTravelers,
    updateTraveler,
    reset: resetBooking,
  } = useBookingStore();

  const { adults, children, infants } = useSearchStore();

  // Initialize travelers on mount
  useEffect(() => {
    if (travelers.length === 0 && selectedOffer) {
      initializeTravelers(adults, children, infants);
    }
  }, [selectedOffer, travelers.length, adults, children, infants, initializeTravelers]);

  // No offer selected
  if (!selectedOffer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="p-8 text-center">
          <Plane className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Kein Flug ausgewählt.</p>
          <Link href="/results">
            <Button>Zurück zur Flugsuche</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const offer = selectedOffer;
  const outbound = offer.itineraries[0];
  const returnFlight = offer.itineraries.length > 1 ? offer.itineraries[1] : null;

  const handleNext = () => {
    if (currentStep === 'travelers') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      handleSubmitBooking();
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('travelers');
    }
  };

  const handleSubmitBooking = async () => {
    setIsSubmitting(true);
    // Simulate booking API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setBookingReference(`FP${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setBookingComplete(true);
    setCurrentStep('confirmation');
    setIsSubmitting(false);
  };

  const handleNewSearch = () => {
    resetBooking();
    router.push('/');
  };

  // Confirmation view
  if (currentStep === 'confirmation' && bookingComplete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Buchung bestätigt!</h1>
          <p className="text-muted-foreground mb-4">
            Ihre Buchung wurde erfolgreich abgeschlossen.
          </p>
          <div className="rounded-lg bg-muted p-4 mb-6">
            <p className="text-sm text-muted-foreground">Buchungsreferenz</p>
            <p className="text-2xl font-mono font-bold">{bookingReference}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Eine Bestätigungsmail wurde an Ihre E-Mail-Adresse gesendet.
          </p>
          <Button onClick={handleNewSearch} size="lg">
            Neue Suche starten
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/results">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zu den Ergebnissen
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-background border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isPast = STEPS.findIndex(s => s.id === currentStep) > idx;
              return (
                <div key={step.id} className="flex items-center">
                  {idx > 0 && <div className="h-px w-8 bg-border mx-2" />}
                  <div className="flex items-center gap-2">
                    <div className={`
                      flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                      ${isActive ? 'bg-primary text-primary-foreground' : ''}
                      ${isPast ? 'bg-green-500 text-white' : ''}
                      ${!isActive && !isPast ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {isPast ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Flight Summary Card */}
            <Card className="p-4">
              <h2 className="font-semibold mb-4">Ihre Flugauswahl</h2>

              {/* Outbound */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Plane className="h-4 w-4" />
                  <span>Hinflug</span>
                </div>
                <FlightSegmentSummary itinerary={outbound} />
              </div>

              {/* Return */}
              {returnFlight && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Plane className="h-4 w-4 rotate-180" />
                    <span>Rückflug</span>
                  </div>
                  <FlightSegmentSummary itinerary={returnFlight} />
                </div>
              )}
            </Card>

            {/* Travelers Form */}
            {currentStep === 'travelers' && (
              <Card className="p-4">
                <h2 className="font-semibold mb-4">Passagierdaten</h2>
                <div className="space-y-6">
                  {travelers.map((traveler, idx) => (
                    <TravelerFormSection
                      key={idx}
                      traveler={traveler}
                      index={idx}
                      onUpdate={(updates) => updateTraveler(idx, updates)}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Review */}
            {currentStep === 'review' && (
              <Card className="p-4">
                <h2 className="font-semibold mb-4">Buchungsübersicht</h2>
                <div className="space-y-4">
                  {travelers.map((traveler, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{traveler.firstName} {traveler.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          {traveler.type === 'ADULT' ? 'Erwachsener' :
                           traveler.type === 'CHILD' ? 'Kind' : 'Baby'}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {traveler.dateOfBirth ? new Date(traveler.dateOfBirth).toLocaleDateString('de-DE') : '-'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Price Summary */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-4">
              <h3 className="font-semibold mb-4">Preisübersicht</h3>

              <div className="space-y-2 text-sm">
                {travelers.map((t, idx) => {
                  const pricing = offer.travelerPricings.find(
                    tp => tp.travelerType === t.type
                  ) || offer.travelerPricings[idx];

                  return (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.firstName || 'Passagier'} {t.lastName || idx + 1}
                      </span>
                      <span>
                        {pricing ? formatCurrency(pricing.price.total, offer.price.currency) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border my-4" />

              <div className="flex justify-between font-semibold text-lg">
                <span>Gesamtpreis</span>
                <span>{formatCurrency(offer.price.grandTotal, offer.price.currency)}</span>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Inklusive Steuern und Gebühren
              </p>

              <div className="mt-6 space-y-2">
                {currentStep === 'review' && (
                  <Button variant="outline" className="w-full" onClick={handleBack}>
                    Zurück
                  </Button>
                )}
                <Button
                  className="w-full"
                  onClick={handleNext}
                  disabled={isSubmitting || (currentStep === 'travelers' && !isTravelersValid(travelers))}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buchung wird verarbeitet...
                    </>
                  ) : currentStep === 'travelers' ? (
                    'Weiter zur Überprüfung'
                  ) : (
                    'Buchung abschließen'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function FlightSegmentSummary({ itinerary }: { itinerary: any }) {
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const stops = itinerary.segments.length - 1;

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-lg font-bold">{formatDateTime(first.departure.at, 'time')}</p>
        <p className="text-sm text-muted-foreground">{first.departure.iataCode}</p>
      </div>
      <div className="flex-1 text-center">
        <p className="text-xs text-muted-foreground">{formatDuration(itinerary.duration)}</p>
        <div className="flex items-center">
          <div className="h-px flex-1 bg-border" />
          <div className="px-2">
            <Badge variant="outline" className="text-xs">
              {stops === 0 ? 'Direkt' : `${stops} Stopp${stops > 1 ? 's' : ''}`}
            </Badge>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{formatAirlineName(first.carrierCode)}</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold">{formatDateTime(last.arrival.at, 'time')}</p>
        <p className="text-sm text-muted-foreground">{last.arrival.iataCode}</p>
      </div>
    </div>
  );
}

function TravelerFormSection({
  traveler,
  index,
  onUpdate,
}: {
  traveler: TravelerData;
  index: number;
  onUpdate: (updates: Partial<TravelerData>) => void;
}) {
  const typeLabel = traveler.type === 'ADULT' ? 'Erwachsener' :
                    traveler.type === 'CHILD' ? 'Kind' : 'Baby';

  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">{typeLabel} {index + 1}</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`firstName-${index}`}>Vorname</Label>
          <Input
            id={`firstName-${index}`}
            value={traveler.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            placeholder="Wie im Reisepass"
          />
        </div>
        <div>
          <Label htmlFor={`lastName-${index}`}>Nachname</Label>
          <Input
            id={`lastName-${index}`}
            value={traveler.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
            placeholder="Wie im Reisepass"
          />
        </div>
        <div>
          <Label htmlFor={`dob-${index}`}>Geburtsdatum</Label>
          <Input
            id={`dob-${index}`}
            type="date"
            value={traveler.dateOfBirth}
            onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`gender-${index}`}>Geschlecht</Label>
          <select
            id={`gender-${index}`}
            value={traveler.gender}
            onChange={(e) => onUpdate({ gender: e.target.value as 'MALE' | 'FEMALE' })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Bitte wählen</option>
            <option value="MALE">Männlich</option>
            <option value="FEMALE">Weiblich</option>
          </select>
        </div>
      </div>

      {index === 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`email-${index}`}>E-Mail</Label>
            <Input
              id={`email-${index}`}
              type="email"
              value={traveler.email || ''}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="email@beispiel.de"
            />
          </div>
          <div>
            <Label htmlFor={`phone-${index}`}>Telefon</Label>
            <Input
              id={`phone-${index}`}
              type="tel"
              value={traveler.phone || ''}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function isTravelersValid(travelers: TravelerData[]): boolean {
  return travelers.every(t =>
    t.firstName.trim() !== '' &&
    t.lastName.trim() !== '' &&
    t.dateOfBirth !== ''
  ) && travelers.length > 0 && !!travelers[0].email;
}

// ============================================================================
// Booking Page
// ============================================================================

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
