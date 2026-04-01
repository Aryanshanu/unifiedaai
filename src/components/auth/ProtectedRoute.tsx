import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canAccessRoute } from '@/lib/role-personas';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const AUTH_TIMEOUT_MS = 10_000;

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, roles, persona, loading, isAuthorized } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <ShieldAlert className="w-10 h-10 text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Authentication Timeout</h1>
          <p className="text-muted-foreground text-sm">
            Unable to verify your session. Please reload the page.
          </p>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Auto route-level access control
  if (roles.length > 0 && !canAccessRoute(roles, location.pathname)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            Your role ({persona.displayName}) does not have access to this page.
          </p>
          <Button onClick={() => navigate(persona.defaultRoute)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
