import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Layers,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustReport {
  discarded_metrics: string[];
  deduplicated_rules: number;
  inconsistencies_found: string[];
  trust_score: number; // GOVERNANCE: INTEGER 0-100, not ratio
  // Enhanced governance fields
  missing_dimensions_count?: number;
  simulated_metrics_count?: number;
  critical_inconsistencies?: string[];
  warning_inconsistencies?: string[];
  score_breakdown?: {
    base: number;
    dimension_penalty: number;
    simulated_penalty: number;
    critical_penalty: number;
    warning_penalty: number;
  };
}

interface DQTrustReportProps {
  trustReport: TrustReport | null;
  isLoading?: boolean;
  governanceStatus?: 'GOVERNANCE_CERTIFIED' | 'DQ_CONTRACT_VIOLATION';
  violations?: string[];
}

export function DQTrustReport({ trustReport, isLoading, governanceStatus, violations }: DQTrustReportProps) {
  if (isLoading) {
    return null;
  }

  if (!trustReport) {
    return null;
  }

  const { 
    discarded_metrics, 
    deduplicated_rules, 
    inconsistencies_found, 
    trust_score,
    critical_inconsistencies,
    warning_inconsistencies,
    score_breakdown
  } = trustReport;
  
  // GOVERNANCE: Helper functions now expect ratio (0-1) for consistency
  // Convert trust_score (0-100) to ratio for color/icon functions
  const scoreAsRatio = trust_score / 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.95) return 'text-success';
    if (score >= 0.80) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.95) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (score >= 0.80) return <AlertTriangle className="h-5 w-5 text-warning" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const isCertified = governanceStatus === 'GOVERNANCE_CERTIFIED';
  const hasViolations = violations && violations.length > 0;

  return (
    <Card className={cn(
      "border-2",
      isCertified ? "border-success/30 bg-success/5" : hasViolations ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            {isCertified ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : hasViolations ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            GOVERNANCE INTEGRITY REPORT
          </div>
          {governanceStatus && (
            <Badge 
              className={cn(
                isCertified 
                  ? 'bg-success/10 text-success border-success/30' 
                  : 'bg-destructive/10 text-destructive border-destructive/30'
              )}
            >
              {isCertified ? 'CERTIFIED' : 'VIOLATION'}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pipeline reconciliation and governance integrity verification
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Violations Alert */}
        {hasViolations && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              <span className="font-semibold text-destructive">GOVERNANCE VIOLATION:</span>{' '}
              Pipeline output is not governance-safe.
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                {violations.slice(0, 5).map((v, i) => (
                  <li key={i} className="text-xs">{v}</li>
                ))}
                {violations.length > 5 && (
                  <li className="text-xs">...and {violations.length - 5} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Trust Score - GOVERNANCE: Now displayed as INTEGER 0-100 */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            {getScoreIcon(scoreAsRatio)}
            <div>
              <p className="font-medium">Governance Integrity Score</p>
              <p className="text-sm text-muted-foreground">
                Pipeline governance verification
              </p>
            </div>
          </div>
          <div className="text-right">
            {/* GOVERNANCE: trust_score is now INTEGER 0-100, not ratio */}
            <p className={cn("text-3xl font-bold", getScoreColor(scoreAsRatio))}>
              {Math.round(trust_score)}%
            </p>
            <Progress value={trust_score} className="w-24 h-2 mt-1" />
          </div>
        </div>

        {/* Score Breakdown (if available) */}
        {score_breakdown && (
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Score Breakdown:</p>
            <div className="flex flex-wrap gap-2">
              <span>Base: {score_breakdown.base}</span>
              {score_breakdown.dimension_penalty > 0 && (
                <span className="text-warning">- {score_breakdown.dimension_penalty} (dimensions)</span>
              )}
              {score_breakdown.simulated_penalty > 0 && (
                <span className="text-warning">- {score_breakdown.simulated_penalty} (unavailable)</span>
              )}
              {score_breakdown.critical_penalty > 0 && (
                <span className="text-destructive">- {score_breakdown.critical_penalty} (critical)</span>
              )}
              {score_breakdown.warning_penalty > 0 && (
                <span className="text-warning">- {score_breakdown.warning_penalty} (warnings)</span>
              )}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Discarded Metrics */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileWarning className="h-4 w-4" />
              Discarded Metrics
            </div>
            {discarded_metrics.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {discarded_metrics.map((metric) => (
                  <Badge key={metric} variant="outline" className="text-xs capitalize">
                    {metric}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-success font-medium">None</p>
            )}
            <p className="text-xs text-muted-foreground">
              {discarded_metrics.length === 0 
                ? 'All metrics computed' 
                : `${discarded_metrics.length} metrics unavailable`}
            </p>
          </div>

          {/* Deduplicated Rules */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="h-4 w-4" />
              Deduplicated Rules
            </div>
            <p className={cn(
              "text-2xl font-bold",
              deduplicated_rules > 0 ? "text-warning" : "text-success"
            )}>
              {deduplicated_rules}
            </p>
            <p className="text-xs text-muted-foreground">
              {deduplicated_rules === 0 
                ? 'No duplicates found' 
                : `${deduplicated_rules} duplicate rules collapsed`}
            </p>
          </div>

          {/* Inconsistencies */}
          <div className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Inconsistencies
            </div>
            <p className={cn(
              "text-2xl font-bold",
              inconsistencies_found.length > 0 ? "text-destructive" : "text-success"
            )}>
              {inconsistencies_found.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {inconsistencies_found.length === 0 
                ? 'Pipeline state is consistent' 
                : 'Issues detected in pipeline'}
            </p>
          </div>
        </div>

        {/* Critical Inconsistencies (if any) */}
        {critical_inconsistencies && critical_inconsistencies.length > 0 && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg space-y-2">
            <p className="font-medium text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Critical Issues:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {critical_inconsistencies.map((issue, idx) => (
                <li key={idx} className="text-muted-foreground">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning Inconsistencies (if any) */}
        {warning_inconsistencies && warning_inconsistencies.length > 0 && (
          <div className="p-4 border border-warning/30 bg-warning/5 rounded-lg space-y-2">
            <p className="font-medium text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {warning_inconsistencies.map((issue, idx) => (
                <li key={idx} className="text-muted-foreground">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Legacy Inconsistencies (if no breakdown available) */}
        {!critical_inconsistencies && inconsistencies_found.length > 0 && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg space-y-2">
            <p className="font-medium text-destructive">Inconsistencies Found:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {inconsistencies_found.map((issue, idx) => (
                <li key={idx} className="text-muted-foreground">{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Governance Integrity Score = 100 only if all dimensions computed, no violations, no unavailable metrics.
          </span>
          {/* GOVERNANCE: trust_score is now INTEGER 0-100 */}
          <Badge 
            variant="outline" 
            className={cn(
              trust_score >= 95 
                ? 'border-success/30 text-success' 
                : trust_score >= 80 
                  ? 'border-warning/30 text-warning' 
                  : 'border-destructive/30 text-destructive'
            )}
          >
            {trust_score >= 95 ? 'VERIFIED' : trust_score >= 80 ? 'PARTIAL' : 'INCONSISTENT'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
