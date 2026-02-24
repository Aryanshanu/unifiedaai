import { cn } from '@/lib/utils';

interface DriftScoreIndicatorProps {
  score: number; // 0–100, 0 = no drift
  className?: string;
}

export function DriftScoreIndicator({ score, className }: DriftScoreIndicatorProps) {
  const label = score <= 10 ? 'No Drift' : score <= 40 ? 'Low Drift' : score <= 70 ? 'Moderate Drift' : 'High Drift';
  const color = score <= 10 ? 'text-success' : score <= 40 ? 'text-primary' : score <= 70 ? 'text-warning' : 'text-destructive';
  const bg = score <= 10 ? 'bg-success/10' : score <= 40 ? 'bg-primary/10' : score <= 70 ? 'bg-warning/10' : 'bg-destructive/10';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('h-2 rounded-full', bg)} style={{ width: '60px' }}>
        <div
          className={cn('h-full rounded-full', score <= 10 ? 'bg-success' : score <= 40 ? 'bg-primary' : score <= 70 ? 'bg-warning' : 'bg-destructive')}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={cn('text-xs font-medium', color)}>{label}</span>
    </div>
  );
}
