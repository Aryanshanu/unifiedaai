import { MainLayout } from "@/components/layout/MainLayout";
import { useModels } from "@/hooks/useModels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { 
  Database, 
  Scale, 
  AlertCircle, 
  ShieldAlert, 
  Lock, 
  Eye, 
  ArrowRight, 
  Shield, 
  AlertTriangle,
  ClipboardList,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Index() {
  const [realtimeActive, setRealtimeActive] = useState(false);
  const queryClient = useQueryClient();
  const { data: models, isLoading: modelsLoading, isError: modelsError, refetch: refetchModels } = useModels();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = usePlatformMetrics();
  const navigate = useNavigate();
  
  const isLoading = modelsLoading || metricsLoading;
  const isError = modelsError || metricsError;
  const { status, lastUpdated } = useDataHealth(isLoading, isError);
  
  // Pending reviews count for prominent display
  const { data: pendingReviewsCount } = useQuery({
    queryKey: ['pending-reviews-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('review_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Data Quality metrics
  const { data: dqMetrics } = useQuery({
    queryKey: ['dq-summary'],
    queryFn: async () => {
      const [datasetsRes, incidentsRes, contractsRes, violationsRes] = await Promise.all([
        supabase.from('datasets').select('*', { count: 'exact', head: true }),
        supabase.from('dq_incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('data_contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('data_contract_violations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      return {
        datasets: datasetsRes.count || 0,
        openIncidents: incidentsRes.count || 0,
        activeContracts: contractsRes.count || 0,
        openViolations: violationsRes.count || 0,
      };
    },
    refetchInterval: 60000,
  });


  // Recent incidents for activity log
  const { data: recentIncidents } = useQuery({
    queryKey: ['recent-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, title, severity, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    refetchInterval: 30000,
  });
  
  // Realtime subscription for dashboard data
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          setRealtimeActive(true);
          queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['recent-incidents'] });
          
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
        { event: '*', schema: 'public', table: 'dq_incidents' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dq-summary'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'review_queue' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['review-queue'] });
          queryClient.invalidateQueries({ queryKey: ['pending-reviews-count'] });
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

  const raiEngines = [
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
      subtitle="Unified Data & AI Governance"
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
      {/* Pending Reviews Alert - Critical HITL Queue */}
      {(pendingReviewsCount || 0) > 0 && (
        <div className="p-4 mb-6 rounded-xl border-2 border-primary bg-primary/5 flex items-start gap-4">
          <ClipboardList className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-primary">Human-in-the-Loop Queue</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingReviewsCount} item(s) require human review for governance compliance.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => navigate("/hitl")}
            >
              Review Queue
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Data Governance & Core Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Data Governance Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Governance
          </h2>
          
          {/* Data Quality Engine Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/engine/data-quality")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Data Quality Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Profile, validate, and monitor dataset quality
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold">{dqMetrics?.datasets || 0}</p>
                  <p className="text-xs text-muted-foreground">Datasets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{dqMetrics?.openIncidents || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Contracts Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/data-contracts")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <FileText className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Data Contracts</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Schema expectations and SLA enforcement
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold">{dqMetrics?.activeContracts || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Contracts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{dqMetrics?.openViolations || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Core Security Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Core Security
          </h2>
          
          {/* Security Dashboard Summary Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/security")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <Shield className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Security Dashboard</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Security posture and vulnerability overview
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-2xl font-bold">{securityMetrics?.openFindings || 0}</p>
                  <p className="text-xs text-muted-foreground">Open Findings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{securityMetrics?.criticalFindings || 0}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{securityMetrics?.completedScans || 0}</p>
                  <p className="text-xs text-muted-foreground">Scans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            {securityItems.slice(1).map((item) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.path}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(item.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Core RAI Engines Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          Core RAI Engines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {raiEngines.map((engine) => {
            const Icon = engine.icon;
            return (
              <Card 
                key={engine.path} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(engine.path)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 rounded-lg bg-muted mb-3">
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{engine.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {engine.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Activity & Platform Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Recent Incidents
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              {recentIncidents && recentIncidents.length > 0 ? (
                <div className="space-y-3">
                  {recentIncidents.map((incident: any) => (
                    <div 
                      key={incident.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                      onClick={() => navigate("/incidents")}
                    >
                      <div className="flex items-center gap-3">
                        {incident.status === 'open' ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{incident.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(incident.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent incidents</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Platform Stats */}
        <div className="space-y-4">
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

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/alerts")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics?.recentIncidents || 0}</p>
                <p className="text-sm text-muted-foreground">Open Alerts</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
