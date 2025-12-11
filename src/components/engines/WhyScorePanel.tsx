/**
 * WhyScorePanel - "Why X%?" expandable explanation panel
 * Provides detailed reasoning for how the score was calculated
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Calculator, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComputationStep {
  step: number;
  description: string;
  formula?: string;
  inputs?: Record<string, number>;
  output?: number;
}

interface WhyScorePanelProps {
  score: number;
  engineName: string;
  computationSteps: ComputationStep[];
  weightedFormula: string;
  metricBreakdown: {
    name: string;
    score: number;
    weight: number;
    contribution: number;
  }[];
  delta?: number;
  threshold?: number;
}

export function WhyScorePanel({
  score,
  engineName,
  computationSteps,
  weightedFormula,
  metricBreakdown,
  delta = 0.1,
  threshold = 70,
}: WhyScorePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-success";
    if (s >= 60) return "text-warning";
    return "text-danger";
  };

  return (
    <Card className="border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="w-5 h-5 text-primary" />
                Why {score.toFixed(0)}%?
                <Badge variant="outline" className="text-xs ml-2">
                  Click to expand
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Weighted Formula */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Weighted Formula</span>
              </div>
              <code className="text-xs font-mono text-muted-foreground block bg-background/50 p-2 rounded">
                {weightedFormula}
              </code>
            </div>

            {/* Metric Breakdown Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Metric Contributions</span>
              </div>
              <div className="space-y-2">
                {metricBreakdown.map((metric, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {metric.score >= 80 ? (
                        <CheckCircle className="w-3 h-3 text-success" />
                      ) : metric.score >= 60 ? (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-danger" />
                      )}
                      <span className="text-muted-foreground">{metric.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-xs">
                        {(metric.weight * 100).toFixed(0)}%
                      </Badge>
                      <span className={cn("font-mono text-xs", getScoreColor(metric.score))}>
                        {metric.score.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        → {metric.contribution.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-2 mt-2 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-semibold text-sm">Total (Weighted Sum)</span>
                <span className={cn("font-bold text-lg", getScoreColor(score))}>
                  {score.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Computation Steps */}
            {computationSteps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Computation Steps</span>
                </div>
                <div className="space-y-2">
                  {computationSteps.map((step) => (
                    <div 
                      key={step.step}
                      className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg text-xs"
                    >
                      <Badge 
                        variant="outline" 
                        className="shrink-0 w-6 h-6 p-0 flex items-center justify-center"
                      >
                        {step.step}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-muted-foreground">{step.description}</p>
                        {step.formula && (
                          <code className="text-[10px] text-primary/80 mt-1 block">
                            {step.formula}
                          </code>
                        )}
                      </div>
                      {step.output !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {step.output}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thresholds */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs">
              <p className="text-muted-foreground">
                <strong>Normalization:</strong> δ = {delta} (tolerated gap) | 
                <strong> Compliance Threshold:</strong> {threshold}% | 
                <strong> Optimal:</strong> ≥80%
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
