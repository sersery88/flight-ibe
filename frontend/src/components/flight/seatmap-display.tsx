import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, Badge, Button } from '@/components/ui';
import { Plane } from 'lucide-react';
import type { SeatmapData, Seat, Facility } from '@/types/flight';

// ============================================================================
// Seatmap Display Component - Interactive seat selection with Widebody support
// ============================================================================

export interface SelectedSeat {
  segmentId: string;
  travelerId: string;
  seatNumber: string;
  price?: number;
  currency?: string;
}

interface SeatmapDisplayProps {
  seatmaps: SeatmapData[];
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections?: number;
  className?: string;
}

interface LegacySeatmapDisplayProps {
  seatmap: SeatmapData;
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections?: number;
  className?: string;
  segmentId?: string;
  travelerId?: string;
}

// Cabin layout configuration based on seat columns
interface CabinLayout {
  columns: string[];           // All seat columns (e.g., ['A','B','C','D','E','F','G','H','J','K'])
  sections: string[][];        // Grouped by aisle (e.g., [['A','B','C'], ['D','E','F','G'], ['H','J','K']])
  isWidebody: boolean;
}

// Detect cabin layout from actual seat data
function detectCabinLayout(seats: Seat[]): CabinLayout {
  const columnSet = new Set<string>();
  seats.forEach(seat => {
    const col = seat.number.replace(/\d/g, '');
    if (col) columnSet.add(col);
  });

  const columns = Array.from(columnSet).sort();

  // Common aircraft configurations
  // Narrowbody: 3-3 (A-B-C | D-E-F)
  // Widebody: 3-3-3 (A-B-C | D-E-F | G-H-J or G-H-K), 3-4-3 (A-B-C | D-E-F-G | H-J-K), 2-4-2 (A-B | C-D-E-F | G-H)

  if (columns.length <= 6) {
    // Narrowbody 3-3
    const left = columns.filter(c => ['A','B','C'].includes(c));
    const right = columns.filter(c => ['D','E','F'].includes(c));
    return { columns, sections: [left, right], isWidebody: false };
  } else if (columns.length <= 8) {
    // Widebody 2-4-2 (e.g., A330 in some configs)
    const left = columns.filter(c => ['A','B'].includes(c));
    const middle = columns.filter(c => ['C','D','E','F'].includes(c));
    const right = columns.filter(c => ['G','H'].includes(c));
    return { columns, sections: [left, middle, right], isWidebody: true };
  } else {
    // Widebody 3-3-3 or 3-4-3 (B777, B787, A350, A380)
    const left = columns.filter(c => ['A','B','C'].includes(c));
    const middle = columns.filter(c => ['D','E','F','G'].includes(c));
    const right = columns.filter(c => ['H','J','K'].includes(c));
    return { columns, sections: [left, middle, right], isWidebody: true };
  }
}

