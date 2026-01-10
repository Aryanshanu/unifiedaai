import { useGovernanceActivationState, GovernanceActivationState } from '@/hooks/useGovernanceMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, CheckCircle2, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStageProps {
  title: string;
  capabilities: {
    name: string;
    capability: string;
    status: GovernanceActivationState['status'];
  }[];
}

function StatusIcon({ status }: { status: GovernanceActivationState['status'] }) {
  switch (status) {
    case 'enforced':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'piloting':
      return <Clock className="h-4 w-4 text-amber-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: GovernanceActivationState['status'] }) {
  const variants = {
    enforced: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    piloting: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    inactive: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <Badge variant="outline" className={cn('text-xs capitalize', variants[status])}>
      {status}
    </Badge>
  );
}

function WorkflowStage({ title, capabilities }: WorkflowStageProps) {
  const enforcedCount = capabilities.filter(c => c.status === 'enforced').length;
  const isFullyEnforced = enforcedCount === capabilities.length;
  const isPartiallyActive = enforcedCount > 0 || capabilities.some(c => c.status === 'piloting');

  return (
    <Card className={cn(
      'border-2 transition-colors',
      isFullyEnforced && 'border-emerald-500/50 bg-emerald-500/5',
      !isFullyEnforced && isPartiallyActive && 'border-amber-500/50 bg-amber-500/5',
      !isFullyEnforced && !isPartiallyActive && 'border-muted bg-muted/20'
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            {enforcedCount}/{capabilities.length} enforced
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {capabilities.map((cap) => (
          <div key={cap.capability} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon status={cap.status} />
              <span className={cn(
                cap.status === 'inactive' && 'text-muted-foreground'
              )}>
                {cap.name}
              </span>
            </div>
            <StatusBadge status={cap.status} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ArrowConnector() {
  return (
    <div className="flex justify-center py-2">
      <ArrowDown className="h-6 w-6 text-muted-foreground/50" />
    </div>
  );
}

export default function GovernanceWorkflowDiagram() {
  const { data: activationState, isLoading } = useGovernanceActivationState();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
            {i < 3 && <div className="flex justify-center py-2"><Skeleton className="h-6 w-6" /></div>}
          </div>
        ))}
      </div>
    );
  }

  const getStatus = (capability: string): GovernanceActivationState['status'] => {
    const state = activationState?.find(s => s.capability === capability);
    return state?.status || 'inactive';
  };

  const stages: WorkflowStageProps[] = [
    {
      title: 'Data Layer',
      capabilities: [
        { name: 'Data Quality', capability: 'data_quality', status: getStatus('data_quality') },
        { name: 'Drift Detection', capability: 'data_drift', status: getStatus('data_drift') },
        { name: 'Contract Enforcement', capability: 'data_contracts', status: getStatus('data_contracts') },
      ],
    },
    {
      title: 'Model Layer',
      capabilities: [
        { name: 'RAI Evaluation', capability: 'model_evaluation', status: getStatus('model_evaluation') },
        { name: 'Deployment Gating', capability: 'deployment_gating', status: getStatus('deployment_gating') },
        { name: 'MLOps Attestation', capability: 'mlops_attestation', status: getStatus('mlops_attestation') },
      ],
    },
    {
      title: 'Decision Layer',
      capabilities: [
        { name: 'Decision Logging', capability: 'decision_logging', status: getStatus('decision_logging') },
        { name: 'Explanation Generation', capability: 'decision_explanation', status: getStatus('decision_explanation') },
        { name: 'Appeal Workflow', capability: 'appeals', status: getStatus('appeals') },
      ],
    },
    {
      title: 'Outcome Layer',
      capabilities: [
        { name: 'Outcome Tracking', capability: 'outcome_tracking', status: getStatus('outcome_tracking') },
        { name: 'Harm Classification', capability: 'harm_classification', status: getStatus('harm_classification') },
      ],
    },
  ];

  return (
    <div className="space-y-0">
      {stages.map((stage, index) => (
        <div key={stage.title}>
          <WorkflowStage {...stage} />
          {index < stages.length - 1 && <ArrowConnector />}
        </div>
      ))}
    </div>
  );
}
