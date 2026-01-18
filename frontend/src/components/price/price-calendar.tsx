import { useMemo, useState, memo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlightDates } from '@/hooks/use-flights';
import { Button } from '@/components/ui';

// ============================================================================
// Price Calendar - Shows cheapest flight dates like Google Flights
// ============================================================================

interface PriceCalendarProps {
  origin: string;
  destination: string;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  className?: string;
}

interface DayPrice {
  date: string;
  price: number;
  currency: string;
  isLowest: boolean;
  isHighest: boolean;
  priceLevel: 'low' | 'medium' | 'high';
}

// Get the start of a month
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Format date as YYYY-MM-DD
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get day of week (0 = Monday, 6 = Sunday)
function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday-start week
}

// German weekday names
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// German month names
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const PriceCalendar = memo(function PriceCalendar({
  origin,
  destination,
  selectedDate,
  onSelectDate,
  className,
}: PriceCalendarProps) {
  // Fetch cheapest dates
  const { data, isLoading, error } = useFlightDates(origin, destination);

  // Current displayed month state
  const today = useMemo(() => new Date(), []);
  const initialMonth = useMemo(() => {
    return selectedDate ? new Date(selectedDate) : today;
  }, [selectedDate, today]);

  const [displayMonth, setDisplayMonth] = useState(initialMonth);

  // Process flight dates into a map
  const priceMap = useMemo(() => {
    if (!data?.data) return new Map<string, DayPrice>();

    const prices = data.data.map(d => ({
      date: d.departureDate,
      price: parseFloat(d.price.total),
      currency: d.price.currency,
    }));

    if (prices.length === 0) return new Map<string, DayPrice>();

    const minPrice = Math.min(...prices.map(p => p.price));
    const maxPrice = Math.max(...prices.map(p => p.price));
    const priceRange = maxPrice - minPrice;

    const map = new Map<string, DayPrice>();
    prices.forEach(p => {
      const normalizedPrice = priceRange > 0 ? (p.price - minPrice) / priceRange : 0.5;
      const priceLevel = normalizedPrice < 0.33 ? 'low' : normalizedPrice < 0.66 ? 'medium' : 'high';

      map.set(p.date, {
        ...p,
        isLowest: p.price === minPrice,
        isHighest: p.price === maxPrice,
        priceLevel,
      });
    });

    return map;
  }, [data]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = getMonthStart(displayMonth);
    const daysInMonth = getDaysInMonth(year, month);
    const startDayOfWeek = getDayOfWeek(firstDay);

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [displayMonth]);

  // Navigate months
  const canGoPrev = useMemo(() => {
    const prevMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1);
    return prevMonth >= getMonthStart(today);
  }, [displayMonth, today]);

  const goToPrevMonth = () => {
    if (canGoPrev) {
      setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
    }
  };

  const goToNextMonth = () => {
    // Allow navigating up to 12 months in the future
    const maxMonth = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    const nextMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
    if (nextMonth <= maxMonth) {
      setDisplayMonth(nextMonth);
    }
  };

  const canGoNext = useMemo(() => {
    const maxMonth = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    const nextMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
    return nextMonth <= maxMonth;
  }, [displayMonth, today]);

  // Render loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Lade Preise...</span>
        </div>
      </div>
    );
  }

  // Render error or no data state
  if (error || !data?.data?.length) {
    return (
      <div className={cn('rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
        <p className="text-center text-sm text-gray-500">
          Keine Preisdaten verfügbar für diese Route.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth} disabled={!canGoPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          {MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
        </h3>
        <Button variant="ghost" size="icon" onClick={goToNextMonth} disabled={!canGoNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 px-2 py-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-3">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateStr = formatDateISO(date);
          const priceData = priceMap.get(dateStr);
          const isSelected = selectedDate === dateStr;
          const isPast = date < today;
          const isToday = formatDateISO(date) === formatDateISO(today);

          return (
            <button
              key={dateStr}
              onClick={() => priceData && !isPast && onSelectDate(dateStr)}
              disabled={isPast || !priceData}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg p-1 text-xs transition-all',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1',
                isPast && 'cursor-not-allowed opacity-40',
                !priceData && !isPast && 'opacity-50',
                isSelected && 'ring-2 ring-pink-500 ring-offset-1',
                isToday && 'font-bold'
              )}
            >
              {/* Day number */}
              <span className={cn(
                'text-xs',
                isToday && 'text-pink-600 dark:text-pink-400'
              )}>
                {date.getDate()}
              </span>

              {/* Price */}
              {priceData && (
                <span className={cn(
                  'mt-0.5 text-[10px] font-medium',
                  priceData.priceLevel === 'low' && 'text-green-600 dark:text-green-400',
                  priceData.priceLevel === 'medium' && 'text-yellow-600 dark:text-yellow-400',
                  priceData.priceLevel === 'high' && 'text-red-500 dark:text-red-400'
                )}>
                  €{Math.round(priceData.price)}
                </span>
              )}

              {/* Lowest price indicator */}
              {priceData?.isLowest && (
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 border-t border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-gray-500">Günstig</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-500">Mittel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500">Teuer</span>
        </div>
      </div>
    </div>
  );
});

export default PriceCalendar;
