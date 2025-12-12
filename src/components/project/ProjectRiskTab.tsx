import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProjectRiskTabProps {
  projectId: string;
}

interface SystemRiskData {
  id: string;
  name: string;
  risk_tier: string | null;
  uri_score: number | null;
  runtime_risk_score: number | null;
}

export function ProjectRiskTab({ projectId }: ProjectRiskTabProps) {
  const navigate = useNavigate();
  
  // Fetch systems with their risk data
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ["project-systems-risk", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("systems")
        .select("id, name, uri_score, runtime_risk_score")
        .eq("project_id", projectId);
      
      if (error) throw error;
      return data as SystemRiskData[];
    },
    enabled: !!projectId,
  });

  // Fetch risk assessments for all systems in this project
  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ["project-risk-assessments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .select("*, systems!inner(project_id)")
        .eq("systems.project_id", projectId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const isLoading = systemsLoading || assessmentsLoading;

  // Calculate aggregate stats
  const totalSystems = systems?.length || 0;
  const assessedSystems = assessments 
    ? new Set(assessments.map(a => a.system_id)).size 
    : 0;
  
  const avgUriScore = systems?.length 
    ? systems.reduce((acc, s) => acc + (s.uri_score || 0), 0) / systems.length 
    : 0;

  const riskDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  assessments?.forEach(a => {
    if (a.risk_tier in riskDistribution) {
      riskDistribution[a.risk_tier as keyof typeof riskDistribution]++;
    }
  });

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case "low": return "bg-success/10 text-success border-success/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "critical": return "bg-danger/10 text-danger border-danger/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getScoreTrend = (score: number | null) => {
    if (!score) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (score < 30) return <TrendingDown className="h-4 w-4 text-success" />;
    if (score > 60) return <TrendingUp className="h-4 w-4 text-danger" />;
    return <Minus className="h-4 w-4 text-warning" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalSystems === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Shield className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Systems to Assess</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Add AI models to this project first, then run risk assessments on each system.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessedSystems}/{totalSystems}</p>
                <p className="text-sm text-muted-foreground">Systems Assessed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(avgUriScore)}</p>
                <p className="text-sm text-muted-foreground">Avg URI Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold">{riskDistribution.high + riskDistribution.critical}</p>
                <p className="text-sm text-muted-foreground">High/Critical Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{riskDistribution.low}</p>
                <p className="text-sm text-muted-foreground">Low Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
          <CardDescription>Risk tier breakdown across all assessed systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {Object.entries(riskDistribution).map(([tier, count]) => (
              <div key={tier} className="flex-1">
                <div className={`h-8 rounded-lg ${getRiskColor(tier)} flex items-center justify-center`}>
                  <span className="text-sm font-medium capitalize">{tier}: {count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Systems List */}
      <Card>
        <CardHeader>
          <CardTitle>System Risk Status</CardTitle>
          <CardDescription>Click on a system to view detailed risk assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systems?.map(system => {
              const latestAssessment = assessments?.find(a => a.system_id === system.id);
              const riskTier = latestAssessment?.risk_tier || "unassessed";
              
              return (
                <div
                  key={system.id}
                  onClick={() => navigate(`/systems/${system.id}`)}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getRiskColor(riskTier)}>
                          {riskTier === "unassessed" ? "Not Assessed" : riskTier.toUpperCase()}
                        </Badge>
                        {system.uri_score !== null && (
                          <span className="text-sm text-muted-foreground">
                            URI: {Math.round(system.uri_score)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getScoreTrend(system.uri_score)}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
