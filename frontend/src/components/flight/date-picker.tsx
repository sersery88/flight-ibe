import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Custom Date Picker Components - Single and Range (No external library)
// ============================================================================

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Helper functions
const formatDisplayDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

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

// ============================================================================
// Single Date Picker
// ============================================================================

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  minDate?: Date;
  className?: string;
  compact?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Datum wählen',
  label,
  minDate = new Date(),
  className,
  compact = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Click outside handler (only for desktop)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  // Block scroll when mobile datepicker is open
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

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  };

  const isDateSelected = (day: number) => {
    if (!value) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === value.toDateString();
  };

  const isToday = (day: number) => {
    const today = new Date();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  const handleDateClick = (day: number) => {
    if (isDateDisabled(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(date);
    setIsOpen(false);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
        {value ? formatDisplayDate(value) : placeholder}
      </button>

      {/* Desktop: inline dropdown */}
      {isOpen && !isMobile && (
        <div
          className="absolute mt-2 right-0 sm:left-0 sm:right-auto w-[310px] sm:min-w-[320px] z-50 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
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
              if (day === null) return <div key={`empty-${index}`} />;
              const disabled = isDateDisabled(day);
              const selected = isDateSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={disabled}
                  className={cn(
                    'h-10 w-10 rounded-md text-sm font-medium transition-all active:scale-95',
                    disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                    !disabled && 'text-neutral-700 hover:bg-pink-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-pink-900/30',
                    selected && 'bg-pink-500 text-white hover:bg-pink-600',
                    today && !selected && 'ring-1 ring-pink-500'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile: Portal to body for true fixed positioning */}
      {isOpen && isMobile && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-[320px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-neutral-100 rounded-lg dark:hover:bg-neutral-800 active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
                if (day === null) return <div key={`empty-${index}`} />;
                const disabled = isDateDisabled(day);
                const selected = isDateSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={disabled}
                    className={cn(
                      'h-10 w-10 rounded-md text-sm font-medium transition-all active:scale-95',
                      disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                      !disabled && 'text-neutral-700 hover:bg-pink-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-pink-900/30',
                      selected && 'bg-pink-500 text-white hover:bg-pink-600',
                      today && !selected && 'ring-1 ring-pink-500'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ============================================================================
// Date Range Picker (Two months side by side)
// ============================================================================

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholderFrom?: string;
  placeholderTo?: string;
  label?: string;
  minDate?: Date;
  className?: string;
  compact?: boolean;
  dropdownPosition?: 'top' | 'bottom';
}

export function DateRangePicker({
  value,
  onChange,
  placeholderFrom = 'Hinflug',
  placeholderTo = 'Rückflug',
  label,
  minDate = new Date(),
  className,
  compact = false,
  dropdownPosition = 'top',
}: DateRangePickerProps) {
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
        // Reset temp values if not complete
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
    // If selecting 'to', disable dates before 'from'
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
      // Complete selection - propagate and close
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
            if (day === null) return <div key={`empty-${index}`} />;
            const disabled = isDateDisabled(day, month);
            const inRange = isDateInRange(day, month);
            const isStart = isRangeStart(day, month);
            const isEnd = isRangeEnd(day, month);
            const today = isToday(day, month);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day, month)}
                disabled={disabled}
                className={cn(
                  'h-10 w-10 rounded-md text-sm font-medium transition-all active:scale-95',
                  disabled && 'text-neutral-300 cursor-not-allowed dark:text-neutral-600',
                  !disabled && !isStart && !isEnd && !inRange && 'text-neutral-700 hover:bg-pink-100 cursor-pointer dark:text-neutral-200 dark:hover:bg-pink-900/30',
                  inRange && 'bg-pink-100 dark:bg-pink-900/30 rounded-none',
                  isStart && 'bg-pink-500 text-white rounded-l-md rounded-r-none',
                  isEnd && 'bg-pink-500 text-white rounded-r-md rounded-l-none',
                  isStart && isEnd && 'rounded-md',
                  today && !isStart && !isEnd && 'ring-1 ring-pink-500'
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && !compact && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

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
          <div className={cn(
            'fixed z-50 left-1/2 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900',
            'w-[calc(100vw-2rem)] max-w-[330px] p-3 sm:max-w-none sm:w-auto sm:p-4',
            dropdownPosition === 'top' ? 'top-1/2 -translate-y-1/2' : 'top-20'
          )}>
            {/* Selection hint */}
            <div className="text-center text-sm text-neutral-500 mb-3 sm:mb-4">
              {selecting === 'from' ? 'Hinflugdatum wählen' : 'Rückflugdatum wählen'}
            </div>

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
          </div>
        </>
      )}
    </div>
  );
}
