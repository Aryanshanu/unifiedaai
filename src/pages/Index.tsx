import { MainLayout } from "@/components/layout/MainLayout";
import { useModels } from "@/hooks/useModels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformHealthCards } from "@/components/dashboard/PlatformHealthCards";
import { RealityCheckDashboard } from "@/components/dashboard/RealityCheckDashboard";
import { useUnsafeDeployments, usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { Database, Scale, AlertCircle, ShieldAlert, Lock, Eye, Plus, AlertOctagon, ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";

export default function Index() {
  const { data: models, isLoading: modelsLoading, isError: modelsError, refetch: refetchModels } = useModels();
  const { data: unsafeDeployments, isLoading: deploymentsLoading } = useUnsafeDeployments();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError, refetch: refetchMetrics } = usePlatformMetrics();
  const navigate = useNavigate();
  
  const isLoading = modelsLoading || deploymentsLoading || metricsLoading;
  const isError = modelsError || metricsError;
  const { status, lastUpdated } = useDataHealth(isLoading, isError);
  
  const handleRetry = () => {
    refetchModels();
    refetchMetrics();
  };

  const engines = [
    { 
      name: "Fairness Engine", 
      icon: Scale, 
      path: "/engine/fairness",
      description: "Evaluate demographic parity, equalized odds, and bias metrics",
      color: "text-blue-500"
    },
    { 
      name: "Hallucination Engine", 
      icon: AlertCircle, 
      path: "/engine/hallucination",
      description: "Detect factuality issues, groundedness, and false claims",
      color: "text-orange-500"
    },
    { 
      name: "Toxicity Engine", 
      icon: ShieldAlert, 
      path: "/engine/toxicity",
      description: "Measure harmful content, hate speech, and jailbreak resistance",
      color: "text-red-500"
    },
    { 
      name: "Privacy Engine", 
      icon: Lock, 
      path: "/engine/privacy",
      description: "Assess PII leakage, data memorization, and privacy risks",
      color: "text-green-500"
    },
    { 
      name: "Explainability Engine", 
      icon: Eye, 
      path: "/engine/explainability",
      description: "Analyze reasoning quality, transparency, and decision clarity",
      color: "text-purple-500"
    },
  ];

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Fractal RAI Platform Overview"
      headerActions={
        <HealthIndicator 
          status={status} 
          lastUpdated={lastUpdated} 
          onRetry={handleRetry}
          showLabel 
        />
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

      {/* Reality Check Dashboard — December 11, 2025 */}
      <div className="mb-6">
        <RealityCheckDashboard />
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
            <div className="p-3 rounded-lg bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics?.systemsCount || 0}</p>
              <p className="text-sm text-muted-foreground">Registered Systems</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/governance/approvals")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <Shield className="h-6 w-6 text-yellow-500" />
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
      <h2 className="text-lg font-semibold text-foreground mb-4">Core RAI Engines</h2>
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
                  <div className={`p-3 rounded-lg bg-muted ${engine.color}`}>
                    <Icon className="w-6 h-6" />
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
