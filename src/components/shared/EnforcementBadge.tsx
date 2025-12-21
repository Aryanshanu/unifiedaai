import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Eye, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type EnforcementLevel = 'enforced' | 'advisory' | 'ui-only' | 'disabled';

interface EnforcementBadgeProps {
  level: EnforcementLevel;
  showIcon?: boolean;
  className?: string;
}

const config: Record<EnforcementLevel, { 
  label: string; 
  icon: typeof Shield;
  className: string;
  description: string;
}> = {
  enforced: { 
    label: 'ENFORCED', 
    icon: Shield,
    className: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
    description: 'Blocked at backend - cannot be bypassed'
  },
  advisory: { 
    label: 'ADVISORY', 
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20',
    description: 'Logged and alerted - not blocked'
  },
  'ui-only': { 
    label: 'UI-ONLY', 
    icon: Eye,
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
    description: 'Visual display only - no backend enforcement'
  },
  disabled: { 
    label: 'DISABLED', 
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
    description: 'Feature disabled until backend implementation'
  },
};

export function EnforcementBadge({ level, showIcon = true, className }: EnforcementBadgeProps) {
  const { label, icon: Icon, className: badgeClass } = config[level];
  
  return (
    <Badge 
      variant="outline" 
      className={cn("text-[10px] font-semibold uppercase tracking-wider", badgeClass, className)}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}

export function EnforcementStatusPanel() {
  const features: { name: string; level: EnforcementLevel; detail: string }[] = [
    { name: 'Registry Lock', level: 'enforced', detail: 'Blocked at gateway + CI/CD' },
    { name: 'PII/Aadhaar/PAN Blocking', level: 'enforced', detail: 'Blocked at gateway' },
    { name: 'Harmful Content Blocking', level: 'enforced', detail: 'Blocked at gateway' },
    { name: 'Secret Leak Detection', level: 'enforced', detail: 'Blocked at gateway' },
    { name: 'Risk Policy Bindings', level: 'enforced', detail: 'Auto-lock for critical risk' },
    { name: 'Approval Workflow', level: 'enforced', detail: 'Gateway checks approval status' },
    { name: 'Evaluation Scores', level: 'enforced', detail: 'Gateway blocks < 70% or failed' },
    { name: 'CI/CD Gate', level: 'enforced', detail: 'Signed JWT tokens required' },
    { name: 'Fairness Evaluation', level: 'advisory', detail: 'Scored but not auto-blocked' },
    { name: 'Explainability Evaluation', level: 'advisory', detail: 'Scored but not auto-blocked' },
    { name: 'MFA', level: 'disabled', detail: 'Pending Supabase Auth config' },
    { name: 'SSO/SAML', level: 'disabled', detail: 'Pending enterprise integration' },
    { name: 'Slack Notifications', level: 'disabled', detail: 'Pending webhook implementation' },
    { name: 'PagerDuty Escalation', level: 'disabled', detail: 'Pending integration' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Backend Enforcement Status</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Only ENFORCED features block at backend. Others are informational.
      </p>
      <div className="space-y-2">
        {features.map((feature) => (
          <div 
            key={feature.name} 
            className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{feature.name}</p>
              <p className="text-xs text-muted-foreground">{feature.detail}</p>
            </div>
            <EnforcementBadge level={feature.level} />
          </div>
        ))}
      </div>
    </div>
  );
}
