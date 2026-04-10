import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { RoleSelector } from '@/components/auth/RoleSelector';
import type { AppRole } from '@/lib/role-personas';
import { PERSONA_MAP } from '@/lib/role-personas';

export default function Auth() {
  const [loadingRole, setLoadingRole] = useState<AppRole | null>(null);
  const { user, roles, persona, signInAsRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || persona.defaultRoute;

  useEffect(() => {
    if (user && roles.length > 0) {
      navigate(from, { replace: true });
    }
  }, [user, roles, navigate, from]);

  const handleRoleSelect = async (role: AppRole) => {
    setLoadingRole(role);
    const { error } = await signInAsRole(role);
    setLoadingRole(null);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      const p = PERSONA_MAP[role];
      toast({
        title: 'Welcome!',
        description: `Logged in as ${p.displayName}.`,
      });
      navigate(p.defaultRoute, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 shadow-glow">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Fractal Unified AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Enterprise AI Governance Platform</p>
        </div>

        <RoleSelector onSelect={handleRoleSelect} loadingRole={loadingRole} />
      </div>
    </div>
  );
}
