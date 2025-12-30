import { type ReactNode } from 'react';
import { SearchX, Plane, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ============================================================================
// Empty State - For when there's no data to display
// ============================================================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-gray-500">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// ============================================================================
// Pre-defined Empty States
// ============================================================================

export function NoSearchResults({ onNewSearch }: { onNewSearch?: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="h-8 w-8" />}
      title="Keine Flüge gefunden"
      description="Versuchen Sie andere Suchkriterien oder ein anderes Datum."
      action={onNewSearch ? { label: 'Neue Suche', onClick: onNewSearch } : undefined}
    />
  );
}

export function NoFlightsSelected() {
  return (
    <EmptyState
      icon={<Plane className="h-8 w-8" />}
      title="Kein Flug ausgewählt"
      description="Wählen Sie einen Flug aus der Suchergebnisliste aus."
    />
  );
}

export function NoDateSelected() {
  return (
    <EmptyState
      icon={<Calendar className="h-8 w-8" />}
      title="Bitte Datum wählen"
      description="Wählen Sie ein Reisedatum, um fortzufahren."
    />
  );
}

export function NoTravelersAdded() {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title="Keine Reisenden"
      description="Fügen Sie mindestens einen Reisenden hinzu."
    />
  );
}

