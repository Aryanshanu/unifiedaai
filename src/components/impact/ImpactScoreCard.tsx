import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { ImpactAssessment } from "@/hooks/useImpactAssessments";

interface ImpactScoreCardProps {
  assessment: ImpactAssessment | null;
  compact?: boolean;
}

export function ImpactScoreCard({ assessment, compact = false }: ImpactScoreCardProps) {
  const getQuadrantConfig = (quadrant: string) => {
    if (quadrant.includes("high_high") || quadrant.includes("critical")) {
      return { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "High Risk × High Impact" };
    }
    if (quadrant.includes("high_medium") || quadrant.includes("medium_high")) {
      return { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "Elevated Concern" };
    }
    if (quadrant.includes("medium_medium")) {
      return { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Moderate" };
    }
    if (quadrant.includes("low_high") || quadrant.includes("high_low")) {
      return { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Mixed" };
    }
    return { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "Low Concern" };
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      userImpact: "User",
      businessImpact: "Business",
      legalImpact: "Legal",
      reputationImpact: "Reputation",
      safetyImpact: "Safety",
    };
    return labels[key] || key;
  };

  if (!assessment) {
    return (
      <Card>
        <CardContent className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`}>
          <Target className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">No Impact Assessment</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Run an impact assessment to evaluate potential consequences.
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = getQuadrantConfig(assessment.quadrant);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Impact Score</span>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
          <Progress value={assessment.overall_score} className="h-2" />
        </div>
        <span className="text-2xl font-bold">{Math.round(assessment.overall_score)}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Impact Assessment
          </CardTitle>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center p-6 rounded-xl bg-muted/50">
          <div className="text-5xl font-bold mb-2">{Math.round(assessment.overall_score)}</div>
          <p className="text-sm text-muted-foreground">Overall Impact Score</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Impact Dimensions</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(assessment.dimensions).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getDimensionLabel(key)}</span>
                  <span className="font-medium">{value}/5</span>
                </div>
                <Progress value={(value / 5) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {assessment.summary && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{assessment.summary}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(assessment.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
          <span>Version {assessment.version}</span>
        </div>
      </CardContent>
    </Card>
  );
}
