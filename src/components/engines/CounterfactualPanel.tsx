import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Lightbulb, TrendingUp, RefreshCw } from "lucide-react";
import type { CounterfactualExplanation } from "@/lib/shap-formulas";

interface CounterfactualPanelProps {
  counterfactual: CounterfactualExplanation | null;
  isLoading?: boolean;
}

export function CounterfactualPanel({
  counterfactual,
  isLoading = false,
}: CounterfactualPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Generating Counterfactual...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-secondary/30 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!counterfactual) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            Counterfactual Explanations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No counterfactual available</p>
            <p className="text-sm">Run an evaluation to generate "what-if" scenarios</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            Counterfactual Explanation
          </CardTitle>
          <Badge 
            variant="outline" 
            className={counterfactual.confidence >= 70 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}
          >
            {counterfactual.confidence.toFixed(0)}% confidence
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          What would need to change to achieve a different outcome?
        </p>
      </CardHeader>
      <CardContent>
        {/* Prediction transition */}
        <div className="flex items-center justify-center gap-4 p-4 bg-secondary/30 rounded-lg mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <Badge variant="outline" className="text-base px-4 py-1">
              {counterfactual.originalPrediction}
            </Badge>
          </div>
          <ArrowRight className="w-6 h-6 text-primary" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Target</p>
            <Badge className="bg-success text-success-foreground text-base px-4 py-1">
              {counterfactual.counterfactualPrediction}
            </Badge>
          </div>
        </div>

        {/* Changes needed */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Suggested Changes
          </h4>
          
          {counterfactual.changes.map((change, idx) => (
            <div
              key={change.feature}
              className="p-4 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{change.feature}</span>
                <Badge 
                  variant="outline" 
                  className={change.impact > 0 ? 'text-success border-success/30' : 'text-danger border-danger/30'}
                >
                  {change.impact > 0 ? '+' : ''}{change.impact.toFixed(1)}% impact
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <p className="font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded text-xs">
                    {change.originalValue || 'N/A'}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Suggested</p>
                  <p className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                    {change.newValue || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="mt-3">
                <Progress 
                  value={Math.min(100, Math.abs(change.impact))} 
                  className="h-1"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Confidence explanation */}
        <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-warning mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">How to interpret this</p>
              <p>
                These are the minimum changes needed to flip the prediction. 
                Higher impact changes have more effect on the outcome. 
                Confidence reflects how certain the model is about these suggestions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