export function SeatmapDisplay(props: SeatmapDisplayProps | LegacySeatmapDisplayProps) {
  const seatmaps = 'seatmaps' in props ? props.seatmaps : [props.seatmap];
  const { selectedSeats, onSeatSelect, maxSelections = 1, className } = props;

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const activeSeatmap = seatmaps[activeSegmentIndex];

  if (!activeSeatmap) return null;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {seatmaps.length > 1 && (
        <SegmentSelector
          seatmaps={seatmaps}
          activeIndex={activeSegmentIndex}
          onSelect={setActiveSegmentIndex}
          selectedSeats={selectedSeats}
          className="mb-6"
        />
      )}

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
    <div className={cn('flex flex-col sm:flex-row gap-1 sm:gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 w-full sm:w-auto', className)}>
      {seatmaps.map((seatmap, index) => {
        const segmentSeats = selectedSeats.filter(s =>
          s.segmentId === seatmap.segmentId || s.segmentId === `segment-${index}`
        );
        const isActive = index === activeIndex;
        const departure = seatmap.departure?.iataCode || '???';
        const arrival = seatmap.arrival?.iataCode || '???';

        // Calculate total price for this segment's seats
        const segmentTotalPrice = segmentSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
        const currency = segmentSeats[0]?.currency || 'EUR';

        return (
          <Button
            key={index}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onSelect(index)}
            className={cn(
              'flex items-center justify-center gap-1 sm:gap-2 transition-all text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 w-full sm:w-auto',
              isActive && 'shadow-md'
            )}
          >
            <Plane className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="font-medium">{departure} → {arrival}</span>
            {segmentSeats.length > 0 && (
              <>
                <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs">
                  {segmentSeats.length} {segmentSeats.length === 1 ? 'Sitz' : 'Sitze'}
                </Badge>
                {segmentTotalPrice > 0 && (
                  <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                    +{formatCurrency(segmentTotalPrice, currency)}
                  </span>
                )}
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single Seatmap Display Component - with Widebody support
// ============================================================================

interface SingleSeatmapDisplayProps {
  seatmap: SeatmapData;
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections: number;
}

function SingleSeatmapDisplay({ seatmap, selectedSeats, onSeatSelect, maxSelections }: SingleSeatmapDisplayProps) {
  const deck = seatmap.decks[0];
  if (!deck) return null;

  const config = deck.deckConfiguration;
  const facilities = deck.facilities || [];

  // Track which seat is currently focused (for mobile tap-to-see-price)
  const [activeSeat, setActiveSeat] = useState<string | null>(null);

  // Detect cabin layout from actual seat data
  const cabinLayout = useMemo(() => detectCabinLayout(deck.seats), [deck.seats]);

  // Group seats by row and detect exit rows
  const { seatsByRow, exitRows, facilitiesByRow } = useMemo(() => {
    const rows = new Map<number, Seat[]>();
    const exitRowSet = new Set<number>();
    const facilityRows = new Map<number, Facility[]>();

    deck.seats.forEach((seat) => {
      const rowNum = parseInt(seat.number.replace(/\D/g, ''), 10);
      if (!rows.has(rowNum)) rows.set(rowNum, []);
      rows.get(rowNum)!.push(seat);

      if (seat.characteristicsCodes?.includes('E')) {
        exitRowSet.add(rowNum);
      }
    });

    // Group facilities by row (using y coordinate or position)
    facilities.forEach((facility) => {
      const row = facility.row ?? Math.round((facility.coordinates?.y ?? 0) / 32);
      if (!facilityRows.has(row)) facilityRows.set(row, []);
      facilityRows.get(row)!.push(facility);
    });

    rows.forEach((seats) => seats.sort((a, b) => a.number.localeCompare(b.number)));

    return { seatsByRow: rows, exitRows: exitRowSet, facilitiesByRow: facilityRows };
  }, [deck.seats, facilities]);

  const sortedRows = Array.from(seatsByRow.entries()).sort((a, b) => a[0] - b[0]);
  const firstRow = sortedRows[0]?.[0] ?? 1;
  const lastRow = sortedRows[sortedRows.length - 1]?.[0] ?? 30;

  // Build column headers with aisles
  const columnHeaders = useMemo(() => {
    const headers: (string | null)[] = [];
    cabinLayout.sections.forEach((section, i) => {
      section.forEach(col => headers.push(col));
      if (i < cabinLayout.sections.length - 1) headers.push(null); // Aisle
    });
    return headers;
  }, [cabinLayout]);

  return (
    <div className="flex flex-col items-center w-full px-2 sm:px-0">
      <SeatLegend isWidebody={cabinLayout.isWidebody} className="mb-4 sm:mb-6" />

      {/* Flight Info Header */}
      <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">
        <Plane className="h-3 w-3 sm:h-4 sm:w-4" />
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
            {cabinLayout.isWidebody && <Badge variant="outline" className="ml-0.5 sm:ml-1 text-[8px] sm:text-xs">Widebody</Badge>}
          </>
        )}
      </div>

      {/* Aircraft Cabin with Wings */}
      <div className="relative">
        {/* Left Wing */}
        {config?.startWingsRow && config?.endWingsRow && (
          <WingIndicator side="left" startRow={config.startWingsRow} endRow={config.endWingsRow} firstRow={firstRow} />
        )}

        {/* Right Wing */}
        {config?.startWingsRow && config?.endWingsRow && (
          <WingIndicator side="right" startRow={config.startWingsRow} endRow={config.endWingsRow} firstRow={firstRow} />
        )}

        <div className={cn(
          'relative border sm:border-2 border-gray-300 bg-gray-50 p-2 sm:p-4 pt-8 sm:pt-12 dark:border-gray-700 dark:bg-gray-900',
          cabinLayout.isWidebody ? 'rounded-t-[80px] sm:rounded-t-[120px] rounded-b-2xl sm:rounded-b-3xl' : 'rounded-t-[60px] sm:rounded-t-[100px] rounded-b-2xl sm:rounded-b-3xl'
        )}>
          {/* Nose */}
          <div className={cn(
            'absolute -top-1 left-1/2 -translate-x-1/2 rounded-t-full border sm:border-2 border-b-0 border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
            cabinLayout.isWidebody ? 'h-6 w-24 sm:h-10 sm:w-40' : 'h-5 w-20 sm:h-8 sm:w-32'
          )} />

          {/* Front Galley/Lavatory */}
          <FacilityRow facilities={facilitiesByRow.get(0) || []} position="front" cabinLayout={cabinLayout} />

          {/* Column Headers - must match exact layout of seat rows */}
          <div className="mb-2 sm:mb-3 flex items-center gap-0.5 sm:gap-1">
            {/* Left spacer for row number */}
            <div className="w-5 sm:w-6" />
            {cabinLayout.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="contents">
                {/* Aisle spacer before middle/right sections */}
                {sectionIndex > 0 && (
                  <div className="w-3 sm:w-5" />
                )}
                {/* Column letters for this section */}
                <div className="flex gap-0.5 sm:gap-1">
                  {section.map((col) => (
                    <div key={col} className="flex h-5 w-6 sm:h-6 sm:w-8 items-center justify-center text-[10px] sm:text-xs font-medium text-gray-400">
                      {col}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Seat Rows */}
          <div className="space-y-1" onClick={(e) => {
            // Clear active seat when clicking outside seats
            if ((e.target as HTMLElement).closest('button') === null) {
              setActiveSeat(null);
            }
          }}>
            {sortedRows.map(([rowNum, seats]) => (
              <div key={rowNum}>
                {/* Mid-cabin facilities (between rows) */}
                {facilitiesByRow.has(rowNum) && (
                  <FacilityRow facilities={facilitiesByRow.get(rowNum)!} position="mid" cabinLayout={cabinLayout} />
                )}
                <SeatRow
                  rowNumber={rowNum}
                  seats={seats}
                  selectedSeats={selectedSeats}
                  onSeatSelect={onSeatSelect}
                  maxSelections={maxSelections}
                  isExitRow={exitRows.has(rowNum)}
                  cabinLayout={cabinLayout}
                  activeSeat={activeSeat}
                  onSeatFocus={setActiveSeat}
                />
              </div>
            ))}
          </div>

          {/* Rear Galley/Lavatory */}
          <FacilityRow facilities={facilitiesByRow.get(lastRow + 1) || []} position="rear" cabinLayout={cabinLayout} />
        </div>
      </div>

      {/* Selection Summary */}
      {selectedSeats.length > 0 && (
        <Card className="mt-4 sm:mt-6 w-full max-w-md p-3 sm:p-4">
          <h4 className="mb-1.5 sm:mb-2 text-sm sm:text-base font-semibold">Ausgewählte Sitze</h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {selectedSeats.map((seat) => (
              <Badge key={seat.seatNumber} variant="default" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs">
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
// Wing Indicator Component
// ============================================================================

interface WingIndicatorProps {
  side: 'left' | 'right';
  startRow: number;
  endRow: number;
  firstRow: number;
}

function WingIndicator({ side, startRow, endRow, firstRow }: WingIndicatorProps) {
  // Calculate position based on row numbers
  const rowHeight = 28; // Approximate px per row
  const headerOffset = 45; // px for nose + headers
  const topOffset = headerOffset + (startRow - firstRow) * rowHeight;
  const height = (endRow - startRow + 1) * rowHeight;

  return (
    <div
      className={cn(
        'absolute flex items-center justify-center',
        side === 'left' ? '-left-5 sm:-left-12' : '-right-5 sm:-right-12'
      )}
      style={{ top: topOffset, height }}
    >
      <div className={cn(
        'flex h-full w-4 sm:w-10 items-center justify-center rounded-md sm:rounded-lg bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
        side === 'left' ? 'rounded-l-full' : 'rounded-r-full'
      )}>
        <span className="text-[6px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180">
          FLÜGEL
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Facility Row Component (Galley, Lavatory)
// ============================================================================

interface FacilityRowProps {
  facilities: Facility[];
  position: 'front' | 'mid' | 'rear';
  cabinLayout: CabinLayout;
}

function FacilityRow({ facilities: _facilities, position, cabinLayout: _cabinLayout }: FacilityRowProps) {
  // Show standard facilities based on position (front/rear of cabin)
  // API data is unreliable (returns multiple entries per galley position)
  // Real aircraft have: Front: WC + Galley, Rear: WC + Galley
  const facilityTypes = position === 'front' || position === 'rear'
    ? ['LA', 'GA']
    : [];

  if (facilityTypes.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center justify-center gap-1 sm:gap-2 py-1 sm:py-2',
      position === 'front' && 'border-b border-dashed border-gray-300 dark:border-gray-700 mb-1 sm:mb-2',
      position === 'rear' && 'border-t border-dashed border-gray-300 dark:border-gray-700 mt-1 sm:mt-2'
    )}>
      {facilityTypes.map((type) => {
        const isLavatory = type === 'LA';
        const isGalley = type === 'GA';

        return (
          <div
            key={type}
            className={cn(
              'flex items-center gap-0.5 sm:gap-1 rounded px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs',
              isLavatory && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              isGalley && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            )}
          >
            {isLavatory && <span className="text-[10px] sm:text-xs">🚻</span>}
            {isGalley && <span className="text-[10px] sm:text-xs">🍽️</span>}
            <span>{isLavatory ? 'WC' : 'Küche'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Seat Row Component - Dynamic layout support
// ============================================================================

interface SeatRowProps {
  rowNumber: number;
  seats: Seat[];
  selectedSeats: SelectedSeat[];
  onSeatSelect: (seat: SelectedSeat) => void;
  maxSelections: number;
  isExitRow?: boolean;
  cabinLayout: CabinLayout;
  activeSeat: string | null;
  onSeatFocus: (seatNumber: string | null) => void;
}

function SeatRow({
  rowNumber,
  seats,
  selectedSeats,
  onSeatSelect,
  maxSelections,
  isExitRow,
  cabinLayout,
  activeSeat,
  onSeatFocus
}: SeatRowProps) {

  return (
    <div className={cn(
      'flex items-center gap-0.5 sm:gap-1 relative',
      isExitRow && 'my-2 sm:my-3'
    )}>
      {/* Row number on the left */}
      <div className="flex h-6 w-5 sm:h-8 sm:w-6 items-center justify-center text-[10px] sm:text-xs text-gray-400">
        {rowNumber}
      </div>

      {/* Render sections with aisles between */}
      {cabinLayout.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="contents">
          {/* Aisle before middle/right sections */}
          {sectionIndex > 0 && (
            <div className="w-3 sm:w-5" />
          )}

          {/* Seats in this section */}
          <div className="flex gap-0.5 sm:gap-1">
            {section.map((col) => {
              const seat = seats.find(s => s.number.replace(/\d/g, '') === col);
              return seat ? (
                <SeatButton
                  key={seat.number}
                  seat={seat}
                  selectedSeats={selectedSeats}
                  onSeatSelect={onSeatSelect}
                  maxSelections={maxSelections}
                  activeSeat={activeSeat}
                  onSeatFocus={onSeatFocus}
                />
              ) : (
                <div key={col} className="h-6 w-6 sm:h-8 sm:w-8" />
              );
            })}
          </div>
        </div>
      ))}

      {/* Exit indicator */}
      {isExitRow && (
        <Badge variant="destructive" className="ml-1 sm:ml-2 text-[10px] sm:text-xs animate-pulse">
          EXIT
        </Badge>
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
  activeSeat: string | null;
  onSeatFocus: (seatNumber: string | null) => void;
}

function SeatButton({ seat, selectedSeats, onSeatSelect, maxSelections, activeSeat, onSeatFocus }: SeatButtonProps) {
  const pricing = seat.travelerPricing?.[0];
  const isAvailable = pricing?.seatAvailabilityStatus === 'AVAILABLE';
  const isSelected = selectedSeats.some(s => s.seatNumber === seat.number);
  const price = pricing?.price?.total ? parseFloat(pricing.price.total) : undefined;
  const currency = pricing?.price?.currency || 'EUR';
  const isFree = price === undefined || price === 0;
  const isActive = activeSeat === seat.number;

  const characteristics = seat.characteristicsCodes || [];
  const isExtraLegroom = characteristics.includes('L') || characteristics.includes('E');

  const handleClick = () => {
    if (!isAvailable) return;

    // Always allow deselecting
    if (isSelected) {
      onSeatSelect({ segmentId: '', travelerId: '', seatNumber: seat.number, price });
      onSeatFocus(null);
      return;
    }

    // On mobile (touch): first tap shows info, second tap selects
    // Check if this seat is already active (focused)
    if (!isActive) {
      // First tap - show price info
      onSeatFocus(seat.number);
      return;
    }

    // Second tap or desktop click - select the seat
    if (selectedSeats.length < maxSelections) {
      onSeatSelect({ segmentId: '', travelerId: '', seatNumber: seat.number, price });
      onSeatFocus(null);
    }
  };

  // Format tooltip with price info
  const tooltipText = isAvailable
    ? `Sitz ${seat.number} - ${isFree ? 'Gratis' : formatCurrency(price!, currency)}`
    : `Sitz ${seat.number} - Belegt`;

  const priceText = isFree ? 'Gratis' : formatCurrency(price!, currency);

  return (
    <div className="group relative">
      <motion.button
        whileHover={isAvailable ? { scale: 1.1 } : undefined}
        whileTap={isAvailable ? { scale: 0.95 } : undefined}
        onClick={handleClick}
        disabled={!isAvailable}
        className={cn(
          'flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-t-md sm:rounded-t-lg text-[10px] sm:text-xs font-medium transition-colors border sm:border-2',
          // Free seats - green
          isAvailable && !isSelected && isFree && 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400',
          // Paid seats - purple/violet
          isAvailable && !isSelected && !isFree && !isExtraLegroom && 'border-violet-500 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400',
          // Selected - pink accent
          isSelected && 'border-pink-500 bg-pink-500 text-white',
          // Unavailable - gray
          !isAvailable && 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-400 dark:border-gray-600 dark:bg-gray-700',
          // Extra legroom - amber
          isExtraLegroom && isAvailable && !isSelected && 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
          // Active/focused state (mobile)
          isActive && 'ring-2 ring-pink-400 ring-offset-1'
        )}
        title={tooltipText}
      >
        {seat.number.slice(-1)}
      </motion.button>

      {/* Price tooltip - visible on hover (desktop) or when active (mobile) */}
      {isAvailable && (
        <div className={cn(
          'pointer-events-none absolute -top-7 sm:-top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-white transition-opacity dark:bg-gray-100 dark:text-gray-900',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {priceText}
          {isActive && <span className="ml-1 text-pink-300 dark:text-pink-600">• Tippen</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Seat Legend Component - with facility icons
// ============================================================================

interface SeatLegendProps {
  className?: string;
  isWidebody?: boolean;
}

function SeatLegend({ className, isWidebody: _isWidebody }: SeatLegendProps) {
  // Row 1: Seat types
  const row1Items = [
    { type: 'seat', label: 'Gratis', className: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
    { type: 'seat', label: 'Kostenpflichtig', className: 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    { type: 'seat', label: 'Extra Beinfreiheit', className: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ];

  // Row 2: States + Facility
  const row2Items = [
    { type: 'seat', label: 'Ausgewählt', className: 'border-pink-500 bg-pink-500' },
    { type: 'seat', label: 'Belegt', className: 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700' },
    { type: 'facility', label: 'Notausgang', badge: 'EXIT', className: 'bg-red-100 text-red-700 dark:bg-red-900/30' },
  ];

  const renderItem = (item: typeof row1Items[0] | typeof row2Items[0]) => (
    <div key={item.label} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-sm">
      {item.type === 'seat' ? (
        <div className={cn('h-4 w-4 sm:h-5 sm:w-5 rounded-t-sm sm:rounded-t-md border sm:border-2', item.className)} />
      ) : (
        <div className={cn('flex h-4 sm:h-5 items-center rounded px-1 sm:px-1.5', item.className)}>
          {'badge' in item && item.badge && <span className="text-[8px] sm:text-[10px] font-bold">{item.badge}</span>}
        </div>
      )}
      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-2 sm:gap-3', className)}>
      {/* Row 1: Seat types */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 sm:gap-x-4">
        {row1Items.map(renderItem)}
      </div>

      {/* Row 2: States + Facility */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 sm:gap-x-4">
        {row2Items.map(renderItem)}
      </div>
    </div>
  );
}
