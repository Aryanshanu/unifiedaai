import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield } from 'lucide-react';
import type { AppRole } from '@/lib/role-personas';

export default function AdminLogin() {
  const { signInAsRole, user, roles } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (attempted) return;
    setAttempted(true);

    (async () => {
      const { error } = await signInAsRole('superadmin' as AppRole);
      if (error) {
        setError(error.message);
      }
    })();
  }, [attempted, signInAsRole]);

  useEffect(() => {
    if (user && roles.includes('superadmin' as AppRole)) {
      navigate('/', { replace: true });
    }
  }, [user, roles, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-10 h-10 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Authenticating...</p>
      </div>
    </div>
  );
}
