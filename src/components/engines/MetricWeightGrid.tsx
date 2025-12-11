/**
 * MetricWeightGrid - Display 5 weighted metrics with formula
 * Used by all RAI Engine pages for 2025 SOTA transparency
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, XCircle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WeightedMetric {
  key: string;
  name: string;
  score: number;
  weight: number;
  description?: string;
}

interface MetricWeightGridProps {
  metrics: WeightedMetric[];
  overallScore: number;
  engineName: string;
  formula: string;
  complianceThreshold?: number;
}

export function MetricWeightGrid({
  metrics,
  overallScore,
  engineName,
  formula,
  complianceThreshold = 70,
}: MetricWeightGridProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-success/10 border-success/20";
    if (score >= 60) return "bg-warning/10 border-warning/20";
    return "bg-danger/10 border-danger/20";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-success" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-danger" />;
  };

  const isCompliant = overallScore >= complianceThreshold;
  const complianceStatus = overallScore >= 80 ? 'COMPLIANT' : overallScore >= complianceThreshold ? 'PARTIAL' : 'NON_COMPLIANT';

  return (
    <div className="space-y-4">
      {/* Formula Badge */}
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Badge variant="outline" className="text-primary border-primary/30 font-mono text-xs">
          2025 SOTA
        </Badge>
        <code className="text-xs text-muted-foreground font-mono flex-1">
          {formula}
        </code>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Weighted formula based on 2025 SOTA RAI research. Each metric contributes proportionally to the overall {engineName} score.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Compliance Status Banner */}
      {complianceStatus === 'NON_COMPLIANT' && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-danger">NON-COMPLIANT</p>
            <p className="text-sm text-muted-foreground mt-1">
              Score is below {complianceThreshold}% threshold. Remediation required per EU AI Act Article 9.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <Card 
            key={metric.key} 
            className={cn(
              "border transition-all hover:shadow-md",
              getScoreBgColor(metric.score)
            )}
          >
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate">
                  {metric.name}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                >
                  {(metric.weight * 100).toFixed(0)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {getScoreIcon(metric.score)}
                <span className={cn("text-2xl font-bold", getScoreColor(metric.score))}>
                  {metric.score.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={metric.score} 
                className="h-1.5"
              />
              {metric.description && (
                <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                  {metric.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall Score Summary */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        isCompliant ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
      )}>
        <div className="flex items-center gap-3">
          {isCompliant ? (
            <CheckCircle className="w-6 h-6 text-success" />
          ) : (
            <XCircle className="w-6 h-6 text-danger" />
          )}
          <div>
            <p className="font-medium text-foreground">Overall {engineName} Score</p>
            <p className="text-xs text-muted-foreground">
              Weighted average of {metrics.length} metrics
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-3xl font-bold", getScoreColor(overallScore))}>
            {overallScore.toFixed(0)}%
          </p>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              complianceStatus === 'COMPLIANT' ? "text-success border-success" :
              complianceStatus === 'PARTIAL' ? "text-warning border-warning" :
              "text-danger border-danger"
            )}
          >
            {complianceStatus}
          </Badge>
        </div>
      </div>
    </div>
  );
}
