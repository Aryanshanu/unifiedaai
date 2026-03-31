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
  XCircle,
  ScanSearch,
  FlaskConical,
  Target,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { GovernanceDashboard } from "@/components/dashboard/GovernanceDashboard";
import { TechnicalDashboard } from "@/components/dashboard/TechnicalDashboard";
import { ComplianceDashboard } from "@/components/dashboard/ComplianceDashboard";

export default function Index() {
  const { persona } = useAuth();
  const { data: models, isLoading: modelsLoading, isError: modelsError, refetch: refetchModels } = useModels();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = usePlatformMetrics();
  const navigate = useNavigate();
  
  const isLoading = modelsLoading || metricsLoading;
  const isError = modelsError || metricsError;
  const { status, lastUpdated } = useDataHealth(isLoading, isError);
  
  // Use metrics from usePlatformMetrics instead of separate queries
  const pendingReviewsCount = metrics?.pendingApprovals || 0;

  // Data Quality metrics
  const { data: dqMetrics } = useQuery({
    queryKey: ['dq-summary'],
    staleTime: 120_000,
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
    refetchInterval: false,
  });

  // Semantic Layer metrics
  const { data: semanticMetrics } = useQuery({
    queryKey: ['semantic-summary'],
    staleTime: 120_000,
    queryFn: async () => {
      const [activeRes, draftRes, deprecatedRes, driftRes] = await Promise.all([
        (supabase as any).from('semantic_definitions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        (supabase as any).from('semantic_definitions').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        (supabase as any).from('semantic_definitions').select('*', { count: 'exact', head: true }).eq('status', 'deprecated'),
        (supabase as any).from('semantic_drift_alerts').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      return {
        active: activeRes.count || 0,
        draft: draftRes.count || 0,
        deprecated: deprecatedRes.count || 0,
        openDrift: driftRes.count || 0,
      };
    },
    refetchInterval: false,
  });

  // Recent incidents - keep but with longer interval
  const { data: recentIncidents } = useQuery({
    queryKey: ['recent-incidents'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, title, severity, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    refetchInterval: false,
  });
  

  const handleRetry = () => {
    refetchModels();
    refetchMetrics();
  };

  const logicGovernanceEngines = [
    { 
      name: "Fairness", 
      icon: Scale, 
      path: "/engine/fairness",
      description: "Validate demographic parity, equalized odds, and parity metrics"
    },
    { 
      name: "Fidelity", 
      icon: AlertCircle, 
      path: "/engine/hallucination",
      description: "Detect factuality issues, groundedness, and system drift"
    },
    { 
      name: "Safety", 
      icon: ShieldAlert, 
      path: "/engine/toxicity",
      description: "Measure content safety, policy adherence, and resistance parameters"
    },
    { 
      name: "Privacy", 
      icon: Lock, 
      path: "/engine/privacy",
      description: "Audit sensitive data leakage and cryptographic boundaries"
    },
    { 
      name: "Logic", 
      icon: Eye, 
      path: "/engine/explainability",
      description: "Analyze reasoning quality, transparency, and decision clarity"
    },
  ];


  // For non-admin roles, render their specific dashboard
  if (persona.dashboardLayout !== 'executive') {
    const DashboardComponent = {
      governance: GovernanceDashboard,
      technical: TechnicalDashboard,
      compliance: ComplianceDashboard,
    }[persona.dashboardLayout];

    return (
      <MainLayout 
        title="Command Center" 
        subtitle={persona.displayName}
        headerActions={
          <div className="flex items-center gap-3">
            <HealthIndicator 
              status={status} 
              lastUpdated={lastUpdated} 
              onRetry={handleRetry}
              showLabel 
            />
          </div>
        }
      >
        {DashboardComponent && <DashboardComponent />}
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="CDAO Command Center" 
      subtitle="Executive Control Plane"
      headerActions={
        <div className="flex items-center gap-3">
          <HealthIndicator
            status={status} 
            lastUpdated={lastUpdated} 
            onRetry={handleRetry}
            showLabel 
          />
        </div>
      }
    >
      <ExecutiveDashboard />
    </MainLayout>
  );
}
