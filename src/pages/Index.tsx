import { MainLayout } from "@/components/layout/MainLayout";
import { useModels } from "@/hooks/useModels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformHealthCards } from "@/components/dashboard/PlatformHealthCards";
import { RealityCheckDashboard } from "@/components/dashboard/RealityCheckDashboard";
import GovernanceHealthCards, { GovernanceCoverageBadge } from "@/components/dashboard/GovernanceHealthCards";
import { useUnsafeDeployments, usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { useGovernanceMetrics } from "@/hooks/useGovernanceMetrics";
import { Database, Scale, AlertCircle, ShieldAlert, Lock, Eye, AlertOctagon, ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Index() {
  const [realtimeActive, setRealtimeActive] = useState(false);
  const queryClient = useQueryClient();
  const { data: models, isLoading: modelsLoading, isError: modelsError, refetch: refetchModels } = useModels();
  const { data: unsafeDeployments, isLoading: deploymentsLoading } = useUnsafeDeployments();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = usePlatformMetrics();
  const { data: governanceMetrics } = useGovernanceMetrics();
  const navigate = useNavigate();
  
  const isLoading = modelsLoading || deploymentsLoading || metricsLoading;
  const isError = modelsError || metricsError;
  const { status, lastUpdated } = useDataHealth(isLoading, isError);
  
  // Realtime subscription for dashboard data
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'systems' },
        () => {
          setRealtimeActive(true);
          queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['unsafe-deployments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          setRealtimeActive(true);
          queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
          
          if (payload.eventType === 'INSERT') {
            const incident = payload.new as any;
            toast.warning(`New Incident: ${incident.title}`, {
              description: `Severity: ${incident.severity}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        () => {
          setRealtimeActive(true);
          queryClient.invalidateQueries({ queryKey: ['models'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleRetry = () => {
    refetchModels();
    refetchMetrics();
  };

  const engines = [
    { 
      name: "Fairness", 
      icon: Scale, 
      path: "/engine/fairness",
      description: "Evaluate demographic parity, equalized odds, and bias metrics"
    },
    { 
      name: "Hallucination", 
      icon: AlertCircle, 
      path: "/engine/hallucination",
      description: "Detect factuality issues, groundedness, and false claims"
    },
    { 
      name: "Toxicity", 
      icon: ShieldAlert, 
      path: "/engine/toxicity",
      description: "Measure harmful content, hate speech, and jailbreak resistance"
    },
    { 
      name: "Privacy", 
      icon: Lock, 
      path: "/engine/privacy",
      description: "Assess PII leakage, data memorization, and privacy risks"
    },
    { 
      name: "Explainability", 
      icon: Eye, 
      path: "/engine/explainability",
      description: "Analyze reasoning quality, transparency, and decision clarity"
    },
  ];

  return (
    <MainLayout 
      title="Command Center" 
      subtitle="Unified AI Governance Operating System"
      headerActions={
        <div className="flex items-center gap-3">
          {realtimeActive && (
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Realtime active" />
          )}
          <HealthIndicator 
            status={status} 
            lastUpdated={lastUpdated} 
            onRetry={handleRetry}
            showLabel 
          />
        </div>
      }
    >
      {/* Unsafe Deployment Alert */}
      {(unsafeDeployments?.length || 0) > 0 && (
        <div className="p-4 mb-6 rounded-xl border-2 border-destructive bg-destructive/5 flex items-start gap-4">
          <AlertOctagon className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Unsafe Deployment Detected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {unsafeDeployments?.length} system(s) have live traffic without proper approval.
            </p>
            <Button 
              variant="destructive" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate("/governance/approvals")}
            >
              Review Now
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Reality Check Dashboard */}
      <div className="mb-6">
        <RealityCheckDashboard />
      </div>

      {/* Unified Governance Health */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-3">
          Governance Health
          <GovernanceCoverageBadge rate={governanceMetrics?.governanceCoverageRate || 0} />
        </h2>
        <GovernanceHealthCards />
      </div>

      {/* Platform Health */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Platform Health</h2>
        <PlatformHealthCards />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/projects")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics?.systemsCount || 0}</p>
              <p className="text-sm text-muted-foreground">Registered Systems</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/governance/approvals")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics?.pendingApprovals || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Approvals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/models")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{models?.length || 0}</p>
              <p className="text-sm text-muted-foreground">ML Models</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Engines Grid */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Evaluation Engines</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engines.map((engine) => {
          const Icon = engine.icon;
          return (
            <Card 
              key={engine.path} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(engine.path)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{engine.name}</h3>
                    <p className="text-sm text-muted-foreground">{engine.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
}
