import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Price Matrix Component - Shows price grid for outbound/return combinations
// ============================================================================

// Global cache for price matrix data (persists across component mounts)
// Uses -1 to indicate "no flights available" (so we don't keep searching)
const priceCache = new Map<string, Map<string, number>>();

interface PriceMatrixProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  onDateSelect?: (outbound: string, inbound: string) => void;
  className?: string;
}

const formatPrice = (price: string) => {
  const num = parseFloat(price);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('de-DE', { month: 'short' });
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
  return { day, month, weekday };
};

export function PriceMatrix({ origin, destination, departureDate, returnDate, onDateSelect, className }: PriceMatrixProps) {
  const [outboundOffset, setOutboundOffset] = useState(0);
  const [inboundOffset, setInboundOffset] = useState(0);

  // Create cache key for this search
  const cacheKey = `${origin}-${destination}`;

  // Initialize priceMap from cache or create new
  const [priceMap, setPriceMap] = useState<Map<string, number>>(() => {
    return priceCache.get(cacheKey) || new Map();
  });

  const [loadingCells, setLoadingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);

  // Track if we've already loaded prices for this cache key
  const hasLoadedRef = useRef(false);

  // AbortController for prefetch requests
  const prefetchAbortControllerRef = useRef<AbortController | null>(null);

  // Calculate dates using useMemo to ensure consistency
  const outboundDates = useMemo(() => {
    const baseOutbound = new Date(departureDate);
    const dates: string[] = [];
    for (let i = -3; i <= 3; i++) {
      const outDate = new Date(baseOutbound);
      outDate.setDate(outDate.getDate() + i + outboundOffset);
      dates.push(outDate.toISOString().split('T')[0]);
    }
    return dates;
  }, [departureDate, outboundOffset]);

  const inboundDates = useMemo(() => {
    const baseOutbound = new Date(departureDate);
    const baseInbound = returnDate ? new Date(returnDate) : new Date(baseOutbound.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dates: string[] = [];
    for (let i = -3; i <= 3; i++) {
      const inDate = new Date(baseInbound);
      inDate.setDate(inDate.getDate() + i + inboundOffset);
      dates.push(inDate.toISOString().split('T')[0]);
    }
    return dates;
  }, [departureDate, returnDate, inboundOffset]);

  // Reset loaded flag when route changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [origin, destination]);

  // Helper function to calculate dates for a given offset
  const calculateDates = (baseDate: string, offset: number): string[] => {
    const base = new Date(baseDate);
    const dates: string[] = [];
    for (let i = -3; i <= 3; i++) {
      const date = new Date(base);
      date.setDate(date.getDate() + i + offset);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Helper function to prefetch prices for a given offset combination
  const prefetchPrices = async (outOffset: number, inOffset: number) => {
    if (!origin || !destination) return;

    const prefetchOutboundDates = calculateDates(departureDate, outOffset);
    const prefetchInboundDates = calculateDates(returnDate || departureDate, inOffset);

    const cacheKey = `${origin}-${destination}`;
    const cachedData = priceCache.get(cacheKey);

    // Calculate which combinations we need to fetch
    const neededCombinations: Array<[string, string]> = [];

    prefetchOutboundDates.forEach(out => {
      prefetchInboundDates.forEach(inb => {
        if (new Date(inb) > new Date(out)) {
          const key = `${out}-${inb}`;
          // Only fetch if not in cache
          if (!cachedData?.has(key)) {
            neededCombinations.push([out, inb]);
          }
        }
      });
    });

    // If no new combinations needed, skip
    if (neededCombinations.length === 0) {
      console.log(`✅ Prefetch skipped for offset [${outOffset}, ${inOffset}] - already cached`);
      return;
    }

    console.log(`🔮 Prefetching ${neededCombinations.length} combinations for offset [${outOffset}, ${inOffset}]...`);

    try {
      const params = new URLSearchParams({
        origin,
        destination,
        outboundDates: JSON.stringify(prefetchOutboundDates),
        inboundDates: JSON.stringify(prefetchInboundDates),
        adults: '1',
        children: '0',
        infants: '0',
        currency: 'EUR',
      });

      const url = `http://localhost:3000/price-matrix-stream?${params}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          outboundDates: prefetchOutboundDates,
          inboundDates: prefetchInboundDates,
          adults: 1,
          children: 0,
          infants: 0,
          currency: 'EUR',
        }),
        signal: prefetchAbortControllerRef.current?.signal, // Use prefetch abort controller
      });

      if (!response.ok) {
        console.warn(`⚠️ Prefetch failed for offset [${outOffset}, ${inOffset}]:`, response.status);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          const dataMatch = line.match(/^data: (.+)$/);
          if (!dataMatch) continue;

          const data = dataMatch[1].trim();
          if (data === 'keep-alive') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'price') {
              const outboundDate = event.outbound_date || event.outboundDate;
              const inboundDate = event.inbound_date || event.inboundDate;
              const key = `${outboundDate}-${inboundDate}`;

              // Update cache silently (don't update UI state)
              const currentCache = priceCache.get(cacheKey) || new Map();
              if (event.price) {
                currentCache.set(key, parseFloat(event.price));
              } else {
                currentCache.set(key, -1);
              }
              priceCache.set(cacheKey, currentCache);
            }
          } catch (err) {
            console.warn('Failed to parse prefetch event:', err);
          }
        }
      }

      console.log(`✅ Prefetch completed for offset [${outOffset}, ${inOffset}]`);
    } catch (err) {
      // Ignore abort errors (user closed calendar or changed filters)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`🚫 Prefetch aborted for offset [${outOffset}, ${inOffset}]`);
        return;
      }
      console.warn(`⚠️ Prefetch error for offset [${outOffset}, ${inOffset}]:`, err);
    }
  };

  // Load real round-trip prices (7x7 = ~49 combinations max)
  // Use SSE streaming endpoint for progressive loading
  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    const loadPrices = async () => {
      if (!origin || !destination) return;

      setError(null);

      // Get cached data for this route
      const cachedData = priceCache.get(cacheKey);

      // Initialize priceMap with cached data if available
      if (cachedData && cachedData.size > 0) {
        console.log('📦 Loading cached price data, size:', cachedData.size);
        setPriceMap(new Map(cachedData));
      }

      // Calculate which combinations we need to fetch
      const neededCombinations: Array<[string, string]> = [];
      const newLoadingCells = new Set<string>();

      outboundDates.forEach(out => {
        inboundDates.forEach(inb => {
          if (new Date(inb) > new Date(out)) {
            const key = `${out}-${inb}`;
            // Only fetch if not in cache
            if (!cachedData?.has(key)) {
              neededCombinations.push([out, inb]);
              newLoadingCells.add(key);
            }
          }
        });
      });

      // If no new combinations needed, we're done
      if (neededCombinations.length === 0) {
        console.log('✅ All prices already cached, no new data needed');
        return;
      }

      console.log(`🔄 Loading ${neededCombinations.length} new price combinations...`);
      setLoadingCells(newLoadingCells);

      try {
        // Create SSE connection to price matrix stream
        const params = new URLSearchParams({
          origin,
          destination,
          outboundDates: JSON.stringify(outboundDates),
          inboundDates: JSON.stringify(inboundDates),
          adults: '1',
          children: '0',
          infants: '0',
          currency: 'EUR',
        });

        const url = `http://localhost:3000/price-matrix-stream?${params}`;

        // Use fetch with streaming for SSE
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin,
            destination,
            outboundDates: outboundDates,
            inboundDates: inboundDates,
            adults: 1,
            children: 0,
            infants: 0,
            currency: 'EUR',
          }),
          signal: abortController.signal, // Cancel request if component unmounts or deps change
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        // Read SSE stream
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();

          if (done || isCancelled) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Split by newlines and process complete lines
          const lines = buffer.split(/\r?\n/);
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue; // Skip empty lines

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === 'keep-alive') continue;

              try {
                const event = JSON.parse(data);
                console.log('📊 SSE Event received:', event);

                if (event.type === 'price') {
                  // Update price map with new price
                  // Backend sends snake_case, convert to camelCase
                  const outboundDate = event.outbound_date || event.outboundDate;
                  const inboundDate = event.inbound_date || event.inboundDate;
                  const key = `${outboundDate}-${inboundDate}`;
                  console.log('💰 Price event:', key, event.price);

                  setPriceMap(prev => {
                    const newMap = new Map(prev);

                    if (event.price) {
                      newMap.set(key, parseFloat(event.price));
                      console.log('📝 Updated priceMap, size:', newMap.size);
                    } else {
                      // No price available - mark as -1 to indicate "checked but no flights"
                      newMap.set(key, -1);
                      console.log('⚠️ No price available for:', key);
                    }

                    // Update global cache
                    priceCache.set(cacheKey, new Map(newMap));

                    return newMap;
                  });

                  // Always remove from loading cells (whether price found or not)
                  setLoadingCells(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                  });
                } else if (event.type === 'complete') {
                  console.log('✅ Stream complete');
                  setLoadingCells(new Set());
                  hasLoadedRef.current = true;
                } else if (event.type === 'progress') {
                  console.log(`📈 Progress: ${event.current}/${event.total}`);
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e, 'Line:', line);
              }
            }
          }
        }
      } catch (err) {
        // Ignore abort errors (user navigated away or changed filters)
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('🚫 Request aborted (user changed filters)');
          return;
        }
        if (!isCancelled) {
          setError(err as Error);
        }
      }
    };

    loadPrices();

    return () => {
      isCancelled = true;
      abortController.abort(); // Cancel any ongoing fetch requests
    };
  }, [origin, destination, departureDate, returnDate, outboundOffset, inboundOffset, outboundDates, inboundDates]);

  // Prefetch adjacent date ranges when current matrix is fully loaded
  useEffect(() => {
    // Only prefetch when:
    // 1. No cells are loading (current matrix is complete)
    // 2. We have a valid route
    if (loadingCells.size > 0 || !origin || !destination) return;

    let isCancelled = false;

    // Create new AbortController for this prefetch session
    prefetchAbortControllerRef.current = new AbortController();
    const abortController = prefetchAbortControllerRef.current;

    // Prefetch adjacent ranges in the background
    // Priority: left/right (most common navigation), then up/down
    const prefetchSequence = async () => {
      // Wait a bit to ensure main loading is complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isCancelled) return;

      // Prefetch right (outbound +1)
      await prefetchPrices(outboundOffset + 1, inboundOffset);

      if (isCancelled) return;

      // Prefetch left (outbound -1)
      await prefetchPrices(outboundOffset - 1, inboundOffset);

      if (isCancelled) return;

      // Prefetch down (inbound +1)
      await prefetchPrices(outboundOffset, inboundOffset + 1);

      if (isCancelled) return;

      // Prefetch up (inbound -1)
      await prefetchPrices(outboundOffset, inboundOffset - 1);
    };

    prefetchSequence();

    return () => {
      isCancelled = true;
      abortController.abort(); // Cancel all ongoing prefetch requests
      console.log('🚫 Prefetch aborted (component unmounted or deps changed)');
    };
  }, [loadingCells.size, origin, destination, outboundOffset, inboundOffset, departureDate, returnDate]);

  // Get combined price from map
  const getCombinedPrice = (outbound: string, inbound: string) => {
    const key = `${outbound}-${inbound}`;
    const price = priceMap.get(key);
    // Return null if not found or if -1 (no flights available)
    return price && price > 0 ? price : null;
  };

  // Find min/max for color coding
  const allPrices: number[] = [];
  outboundDates.forEach(out => {
    inboundDates.forEach(inb => {
      const price = getCombinedPrice(out, inb);
      if (price) allPrices.push(price);
    });
  });

  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

  const getPriceColor = (price: number) => {
    if (allPrices.length === 0) return '';
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    
    if (ratio < 0.33) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (ratio < 0.66) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4 md:p-6 dark:border-gray-700 dark:bg-gray-900', className)}>
      {/* Header */}
      {minPrice > 0 && (
        <div className="mb-4 md:mb-6 flex items-center justify-end">
          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <TrendingDown className="h-4 w-4" />
            <span>ab {formatPrice(minPrice.toString())}</span>
          </div>
        </div>
      )}

      {/* Mobile View - Vertical List */}
      <div className="md:hidden">
        {error ? (
          <div className="flex h-96 items-center justify-center text-sm text-gray-500">
            Keine Preisdaten verfügbar
          </div>
        ) : (
          <div>
              {/* Header */}
              <div className="mb-4 text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  Beste Preise
                </div>
              </div>

              {/* Vertical List of Combinations */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {(() => {
                  const combinations: Array<{ outDate: string; inDate: string; price: number }> = [];
                  outboundDates.forEach((outDate) => {
                    inboundDates.forEach((inDate) => {
                      const price = getCombinedPrice(outDate, inDate);
                      const isValid = new Date(inDate) > new Date(outDate);
                      if (isValid && price) {
                        combinations.push({ outDate, inDate, price });
                      }
                    });
                  });
                  combinations.sort((a, b) => a.price - b.price);

                  return combinations.map(({ outDate, inDate, price }) => {
                    const isBothSelected = outDate === departureDate && inDate === returnDate;
                    const outFormatted = formatDate(outDate);
                    const inFormatted = formatDate(inDate);

                    return (
                      <button
                        key={`${outDate}-${inDate}`}
                        type="button"
                        onClick={() => onDateSelect?.(outDate, inDate)}
                        className={cn(
                          'w-full rounded-lg border p-4 text-left transition-all',
                          isBothSelected
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-500'
                            : 'border-gray-200 bg-white hover:border-pink-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-pink-700'
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatPrice(price.toString())}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 w-16">Hinflug</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {outFormatted.weekday}, {outFormatted.day}. {outFormatted.month}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 w-16">Rückflug</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {inFormatted.weekday}, {inFormatted.day}. {inFormatted.month}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block">
        {error ? (
          <div className="flex h-96 items-center justify-center text-sm text-gray-500">
            Keine Preisdaten verfügbar
          </div>
        ) : (
          <div>
            {/* Hinflug (Abflug) Navigation */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setOutboundOffset(prev => prev - 1)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Abflug
              </div>
              <button
                type="button"
                onClick={() => setOutboundOffset(prev => prev + 1)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Matrix Grid */}
            <div className="flex gap-2 overflow-hidden">
              <div className="flex-1">
                {/* Table */}
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                  <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {/* Hinflug dates as columns */}
                      {outboundDates.map((date) => {
                        const { day, month, weekday } = formatDate(date);
                        const isSelected = date === departureDate;
                        return (
                          <th
                            key={date}
                            className={cn(
                              'border border-gray-200 p-2 text-center dark:border-gray-700',
                              isSelected ? 'bg-pink-50 dark:bg-pink-900/20' : 'bg-gray-50 dark:bg-gray-800'
                            )}
                          >
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {weekday}
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {day}. {month}
                            </div>
                          </th>
                        );
                      })}
                      {/* Header for Rückflug column */}
                      <th key="return-header" className="border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundDates.map((inDate) => {
                      const { day, month, weekday } = formatDate(inDate);
                      const isSelected = inDate === returnDate;
                      return (
                        <tr key={inDate}>
                          {/* Price cells */}
                          {outboundDates.map((outDate) => {
                            const price = getCombinedPrice(outDate, inDate);
                            const isValidCombination = new Date(inDate) > new Date(outDate);
                            const isBothSelected = outDate === departureDate && inDate === returnDate;

                            return (
                              <td
                                key={`${outDate}-${inDate}`}
                                className={cn(
                                  'border border-gray-200 p-1 text-center dark:border-gray-700',
                                  !isValidCombination && 'bg-gray-100 dark:bg-gray-800',
                                  isBothSelected && 'ring-2 ring-pink-500'
                                )}
                              >
                                {loadingCells.has(`${outDate}-${inDate}`) ? (
                                  <div className="flex items-center justify-center py-1">
                                    <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                                  </div>
                                ) : isValidCombination && price ? (
                                  <button
                                    type="button"
                                    onClick={() => onDateSelect?.(outDate, inDate)}
                                    className={cn(
                                      'w-full rounded px-2 py-1 text-xs font-semibold transition-all hover:scale-105 hover:shadow-md',
                                      getPriceColor(price)
                                    )}
                                  >
                                    {formatPrice(price.toString())}
                                  </button>
                                ) : (
                                  <div className="text-xs text-gray-400">-</div>
                                )}
                              </td>
                            );
                          })}
                          {/* Rückflug date on the right */}
                          <td
                            key={`return-${inDate}`}
                            className={cn(
                              'border border-gray-200 p-2 text-center dark:border-gray-700',
                              isSelected ? 'bg-pink-50 dark:bg-pink-900/20' : 'bg-gray-50 dark:bg-gray-800'
                            )}
                          >
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {weekday}
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {day}. {month}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              </div>

          {/* Rückflug (vertical) navigation */}
          <div className="flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setInboundOffset(prev => prev - 1)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5 rotate-90" />
            </button>
            <div className="text-sm font-semibold text-gray-900 dark:text-white" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              Rückflug
            </div>
            <button
              type="button"
              onClick={() => setInboundOffset(prev => prev + 1)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="h-5 w-5 rotate-90" />
            </button>
          </div>
        </div>

          {/* Legend */}
          {allPrices.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
