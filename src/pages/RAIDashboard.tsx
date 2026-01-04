import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { PillarOverview } from "@/components/dashboard/PillarOverview";
import { RAIRadarChart } from "@/components/dashboard/RAIRadarChart";
import { PillarTrendChart } from "@/components/dashboard/PillarTrendChart";
import { ModelComparisonTable } from "@/components/dashboard/ModelComparisonTable";
import { useModelRAIScores, useDashboardTrends, useRAIDashboardStats } from "@/hooks/useRAIDashboard";
import { instrumentPageLoad } from "@/lib/telemetry";
import { 
  Shield, 
  Scale, 
  AlertTriangle, 
  Lock, 
  Brain, 
  FileCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";

const PILLAR_CONFIG = [
  { 
    key: 'fairness', 
    title: 'Fairness', 
    icon: <Scale className="w-5 h-5" />,
    href: '/engines/fairness',
    accent: 'primary' as const,
    description: 'Demographic parity & bias detection',
  },
  { 
    key: 'toxicity', 
    title: 'Toxicity', 
    icon: <AlertTriangle className="w-5 h-5" />,
    href: '/engines/toxicity',
    accent: 'warning' as const,
    description: 'Harmful content detection',
  },
  { 
    key: 'privacy', 
    title: 'Privacy', 
    icon: <Lock className="w-5 h-5" />,
    href: '/engines/privacy',
    accent: 'success' as const,
    description: 'PII/PHI leakage prevention',
  },
  { 
    key: 'hallucination', 
    title: 'Hallucination', 
    icon: <Brain className="w-5 h-5" />,
    href: '/engines/hallucination',
    accent: 'accent' as const,
    description: 'Factuality verification',
  },
  { 
    key: 'explainability', 
    title: 'Explainability', 
    icon: <FileCheck className="w-5 h-5" />,
    href: '/engines/explainability',
    accent: 'primary' as const,
    description: 'Decision transparency',
  },
];

export default function RAIDashboard() {
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModelRAIScores();
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends(30);
  const { data: stats, isLoading: statsLoading } = useRAIDashboardStats();

  useEffect(() => {
    const endTrace = instrumentPageLoad('RAIDashboard');
    return () => endTrace();
  }, []);

  // Calculate average scores across all models
  const avgPillarScores = PILLAR_CONFIG.reduce((acc, pillar) => {
    if (!models?.length) return acc;
    
    const scores = models
      .map(m => m.pillarScores.find(ps => ps.pillar === pillar.key)?.score)
      .filter((s): s is number => s !== null && s !== undefined);
    
    acc[pillar.key] = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    return acc;
  }, {} as Record<string, number | null>);

  // Calculate overall composite score
  const overallComposite = models?.length
    ? Math.round(models.reduce((sum, m) => sum + m.compositeScore, 0) / models.length)
    : 0;

  const compliantModels = models?.filter(m => m.isCompliant).length ?? 0;
  const totalModels = models?.length ?? 0;

  return (
    <MainLayout 
      title="RAI Dashboard" 
      subtitle="Unified view of all 5 Responsible AI pillars with trends and model comparison"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => refetchModels()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Overall RAI Score */}
        <Card className="col-span-1 md:col-span-1">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overall RAI Score</p>
              <p className="text-3xl font-bold font-mono">{overallComposite}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Weighted average across all pillars
              </p>
            </div>
            <ScoreRing score={overallComposite} size="lg" />
          </CardContent>
        </Card>

        {/* Compliance Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                compliantModels === totalModels ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                {compliantModels === totalModels ? (
                  <CheckCircle className="w-6 h-6 text-success" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-warning" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-2xl font-bold font-mono">
                  {totalModels > 0 ? Math.round((compliantModels / totalModels) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {compliantModels}/{totalModels} models compliant
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Evaluations */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Evaluations</p>
                <p className="text-2xl font-bold font-mono">
                  {stats?.totalEvaluations ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Across all engines
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Compliance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eval Pass Rate</p>
                <p className="text-2xl font-bold font-mono">
                  {stats?.overallComplianceRate ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Evaluations ≥70%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillar Overview Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          5 RAI Pillars
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PILLAR_CONFIG.map(pillar => {
            const score = avgPillarScores[pillar.key];
            const pillarStats = stats?.pillarCounts?.[pillar.key];
            
            return (
              <PillarOverview
                key={pillar.key}
                title={pillar.title}
                icon={pillar.icon}
                score={score ?? 0}
                href={pillar.href}
                accentColor={pillar.accent}
                metrics={[
                  { 
                    label: 'Avg Score', 
                    value: score !== null ? `${score}%` : 'N/A' 
                  },
                  { 
                    label: 'Evaluations', 
                    value: pillarStats?.total ?? 0 
                  },
                ]}
              />
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RAIRadarChart models={models || []} />
        <PillarTrendChart trends={trends || []} isLoading={trendsLoading} />
      </div>

      {/* Model Comparison Table */}
      <ModelComparisonTable models={models || []} isLoading={modelsLoading} />

      {/* Quick Actions */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Link to="/engines/fairness">
          <Button variant="outline" className="gap-2">
            <Scale className="w-4 h-4" />
            Run Fairness Eval
          </Button>
        </Link>
        <Link to="/engines/toxicity">
          <Button variant="outline" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Run Toxicity Eval
          </Button>
        </Link>
        <Link to="/engines/hallucination">
          <Button variant="outline" className="gap-2">
            <Brain className="w-4 h-4" />
            Run Hallucination Eval
          </Button>
        </Link>
        <Link to="/reports">
          <Button variant="default" className="gap-2">
            <FileCheck className="w-4 h-4" />
            Generate Report
          </Button>
        </Link>
      </div>
    </MainLayout>
  );
}
