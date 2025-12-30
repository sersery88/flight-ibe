import { motion } from 'motion/react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Loading Spinner - Various loading indicators
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-neutral-200 border-t-pink-500 dark:border-neutral-700',
        sizes[size],
        className
      )}
    />
  );
}

// ============================================================================
// Flight Loading Animation - Animated plane for search
// ============================================================================

interface FlightLoadingProps {
  message?: string;
  className?: string;
}

export function FlightLoading({ message = 'Suche läuft...', className }: FlightLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <div className="relative mb-6">
        {/* Cloud trail */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"
              initial={{ opacity: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: [-20, -60],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              style={{ left: -i * 10 }}
            />
          ))}
        </div>
        
        {/* Plane */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Plane className="h-12 w-12 rotate-45 text-pink-500" />
        </motion.div>
      </div>
      
      <motion.p
        className="text-lg font-medium text-gray-600 dark:text-gray-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
      
      {/* Progress dots */}
      <div className="mt-4 flex gap-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-pink-500"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Loading - Full page loading overlay
// ============================================================================

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Laden...' }: PageLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
      <FlightLoading message={message} />
    </div>
  );
}

// ============================================================================
// Button Loading - For buttons in loading state
// ============================================================================

export function ButtonLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size="sm" />
      <span>Lädt...</span>
    </div>
  );
}

