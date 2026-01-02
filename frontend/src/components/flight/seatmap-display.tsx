import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
    Check,
    X,
    Info,
    Armchair,
    LogOut,
    Utensils,
    AlertCircle,
    AppWindow,
    ArrowLeftRight,
    Zap,
    Tv,
    Baby,
    ArrowUp,
} from 'lucide-react';
import type { SeatmapData, Seat, Deck, Facility, SeatAmenity, Dictionaries, AircraftCabinAmenities } from '../../types/flight';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

// ============================================================================
// Types
// ============================================================================

export interface SelectedSeat {
    segmentId: string;
    travelerId: string;
    seatNumber: string;
    price?: number;
}

interface SeatmapDisplayProps {
    data?: SeatmapData;  // Single seatmap (legacy)
    seatmaps?: SeatmapData[];  // Multiple seatmaps (new)
    dictionaries?: Dictionaries;
    onSeatSelect?: (seat: SelectedSeat) => void;
    selectedSeats?: SelectedSeat[];
    className?: string;
    travelerCount?: number;
    maxSelections?: number;
}

interface GridCell {
    type: 'seat' | 'aisle' | 'empty' | 'facility' | 'exit';
    data?: Seat | Facility;
    id: string;
    row: number;
    col: number;
    label?: string; // e.g., "12A"
}

// ============================================================================
// Helpers
// ============================================================================

const getSeatStatus = (seat: Seat, selectedSeats: SelectedSeat[] = [], segmentId?: string): 'available' | 'occupied' | 'selected' | 'blocked' => {
    const isSelected = selectedSeats.some(s => s.seatNumber === seat.number && (!segmentId || s.segmentId === segmentId));
    if (isSelected) return 'selected';

    const status = seat.travelerPricing?.[0]?.seatAvailabilityStatus;
    if (status === 'OCCUPIED') return 'occupied';
    if (status === 'BLOCKED') return 'blocked';
    return 'available';
};

const getSeatPrice = (seat: Seat) => {
    const price = seat.travelerPricing?.[0]?.price;
    if (!price) return null;
    return { amount: price.total, currency: price.currency };
};

// ============================================================================
// Components
// ============================================================================

// ----------------------------------------------------------------------------
// Seat Component
// ----------------------------------------------------------------------------

interface SeatProps {
    seat: Seat;
    status: 'available' | 'occupied' | 'selected' | 'blocked';
    onSelect: (seat: SelectedSeat) => void;
    row: number;
    col: number;
    segmentId?: string;
    dictionaries?: Dictionaries;
    cabinAmenities?: AircraftCabinAmenities;
}

