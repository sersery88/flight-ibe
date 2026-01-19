import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useFlightDates } from '@/hooks/use-flights';

// ============================================================================
// Google Flights Style Date Picker
// ============================================================================

const WEEKDAYS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const TRIP_TYPES = [
  { value: 'roundtrip', label: 'Hin- und Rückreise' },
  { value: 'oneway', label: 'Nur Hinflug' },
] as const;

type TripTypeValue = typeof TRIP_TYPES[number]['value'];

// Helper functions
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

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.toDateString() === date2.toDateString();
};

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DayPrice {
  date: string; // YYYY-MM-DD
  price: number;
}

interface FlightDatePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  tripType?: TripTypeValue;
  onTripTypeChange?: (type: TripTypeValue) => void;
  prices?: DayPrice[];
  origin?: string;
  destination?: string;
  minDate?: Date;
  className?: string;
  compact?: boolean;
  showTripTypeSelector?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function FlightDatePicker({
  value,
  onChange,
  tripType = 'roundtrip',
  onTripTypeChange,
  prices: externalPrices = [],
  origin,
  destination,
  minDate = new Date(),
  className,
  compact = false,
  showTripTypeSelector = false,
}: FlightDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [leftMonth, setLeftMonth] = useState(() => {
    if (value?.from) return new Date(value.from.getFullYear(), value.from.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<'departure' | 'return'>('departure');
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value?.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value?.to);
  const [showTripTypeDropdown, setShowTripTypeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tripTypeRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
  const isOneway = tripType === 'oneway';

  // Fetch price data when origin and destination are available
  const canFetchPrices = !!origin && !!destination && origin.length === 3 && destination.length === 3;
  const { data: priceData, isLoading: isPriceLoading } = useFlightDates(
    origin || '',
    destination || ''
  );

  // Create price map from fetched data or external prices
  const { priceMap, priceValues, minPrice, maxPrice } = useMemo(() => {
    const map = new Map<string, number>();

    // First, use externally provided prices
    externalPrices.forEach((p) => map.set(p.date, p.price));

    // Then, overlay fetched prices (if available)
    if (priceData?.data) {
      for (const item of priceData.data) {
        map.set(item.departureDate, parseFloat(item.price.total));
      }
    }

    const values = Array.from(map.values());
    return {
      priceMap: map,
      priceValues: values,
      minPrice: values.length > 0 ? Math.min(...values) : 0,
      maxPrice: values.length > 0 ? Math.max(...values) : 0,
    };
  }, [externalPrices, priceData]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external value
  useEffect(() => {
    setTempFrom(value?.from);
    setTempTo(value?.to);
    if (value?.from) {
      setLeftMonth(new Date(value.from.getFullYear(), value.from.getMonth(), 1));
    }
  }, [value?.from, value?.to]);

  // Update active tab based on selection state
  useEffect(() => {
    if (isOpen) {
      if (!tempFrom) {
        setActiveTab('departure');
      } else if (!tempTo && !isOneway) {
        setActiveTab('return');
      }
    }
  }, [isOpen, tempFrom, tempTo, isOneway]);

  // Close trip type dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tripTypeRef.current && !tripTypeRef.current.contains(event.target as Node)) {
        setShowTripTypeDropdown(false);
      }
    }
    if (showTripTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTripTypeDropdown]);

  // Block scroll when open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  const isDateDisabled = (day: number, month: Date) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const minDateNormalized = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    if (date < minDateNormalized) return true;
    // If selecting return date, disable dates before departure
    if (activeTab === 'return' && tempFrom) {
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
    return isSameDay(date, tempFrom);
  };

  const isRangeEnd = (day: number, month: Date) => {
    if (!tempTo) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return isSameDay(date, tempTo);
  };

  const isToday = (day: number, month: Date) => {
    const today = new Date();
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return isSameDay(date, today);
  };

  const getPriceForDay = (day: number, month: Date) => {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return priceMap.get(dateStr);
  };

  const getPriceColor = (price: number) => {
    if (priceValues.length === 0 || maxPrice === minPrice) return 'text-neutral-500';
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.33) return 'text-green-600 dark:text-green-400';
    if (ratio < 0.66) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleDateClick = (day: number, month: Date) => {
    if (isDateDisabled(day, month)) return;
    const date = new Date(month.getFullYear(), month.getMonth(), day);

    if (activeTab === 'departure') {
      setTempFrom(date);
      // If new departure is after current return, clear return
      if (tempTo && date > tempTo) {
        setTempTo(undefined);
      }
      if (!isOneway) {
        setActiveTab('return');
      }
    } else {
      setTempTo(date);
    }
  };

  const handleReset = () => {
    setTempFrom(undefined);
    setTempTo(undefined);
    setActiveTab('departure');
  };

  const handleDone = () => {
    if (isOneway) {
      onChange({ from: tempFrom, to: undefined });
    } else {
      onChange({ from: tempFrom, to: tempTo });
    }
    setIsOpen(false);
  };

  const canComplete = isOneway ? !!tempFrom : (!!tempFrom && !!tempTo);

  const handlePrevMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1));
  };

  const renderMonth = (month: Date, showNavigation: 'left' | 'right' | 'both' | 'none' = 'none') => {
    const days = getDaysInMonth(month);

    return (
      <div className="flex-1 min-w-[280px]">
        {/* Month header with navigation */}
        <div className="flex items-center justify-between mb-6 px-2">
          {showNavigation === 'left' || showNavigation === 'both' ? (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <span className="text-base font-medium text-neutral-900 dark:text-white">
            {MONTHS[month.getMonth()]}
          </span>
          {showNavigation === 'right' || showNavigation === 'both' ? (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="text-center text-sm font-medium text-neutral-500 py-2 w-10 mx-auto">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="h-16 w-10 mx-auto" />;

            const disabled = isDateDisabled(day, month);
            const inRange = isDateInRange(day, month);
            const isStart = isRangeStart(day, month);
            const isEnd = isRangeEnd(day, month);
            const today = isToday(day, month);
            const price = getPriceForDay(day, month);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day, month)}
                disabled={disabled}
                className={cn(
                  'h-16 w-10 mx-auto flex flex-col items-center justify-start pt-2 text-sm transition-all relative',
                  disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                  !disabled && !isStart && !isEnd && !inRange && 'text-neutral-700 hover:bg-neutral-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-800 rounded-full',
                  inRange && 'bg-pink-50 dark:bg-pink-900/20',
                  isStart && 'bg-pink-500 text-white rounded-l-full',
                  isEnd && 'bg-pink-500 text-white rounded-r-full',
                  isStart && isEnd && 'rounded-full',
                  isStart && !isEnd && inRange && 'rounded-l-full',
                  today && !isStart && !isEnd && 'font-bold'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  today && !isStart && !isEnd && 'w-7 h-7 flex items-center justify-center rounded-full ring-2 ring-pink-500'
                )}>
                  {day}
                </span>
                {price !== undefined && !disabled && (
                  <span className={cn(
                    'text-[10px] mt-1 font-medium',
                    isStart || isEnd ? 'text-white/90' : getPriceColor(price)
                  )}>
                    {formatPrice(price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const calendarContent = (
    <div className={cn(
      'bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden',
      isMobile ? 'w-full max-w-[400px]' : 'w-auto'
    )}>
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Trip Type Selector */}
          {showTripTypeSelector && (
            <div className="relative" ref={tripTypeRef}>
              <button
                type="button"
                onClick={() => setShowTripTypeDropdown(!showTripTypeDropdown)}
                className="flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              >
                {TRIP_TYPES.find((t) => t.value === tripType)?.label}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showTripTypeDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                  {TRIP_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        onTripTypeChange?.(type.value);
                        setShowTripTypeDropdown(false);
                        if (type.value === 'oneway') {
                          setTempTo(undefined);
                          setActiveTab('departure');
                        }
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700',
                        tripType === type.value && 'text-pink-500 font-medium'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Zurücksetzen
            {isPriceLoading && canFetchPrices && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </button>

          {/* Date Tabs */}
          <div className="flex-1 flex justify-end">
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveTab('departure')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  activeTab === 'departure'
                    ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                )}
              >
                <Calendar className="h-4 w-4" />
                <span>{tempFrom ? formatShortDate(tempFrom) : 'Abflug'}</span>
              </button>
              {!isOneway && (
                <button
                  type="button"
                  onClick={() => setActiveTab('return')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                    activeTab === 'return'
                      ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  )}
                >
                  <span>{tempTo ? formatShortDate(tempTo) : 'Rückflug'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-6">
        <div className={cn('flex gap-12', isMobile && 'flex-col gap-8')}>
          {isMobile ? (
            // Mobile: Single month with both navigation arrows
            renderMonth(leftMonth, 'both')
          ) : (
            // Desktop: Two months side by side
            <>
              {renderMonth(leftMonth, 'left')}
              {renderMonth(rightMonth, 'right')}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 flex justify-end">
        <Button
          onClick={handleDone}
          disabled={!canComplete}
          className="bg-pink-500 hover:bg-pink-600 text-white px-6 rounded-full"
        >
          Fertig
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTempFrom(value?.from);
            setTempTo(value?.to);
            setActiveTab(value?.from ? (value?.to || isOneway ? 'departure' : 'return') : 'departure');
          }
        }}
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm transition-all duration-150 cursor-pointer',
          compact
            ? 'rounded-lg border-0 bg-white/60 dark:bg-neutral-700/40 px-3 py-2 hover:bg-white hover:shadow-sm dark:hover:bg-neutral-700 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:focus:bg-neutral-700'
            : 'rounded-lg border border-neutral-300 bg-white px-3 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-neutral-600 dark:bg-neutral-900',
          'focus:outline-none dark:text-white'
        )}
      >
        <Calendar className={cn('text-neutral-400 shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className={cn('whitespace-nowrap', !value?.from && 'text-neutral-400 dark:text-neutral-500')}>
          {value?.from ? formatShortDate(value.from) : 'Hinflug'}
        </span>
        {!isOneway && (
          <>
            <span className="text-neutral-400">→</span>
            <span className={cn('whitespace-nowrap', !value?.to && 'text-neutral-400 dark:text-neutral-500')}>
              {value?.to ? formatShortDate(value.to) : 'Rückflug'}
            </span>
          </>
        )}
      </button>

      {/* Calendar Popup */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          {/* Calendar */}
          <div className={cn(
            'fixed z-[9999]',
            isMobile
              ? 'left-4 right-4 top-1/2 -translate-y-1/2'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          )}>
            {calendarContent}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ============================================================================
// Single Date Picker (Google Flights Style)
// ============================================================================

interface SingleFlightDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  prices?: DayPrice[];
  minDate?: Date;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function SingleFlightDatePicker({
  value,
  onChange,
  prices = [],
  minDate = new Date(),
  placeholder = 'Datum wählen',
  className,
  compact = false,
}: SingleFlightDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value.getFullYear(), value.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const [tempDate, setTempDate] = useState<Date | undefined>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  // Create price map
  const priceMap = new Map<string, number>();
  prices.forEach((p) => priceMap.set(p.date, p.price));

  const priceValues = prices.map((p) => p.price);
  const minPriceValue = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setTempDate(value);
    if (value) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  // Block scroll when open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  const isDateDisabled = (day: number, month: Date) => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const minDateNormalized = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return date < minDateNormalized;
  };

  const isDateSelected = (day: number, month: Date) => {
    if (!tempDate) return false;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return isSameDay(date, tempDate);
  };

  const isToday = (day: number, month: Date) => {
    const today = new Date();
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return isSameDay(date, today);
  };

  const getPriceForDay = (day: number, month: Date) => {
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return priceMap.get(dateStr);
  };

  const getPriceColor = (price: number) => {
    if (priceValues.length === 0 || maxPrice === minPriceValue) return 'text-neutral-500';
    const ratio = (price - minPriceValue) / (maxPrice - minPriceValue);
    if (ratio < 0.33) return 'text-green-600 dark:text-green-400';
    if (ratio < 0.66) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const handleDateClick = (day: number, month: Date) => {
    if (isDateDisabled(day, month)) return;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    setTempDate(date);
  };

  const handleDone = () => {
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempDate(undefined);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderMonth = (month: Date, showNavigation: 'left' | 'right' | 'both' | 'none' = 'none') => {
    const days = getDaysInMonth(month);

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="flex items-center justify-between mb-6 px-2">
          {showNavigation === 'left' || showNavigation === 'both' ? (
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <span className="text-base font-medium text-neutral-900 dark:text-white">
            {MONTHS[month.getMonth()]}
          </span>
          {showNavigation === 'right' || showNavigation === 'both' ? (
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-neutral-100 rounded-full dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="text-center text-sm font-medium text-neutral-500 py-2 w-10 mx-auto">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="h-16 w-10 mx-auto" />;

            const disabled = isDateDisabled(day, month);
            const selected = isDateSelected(day, month);
            const today = isToday(day, month);
            const price = getPriceForDay(day, month);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day, month)}
                disabled={disabled}
                className={cn(
                  'h-16 w-10 mx-auto flex flex-col items-center justify-start pt-2 text-sm transition-all relative rounded-full',
                  disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                  !disabled && !selected && 'text-neutral-700 hover:bg-neutral-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-neutral-800',
                  selected && 'bg-pink-500 text-white',
                  today && !selected && 'font-bold'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  today && !selected && 'w-7 h-7 flex items-center justify-center rounded-full ring-2 ring-pink-500'
                )}>
                  {day}
                </span>
                {price !== undefined && !disabled && (
                  <span className={cn(
                    'text-[10px] mt-1 font-medium',
                    selected ? 'text-white/90' : getPriceColor(price)
                  )}>
                    {formatPrice(price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const calendarContent = (
    <div className={cn(
      'bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden',
      isMobile ? 'w-full max-w-[400px]' : 'w-auto'
    )}>
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Zurücksetzen
          </button>
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg px-4 py-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {tempDate ? formatShortDate(tempDate) : placeholder}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="p-6">
        <div className={cn('flex gap-12', isMobile && 'flex-col gap-8')}>
          {isMobile ? (
            renderMonth(currentMonth, 'both')
          ) : (
            <>
              {renderMonth(currentMonth, 'left')}
              {renderMonth(nextMonth, 'right')}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 flex justify-end">
        <Button
          onClick={handleDone}
          disabled={!tempDate}
          className="bg-pink-500 hover:bg-pink-600 text-white px-6 rounded-full"
        >
          Fertig
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTempDate(value);
          }
        }}
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm transition-all duration-150 cursor-pointer',
          compact
            ? 'rounded-lg border-0 bg-white/60 dark:bg-neutral-700/40 py-3 px-3 hover:bg-white hover:shadow-sm dark:hover:bg-neutral-700 focus:bg-white focus:shadow-md focus:ring-2 focus:ring-pink-500/50 dark:focus:bg-neutral-700 sm:py-2.5'
            : 'rounded-lg border border-neutral-300 bg-white px-3 py-3 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 dark:border-neutral-600 dark:bg-neutral-900',
          'focus:outline-none dark:text-white',
          !value && 'text-neutral-400 dark:text-neutral-500'
        )}
      >
        <Calendar className={cn('text-neutral-400 shrink-0', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        {value ? formatShortDate(value) : placeholder}
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(
            'fixed z-[9999]',
            isMobile
              ? 'left-4 right-4 top-1/2 -translate-y-1/2'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          )}>
            {calendarContent}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
