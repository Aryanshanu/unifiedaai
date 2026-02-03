import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Brain,
  Target,
  Clock,
  ChevronRight
} from "lucide-react";
import { useHighRiskPredictions, useRunPredictiveAnalysis } from "@/hooks/usePredictiveGovernance";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function PredictiveRiskPanel() {
  // Use threshold of 40 to show medium and high risk predictions (not just 70+)
  const { data: predictions, isLoading, refetch } = useHighRiskPredictions(40);
  const runAnalysis = useRunPredictiveAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await runAnalysis.mutateAsync();
      refetch();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPredictionTypeColor = (type: string) => {
    switch (type) {
      case 'drift_risk':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'compliance_risk':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'incident_probability':
        return 'text-primary bg-primary/10 border-primary/30';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getPredictionTypeLabel = (type: string) => {
    switch (type) {
      case 'drift_risk':
        return 'Drift Risk';
      case 'compliance_risk':
        return 'Compliance Risk';
      case 'incident_probability':
        return 'Incident Probability';
      default:
        return type;
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'Critical', color: 'text-destructive' };
    if (score >= 60) return { label: 'High', color: 'text-warning' };
    if (score >= 40) return { label: 'Medium', color: 'text-primary' };
    return { label: 'Low', color: 'text-success' };
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Predictive Governance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || runAnalysis.isPending}
              className="gap-1.5"
            >
              <Target className="w-4 h-4" />
              {isAnalyzing ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !predictions || predictions.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg border border-border">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No High-Risk Predictions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run analysis to generate predictive insights
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => {
              const riskLevel = getRiskLevel(Number(prediction.risk_score));
              return (
                <div 
                  key={prediction.id} 
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getPredictionTypeColor(prediction.prediction_type))}
                      >
                        {getPredictionTypeLabel(prediction.prediction_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {prediction.entity_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {prediction.predicted_timeframe_hours}h
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Risk Score</span>
                        <span className={cn("text-sm font-semibold", riskLevel.color)}>
                          {Math.round(Number(prediction.risk_score))}%
                        </span>
                      </div>
                      <Progress 
                        value={Number(prediction.risk_score)} 
                        className="h-1.5"
                      />
                    </div>
                    <div className="text-right">
                      <span className={cn("text-xs font-medium", riskLevel.color)}>
                        {riskLevel.label}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(Number(prediction.confidence) * 100)}% conf
                      </div>
                    </div>
                  </div>

                  {prediction.factors && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {(prediction.factors as any)?.primary_factor || 'Historical pattern analysis'}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {predictions && predictions.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {predictions.length} high-risk predictions
              </span>
              <span>
                Updated {formatDistanceToNow(new Date(predictions[0]?.created_at || new Date()), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