const SeatIcon = ({ status, className, rotation = 0, isExit = false, isPremium = false }: { status: string; className?: string; rotation?: number; isExit?: boolean; isPremium?: boolean }) => {
    const isInteractive = status === 'available' || status === 'selected';

    return (
        <div className={cn("relative w-full h-full flex items-center justify-center transition-all duration-300", className)}>
            <motion.div
                initial={false}
                animate={{
                    scale: 1,
                    y: 0,
                    rotate: rotation,
                }}
                className={cn(
                    "w-full h-full rounded-lg lg:rounded-xl flex items-center justify-center text-xs font-bold transition-all relative overflow-hidden",
                    "shadow-[0_2px_4px_rgba(0,0,0,0.05)] border",

                    // Available - Standard
                    status === 'available' && !isExit && !isPremium && "bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-600 hover:border-fuchsia-400 hover:shadow-fuchsia-100 dark:from-neutral-800 dark:to-neutral-900 dark:border-neutral-700 dark:text-slate-300 dark:hover:border-fuchsia-500",

                    // Available - Exit Row
                    status === 'available' && isExit && "bg-gradient-to-b from-orange-50 to-orange-100/50 border-orange-300 text-orange-700 hover:border-orange-500 hover:shadow-orange-100 dark:from-orange-500/20 dark:to-orange-600/10 dark:border-orange-500/40 dark:text-orange-400 dark:hover:border-orange-400",

                    // Available - Premium
                    status === 'available' && isPremium && "bg-gradient-to-b from-fuchsia-50/50 to-white border-fuchsia-200 text-fuchsia-700 hover:border-fuchsia-500 hover:shadow-fuchsia-100 dark:from-fuchsia-950/10 dark:to-neutral-800 dark:border-fuchsia-900/50 dark:text-fuchsia-300",

                    // Occupied / Blocked
                    (status === 'occupied' || status === 'blocked') && "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed dark:bg-neutral-600 dark:border-neutral-500 dark:text-neutral-400",

                    // Selected
                    status === 'selected' && "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 border-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/30",

                    isInteractive ? "cursor-pointer" : "cursor-default"
                )}
            >
                {/* 3D Inner Highlights */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-0 top-0 h-px bg-white/60 dark:bg-white/5" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-black/5 dark:bg-black/20" />
                </div>

                {/* Headrest visuals (Split-tone) */}
                <div className={cn(
                    "absolute bottom-[8%] left-[18%] right-[18%] h-[20%] rounded-t-lg transition-colors",
                    status === 'selected' ? "bg-white/20" : "bg-slate-200/50 dark:bg-neutral-700/50"
                )} />

                {/* Armrests (Subtle structural details) */}
                <div className={cn(
                    "absolute top-[15%] bottom-[25%] left-[6%] w-[1.5px] rounded-full opacity-20",
                    status === 'selected' ? "bg-white" : "bg-slate-400 dark:bg-neutral-500"
                )} />
                <div className={cn(
                    "absolute top-[15%] bottom-[25%] right-[6%] w-[1.5px] rounded-full opacity-20",
                    status === 'selected' ? "bg-white" : "bg-slate-400 dark:bg-neutral-500"
                )} />

                {/* Content Icon */}
                <div className="relative z-10 font-bold flex items-center justify-center">
                    {(status === 'occupied' || status === 'blocked') && <X className="w-3 h-3 lg:w-4 lg:h-4 opacity-40 text-slate-400 dark:text-neutral-500" />}
                    {status === 'selected' && <Check className="w-4 h-4 lg:w-5 lg:h-5 text-white" />}
                </div>
            </motion.div>
        </div>
    );
};

const SeatDetailTooltip = ({ seat, status, dictionaries, cabinAmenities, cabinClass, col, totalCols }: {
    seat: Seat;
    status: string;
    dictionaries?: Dictionaries;
    cabinAmenities?: AircraftCabinAmenities;
    cabinClass?: string;
    col?: number;
    totalCols?: number;
}) => {
    const price = getSeatPrice(seat);
    const amenities = seat.amenities || [];
    const characteristics = seat.characteristicsCodes || [];

    // Determine the actual cabin string
    const rawCabin = seat.cabin || cabinClass || '';
    const cabinUpper = rawCabin.toUpperCase();

    const isFirst = cabinUpper === 'F' || cabinUpper.includes('FIRST');
    const isBusiness = cabinUpper === 'C' || cabinUpper === 'J' || cabinUpper.includes('BUSINESS');
    const isPremiumEco = cabinUpper === 'W' || cabinUpper.includes('PREMIUM');
    const isEconomy = !isFirst && !isBusiness && !isPremiumEco;

    const cabinLabel = isFirst ? 'First Class' :
        isBusiness ? 'Business Class' :
            isPremiumEco ? 'Premium Economy' : 'Economy Class';


    // Format characteristics for display (Based on Amadeus / IATA standards)
    const isExit = characteristics.includes('E');
    const isLegroom = characteristics.includes('L');
    const isBulkhead = characteristics.includes('BH'); // Standard Amadeus code for Bulkhead
    const isPreferred = characteristics.includes('P') || characteristics.includes('V') || characteristics.includes('O');
    const isLieFlat = characteristics.includes('LI') || characteristics.includes('LB') || characteristics.includes('F');
    const isAisleAccess = characteristics.includes('AC');

    // Improved Window/Aisle detection with spatial inference (ONLY for true edges)
    const isWindow = characteristics.includes('W') ||
        (col !== undefined && totalCols !== undefined && (col === 0 || col === totalCols - 1));

    const isAisle = characteristics.includes('A');

    const hasPower = characteristics.includes('POW') || !!cabinAmenities?.power || isBusiness || isFirst;
    const hasVideo = characteristics.includes('VID') || !!cabinAmenities?.entertainment || isBusiness || isFirst;
    const hasWifi = !!cabinAmenities?.wifi;
    const hasFood = !!cabinAmenities?.food || isBusiness || isFirst;
    const hasBeverage = !!cabinAmenities?.beverage || isBusiness || isFirst;
    const hasBassinet = characteristics.includes('B');

    // Use cabin-level seat info if seat-level is missing
    const displayAmenities = amenities.length > 0 ? amenities : (cabinAmenities?.seat ? [cabinAmenities.seat] : []);

    // Combine checks for UI section visibility
    const hasAmenities = displayAmenities.length > 0 || hasPower || hasVideo || hasBassinet || isExit || isLegroom || isBulkhead || isPreferred || isLieFlat || isAisleAccess || hasWifi || hasFood || hasBeverage || isWindow || isAisle ||
        (dictionaries?.seatCharacteristics && characteristics.some(c => !['A', 'W', 'E', 'L', 'P', 'V', 'B', 'BH', 'AC', 'LI', 'LB', 'F'].includes(c)));

    return (
        <div className="flex flex-col gap-2 min-w-[200px] p-1">
            <div className="flex flex-col border-b border-white/10 pb-2 mb-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Sitz {seat.number}</span>
                    <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest",
                        status === 'available' && "bg-emerald-500/20 text-emerald-300",
                        status === 'selected' && "bg-fuchsia-500/20 text-fuchsia-300",
                        status === 'occupied' && "bg-slate-500/20 text-slate-400",
                        status === 'blocked' && "bg-slate-500/20 text-slate-400"
                    )}>
                        {status === 'available' ? 'VERFÜGBAR' :
                            status === 'selected' ? 'AUSGEWÄHLT' :
                                status === 'occupied' || status === 'blocked' ? 'BELEGT' : status.toUpperCase()}
                    </span>
                </div>
                <span className={cn(
                    "text-[9px] font-bold mt-1 uppercase tracking-tighter",
                    isFirst && "text-purple-400 dark:text-purple-300",
                    isBusiness && "text-fuchsia-400 dark:text-fuchsia-300",
                    isPremiumEco && "text-blue-400 dark:text-blue-300",
                    isEconomy && "text-slate-500 dark:text-slate-400"
                )}>
                    {cabinLabel}
                </span>
            </div>

            {price && (status === 'available' || status === 'selected') && (
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                    <span className="text-xs text-slate-400">Preis</span>
                    <span className="text-sm font-bold text-white">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: price.currency || 'EUR' }).format(Number(price.amount))}
                    </span>
                </div>
            )}

            {hasAmenities && (
                <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ausstattung</span>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-300">
                        {displayAmenities.map((a: SeatAmenity, i: number) => {
                            const mediaLabel = a.medias?.[0]?.title || a.medias?.[0]?.description?.text;
                            let label = mediaLabel;

                            if (!label) {
                                if (a.seatTilt === 'FULL_FLAT') label = 'Flat Bed / Bett';
                                else if (a.seatTilt === 'ANGLE_FLAT') label = 'Schrägbett';
                                else if (a.legSpace) label = `${a.legSpace}${a.spaceUnit === 'INCHES' ? '"' : ''} Beinfreiheit`;
                                else label = 'Komfortsitz';
                            }

                            return (
                                <div key={i} className="flex items-center gap-1.5 bg-white/5 dark:bg-black/20 px-2 py-1 rounded">
                                    <Armchair className="w-3 h-3 text-fuchsia-400" />
                                    <span className="truncate capitalize text-[10px] text-slate-300 dark:text-slate-200">
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                        {isLieFlat && !displayAmenities.some(a => a.seatTilt === 'FULL_FLAT') && (
                            <div className="flex items-center gap-1.5 bg-white/5 dark:bg-black/20 px-2 py-1 rounded">
                                <Armchair className="w-3 h-3 text-fuchsia-400" />
                                <span className="truncate text-[10px] text-slate-300 dark:text-slate-200">Full Flat Bed</span>
                            </div>
                        )}
                        {isAisleAccess && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <ArrowLeftRight className="w-3 h-3 text-blue-400" />
                                <span className="truncate text-[10px]">Gangzugang</span>
                            </div>
                        )}
                        {hasPower && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="truncate text-[10px]">Strom / USB</span>
                            </div>
                        )}
                        {hasVideo && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Tv className="w-3 h-3 text-blue-400" />
                                <span className="truncate text-[10px]">Entertainment</span>
                            </div>
                        )}
                        {hasWifi && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Zap className="w-3 h-3 text-sky-400" />
                                <span className="truncate text-[10px]">WLAN</span>
                            </div>
                        )}
                        {hasFood && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Utensils className="w-3 h-3 text-orange-400" />
                                <span className="truncate text-[10px]">Menü</span>
                            </div>
                        )}
                        {hasBeverage && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Utensils className="w-3 h-3 text-blue-300" />
                                <span className="truncate text-[10px]">Getränke</span>
                            </div>
                        )}
                        {hasBassinet && (
                            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                <Baby className="w-3 h-3 text-pink-400" />
                                <span className="truncate text-[10px]">Babybett</span>
                            </div>
                        )}
                        {/* Static Mappings for major features */}
                        {isExit && (
                            <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                                <LogOut className="w-3 h-3 text-orange-400" />
                                <span className="truncate text-[10px] text-orange-300">Notausgang</span>
                            </div>
                        )}
                        {isLegroom && (
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                <Zap className="w-3 h-3 text-emerald-400" />
                                <span className="truncate text-[10px] text-emerald-300">Beinfreiheit</span>
                            </div>
                        )}
                        {isBulkhead && (
                            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                <ArrowUp className="w-3 h-3 text-blue-400" />
                                <span className="truncate text-[10px] text-blue-300">Wand-Sitz</span>
                            </div>
                        )}
                        {isWindow && (
                            <div className="flex items-center gap-1.5 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                                <AppWindow className="w-3 h-3 text-sky-400" />
                                <span className="truncate text-[10px] text-sky-300">Fenster</span>
                            </div>
                        )}
                        {isAisle && (
                            <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                <ArrowLeftRight className="w-3 h-3 text-indigo-400" />
                                <span className="truncate text-[10px] text-indigo-300">Gang</span>
                            </div>
                        )}

                        {/* Automated dictionary mapping for all other secondary codes */}
                        {dictionaries?.seatCharacteristics && characteristics
                            .filter(code => !['A', 'W', 'B', 'AC', 'LI', 'LB', 'F', 'E', 'L', 'BH'].includes(code))
                            .map(code => {
                                const desc = dictionaries.seatCharacteristics?.[code];
                                if (!desc) return null;

                                // Avoid showing "Window" or "Aisle" twice if dictionary has it
                                if (desc.toLowerCase().includes('window') || desc.toLowerCase().includes('aisle')) return null;

                                return (
                                    <div key={code} className="flex items-center gap-1.5 bg-white/5 dark:bg-black/20 px-2 py-1 rounded border border-white/5">
                                        <Info className="w-3 h-3 text-slate-400" />
                                        <span className="truncate capitalize text-[10px] text-slate-300 dark:text-slate-200">
                                            {desc}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};

const SeatItem = ({ seat, status, onSelect, segmentId, rotation, dictionaries, cabinAmenities, row, col, totalCols, cabinClass }: SeatProps & { rotation?: number; row: number; col: number; totalCols: number; cabinClass?: string }) => {
    const isInteractive = status === 'available' || status === 'selected';

    // Only highlight TRULY special functional seats (Exits/Legroom)
    // Bulkheads and Preferred seats look normal but show their status in the tooltip
    const isSpecialHighlight = seat.characteristicsCodes?.includes('E') ||
        seat.characteristicsCodes?.includes('L');

    const isPremiumSeat = (seat.cabin === 'F' || seat.cabin === 'C') || (cabinClass === 'FIRST' || cabinClass === 'BUSINESS');


    const handleSelect = () => {
        if (!isInteractive) return;

        const price = seat.travelerPricing?.[0]?.price;
        const selectedSeat: SelectedSeat = {
            segmentId: segmentId || '',
            travelerId: seat.travelerPricing?.[0]?.travelerId || '1',
            seatNumber: seat.number,
            price: price?.total ? parseFloat(price.total) : undefined
        };
        onSelect(selectedSeat);
    };

    const tooltipSide = row < 4 ? 'bottom' : 'top';
    const tooltipAlign = col < totalCols / 3 ? 'start' : col > (totalCols * 2 / 3) ? 'end' : 'center';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div onClick={handleSelect} className={cn("relative p-0.5 w-5 h-5 lg:w-11 lg:h-14 flex items-center justify-center", isInteractive ? "cursor-pointer group" : "cursor-default")}>
                    <SeatIcon
                        status={status}
                        rotation={rotation}
                        className="w-full h-full"
                        isExit={isSpecialHighlight}
                        isPremium={isPremiumSeat}
                    />
                    {/* Seat Number below - just the letter */}
                    <span className={cn(
                        "absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold transition-colors uppercase tracking-tighter opacity-60",
                        status === 'selected' ? "text-fuchsia-600 opacity-100" : "text-slate-500 dark:text-neutral-500"
                    )}>
                        {seat.number.replace(/\d+/g, '')}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent
                side={tooltipSide}
                align={tooltipAlign}
                forceShow={status === 'selected' && typeof window !== 'undefined' && window.innerWidth < 1024}
                className="bg-slate-900/98 dark:bg-neutral-900 border border-slate-700/50 dark:border-neutral-700 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
                <SeatDetailTooltip seat={seat} status={status} dictionaries={dictionaries} cabinAmenities={cabinAmenities} cabinClass={cabinClass} col={col} totalCols={totalCols} />
            </TooltipContent>
        </Tooltip>
    );
};


const FacilityItem = ({ facility }: { facility: Facility }) => {
    let icon = <Info className="w-4 h-4" />;
    let label = 'Einrichtung';
    let bgColor = 'bg-slate-50 dark:bg-neutral-800/50';
    let iconColor = 'text-slate-300 dark:text-neutral-500';

    const code = facility.code;
    const nameLower = facility.name?.toLowerCase() || '';

    // Smart detection of facility type
    const isGalley = ['GN', 'GA', 'G', 'K', 'GY'].includes(code || '') || nameLower.includes('galley') || nameLower.includes('kitchen') || nameLower.includes('bordküche');
    const isToilet = code === 'LA' || code === 'LV' || code === 'T' || code === 'WC' || nameLower.includes('lavatory') || nameLower.includes('toilet') || nameLower.includes('wc');
    const isStairs = code === 'ST' || nameLower.includes('stair');
    const isStorage = ['CL', 'LG'].includes(code || '') || nameLower.includes('closet') || nameLower.includes('baggage') || nameLower.includes('storage') || nameLower.includes('coat');

    if (isToilet) {
        icon = <span className="text-xs sm:text-sm font-extrabold tracking-tight">WC</span>;
        label = 'Toilette';
        bgColor = 'bg-slate-100 dark:bg-neutral-800';
        iconColor = 'text-slate-600 dark:text-neutral-400';
    } else if (isGalley) {
        icon = <Utensils className="w-4 h-4" />;
        label = 'Bordküche';
        bgColor = 'bg-slate-100 dark:bg-neutral-800';
        iconColor = 'text-slate-600 dark:text-neutral-400';
    } else if (isStairs) {
        icon = <ArrowLeftRight className="w-4 h-4 rotate-90" />;
        label = 'Treppe';
        bgColor = 'bg-slate-100 dark:bg-neutral-800';
        iconColor = 'text-slate-400 dark:text-neutral-500';
    } else if (isStorage) {
        icon = <Info className="w-4 h-4" />;
        label = 'Garderobe / Stauraum';
        bgColor = 'bg-slate-50 dark:bg-neutral-800/50';
    } else if (facility.name) {
        label = facility.name; // Fallback to provided name
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    "w-full h-full flex items-center justify-center rounded-lg lg:rounded-xl border border-slate-200 dark:border-neutral-700/50 shadow-sm transition-all cursor-help",
                    bgColor, iconColor
                )}>
                    {icon}
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900/90 border-slate-700 text-white text-xs">
                {label}
            </TooltipContent>
        </Tooltip>
    );
};

