import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

interface DataLoadingStateProps {
  isLoading: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state action label */
  emptyActionLabel?: string;
  /** Custom empty state action */
  onEmptyAction?: () => void;
  children: ReactNode;
}

export function DataLoadingState({
  isLoading,
  isError,
  isEmpty,
  error,
  onRetry,
  skeletonRows = 3,
  emptyMessage = 'No data found',
  emptyActionLabel,
  onEmptyAction,
  children,
}: DataLoadingStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          {error?.message || 'Something went wrong. Please try again.'}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="w-10 h-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyActionLabel && onEmptyAction && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onEmptyAction}>
            {emptyActionLabel}
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
