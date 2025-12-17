import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EngineSummaryCardProps {
  score: number;
  threshold?: number;
  engineName: string;
  keyInsight: string;
  trend?: 'up' | 'down' | 'stable';
  previousScore?: number;
  className?: string;
}

export function EngineSummaryCard({
  score,
  threshold = 70,
  engineName,
  keyInsight,
  trend,
  previousScore,
  className,
}: EngineSummaryCardProps) {
  const isCompliant = score >= threshold;
  const scoreColor = score >= 80 ? "text-success" : score >= threshold ? "text-warning" : "text-destructive";
  const bgColor = score >= 80 ? "bg-success/10" : score >= threshold ? "bg-warning/10" : "bg-destructive/10";
  const borderColor = score >= 80 ? "border-success/30" : score >= threshold ? "border-warning/30" : "border-destructive/30";

  const getStatusIcon = () => {
    if (score >= 80) return <CheckCircle className="w-6 h-6 text-success" />;
    if (score >= threshold) return <AlertTriangle className="w-6 h-6 text-warning" />;
    return <XCircle className="w-6 h-6 text-destructive" />;
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
    return <TrendingDown className="w-4 h-4 text-destructive" />;
  };

  return (
    <Card className={cn("overflow-hidden", borderColor, className)}>
      <div className={cn("h-1", isCompliant ? "bg-success" : "bg-destructive")} />
      <CardContent className="pt-6">
        <div className="flex items-center gap-6">
          {/* Score Circle */}
          <div className={cn("relative w-28 h-28 rounded-full flex items-center justify-center", bgColor)}>
            <div className="text-center">
              <span className={cn("text-4xl font-bold", scoreColor)}>
                {score.toFixed(0)}
              </span>
              <span className={cn("text-lg", scoreColor)}>%</span>
            </div>
            {/* Circular progress */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={`${score * 2.83} 283`}
                strokeLinecap="round"
                className={scoreColor}
              />
            </svg>
          </div>

          {/* Status & Insight */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <Badge 
                variant={isCompliant ? "default" : "destructive"} 
                className={cn(
                  "text-sm px-3 py-1",
                  isCompliant ? "bg-success/20 text-success border-success/30" : ""
                )}
              >
                {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
              </Badge>
              {trend && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getTrendIcon()}
                  {previousScore !== undefined && (
                    <span>vs {previousScore.toFixed(0)}%</span>
                  )}
                </div>
              )}
            </div>
            
            <p className="text-foreground font-medium">{keyInsight}</p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{engineName} Score</span>
              <span>•</span>
              <span>Threshold: {threshold}%</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
          <Progress 
            value={score} 
            className={cn("h-2", score < threshold && "[&>div]:bg-destructive")}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-warning">70% threshold</span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