// ----------------------------------------------------------------------------
// Grid & Fuselage
// ----------------------------------------------------------------------------

const DeckGrid = ({
    deck,
    onSeatSelect,
    selectedSeats,
    segmentId,
    dictionaries,
    cabinAmenities,
    cabinClass
}: {
    deck: Deck;
    onSeatSelect?: (seat: SelectedSeat) => void;
    selectedSeats: SelectedSeat[];
    segmentId?: string;
    dictionaries?: Dictionaries;
    cabinAmenities?: AircraftCabinAmenities;
    cabinClass?: string;
}) => {
    const config = deck.deckConfiguration || {};

    // Exit Rows detection
    // config.exitRowsX is array of row numbers
    const exitRows = useMemo(() => new Set(config?.exitRowsX || []), [config]);

    // if (!config) return ... removed to support implied configuration from seats

    // Calculate actual dimensions from seat coordinates
    const allXCoords = [
        ...deck.seats.map(s => s.coordinates?.x).filter((x): x is number => x !== undefined),
        ...(deck.facilities?.map(f => f.coordinates?.x).filter((x): x is number => x !== undefined) || [])
    ];

    // Use actual min row from data to avoid empty space at front of fuselage
    const startRow = allXCoords.length > 0
        ? Math.min(...allXCoords)
        : (config.startSeatRow || 1);

    const endRow = allXCoords.length > 0
        ? Math.max(...allXCoords)
        : (config.endSeatRow || 30);

    const rowCount = endRow - startRow + 1;

    // Find min and max y coordinates from actual seats to determine width
    const allYCoords = [
        ...deck.seats.map(s => s.coordinates?.y).filter((y): y is number => y !== undefined),
        ...(deck.facilities?.map(f => f.coordinates?.y).filter((y): y is number => y !== undefined) || [])
    ];

    const minY = allYCoords.length > 0 ? Math.min(...allYCoords) : 1;
    const maxY = allYCoords.length > 0 ? Math.max(...allYCoords) : (config.width || 9);
    const width = maxY - minY + 1; // Calculate width based on actual range

    // Build Grid
    // Initialize standard rows
    const grid: GridCell[][] = Array(rowCount).fill(null).map((_, rIdx) =>
        Array(width).fill(null).map((_, cIdx) => ({
            type: 'empty',
            id: `empty-${rIdx}-${cIdx}`,
            row: rIdx + startRow,
            col: cIdx + minY, // Start from minY instead of 1
        }))
    );

    // Place Seats
    deck.seats.forEach(seat => {
        const coords = seat.coordinates;
        if (coords && coords.x !== undefined && coords.y !== undefined) {
            const rowIndex = coords.x - startRow;
            const colIndex = coords.y - minY; // Adjust for minY offset

            if (rowIndex >= 0 && rowIndex < rowCount && colIndex >= 0 && colIndex < width) {
                grid[rowIndex][colIndex] = {
                    type: 'seat',
                    data: seat,
                    id: seat.number,
                    row: coords.x,
                    col: coords.y,
                    label: seat.number
                };
            }
        }
    });

    // Place Facilities
    deck.facilities?.forEach(facility => {
        if (facility.coordinates?.x !== undefined && facility.coordinates?.y !== undefined) {
            const rowIndex = facility.coordinates.x - startRow;
            const colIndex = facility.coordinates.y - minY; // Adjust for minY offset
            if (rowIndex >= 0 && rowIndex < rowCount && colIndex >= 0 && colIndex < width) {
                grid[rowIndex][colIndex] = {
                    type: 'facility',
                    data: facility,
                    id: `fac-${facility.code}-${rowIndex}-${colIndex}`,
                    row: facility.coordinates.x,
                    col: facility.coordinates.y,
                    label: facility.code
                };
            }
        }
    });

    // Analyze Aisles (columns that are consistently empty)
    // Simple heuristic: if a column has < 10% seats populated, it's an aisle
    const aisleStatus = Array(width).fill(0).map((_, c) => {
        let populated = 0;
        for (let r = 0; r < rowCount; r++) {
            if (grid[r][c].type === 'seat') populated++;
        }
        return populated / rowCount < 0.1; // threshold for aisle
    });

    // Update grid cells to 'aisle' type based on aisleStatus
    grid.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
            if (cell.type === 'empty' && aisleStatus[cIdx]) {
                grid[rIdx][cIdx] = { ...cell, type: 'aisle' };
            }
        });
    });

    return (
        <div
            className={cn(
                "relative py-8 lg:py-12 px-1 lg:px-8 flex justify-center",
                // Responsive variables scaled to match the visual row distribution
                "[--row-step:24px] [--nose-offset:32px]",
                "lg:[--row-step:50px] lg:[--nose-offset:60px]"
            )}
            style={{
                ...({
                    '--grid-start-row': startRow,
                    '--wing-start-row': (config.startWingsX !== undefined ? config.startWingsX : config.startWingsRow) ?? (rowCount > 10 ? startRow + 10 : startRow),
                    '--wing-end-row': (config.endWingsX !== undefined ? config.endWingsX : config.endWingsRow) ?? (rowCount > 10 ? startRow + 25 : startRow + 2),
                } as any)
            }}
        >
            {/* Fuselage Background (Architectural Design) */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-neutral-800 rounded-[16px] lg:rounded-[40px] shadow-2xl border border-slate-200 dark:border-neutral-700 pointer-events-none overflow-hidden transition-colors duration-500 z-0">
                {/* Curvature Gradient (Tubular effect) */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200/50 via-white to-slate-200/50 dark:from-black/30 dark:via-neutral-800 dark:to-black/30" />

                {/* Cockpit / Nose Gradient */}
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-100/80 to-transparent dark:from-neutral-700/20 opacity-100" />
            </div>

            {/* Wings Decoration */}
            {deck.deckType !== 'UPPER' && (
                <>
                    <div
                        className="absolute left-[-20px] lg:left-[-60px] w-16 lg:w-32 bg-slate-300/20 dark:bg-neutral-700/20 rounded-l-[100%] skew-y-12 z-0 transition-colors"
                        style={{
                            top: `calc((var(--wing-start-row) - var(--grid-start-row)) * var(--row-step) + var(--nose-offset))`,
                            height: `calc((var(--wing-end-row) - var(--wing-start-row) + 1) * var(--row-step))`
                        }}
                    />
                    <div
                        className="absolute right-[-20px] lg:right-[-60px] w-16 lg:w-32 bg-slate-300/20 dark:bg-neutral-700/20 rounded-r-[100%] -skew-y-12 z-0 transition-colors"
                        style={{
                            top: `calc((var(--wing-start-row) - var(--grid-start-row)) * var(--row-step) + var(--nose-offset))`,
                            height: `calc((var(--wing-end-row) - var(--wing-start-row) + 1) * var(--row-step))`
                        }}
                    />
                </>
            )}

            {/* Grid Content */}
            <div className="relative z-10 flex flex-col gap-2 lg:gap-3">
                {grid.map((row, rIdx) => {
                    const rowNum = rIdx + startRow;

                    // Try to find a seat in the row to determine the label
                    const seatInRow = row.find(cell => cell.type === 'seat' && cell.data);
                    // Extract numeric part from seat number (e.g. "12A" -> "12")
                    // If no seat, do not show row number (e.g. facility rows)
                    const rowLabel = seatInRow && seatInRow.data
                        ? (seatInRow.data as Seat).number.match(/^(\d+)/)?.[1] || rowNum.toString()
                        : "";

                    // We can still use the coordinate-based index for exit row detection 
                    // if config.exitRowsX refers to coordinates. 
                    // If config.exitRowsX refers to physical row numbers, we should use parseInt(rowLabel).
                    // Amadeus documentation implies coordinates, so let's stick to coordinate for exit row check for now.
                    const isExit = exitRows.has(rowNum);

                    return (
                        <div key={`row-${rowNum}`} className="relative">
                            {/* Row Number (Left) */}
                            <div className="absolute -left-7 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-neutral-500 font-bold transition-colors">
                                {rowLabel !== "0" && rowLabel}
                            </div>

                            {/* Exit Indicator */}
                            {isExit && (
                                <>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 pr-16 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest whitespace-nowrap">
                                        EXIT <LogOut className="w-3 h-3 rotate-180" />
                                    </div>
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 pl-16 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest whitespace-nowrap">
                                        <LogOut className="w-3 h-3" /> EXIT
                                    </div>
                                </>
                            )}

                            <div className="flex flex-nowrap items-center gap-px lg:gap-3 min-w-max">
                                {row.map((cell, cIdx) => {
                                    if (cell.type === 'seat' && cell.data) {
                                        const status = getSeatStatus(cell.data as Seat, selectedSeats, segmentId);
                                        return (
                                            <SeatItem
                                                key={cell.id}
                                                seat={cell.data as Seat}
                                                status={status}
                                                onSelect={onSeatSelect || (() => { })}
                                                row={rowNum}
                                                col={cIdx}
                                                totalCols={width}
                                                cabinClass={cabinClass}
                                                segmentId={segmentId}
                                                dictionaries={dictionaries}
                                                cabinAmenities={cabinAmenities}
                                            />
                                        );
                                    } else if (cell.type === 'aisle') {
                                        return <div key={cell.id} className="w-2 lg:w-8 shrink-0 h-5 lg:h-14" />;
                                    } else if (cell.type === 'empty') {
                                        return <div key={cell.id} className="w-5 lg:w-11 shrink-0 h-5 lg:h-14" />;
                                    } else if (cell.type === 'facility' && cell.data) {
                                        // Facility (Lavatory, Galley, Storage)
                                        return (
                                            <div key={cell.id} className="w-5 h-5 lg:w-11 lg:h-14 flex items-center justify-center p-0.5">
                                                <FacilityItem facility={cell.data as Facility} />
                                            </div>
                                        );
                                    }
                                    return <div key={cell.id} className="w-5 lg:w-11 shrink-0 h-5 lg:h-14" />;
                                })}
                            </div>

                            {/* Row Number (Right) */}
                            <div className="absolute -right-7 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-neutral-500 font-bold transition-colors">
                                {rowLabel !== "0" && rowLabel}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------

export default function SeatmapDisplay({
    data,
    seatmaps,
    onSeatSelect,
    selectedSeats = [],
    className,
    travelerCount = 1,
    maxSelections,
    dictionaries
}: SeatmapDisplayProps) {
    // Support both single data and multiple seatmaps
    const seatmapList = seatmaps || (data ? [data] : []);

    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
    const [activeDeckIndex, setActiveDeckIndex] = useState(0);

    if (!seatmapList || seatmapList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Keine Seatmap-Daten verfügbar</p>
            </div>
        );
    }

    const activeSeatmap = seatmapList[activeSegmentIndex];
    const activeDeck = activeSeatmap?.decks?.[activeDeckIndex];

    // Legend Data
    const legendItems = [
        { label: 'Verfügbar', color: 'bg-white dark:bg-neutral-800 border md:border-2 border-blue-200 dark:border-blue-900 overflow-hidden' },
        { label: 'Ausgewählt', color: 'bg-fuchsia-600' },
        { label: 'Belegt', color: 'bg-slate-200 dark:bg-neutral-600 border border-slate-300 dark:border-neutral-500' },
        { label: 'Extra Beinfreiheit', color: 'bg-orange-50 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40' },
    ];

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className={cn("flex flex-col h-full bg-slate-50/50 dark:bg-neutral-900/40 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-inner transition-colors", className)}
                style={{ fontFamily: 'Arial, sans-serif' }}
            >

                {/* Segment Selector (if multiple segments) */}
                {seatmapList.length > 1 && (
                    <div className="bg-white dark:bg-neutral-800 border-b border-slate-100 dark:border-neutral-700 px-6 py-3 rounded-t-2xl transition-colors">
                        <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto">
                            {seatmapList.map((sm, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setActiveSegmentIndex(idx);
                                        setActiveDeckIndex(0);
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                        activeSegmentIndex === idx
                                            ? "bg-fuchsia-600 text-white shadow-md"
                                            : "bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-600"
                                    )}
                                >
                                    {sm.carrierCode} {sm.number} • {sm.departure?.iataCode} → {sm.arrival?.iataCode}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Header / Deck Toggle */}
                <div className={cn(
                    "bg-white dark:bg-neutral-800 border-b border-slate-100 dark:border-neutral-700 px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0 sticky top-0 z-20 shadow-sm transition-colors",
                    seatmapList.length <= 1 && "rounded-t-2xl"
                )}>
                    <div className="flex items-center gap-4">
                        <div className="bg-fuchsia-50 dark:bg-fuchsia-950/30 p-2 rounded-lg transition-colors">
                            <Armchair className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100 transition-colors">Sitzplätze wählen</h3>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-500 transition-colors uppercase tracking-wider font-medium">
                                {selectedSeats.length} / {maxSelections || travelerCount} • {activeSeatmap?.aircraft?.code || 'Flugzeug'}
                            </p>
                        </div>
                    </div>

                    {/* Legend (Moved from Footer) */}
                    <div className="flex flex-wrap items-center gap-4 px-4 mt-2 lg:mt-0 lg:px-4">
                        {legendItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                {item.color && (
                                    <div className={cn("w-3 h-3 rounded shadow-sm", item.color)} />
                                )}
                                {(item as any).icon && (
                                    <div className="scale-75">
                                        {(item as any).icon}
                                    </div>
                                )}
                                <span className="text-[10px] font-medium text-slate-500 dark:text-neutral-500">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Deck Toggles */}
                    {activeSeatmap && activeSeatmap.decks && activeSeatmap.decks.length > 1 && (
                        <div className="flex bg-slate-100 dark:bg-neutral-900/50 p-1 rounded-lg transition-colors">
                            {activeSeatmap.decks.map((deck, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveDeckIndex(idx)}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                                        activeDeckIndex === idx
                                            ? "bg-white dark:bg-neutral-700 text-fuchsia-600 dark:text-fuchsia-300 shadow-sm"
                                            : "text-slate-500 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300"
                                    )}
                                >
                                    {deck.deckType ? deck.deckType.charAt(0) + deck.deckType.slice(1).toLowerCase() : `Deck ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Seatmap Viewport */}
                <div className="flex-1 overflow-auto relative bg-slate-50/30 dark:bg-black/10 transition-colors">
                    <div className="min-w-max py-12 px-4 flex justify-center">
                        {activeDeck ? (
                            <DeckGrid
                                key={`${activeSegmentIndex}-${activeDeckIndex}`}
                                deck={activeDeck}
                                onSeatSelect={onSeatSelect}
                                selectedSeats={selectedSeats}
                                segmentId={activeSeatmap.segmentId}
                                dictionaries={dictionaries}
                                cabinAmenities={activeSeatmap.aircraftCabinAmenities}
                                cabinClass={activeSeatmap.class}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 mt-20">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>Keine Deck-Daten verfügbar</p>
                            </div>
                        )}
                    </div>
                </div>



            </div>
        </TooltipProvider>
    );
}
