import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TrustGradeProps {
  score: number;
  showTrend?: boolean;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

interface GradeConfig {
  grade: Grade;
  label: string;
  minScore: number;
  colorClass: string;
  bgClass: string;
  description: string;
}

const GRADE_CONFIG: GradeConfig[] = [
  { grade: 'A', label: 'Excellent', minScore: 95, colorClass: 'text-success', bgClass: 'bg-success/10 border-success/30', description: 'Production Ready' },
  { grade: 'B', label: 'Good', minScore: 85, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10 border-emerald-500/30', description: 'Minor Issues' },
  { grade: 'C', label: 'Acceptable', minScore: 70, colorClass: 'text-warning', bgClass: 'bg-warning/10 border-warning/30', description: 'Needs Review' },
  { grade: 'D', label: 'Poor', minScore: 50, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10 border-orange-500/30', description: 'Significant Issues' },
  { grade: 'F', label: 'Critical', minScore: 0, colorClass: 'text-destructive', bgClass: 'bg-destructive/10 border-destructive/30', description: 'Critical Problems' },
];

function getGradeConfig(score: number): GradeConfig {
  return GRADE_CONFIG.find(g => score >= g.minScore) || GRADE_CONFIG[GRADE_CONFIG.length - 1];
}

export function TrustGrade({ score, showTrend = false, previousScore, size = 'md', className }: TrustGradeProps) {
  const config = getGradeConfig(score);
  const trend = previousScore !== undefined ? score - previousScore : 0;
  
  const sizeClasses = {
    sm: { container: 'w-16 h-16', grade: 'text-2xl', score: 'text-xs', label: 'text-[10px]' },
    md: { container: 'w-24 h-24', grade: 'text-4xl', score: 'text-sm', label: 'text-xs' },
    lg: { container: 'w-32 h-32', grade: 'text-5xl', score: 'text-base', label: 'text-sm' },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Grade Circle */}
      <div 
        className={cn(
          'rounded-full border-2 flex flex-col items-center justify-center shadow-lg',
          config.bgClass,
          sizes.container
        )}
      >
        <span className={cn('font-black', config.colorClass, sizes.grade)}>
          {config.grade}
        </span>
        <span className={cn('font-medium text-muted-foreground', sizes.score)}>
          {Math.round(score)}%
        </span>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={cn('font-semibold', config.colorClass, sizes.label)}>
          {config.label}
        </p>
        <p className={cn('text-muted-foreground', sizes.label)}>
          {config.description}
        </p>
      </div>

      {/* Trend */}
      {showTrend && previousScore !== undefined && (
        <Badge 
          variant="outline" 
          className={cn(
            'gap-1',
            trend > 0 ? 'text-success border-success/30' : 
            trend < 0 ? 'text-destructive border-destructive/30' : 
            'text-muted-foreground'
          )}
        >
          {trend > 0 ? (
            <><TrendingUp className="h-3 w-3" /> +{trend}%</>
          ) : trend < 0 ? (
            <><TrendingDown className="h-3 w-3" /> {trend}%</>
          ) : (
            <><Minus className="h-3 w-3" /> No change</>
          )}
        </Badge>
      )}
    </div>
  );
}

// Utility function to calculate grade letter from score
export function getGradeLetter(score: number): Grade {
  return getGradeConfig(score).grade;
}

// Compact inline grade badge
export function TrustGradeBadge({ score, className }: { score: number; className?: string }) {
  const config = getGradeConfig(score);
  
  return (
    <Badge 
      className={cn(
        'font-bold px-2',
        config.bgClass,
        config.colorClass,
        className
      )}
    >
      {config.grade} ({Math.round(score)}%)
    </Badge>
  );
}
