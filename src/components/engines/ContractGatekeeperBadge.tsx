import { Shield, ShieldCheck, ShieldX, ShieldQuestion, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ContractStatus = 'skipped' | 'pending' | 'passed' | 'failed';

interface ContractGatekeeperBadgeProps {
  status: ContractStatus;
  contractName?: string;
  violationCount?: number;
  className?: string;
  showTooltip?: boolean;
}

const STATUS_CONFIG: Record<ContractStatus, {
  icon: React.ReactNode;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}> = {
  skipped: {
    icon: <ShieldQuestion className="h-3.5 w-3.5" />,
    label: 'No Contract',
    description: 'No data contract was assigned to this file',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50 border-muted',
  },
  pending: {
    icon: <Shield className="h-3.5 w-3.5" />,
    label: 'Validating',
    description: 'Contract validation in progress...',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/30',
  },
  passed: {
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    label: 'Contract Passed',
    description: 'Data meets all contract requirements',
    colorClass: 'text-success',
    bgClass: 'bg-success/10 border-success/30',
  },
  failed: {
    icon: <ShieldX className="h-3.5 w-3.5" />,
    label: 'Contract Failed',
    description: 'Data violates contract requirements',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10 border-destructive/30',
  },
};

export function ContractGatekeeperBadge({ 
  status, 
  contractName, 
  violationCount,
  className,
  showTooltip = true 
}: ContractGatekeeperBadgeProps) {
  const config = STATUS_CONFIG[status];

  const badge = (
    <Badge 
      variant="outline"
      className={cn(
        'gap-1',
        config.colorClass,
        config.bgClass,
        className
      )}
    >
      {config.icon}
      {config.label}
      {status === 'failed' && violationCount !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold">
          {violationCount}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {contractName && (
              <p className="text-xs flex items-center gap-1 pt-1 border-t">
                <FileCheck className="h-3 w-3" />
                Contract: {contractName}
              </p>
            )}
            {status === 'failed' && violationCount !== undefined && (
              <p className="text-xs text-destructive">
                {violationCount} violation{violationCount !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact inline version
export function GatekeeperIcon({ status, className }: { status: ContractStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span className={cn(config.colorClass, className)}>
      {config.icon}
    </span>
  );
}
