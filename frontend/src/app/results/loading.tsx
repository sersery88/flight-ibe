import { Skeleton } from '@/components/ui/skeleton';

export default function ResultsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-24 w-full" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
