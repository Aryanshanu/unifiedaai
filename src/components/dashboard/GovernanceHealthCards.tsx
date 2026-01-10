import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Scale, 
  AlertTriangle, 
  ShieldCheck, 
  Ban,
  Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  target?: string;
  unit?: string;
  icon: React.ElementType;
  status: 'success' | 'warning' | 'danger' | 'inactive';
  hasData: boolean;
  infoText?: string;
}

function GovernanceMetricCard({ 
  title, 
  value, 
  target, 
  unit = '%',
  icon: Icon, 
  status, 
  hasData,
  infoText 
}: MetricCardProps) {
  const statusStyles = {
    success: 'border-l-emerald-500 bg-emerald-500/5',
    warning: 'border-l-amber-500 bg-amber-500/5',
    danger: 'border-l-destructive bg-destructive/5',
    inactive: 'border-l-muted bg-muted/20',
  };

  const iconStyles = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-destructive',
    inactive: 'text-muted-foreground',
  };

  return (
    <Card className={cn('border-l-4', statusStyles[status])}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('h-4 w-4', iconStyles[status])} />
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="space-y-1">
            <p className="text-sm italic text-muted-foreground">
              No live data yet
            </p>
            <p className="text-xs text-muted-foreground/70">
              Governance flow not activated
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {target && (
              <p className="text-xs text-muted-foreground">
                Target: {target}
              </p>
            )}
            {infoText && (
              <p className="text-xs text-muted-foreground/70">
                {infoText}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GovernanceCoverageBadge({ rate }: { rate: number }) {
  let variant: 'destructive' | 'secondary' | 'outline' | 'default' = 'destructive';
  let label = 'Early Stage';

  if (rate >= 100) {
    variant = 'default';
    label = 'Fully Governed';
  } else if (rate >= 80) {
    variant = 'secondary';
    label = 'Near Complete';
  } else if (rate >= 50) {
    variant = 'outline';
    label = 'Partial Coverage';
  }

  return (
    <Badge variant={variant} className="text-xs">
      {rate}% — {label}
    </Badge>
  );
}

export default function GovernanceHealthCards() {
  const { data: metrics, isLoading } = useGovernanceMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const hasDecisionData = metrics.totalDecisions > 0;
  const hasAppealData = metrics.totalAppeals > 0;
  const hasOutcomeData = metrics.outcomesTracked > 0;
  const hasAttestationData = metrics.totalDeployments > 0;

  // Determine statuses
  const getExplanationStatus = () => {
    if (!hasDecisionData) return 'inactive';
    if (metrics.explanationRate >= 95) return 'success';
    if (metrics.explanationRate >= 80) return 'warning';
    return 'danger';
  };

  const getSlaStatus = () => {
    if (!hasAppealData) return 'inactive';
    if (metrics.slaComplianceRate >= 95) return 'success';
    if (metrics.slaComplianceRate >= 80) return 'warning';
    return 'danger';
  };

  const getHarmStatus = () => {
    if (!hasOutcomeData) return 'inactive';
    if (metrics.harmRate <= 1) return 'success';
    if (metrics.harmRate <= 5) return 'warning';
    return 'danger';
  };

  const getAttestationStatus = () => {
    if (!hasAttestationData) return 'inactive';
    if (metrics.attestationCoverage >= 100) return 'success';
    if (metrics.attestationCoverage >= 80) return 'warning';
    return 'danger';
  };

  const getBypassStatus = () => {
    if (metrics.governanceBypasses === 0) return 'success';
    return 'danger';
  };

  const getCoverageStatus = () => {
    if (metrics.governanceCoverageRate >= 80) return 'success';
    if (metrics.governanceCoverageRate >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <GovernanceMetricCard
        title="Governance Coverage"
        value={metrics.governanceCoverageRate}
        target="100%"
        icon={Activity}
        status={getCoverageStatus()}
        hasData={true}
        infoText={`${metrics.enforcedCapabilities.length}/${metrics.activationState.length} capabilities enforced`}
      />
      
      <GovernanceMetricCard
        title="Decision Explanation Rate"
        value={metrics.explanationRate}
        target="100%"
        icon={FileText}
        status={getExplanationStatus()}
        hasData={hasDecisionData}
        infoText={hasDecisionData ? `${metrics.decisionsWithExplanations}/${metrics.totalDecisions} explained` : undefined}
      />
      
      <GovernanceMetricCard
        title="Appeal SLA Compliance"
        value={metrics.slaComplianceRate}
        target="≥ 95%"
        icon={Scale}
        status={getSlaStatus()}
        hasData={hasAppealData}
        infoText={hasAppealData ? `${metrics.slaBreach} SLA breaches` : undefined}
      />
      
      <GovernanceMetricCard
        title="Harmful Outcome Rate"
        value={metrics.harmRate}
        target="< 1%"
        icon={AlertTriangle}
        status={getHarmStatus()}
        hasData={hasOutcomeData}
        infoText={hasOutcomeData ? `${metrics.harmfulOutcomes}/${metrics.outcomesTracked} harmful` : undefined}
      />
      
      <GovernanceMetricCard
        title="Attestation Coverage"
        value={metrics.attestationCoverage}
        target="100%"
        icon={ShieldCheck}
        status={getAttestationStatus()}
        hasData={hasAttestationData}
        infoText={hasAttestationData ? `${metrics.attestedDeployments}/${metrics.totalDeployments} verified` : undefined}
      />
      
      <GovernanceMetricCard
        title="Governance Bypasses"
        value={metrics.governanceBypasses}
        target="0"
        unit=""
        icon={Ban}
        status={getBypassStatus()}
        hasData={true}
        infoText={`${metrics.blockedDeployments} deployments blocked`}
      />
    </div>
  );
}
