import { Crown, ShieldCheck, Wrench, FileCheck, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type AppRole = 'admin' | 'reviewer' | 'analyst' | 'viewer';

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
  isLoading?: boolean;
}

export function RoleSelector({ onSelect, isLoading }: RoleSelectorProps) {
  const [selected, setSelected] = useState<AppRole | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground">Select Your Role</h3>
        <p className="text-sm text-muted-foreground">Choose the view that best fits your responsibilities</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isActive = selected === option.role;
          return (
            <Card
              key={option.role}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:border-primary/50',
                isActive && 'border-primary ring-1 ring-primary/30 bg-primary/5'
              )}
              onClick={() => setSelected(option.role)}
            >
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className={cn(
                  'p-2.5 rounded-lg shrink-0',
                  isActive ? 'bg-primary/15' : 'bg-muted'
                )}>
                  <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', isActive && 'text-primary')}>
                    {option.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
        disabled={!selected || isLoading}
        onClick={() => selected && onSelect(selected)}
      >
        {isLoading ? 'Setting up...' : 'Continue'}
      </Button>
    </div>
  );
}
