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
  align?: 'start' | 'end' | 'center';
  sideOffset?: number;
  forceShow?: boolean;
}

export function TooltipContent({
  children,
  className,
  side = 'top',
  align = 'center',
  forceShow,
}: TooltipContentProps) {
  const positionClasses = {
    top: {
      center: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      start: 'bottom-full left-0 mb-2',
      end: 'bottom-full right-0 mb-2',
    },
    bottom: {
      center: 'top-full left-1/2 -translate-x-1/2 mt-2',
      start: 'top-full left-0 mt-2',
      end: 'top-full right-0 mt-2',
    },
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const currentPos = typeof positionClasses[side] === 'string'
    ? positionClasses[side]
    : (positionClasses[side] as any)[align];

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-50 opacity-0 transition-opacity group-hover:opacity-100',
        forceShow && 'opacity-100 pointer-events-auto',
        'rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-md dark:bg-gray-100 dark:text-gray-900',
        'whitespace-nowrap',
        currentPos,
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

