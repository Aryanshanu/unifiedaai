import { Crown, ShieldCheck, Wrench, FileCheck, LucideIcon, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/role-personas';

interface RoleOption {
  role: AppRole;
  displayName: string;
  description: string;
  icon: LucideIcon;
}

const roleOptions: RoleOption[] = [
  {
    role: 'admin',
    displayName: 'Chief Data & AI Officer',
    description: 'Executive oversight of AI governance, risk posture, and compliance',
    icon: Crown,
  },
  {
    role: 'reviewer',
    displayName: 'AI Steward',
    description: 'Policy enforcement, HITL reviews, incident management, and approvals',
    icon: ShieldCheck,
  },
  {
    role: 'analyst',
    displayName: 'Agent Engineer',
    description: 'Model evaluation, security testing, data quality, and technical config',
    icon: Wrench,
  },
  {
    role: 'viewer',
    displayName: 'Compliance Auditor',
    description: 'Audit trails, attestations, regulatory reports, and evidence packages',
    icon: FileCheck,
  },
];

interface RoleSelectorProps {
  onSelect: (role: AppRole) => void;
  loadingRole?: AppRole | null;
}

export function RoleSelector({ onSelect, loadingRole }: RoleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground">Select Your Role</h3>
        <p className="text-sm text-muted-foreground">Choose the view that best fits your responsibilities</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isLoading = loadingRole === option.role;
          const isDisabled = loadingRole !== null;
          return (
            <Card
              key={option.role}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/5',
                isLoading && 'border-primary ring-1 ring-primary/30 bg-primary/5',
                isDisabled && !isLoading && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !isDisabled && onSelect(option.role)}
            >
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className={cn(
                  'p-2.5 rounded-lg shrink-0',
                  isLoading ? 'bg-primary/15' : 'bg-muted'
                )}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', isLoading && 'text-primary')}>
                    {option.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
