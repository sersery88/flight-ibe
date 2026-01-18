import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightDates } from '@/hooks/use-flights';

// ============================================================================
// Price-Aware Date Range Picker - Shows cheapest prices on each date
// ============================================================================

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const formatShortDate = (date: Date) => {
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${day}. ${monthNames[date.getMonth()]}`;
};

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let firstDayOfWeek = firstDay.getDay() - 1;
  if (firstDayOfWeek === -1) firstDayOfWeek = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface PriceDateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  origin?: string;
  destination?: string;
  placeholderFrom?: string;
  placeholderTo?: string;
  minDate?: Date;
  className?: string;
  compact?: boolean;
}

export function PriceDateRangePicker({
  value,
  onChange,
  origin,
  destination,
  placeholderFrom = 'Hinflug',
  placeholderTo = 'Rückflug',
  minDate = new Date(),
  className,
  compact = false,
}: PriceDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leftMonth, setLeftMonth] = useState(() => {
    if (value?.from) return new Date(value.from.getFullYear(), value.from.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [selecting, setSelecting] = useState<'from' | 'to'>('from');
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value?.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value?.to);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  // Fetch price data when origin and destination are available
  const canFetchPrices = !!origin && !!destination && origin.length === 3 && destination.length === 3;
  const { data: priceData, isLoading: isPriceLoading } = useFlightDates(
    origin || '',
    destination || ''
  );

  // Create a map of date -> price for quick lookup
  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; currency: string }>();
    if (priceData?.data) {
      for (const item of priceData.data) {
        map.set(item.departureDate, {
          price: parseFloat(item.price.total),
          currency: item.price.currency,
        });
      }
    }
    return map;
  }, [priceData]);

  // Calculate min/max prices for color coding
  const { minPrice, maxPrice } = useMemo(() => {
    if (priceMap.size === 0) return { minPrice: 0, maxPrice: 0 };
    const prices = Array.from(priceMap.values()).map(p => p.price);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [priceMap]);

  // Sync with external value
  useEffect(() => {
    setTempFrom(value?.from);
    setTempTo(value?.to);
    if (value?.from) {
      setLeftMonth(new Date(value.from.getFullYear(), value.from.getMonth(), 1));
    }
  }, [value?.from, value?.to]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!tempFrom || !tempTo) {
          setTempFrom(value?.from);
          setTempTo(value?.to);
          setSelecting('from');
        }
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, tempFrom, tempTo, value]);

  const isDateDisabled = (day: number, month: Date) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const minDateNormalized = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    if (date < minDateNormalized) return true;
    if (selecting === 'to' && tempFrom) {
      return date < tempFrom;
    }
    return false;
  };

  const isDateInRange = (day: number, month: Date) => {
    if (!tempFrom || !tempTo) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date > tempFrom && date < tempTo;
  };

  const isRangeStart = (day: number, month: Date) => {
    if (!tempFrom) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date.toDateString() === tempFrom.toDateString();
  };

  const isRangeEnd = (day: number, month: Date) => {
    if (!tempTo) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date.toDateString() === tempTo.toDateString();
  };

  const isToday = (day: number, month: Date) => {
    const today = new Date();
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  const getDateKey = (day: number, month: Date) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date.toISOString().split('T')[0];
  };

  const getPriceLevel = (price: number): 'low' | 'medium' | 'high' => {
    if (maxPrice === minPrice) return 'medium';
    const range = maxPrice - minPrice;
    const threshold1 = minPrice + range * 0.33;
    const threshold2 = minPrice + range * 0.66;
    if (price <= threshold1) return 'low';
    if (price <= threshold2) return 'medium';
    return 'high';
  };

  const handleDateClick = (day: number, month: Date) => {
    if (isDateDisabled(day, month)) return;
    const date = new Date(month.getFullYear(), month.getMonth(), day);

    if (selecting === 'from') {
      setTempFrom(date);
      setTempTo(undefined);
      setSelecting('to');
    } else {
      setTempTo(date);
      setSelecting('from');
      onChange({ from: tempFrom, to: date });
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1));
  };

  const renderMonth = (month: Date) => {
    const days = getDaysInMonth(month);

    return (
      <div className="w-full sm:min-w-[280px]">
        <div className="text-center text-sm font-semibold text-neutral-900 dark:text-white mb-3">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-neutral-500 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="h-14" />;

            const disabled = isDateDisabled(day, month);
            const inRange = isDateInRange(day, month);
            const isStart = isRangeStart(day, month);
            const isEnd = isRangeEnd(day, month);
            const today = isToday(day, month);

            const dateKey = getDateKey(day, month);
            const priceInfo = priceMap.get(dateKey);
            const priceLevel = priceInfo ? getPriceLevel(priceInfo.price) : null;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day, month)}
                disabled={disabled}
                className={cn(
                  'h-14 flex flex-col items-center justify-center rounded-md text-sm font-medium transition-all active:scale-95 relative',
                  disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                  !disabled && !isStart && !isEnd && !inRange && 'text-neutral-700 hover:bg-pink-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-pink-900/30',
                  inRange && 'bg-pink-100 dark:bg-pink-900/30 rounded-none',
                  isStart && 'bg-pink-500 text-white rounded-l-md rounded-r-none',
                  isEnd && 'bg-pink-500 text-white rounded-r-md rounded-l-none',
                  isStart && isEnd && 'rounded-md',
                  today && !isStart && !isEnd && 'ring-1 ring-pink-500',
                  // Price-based background (only when not selected)
                  !isStart && !isEnd && !inRange && !disabled && priceLevel === 'low' && 'bg-green-50 dark:bg-green-900/20',
                  !isStart && !isEnd && !inRange && !disabled && priceLevel === 'high' && 'bg-red-50 dark:bg-red-900/20'
                )}
              >
                <span>{day}</span>
                {/* Price indicator */}
                {priceInfo && !disabled && (
                  <span className={cn(
                    'text-[9px] font-normal leading-tight',
                    isStart || isEnd ? 'text-white/80' :
                    priceLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                    priceLevel === 'high' ? 'text-red-600 dark:text-red-400' :
                    'text-neutral-500'
                  )}>
                    {priceInfo.price.toFixed(0)}€
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setSelecting('from');
            setTempFrom(value?.from);
            setTempTo(value?.to);
          }
        }}
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm transition-all duration-150 cursor-pointer',
          compact
            ? 'rounded-lg border-0 bg-white/60 dark:bg-gray-700/40 px-3 py-2 hover:bg-white hover:shadow-sm dark:hover:bg-gray-700 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:focus:bg-gray-700'
            : 'rounded-lg border border-gray-300 bg-white px-3 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-gray-600 dark:bg-gray-900',
          'focus:outline-none dark:text-white'
        )}
      >
        <Calendar className={cn('text-gray-400 shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className={cn('whitespace-nowrap', !value?.from && 'text-gray-400 dark:text-gray-500')}>
          {value?.from ? formatShortDate(value.from) : placeholderFrom}
        </span>
        <span className="text-gray-400">→</span>
        <span className={cn('whitespace-nowrap', !value?.to && 'text-gray-400 dark:text-gray-500')}>
          {value?.to ? formatShortDate(value.to) : placeholderTo}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 w-[calc(100vw-2rem)] max-w-[330px] p-3 sm:max-w-none sm:w-auto sm:p-4">
            {/* Selection hint + loading indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 mb-3 sm:mb-4">
              <span>{selecting === 'from' ? 'Hinflugdatum wählen' : 'Rückflugdatum wählen'}</span>
              {isPriceLoading && canFetchPrices && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </div>

            {/* Price legend */}
            {canFetchPrices && priceMap.size > 0 && (
              <div className="flex items-center justify-center gap-4 text-[10px] mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                  <span className="text-green-600 dark:text-green-400">Günstig</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-neutral-100 dark:bg-neutral-800" />
                  <span className="text-neutral-500">Normal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                  <span className="text-red-600 dark:text-red-400">Teuer</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95 sm:p-2"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95 sm:p-2"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* One month on mobile, two on desktop */}
            <div className="flex gap-6">
              {renderMonth(leftMonth)}
              <div className="hidden sm:block">
                {renderMonth(rightMonth)}
              </div>
            </div>

            {/* Hint when no prices */}
            {canFetchPrices && !isPriceLoading && priceMap.size === 0 && (
              <div className="text-center text-xs text-neutral-400 mt-3">
                Keine Preisdaten für diese Route verfügbar
              </div>
            )}
            {!canFetchPrices && (
              <div className="text-center text-xs text-neutral-400 mt-3">
                Wählen Sie Abflug- und Zielort um Preise zu sehen
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
