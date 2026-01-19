import { useState, useEffect, useCallback, useRef } from 'react';
import type { FlightOffer, FlightPriceResponse } from '@/types/flight';

export interface PricingResult {
  offerId: string;
  result?: FlightPriceResponse;
  error?: string;
  status: 'pending' | 'success' | 'error';
}

export interface PricingProgress {
  current: number;
  total: number;
}

interface UsePricingStreamOptions {
  onProgress?: (progress: PricingProgress) => void;
  onResult?: (result: PricingResult) => void;
  onComplete?: () => void;
}

export function usePricingStream(options: UsePricingStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [results, setResults] = useState<Map<string, PricingResult>>(new Map());
  const [progress, setProgress] = useState<PricingProgress>({ current: 0, total: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (offers: FlightOffer[], includeBags = true) => {
    // Close existing stream if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsStreaming(true);
    setResults(new Map());
    setProgress({ current: 0, total: offers.length });

    try {
      // Create SSE connection
      const response = await fetch('http://localhost:3000/flight-price-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightOffers: offers,
          includeBags: includeBags,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === 'keep-alive') {
              continue;
            }

            try {
              const event = JSON.parse(data);

              if (event.type === 'progress') {
                const prog = { current: event.current, total: event.total };
                setProgress(prog);
                options.onProgress?.(prog);
              } else if (event.type === 'success') {
                const result: PricingResult = {
                  offerId: event.offerId,
                  result: event.result,
                  status: 'success',
                };
                setResults(prev => new Map(prev).set(event.offerId, result));
                options.onResult?.(result);
              } else if (event.type === 'error') {
                const result: PricingResult = {
                  offerId: event.offerId,
                  error: event.error,
                  status: 'error',
                };
                setResults(prev => new Map(prev).set(event.offerId, result));
                options.onResult?.(result);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      options.onComplete?.();
    } catch (error) {
      console.error('Pricing stream error:', error);
      setIsStreaming(false);
    }
  }, [options]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    results,
    progress,
    startStream,
    stopStream,
  };
}

