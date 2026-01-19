import { Calculator, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ErrorRateExplanationProps {
  failedRows: number;
  totalRows: number;
  errorRate: number;
  dimension?: string;
  ruleName?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Transparent Error Rate Calculation Component
 * Shows the exact formula and values used to calculate error rates
 */
export function ErrorRateExplanation({
  failedRows,
  totalRows,
  errorRate,
  dimension,
  ruleName,
  variant = 'default',
  className
}: ErrorRateExplanationProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Info className="h-3 w-3" />
        <span className="font-mono">
          {failedRows.toLocaleString()} / {totalRows.toLocaleString()} = {errorRate.toFixed(2)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/50 rounded-lg p-3 border text-sm", className)}>
      <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
        <Calculator className="h-4 w-4 text-primary" />
        Error Rate Calculation
        {dimension && <Badge variant="outline" className="text-xs">{dimension}</Badge>}
        {ruleName && <Badge variant="secondary" className="text-xs">{ruleName}</Badge>}
      </h4>
      
      {/* Formula */}
      <div className="font-mono text-xs bg-background p-2 rounded mb-2 border">
        <span className="text-muted-foreground">Error Rate = </span>
        <span className="text-foreground">(Failing Rows / Total Rows)</span>
        <span className="text-muted-foreground"> × 100</span>
      </div>
      
      {/* Current Values */}
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">{failedRows.toLocaleString()}</span>
        {' '}failing rows out of{' '}
        <span className="text-foreground font-medium">{totalRows.toLocaleString()}</span>
        {' '}total rows{' '}
        <span className="text-muted-foreground">→</span>
        {' '}Error Rate ={' '}
        <span className={cn(
          "font-bold",
          errorRate > 10 ? "text-destructive" : errorRate > 5 ? "text-warning" : "text-success"
        )}>
          {errorRate.toFixed(2)}%
        </span>
      </p>
    </div>
  );
}

interface PassRateExplanationProps {
  passedRules: number;
  totalRules: number;
  passRate: number;
  className?: string;
}

/**
 * Transparent Pass Rate Calculation Component
 * Shows the exact formula and values used to calculate rule pass rates
 */
export function PassRateExplanation({
  passedRules,
  totalRules,
  passRate,
  className
}: PassRateExplanationProps) {
  return (
    <div className={cn("bg-muted/50 rounded-lg p-3 border text-sm", className)}>
      <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
        <Calculator className="h-4 w-4 text-primary" />
        Pass Rate Calculation
      </h4>
      
      {/* Formula */}
      <div className="font-mono text-xs bg-background p-2 rounded mb-2 border">
        <span className="text-muted-foreground">Pass Rate = </span>
        <span className="text-foreground">(Passed Rules / Total Rules)</span>
        <span className="text-muted-foreground"> × 100</span>
      </div>
      
      {/* Current Values */}
      <p className="text-muted-foreground">
        <span className="text-success font-medium">{passedRules}</span>
        {' '}passed rules out of{' '}
        <span className="text-foreground font-medium">{totalRules}</span>
        {' '}total rules{' '}
        <span className="text-muted-foreground">→</span>
        {' '}Pass Rate ={' '}
        <span className={cn(
          "font-bold",
          passRate >= 90 ? "text-success" : passRate >= 70 ? "text-warning" : "text-destructive"
        )}>
          {passRate.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}
