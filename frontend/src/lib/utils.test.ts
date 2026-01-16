import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDuration,
  parseDuration,
  formatDateForApi,
  getStopsLabel,
  getCabinLabel,
  getTravelerTypeLabel,
  generateId,
} from './utils';

describe('cn (className merge)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatCurrency', () => {
  it('should format number as EUR currency', () => {
    const result = formatCurrency(123.45);
    expect(result).toContain('123,45');
    expect(result).toContain('€');
  });

  it('should format string as currency', () => {
    const result = formatCurrency('99.99', 'EUR');
    expect(result).toContain('99,99');
  });

  it('should handle different currencies', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100,00');
    expect(result).toContain('$');
  });
});

describe('formatDuration', () => {
  it('should format hours and minutes', () => {
    expect(formatDuration('PT2H30M')).toBe('2h 30m');
  });

  it('should handle hours only', () => {
    expect(formatDuration('PT3H')).toBe('3h');
  });

  it('should handle minutes only', () => {
    expect(formatDuration('PT45M')).toBe('45m');
  });

  it('should return original string for invalid format', () => {
    expect(formatDuration('invalid')).toBe('invalid');
  });
});

describe('parseDuration', () => {
  it('should parse hours and minutes to total minutes', () => {
    expect(parseDuration('PT2H30M')).toBe(150);
  });

  it('should parse hours only', () => {
    expect(parseDuration('PT3H')).toBe(180);
  });

  it('should parse minutes only', () => {
    expect(parseDuration('PT45M')).toBe(45);
  });

  it('should return 0 for invalid format', () => {
    expect(parseDuration('invalid')).toBe(0);
  });
});

describe('formatDateForApi', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    expect(formatDateForApi(date)).toBe('2024-06-15');
  });
});

describe('getStopsLabel', () => {
  it('should return "Nonstop" for 0 stops', () => {
    expect(getStopsLabel(0)).toBe('Nonstop');
  });

  it('should return "1 Stop" for 1 stop', () => {
    expect(getStopsLabel(1)).toBe('1 Stop');
  });

  it('should return plural for multiple stops', () => {
    expect(getStopsLabel(2)).toBe('2 Stops');
    expect(getStopsLabel(3)).toBe('3 Stops');
  });
});

describe('getCabinLabel', () => {
  it('should return correct label for cabin codes', () => {
    expect(getCabinLabel('ECONOMY')).toBe('Economy');
    expect(getCabinLabel('PREMIUM_ECONOMY')).toBe('Premium Economy');
    expect(getCabinLabel('BUSINESS')).toBe('Business');
    expect(getCabinLabel('FIRST')).toBe('First');
  });

  it('should return original value for unknown codes', () => {
    expect(getCabinLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('getTravelerTypeLabel', () => {
  it('should return correct German label for traveler types', () => {
    expect(getTravelerTypeLabel('ADULT')).toBe('Erwachsener');
    expect(getTravelerTypeLabel('CHILD')).toBe('Kind');
    expect(getTravelerTypeLabel('SEATED_INFANT')).toBe('Kleinkind (mit Sitz)');
    expect(getTravelerTypeLabel('HELD_INFANT')).toBe('Baby');
  });

  it('should return original value for unknown types', () => {
    expect(getTravelerTypeLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs of expected length', () => {
    const id = generateId();
    expect(id.length).toBe(7);
  });
});
