import { Plane, User, Armchair, Gift, CreditCard, ChevronRight } from 'lucide-react';

import { Button, Card, Badge } from '@/components/ui';
import { cn, formatCurrency, formatDate, formatDuration } from '@/lib/utils';
import { useBookingStore } from '@/stores/booking-store';

// ============================================================================
// Booking Summary - Review all booking details before confirmation
// ============================================================================

interface BookingSummaryProps {
  onConfirm: () => void;
  onEdit: (step: 'travelers' | 'seats' | 'ancillaries' | 'payment') => void;
  isLoading?: boolean;
  className?: string;
}

export function BookingSummary({ onConfirm, onEdit, isLoading, className }: BookingSummaryProps) {
  const { 
    selectedOffer, 
    pricedOffer, 
    travelers, 
    selectedSeats, 
    selectedAncillaries, 
    payment,
    getTotalPrice,
  } = useBookingStore();

  const offer = pricedOffer || selectedOffer;
  if (!offer) return null;

  const currency = offer.price.currency;
  const totalPrice = getTotalPrice();
  const seatsTotal = selectedSeats.reduce((sum, s) => {
    const price = typeof s.price === 'number' ? s.price : parseFloat(String(s.price ?? 0));
    return sum + price;
  }, 0);
  const ancillariesTotal = selectedAncillaries.reduce((sum, a) => {
    const price = typeof a.price === 'number' ? a.price : parseFloat(String(a.price ?? 0));
    return sum + price;
  }, 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Flight Summary */}
      <SummarySection title="Flugdetails" icon={<Plane className="h-5 w-5" />}>
        {offer.itineraries.map((itinerary, idx) => {
          const first = itinerary.segments[0];
          const last = itinerary.segments[itinerary.segments.length - 1];
          return (
            <div key={idx} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">
                  {first.departure.iataCode} → {last.arrival.iataCode}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(first.departure.at)} • {formatDuration(itinerary.duration)}
                </div>
              </div>
              <Badge variant="secondary">{idx === 0 ? 'Hinflug' : 'Rückflug'}</Badge>
            </div>
          );
        })}
      </SummarySection>

      {/* Travelers Summary */}
      <SummarySection 
        title="Reisende" 
        icon={<User className="h-5 w-5" />}
        onEdit={() => onEdit('travelers')}
      >
        {travelers.map((traveler, idx) => (
          <div key={traveler.id} className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">
                {traveler.firstName} {traveler.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {traveler.type === 'ADULT' ? 'Erwachsener' : traveler.type === 'CHILD' ? 'Kind' : 'Baby'}
              </div>
            </div>
            {idx === 0 && <Badge>Hauptreisender</Badge>}
          </div>
        ))}
      </SummarySection>

      {/* Seats Summary */}
      {selectedSeats.length > 0 && (
        <SummarySection 
          title="Sitzplätze" 
          icon={<Armchair className="h-5 w-5" />}
          onEdit={() => onEdit('seats')}
        >
          {selectedSeats.map((seat, idx) => {
            const seatPrice = typeof seat.price === 'number' ? seat.price : parseFloat(String(seat.price ?? 0));
            return (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="font-medium">Sitz {seat.seatNumber}</div>
                {seat.price && <div>{formatCurrency(seatPrice, currency)}</div>}
              </div>
            );
          })}
        </SummarySection>
      )}

      {/* Ancillaries Summary */}
      {selectedAncillaries.length > 0 && (
        <SummarySection 
          title="Zusatzleistungen" 
          icon={<Gift className="h-5 w-5" />}
          onEdit={() => onEdit('ancillaries')}
        >
          {selectedAncillaries.map((anc, idx) => {
            const ancPrice = typeof anc.price === 'number' ? anc.price : parseFloat(String(anc.price ?? 0));
            return (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="font-medium">{anc.type}</div>
                <div>{formatCurrency(ancPrice, currency)}</div>
              </div>
            );
          })}
        </SummarySection>
      )}

      {/* Payment Summary */}
      <SummarySection 
        title="Zahlungsmethode" 
        icon={<CreditCard className="h-5 w-5" />}
        onEdit={() => onEdit('payment')}
      >
        {payment?.creditCard && (
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">{payment.creditCard.brand}</div>
              <div className="text-sm text-gray-500">•••• {payment.creditCard.number.slice(-4)}</div>
            </div>
          </div>
        )}
      </SummarySection>

      {/* Price Breakdown */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 p-4 dark:border-gray-800">
          <h3 className="font-semibold">Preisübersicht</h3>
        </div>
        <div className="p-4">
          <div className="space-y-2 text-sm">
            {/* Show price per traveler type */}
            {(() => {
              const travelerTypeLabels: Record<string, string> = {
                'ADULT': 'Erwachsener',
                'CHILD': 'Kind',
                'SEATED_INFANT': 'Kleinkind (mit Sitz)',
                'HELD_INFANT': 'Baby (auf Schoß)',
              };

              // Group travelers by type
              const typeGroups = offer.travelerPricings.reduce((acc, tp) => {
                const type = tp.travelerType;
                if (!acc[type]) {
                  acc[type] = { count: 0, pricePerPerson: parseFloat(tp.price.total) };
                }
                acc[type].count++;
                return acc;
              }, {} as Record<string, { count: number; pricePerPerson: number }>);

              return Object.entries(typeGroups).map(([type, data]) => (
                <div key={type} className="flex justify-between">
                  <span>{data.count}x {travelerTypeLabels[type] || type}</span>
                  <span>{formatCurrency(data.pricePerPerson * data.count, currency)}</span>
                </div>
              ));
            })()}
            {seatsTotal > 0 && (
              <div className="flex justify-between">
                <span>Sitzplätze</span>
                <span>{formatCurrency(seatsTotal, currency)}</span>
              </div>
            )}
            {ancillariesTotal > 0 && (
              <div className="flex justify-between">
                <span>Zusatzleistungen</span>
                <span>{formatCurrency(ancillariesTotal, currency)}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold dark:border-gray-800">
            <span>Gesamtpreis</span>
            <span className="text-pink-500">{formatCurrency(Number(totalPrice), currency)}</span>
          </div>
        </div>
      </Card>

      {/* Confirm Button */}
      <Button onClick={onConfirm} size="lg" className="w-full gap-2" disabled={isLoading}>
        {isLoading ? 'Buchung wird bearbeitet...' : 'Jetzt verbindlich buchen'}
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Summary Section Component
function SummarySection({ 
  title, 
  icon, 
  children, 
  onEdit 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>Bearbeiten</Button>
        )}
      </div>
      <div className="divide-y divide-gray-100 p-4 dark:divide-gray-800">{children}</div>
    </Card>
  );
}

