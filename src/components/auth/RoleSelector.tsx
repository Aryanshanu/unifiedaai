import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PERSONA_MAP, type AppRole } from '@/lib/role-personas';

const roleOptions = Object.values(PERSONA_MAP).filter(p => p.role !== 'superadmin');

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
          const isLoading = loadingRole === option.role;
          const isDisabled = loadingRole !== null;
          return (
            <Card
              key={option.role}
              className={cn(
                'cursor-pointer transition-all duration-200 border-l-4 hover:scale-[1.02] hover:shadow-lg',
                option.borderColor,
                isLoading && 'ring-2 ring-primary/40 shadow-lg scale-[1.02]',
                isDisabled && !isLoading && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !isDisabled && onSelect(option.role)}
            >
              <CardContent className="pt-4 pb-4 flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br text-2xl shadow-md',
                  option.avatarGradient
                )}>
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <span role="img" aria-label={option.displayName}>{option.avatarEmoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', isLoading && 'text-primary')}>
                    {option.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{option.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
