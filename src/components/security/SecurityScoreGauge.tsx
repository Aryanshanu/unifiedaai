import { cn } from '@/lib/utils';

interface SecurityScoreGaugeProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SecurityScoreGauge({ score, label = 'Security Health', size = 'md' }: SecurityScoreGaugeProps) {
  const radius = size === 'sm' ? 36 : size === 'lg' ? 56 : 46;
  const stroke = size === 'sm' ? 6 : size === 'lg' ? 8 : 7;
  const svgSize = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  const color = score >= 70 ? 'hsl(var(--success))' : score >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const textColor = score >= 70 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', textColor, size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl')}>
            {Math.round(score)}%
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
