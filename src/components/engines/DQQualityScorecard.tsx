import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Minus, 
  CheckCircle2, AlertTriangle, XCircle,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DimensionScore {
  dimension: string;
  score: number | null;
  previousScore?: number | null;
  computed: boolean;
  weight: number;
}

interface DQQualityScorecardProps {
  overallScore: number | null;
  previousOverallScore?: number | null;
  dimensions: DimensionScore[];
  lastUpdated?: string;
  isLoading?: boolean;
}

function getTrendIcon(current: number | null, previous: number | null | undefined) {
  if (current === null || previous === null || previous === undefined) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  const diff = current - previous;
  if (diff > 2) return <TrendingUp className="h-4 w-4 text-success" />;
  if (diff < -2) return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-destructive";
}

function getScoreBg(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 90) return "bg-success/10";
  if (score >= 70) return "bg-warning/10";
  return "bg-destructive/10";
}

function getVerdictBadge(score: number | null) {
  if (score === null) return { label: "N/A", className: "bg-muted text-muted-foreground", icon: Minus };
  if (score >= 90) return { label: "Excellent", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 };
  if (score >= 70) return { label: "Acceptable", className: "bg-warning/10 text-warning border-warning/30", icon: AlertTriangle };
  return { label: "Needs Attention", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle };
}

export function DQQualityScorecard({ 
  overallScore, 
  previousOverallScore, 
  dimensions, 
  lastUpdated,
  isLoading 
}: DQQualityScorecardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-xl" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const verdict = getVerdictBadge(overallScore);
  const VerdictIcon = verdict.icon;
  const computedDimensions = dimensions.filter(d => d.computed && d.score !== null);
  const overallTrend = getTrendIcon(overallScore, previousOverallScore);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quality Scorecard
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Gauge */}
        <div className={cn("p-6 rounded-xl text-center", getScoreBg(overallScore))}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className={cn("text-6xl font-bold", getScoreColor(overallScore))}>
              {overallScore !== null ? `${overallScore.toFixed(1)}%` : "N/A"}
            </span>
            {overallTrend}
          </div>
          <Badge variant="outline" className={verdict.className}>
            <VerdictIcon className="h-3.5 w-3.5 mr-1" />
            {verdict.label}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {computedDimensions.length} of {dimensions.length} dimensions
          </p>
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Dimension Breakdown
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dimensions.map((dim) => {
              const displayScore = dim.computed && dim.score !== null ? dim.score * 100 : null;
              const trend = getTrendIcon(
                displayScore, 
                dim.previousScore !== null && dim.previousScore !== undefined ? dim.previousScore * 100 : null
              );
              
              return (
                <div 
                  key={dim.dimension} 
                  className={cn(
                    "p-3 rounded-lg border",
                    dim.computed ? "bg-card" : "bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{dim.dimension}</span>
                    <span className="text-xs text-muted-foreground">
                      {(dim.weight * 100).toFixed(0)}% weight
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg font-bold", getScoreColor(displayScore))}>
                      {displayScore !== null ? `${displayScore.toFixed(1)}%` : "N/A"}
                    </span>
                    {trend}
                  </div>
                  {displayScore !== null && (
                    <Progress 
                      value={displayScore} 
                      className={cn(
                        "h-1.5 mt-2",
                        displayScore >= 90 ? "[&>div]:bg-success" : 
                        displayScore >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"
                      )} 
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
