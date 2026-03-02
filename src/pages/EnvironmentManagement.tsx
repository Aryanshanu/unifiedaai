import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystems } from '@/hooks/useSystems';
import { useAgents } from '@/hooks/useAgents';
import { Server, Shield, CheckCircle, AlertTriangle, Lock, Unlock } from 'lucide-react';

interface DeploymentEnvironment {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_production: boolean;
  approval_required: boolean;
  max_risk_tier: string;
  auto_monitoring: boolean;
}

function useEnvironments() {
  return useQuery({
    queryKey: ['deployment-environments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deployment_environments')
        .select('*')
        .order('is_production', { ascending: true });
      if (error) throw error;
      return data as unknown as DeploymentEnvironment[];
    },
  });
}

export default function EnvironmentManagement() {
  const { data: environments } = useEnvironments();
  const { data: systems } = useSystems();
  const { data: agents } = useAgents();

  const getEnvCounts = (envName: string) => {
    const systemCount = systems?.filter(s => (s as any).environment === envName || (envName === 'production' && (s as any).deployment_status === 'deployed'))?.length ?? 0;
    const agentCount = agents?.filter(a => a.environment === envName)?.length ?? 0;
    return { systemCount, agentCount };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Environment Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage deployment environments with governance controls, approval gates, and risk isolation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {environments?.map(env => {
            const counts = getEnvCounts(env.name);
            return (
              <Card key={env.id} className={`bg-card border-border ${env.is_production ? 'ring-1 ring-primary/30' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className={`w-5 h-5 ${env.is_production ? 'text-primary' : 'text-muted-foreground'}`} />
                      {env.display_name}
                    </CardTitle>
                    {env.is_production && <Badge variant="default">Production</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{env.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{counts.systemCount}</div>
                      <div className="text-xs text-muted-foreground">Systems</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{counts.agentCount}</div>
                      <div className="text-xs text-muted-foreground">Agents</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {env.approval_required ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        Approval Required
                      </span>
                      <Badge variant={env.approval_required ? 'default' : 'outline'}>
                        {env.approval_required ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Max Risk Tier
                      </span>
                      <Badge variant="secondary">{env.max_risk_tier}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {env.auto_monitoring ? <CheckCircle className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        Auto Monitoring
                      </span>
                      <Badge variant={env.auto_monitoring ? 'default' : 'outline'}>
                        {env.auto_monitoring ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
