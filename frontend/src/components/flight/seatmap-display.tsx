import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, Badge, Button } from '@/components/ui';
import { Plane } from 'lucide-react';
import type { SeatmapData, Seat } from '@/types/flight';

// ============================================================================
// Seatmap Display Component - Interactive seat selection
// ============================================================================

export interface SelectedSeat {
  segmentId: string;
  travelerId: string;
  seatNumber: string;
  price?: number;
  currency?: string;
}

interface SeatmapDisplayProps {
  seatmaps: SeatmapData[];  // Array of seatmaps for all segments
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections?: number;
  className?: string;
}

// Legacy single-seatmap interface for backwards compatibility
interface LegacySeatmapDisplayProps {
  seatmap: SeatmapData;
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections?: number;
  className?: string;
  segmentId?: string;
  travelerId?: string;
}

export function SeatmapDisplay(props: SeatmapDisplayProps | LegacySeatmapDisplayProps) {
  // Handle both old (single seatmap) and new (array) interface
  const seatmaps = 'seatmaps' in props ? props.seatmaps : [props.seatmap];
  const { selectedSeats, onSeatSelect, maxSelections = 1, className } = props;

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const activeSeatmap = seatmaps[activeSegmentIndex];

  if (!activeSeatmap) return null;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Segment Selector (when multiple segments) */}
      {seatmaps.length > 1 && (
        <SegmentSelector
          seatmaps={seatmaps}
          activeIndex={activeSegmentIndex}
          onSelect={setActiveSegmentIndex}
          selectedSeats={selectedSeats}
          className="mb-6"
        />
      )}

      {/* Single Seatmap Display */}
      <SingleSeatmapDisplay
        seatmap={activeSeatmap}
        selectedSeats={selectedSeats.filter(s => s.segmentId === activeSeatmap.segmentId || !s.segmentId)}
        onSeatSelect={(seat) => onSeatSelect({
          ...seat,
          segmentId: activeSeatmap.segmentId || `segment-${activeSegmentIndex}`,
        })}
        maxSelections={maxSelections}
      />
    </div>
  );
}

// ============================================================================
// Segment Selector Component
// ============================================================================

interface SegmentSelectorProps {
  seatmaps: SeatmapData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  selectedSeats: SelectedSeat[];
  className?: string;
}

