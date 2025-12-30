import { cn } from '@/lib/utils';

// ============================================================================
// Skeleton Component - shadcn/ui style
// ============================================================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const variants = {
    default: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

// Pre-built skeleton patterns
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function SkeletonFlightCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between">
        {/* Left: Departure */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        
        {/* Middle: Flight path */}
        <div className="flex-1 px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="mt-2 flex justify-center">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {/* Right: Arrival */}
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-6 w-16" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
        
        {/* Price */}
        <div className="ml-8 space-y-2 text-right">
          <Skeleton className="ml-auto h-8 w-24" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonFlightCard };

