import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with locale
 */
export function formatCurrency(amount: string | number, currency = 'EUR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Format duration from ISO 8601 (PT2H30M) to human readable (2h 30m)
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? `${match[1]}h` : '';
  const minutes = match[2] ? `${match[2]}m` : '';

  return [hours, minutes].filter(Boolean).join(' ');
}

/**
 * Parse ISO 8601 duration (PT2H30M) to minutes
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);

  return hours * 60 + minutes;
}

/**
 * Format date/time for display
 */
export function formatDateTime(isoString: string, format?: 'time' | 'date' | 'full' | Intl.DateTimeFormatOptions): string {
  const date = new Date(isoString);

  if (format === 'time') {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  if (format === 'date') {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }
  if (format === 'full') {
    return date.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  return date.toLocaleString('de-DE', format ?? { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for display
 */
export function formatDate(isoString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('de-DE', options ?? {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate number of stops from segments
 */
export function getStopsLabel(numberOfStops: number): string {
  if (numberOfStops === 0) return 'Nonstop';
  if (numberOfStops === 1) return '1 Stop';
  return `${numberOfStops} Stops`;
}

/**
 * Get cabin class label
 */
export function getCabinLabel(cabin: string): string {
  const labels: Record<string, string> = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium Economy',
    BUSINESS: 'Business',
    FIRST: 'First',
  };
  return labels[cabin] ?? cabin;
}

/**
 * Get traveler type label
 */
export function getTravelerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ADULT: 'Erwachsener',
    CHILD: 'Kind',
    SEATED_INFANT: 'Kleinkind (mit Sitz)',
    HELD_INFANT: 'Baby',
  };
  return labels[type] ?? type;
}

/**
 * Delay helper for animations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