function SegmentSelector({ seatmaps, activeIndex, onSelect, selectedSeats, className }: SegmentSelectorProps) {
  return (
    <div className={cn('flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800', className)}>
      {seatmaps.map((seatmap, index) => {
        const segmentSeats = selectedSeats.filter(s =>
          s.segmentId === seatmap.segmentId || s.segmentId === `segment-${index}`
        );
        const isActive = index === activeIndex;
        const departure = seatmap.departure?.iataCode || '???';
        const arrival = seatmap.arrival?.iataCode || '???';

        return (
          <Button
            key={index}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onSelect(index)}
            className={cn(
              'flex items-center gap-2 transition-all',
              isActive && 'shadow-md'
            )}
          >
            <Plane className="h-4 w-4" />
            <span className="font-medium">{departure} → {arrival}</span>
            {segmentSeats.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {segmentSeats.length}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single Seatmap Display Component
// ============================================================================

interface SingleSeatmapDisplayProps {
  seatmap: SeatmapData;
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections: number;
}

function SingleSeatmapDisplay({ seatmap, selectedSeats, onSeatSelect, maxSelections }: SingleSeatmapDisplayProps) {
  const deck = seatmap.decks[0]; // Usually only one deck for narrow-body

  if (!deck) return null;

  // Group seats by row and detect exit rows from seat characteristics
  const { seatsByRow, exitRows } = useMemo(() => {
    const rows = new Map<number, Seat[]>();
    const exitRowSet = new Set<number>();

    deck.seats.forEach((seat) => {
      const rowNum = parseInt(seat.number.replace(/\D/g, ''), 10);
      if (!rows.has(rowNum)) rows.set(rowNum, []);
      rows.get(rowNum)!.push(seat);

      // Check if any seat in this row has EXIT characteristic (code "E")
      if (seat.characteristicsCodes?.includes('E')) {
        exitRowSet.add(rowNum);
      }
    });

    // Sort seats in each row by column (A, B, C, D, E, F)
    rows.forEach((seats) => seats.sort((a, b) => a.number.localeCompare(b.number)));

    return { seatsByRow: rows, exitRows: exitRowSet };
  }, [deck.seats]);

  const sortedRows = Array.from(seatsByRow.entries()).sort((a, b) => a[0] - b[0]);

  const config = deck.deckConfiguration;

  return (
    <div className="flex flex-col items-center">
      {/* Legend */}
      <SeatLegend className="mb-6" />

      {/* Flight Info Header */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Plane className="h-4 w-4" />
        <span>{seatmap.carrierCode}{seatmap.number}</span>
        {seatmap.departure?.iataCode && seatmap.arrival?.iataCode && (
          <>
            <span>•</span>
            <span>{seatmap.departure.iataCode} → {seatmap.arrival.iataCode}</span>
          </>
        )}
        {seatmap.aircraft?.code && (
          <>
            <span>•</span>
            <span>{seatmap.aircraft.code}</span>
          </>
        )}
      </div>

      {/* Aircraft Cabin */}
      <div className="relative rounded-t-[100px] rounded-b-3xl border-2 border-gray-300 bg-gray-50 p-6 pt-16 dark:border-gray-700 dark:bg-gray-900">
        {/* Nose */}
        <div className="absolute -top-1 left-1/2 h-8 w-32 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />

        {/* Column Headers */}
        <div className="mb-4 flex justify-center gap-1">
          {['A', 'B', 'C', '', 'D', 'E', 'F'].map((col, i) => (
            <div
              key={i}
              className={cn(
                'flex h-6 w-8 items-center justify-center text-xs font-medium text-gray-400',
                col === '' && 'w-6' // Aisle
              )}
            >
              {col}
            </div>
          ))}
        </div>

        {/* Seat Rows */}
        <div className="space-y-1">
          {sortedRows.map(([rowNum, seats]) => (
            <SeatRow
              key={rowNum}
              rowNumber={rowNum}
              seats={seats}
              selectedSeats={selectedSeats}
              onSeatSelect={onSeatSelect}
              maxSelections={maxSelections}
              isExitRow={exitRows.has(rowNum)}
              isOverWing={config?.startWingsRow && config?.endWingsRow
                ? rowNum >= config.startWingsRow && rowNum <= config.endWingsRow
                : false}
            />
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedSeats.length > 0 && (
        <Card className="mt-6 w-full max-w-md p-4">
          <h4 className="mb-2 font-semibold">Ausgewählte Sitze</h4>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map((seat) => (
              <Badge key={seat.seatNumber} variant="default" className="gap-1">
                Sitz {seat.seatNumber}
                {seat.price !== undefined && seat.currency && (
                  <span className="opacity-80">
                    (+{formatCurrency(seat.price, seat.currency)})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Seat Row Component
// ============================================================================

interface SeatRowProps {
  rowNumber: number;
  seats: Seat[];
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections: number;
  isExitRow?: boolean;
  isOverWing?: boolean;
}

function SeatRow({ rowNumber, seats, selectedSeats, onSeatSelect, maxSelections, isExitRow }: SeatRowProps) {
  // Standard 3-3 configuration: A B C | aisle | D E F
  const leftSeats = seats.filter(s => ['A', 'B', 'C'].includes(s.number.slice(-1)));
  const rightSeats = seats.filter(s => ['D', 'E', 'F'].includes(s.number.slice(-1)));

  return (
    <div className={cn('flex items-center gap-1', isExitRow && 'my-2')}>
      {/* Left side */}
      <div className="flex gap-1">
        {['A', 'B', 'C'].map((col) => {
          const seat = leftSeats.find(s => s.number.endsWith(col));
          return seat ? (
            <SeatButton key={seat.number} seat={seat} selectedSeats={selectedSeats} onSeatSelect={onSeatSelect} maxSelections={maxSelections} />
          ) : (
            <div key={col} className="h-8 w-8" />
          );
        })}
      </div>

      {/* Aisle with row number */}
      <div className="flex h-8 w-6 items-center justify-center text-xs text-gray-400">
        {rowNumber}
      </div>

      {/* Right side */}
      <div className="flex gap-1">
        {['D', 'E', 'F'].map((col) => {
          const seat = rightSeats.find(s => s.number.endsWith(col));
          return seat ? (
            <SeatButton key={seat.number} seat={seat} selectedSeats={selectedSeats} onSeatSelect={onSeatSelect} maxSelections={maxSelections} />
          ) : (
            <div key={col} className="h-8 w-8" />
          );
        })}
      </div>

      {/* Exit indicator */}
      {isExitRow && (
        <Badge variant="outline" className="ml-2 text-xs">EXIT</Badge>
      )}
    </div>
  );
}

// ============================================================================
// Seat Button Component
// ============================================================================

interface SeatButtonProps {
  seat: Seat;
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections: number;
}

function SeatButton({ seat, selectedSeats, onSeatSelect, maxSelections }: SeatButtonProps) {
  const pricing = seat.travelerPricing?.[0];
  const isAvailable = pricing?.seatAvailabilityStatus === 'AVAILABLE';
  const isSelected = selectedSeats.some(s => s.seatNumber === seat.number);
  const price = pricing?.price?.total ? parseFloat(pricing.price.total) : undefined;
  const currency = pricing?.price?.currency || 'EUR';
  const isFree = price === undefined || price === 0;

  const characteristics = seat.characteristicsCodes || [];
  const isExtraLegroom = characteristics.includes('L') || characteristics.includes('E');

  const handleClick = () => {
    if (!isAvailable) return;

    // Always allow deselecting
    if (isSelected) {
      onSeatSelect({ segmentId: '', travelerId: '', seatNumber: seat.number, price });
      return;
    }

    // Only allow selecting if under max selections
    if (selectedSeats.length < maxSelections) {
      onSeatSelect({ segmentId: '', travelerId: '', seatNumber: seat.number, price });
    }
  };

  // Format tooltip with price info
  const tooltipText = isAvailable
    ? `Sitz ${seat.number} - ${isFree ? 'Gratis' : formatCurrency(price!, currency)}`
    : `Sitz ${seat.number} - Belegt`;

  return (
    <div className="group relative">
      <motion.button
        whileHover={isAvailable ? { scale: 1.1 } : undefined}
        whileTap={isAvailable ? { scale: 0.95 } : undefined}
        onClick={handleClick}
        disabled={!isAvailable}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-t-lg text-xs font-medium transition-colors border-2',
          // Free seats - green
          isAvailable && !isSelected && isFree && 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400',
          // Paid seats - purple/violet
          isAvailable && !isSelected && !isFree && !isExtraLegroom && 'border-violet-500 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400',
          // Selected - pink accent
          isSelected && 'border-pink-500 bg-pink-500 text-white',
          // Unavailable - gray
          !isAvailable && 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400 dark:border-gray-600 dark:bg-gray-700',
          // Extra legroom - amber
          isExtraLegroom && isAvailable && !isSelected && 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        )}
        title={tooltipText}
      >
        {seat.number.slice(-1)}
      </motion.button>

      {/* Price tooltip on hover */}
      {isAvailable && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
          {isFree ? 'Gratis' : formatCurrency(price!, currency)}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Seat Legend Component
// ============================================================================

function SeatLegend({ className }: { className?: string }) {
  const items = [
    { label: 'Gratis', className: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
    { label: 'Kostenpflichtig', className: 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Extra Beinfreiheit', className: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Ausgewählt', className: 'border-pink-500 bg-pink-500' },
    { label: 'Belegt', className: 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700' },
  ];

  return (
    <div className={cn('flex flex-wrap justify-center gap-4', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <div className={cn('h-5 w-5 rounded-t-md border-2', item.className)} />
          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
