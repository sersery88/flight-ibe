import { useState, useEffect, useCallback, useRef } from 'react';
import type { FlightOffer } from '@/types/flight';

export interface UpsellResult {
  offerId: string;
  upsells?: FlightOffer[];
  error?: string;
  status: 'pending' | 'success' | 'error';
}

export interface UpsellProgress {
  current: number;
  total: number;
}

interface UseUpsellStreamOptions {
  onProgress?: (progress: UpsellProgress) => void;
  onResult?: (result: UpsellResult) => void;
  onComplete?: () => void;
}

export function useUpsellStream(options: UseUpsellStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [results, setResults] = useState<Map<string, UpsellResult>>(new Map());
  const [progress, setProgress] = useState<UpsellProgress>({ current: 0, total: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (offers: FlightOffer[]) => {
    // Close existing stream if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsStreaming(true);
    setResults(new Map());
    setProgress({ current: 0, total: offers.length });

    try {
      // Create SSE connection
      const response = await fetch('http://localhost:3000/upsell-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightOffers: offers,
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
                const result: UpsellResult = {
                  offerId: event.offerId,
                  upsells: event.upsells,
                  status: 'success',
                };
                setResults(prev => new Map(prev).set(event.offerId, result));
                options.onResult?.(result);
              } else if (event.type === 'error') {
                const result: UpsellResult = {
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
      console.error('Upsell stream error:', error);
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

