import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Shield, Info, Clock } from "lucide-react";
import { format } from "date-fns";
import type { RiskAssessment } from "@/hooks/useRiskAssessments";

interface RiskScoreCardProps {
  assessment: RiskAssessment | null;
  compact?: boolean;
}

export function RiskScoreCard({ assessment, compact = false }: RiskScoreCardProps) {
  const getRiskTierConfig = (tier: string) => {
    switch (tier) {
      case "low":
        return { 
          color: "bg-green-500/10 text-green-500 border-green-500/20",
          bgColor: "bg-green-500",
          label: "Low Risk"
        };
      case "medium":
        return { 
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
          bgColor: "bg-yellow-500",
          label: "Medium Risk"
        };
      case "high":
        return { 
          color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
          bgColor: "bg-orange-500",
          label: "High Risk"
        };
      case "critical":
        return { 
          color: "bg-red-500/10 text-red-500 border-red-500/20",
          bgColor: "bg-red-500",
          label: "Critical Risk"
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground",
          bgColor: "bg-muted",
          label: "Unknown"
        };
    }
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      dataRisk: "Data",
      modelRisk: "Model",
      useCaseRisk: "Use Case",
      operationalRisk: "Operations",
      regulatoryRisk: "Regulatory",
      ethicalRisk: "Ethical",
    };
    return labels[key] || key;
  };

  if (!assessment) {
    return (
      <Card className={compact ? "" : ""}>
        <CardContent className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`}>
          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">No Risk Assessment</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Run a risk assessment to evaluate this system.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tierConfig = getRiskTierConfig(assessment.risk_tier);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Risk Score</span>
            <Badge className={tierConfig.color}>
              {tierConfig.label}
            </Badge>
          </div>
          <Progress 
            value={assessment.uri_score} 
            className="h-2"
          />
        </div>
        <span className="text-2xl font-bold">{Math.round(assessment.uri_score)}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Assessment
          </CardTitle>
          <Badge className={tierConfig.color}>
            {tierConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="text-center p-6 rounded-xl bg-muted/50">
          <div className="text-5xl font-bold mb-2">{Math.round(assessment.uri_score)}</div>
          <p className="text-sm text-muted-foreground">Unified Risk Index</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Static: </span>
              <span className="font-medium">{Math.round(assessment.static_risk_score)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Runtime: </span>
              <span className="font-medium">{Math.round(assessment.runtime_risk_score)}</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Runtime engines not connected yet</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Dimension Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Risk Dimensions</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(assessment.dimension_scores).map(([key, value]) => (
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

        {/* Summary */}
        {assessment.summary && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{assessment.summary}</p>
          </div>
        )}

        {/* Metadata */}
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
