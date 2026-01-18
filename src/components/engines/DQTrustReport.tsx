import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Layers,
  Copy,
  FileWarning
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustReport {
  discarded_metrics: string[];
  deduplicated_rules: number;
  inconsistencies_found: string[];
  truth_score: number;
}

interface DQTrustReportProps {
  trustReport: TrustReport | null;
  isLoading?: boolean;
}

export function DQTrustReport({ trustReport, isLoading }: DQTrustReportProps) {
  if (isLoading) {
    return null; // Don't show skeleton, just hide
  }

  if (!trustReport) {
    return null;
  }

  const { discarded_metrics, deduplicated_rules, inconsistencies_found, truth_score } = trustReport;
  
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

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          TRUST REPORT
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pipeline reconciliation and data integrity verification
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Truth Score */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            {getScoreIcon(truth_score)}
            <div>
              <p className="font-medium">Truth Score</p>
              <p className="text-sm text-muted-foreground">
                Pipeline integrity verification
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-3xl font-bold", getScoreColor(truth_score))}>
              {(truth_score * 100).toFixed(0)}%
            </p>
            <Progress value={truth_score * 100} className="w-24 h-2 mt-1" />
          </div>
        </div>

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

        {/* Inconsistencies Detail (if any) */}
        {inconsistencies_found.length > 0 && (
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
          <span>
            This report verifies pipeline integrity. Truth Score = 100% means all data is reconciled.
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              truth_score >= 0.95 
                ? 'border-success/30 text-success' 
                : truth_score >= 0.80 
                  ? 'border-warning/30 text-warning' 
                  : 'border-destructive/30 text-destructive'
            )}
          >
            {truth_score >= 0.95 ? 'VERIFIED' : truth_score >= 0.80 ? 'PARTIAL' : 'INCONSISTENT'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
