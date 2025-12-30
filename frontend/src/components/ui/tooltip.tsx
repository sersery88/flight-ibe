import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Simple Tooltip Component (CSS-based, no external dependencies)
// ============================================================================

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipProps {
  children: React.ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  return <div className="group relative inline-block">{children}</div>;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
  return <>{children}</>;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export function TooltipContent({
  children,
  className,
  side = 'top',
}: TooltipContentProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-50 opacity-0 transition-opacity group-hover:opacity-100',
        'rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-md dark:bg-gray-100 dark:text-gray-900',
        'whitespace-nowrap',
        positionClasses[side],
        className
      )}
      role="tooltip"
    >
      {children}
      {/* Arrow */}
      <div
        className={cn(
          'absolute h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-100',
          side === 'top' && 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2',
          side === 'bottom' && 'left-1/2 bottom-full -translate-x-1/2 translate-y-1/2',
          side === 'left' && 'top-1/2 left-full -translate-y-1/2 -translate-x-1/2',
          side === 'right' && 'top-1/2 right-full -translate-y-1/2 translate-x-1/2',
        )}
      />
    </div>
  );
}

