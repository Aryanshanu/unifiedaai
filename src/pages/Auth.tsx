import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Activity, User } from 'lucide-react';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { RoleSelector } from '@/components/auth/RoleSelector';
import type { AppRole } from '@/lib/role-personas';

export default function Auth() {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  
  const { user, roles, assignRole, persona } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || persona.defaultRoute;

  useEffect(() => {
    if (user && roles.length > 0) {
      navigate(from, { replace: true });
    } else if (user && roles.length === 0) {
      setShowRoleSelector(true);
    }
  }, [user, roles, navigate, from]);

  const handleSignUpSuccess = () => {
    setShowRoleSelector(true);
  };

  const handleRoleSelect = async (role: AppRole) => {
    setIsAssigningRole(true);
    const { error } = await assignRole(role);
    setIsAssigningRole(false);

    if (error) {
      toast({
        title: 'Role Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome!',
        description: `You're set up as ${role === 'admin' ? 'Chief Data & AI Officer' : role === 'reviewer' ? 'AI Steward' : role === 'analyst' ? 'Agent Engineer' : 'Compliance Auditor'}.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 shadow-glow">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Fractal Unified</h1>
          <p className="text-muted-foreground text-sm mt-1">Autonomous Governance Platform</p>
        </div>

        <Card className="border-border bg-card/80 backdrop-blur-sm">
          {showRoleSelector ? (
            <CardContent className="pt-6">
              <RoleSelector onSelect={handleRoleSelect} isLoading={isAssigningRole} />
            </CardContent>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="signin" className="mt-0">
                  <CardDescription className="mb-4 text-center">
                    Sign in to access your governance dashboard
                  </CardDescription>
                  <SignInForm />
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <CardDescription className="mb-4 text-center">
                    Create an account to get started
                  </CardDescription>
                  <SignUpForm onSuccess={handleSignUpSuccess} />
                </TabsContent>
              </CardContent>
            </Tabs>
          )}
        </Card>

        {!showRoleSelector && (
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-card/50 border border-border">
              <Activity className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Continuous Monitoring</p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border">
              <Shield className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Compliance Ready</p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border">
              <User className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">HITL Controls</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
