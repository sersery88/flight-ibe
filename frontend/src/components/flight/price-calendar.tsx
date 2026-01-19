import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useFlightDates } from '@/hooks/use-flights';
import type { FlightDate } from '@/types/flight';

// ============================================================================
// Price Calendar Component - Shows cheapest dates for a route
// ============================================================================

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

interface PriceCalendarProps {
  origin: string;
  destination: string;
  onDateSelect?: (date: FlightDate) => void;
  className?: string;
}

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

const formatPrice = (price: string) => {
  const num = parseFloat(price);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function PriceCalendar({ origin, destination, onDateSelect, className }: PriceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data, isLoading, error } = useFlightDates(origin, destination, !!origin && !!destination);

  // Create a map of dates to prices
  const priceMap = new Map<string, FlightDate>();
  if (data?.data) {
    data.data.forEach((flightDate) => {
      const dateKey = flightDate.departureDate;
      priceMap.set(dateKey, flightDate);
    });
  }

  // Find min and max prices for color coding
  const prices = data?.data?.map(d => parseFloat(d.price.total)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const getPriceColor = (price: number) => {
    if (prices.length === 0) return '';
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    
    if (ratio < 0.33) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (ratio < 0.66) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const flightDate = priceMap.get(dateStr);
    if (flightDate && onDateSelect) {
      onDateSelect(flightDate);
    }
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-pink-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Günstigste Preise
          </h3>
        </div>
        {minPrice > 0 && (
          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <TrendingDown className="h-4 w-4" />
            <span>ab {formatPrice(minPrice.toString())}</span>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center font-semibold text-gray-900 dark:text-white">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-64 items-center justify-center"
          >
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-64 items-center justify-center text-sm text-gray-500"
          >
            Keine Preisdaten verfügbar
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} />;

              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const flightDate = priceMap.get(dateStr);
              const price = flightDate ? parseFloat(flightDate.price.total) : null;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={!flightDate}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center rounded-lg text-sm font-medium transition-all',
                    !flightDate && 'cursor-not-allowed text-gray-300 dark:text-gray-600',
                    flightDate && 'cursor-pointer hover:scale-105 hover:shadow-md',
                    price && getPriceColor(price)
                  )}
                >
                  <span className="text-base">{day}</span>
                  {price && (
                    <span className="mt-1 text-xs font-semibold">
                      {formatPrice(price.toString())}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {!isLoading && !error && prices.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30" />
            <span className="text-gray-600 dark:text-gray-400">Günstig</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-100 dark:bg-yellow-900/30" />
            <span className="text-gray-600 dark:text-gray-400">Mittel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span className="text-gray-600 dark:text-gray-400">Teuer</span>
          </div>
        </div>
      )}
    </div>
  );
}

