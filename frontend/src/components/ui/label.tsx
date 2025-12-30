import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Label Component - shadcn/ui style
// ============================================================================

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export { Label };

