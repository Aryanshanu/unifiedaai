import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calculator, CheckCircle, XCircle, ArrowRight, AlertTriangle, ChevronDown, Info, Scale } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ComputationStep {
  step: number;
  name: string;
  formula?: string;
  inputs?: Record<string, number | string>;
  result: number | string;
  status: "pass" | "fail" | "info" | "warn";
  threshold?: number;
  weight?: number;
  whyExplanation?: string;
}

interface ComputationBreakdownProps {
  steps: ComputationStep[];
  overallScore: number;
  weightedFormula?: string;
  engineType?: string;
  euAIActReference?: string;
}

export function ComputationBreakdown({ 
  steps, 
  overallScore, 
  weightedFormula,
  engineType = "unknown",
  euAIActReference
}: ComputationBreakdownProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  
  const isCompliant = overallScore >= 70;
  
  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "fail") return <XCircle className="w-4 h-4 text-danger" />;
    if (status === "warn") return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "pass") return "bg-success/10 border-success/20";
    if (status === "fail") return "bg-danger/10 border-danger/20";
    if (status === "warn") return "bg-warning/10 border-warning/20";
    return "bg-muted border-border";
  };

  const getWeightBadgeColor = (weight?: number) => {
    if (!weight) return "bg-muted text-muted-foreground";
    if (weight >= 0.25) return "bg-primary/20 text-primary";
    if (weight >= 0.15) return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-primary" />
              Computation Breakdown
            </CardTitle>
            {weightedFormula && (
              <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded">
                {weightedFormula}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "font-bold",
                isCompliant ? "border-success text-success" : "border-danger text-danger"
              )}
            >
              {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}: {overallScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* NON-COMPLIANT Warning Banner */}
        {!isCompliant && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">NON-COMPLIANT - Score Below 70% Threshold</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                This evaluation fails to meet the minimum compliance threshold required by regulatory standards.
              </p>
              {euAIActReference && (
                <p className="text-xs font-medium">
                  Reference: {euAIActReference}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Computation Steps */}
        {steps.map((step) => (
          <Collapsible 
            key={step.step}
            open={expandedSteps.has(step.step)}
            onOpenChange={() => toggleStep(step.step)}
          >
            <div className={cn(
              "rounded-lg border transition-all",
              getStatusColor(step.status)
            )}>
              <CollapsibleTrigger className="w-full p-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(step.status)}
                    <span className="font-medium text-sm">
                      Step {step.step}: {step.name}
                    </span>
                    {step.weight !== undefined && (
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getWeightBadgeColor(step.weight))}
                      >
                        {(step.weight * 100).toFixed(0)}% weight
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={step.status === "pass" ? "default" : step.status === "fail" ? "destructive" : "outline"}
                    >
                      {typeof step.result === "number" ? step.result.toFixed(4) : step.result}
                    </Badge>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedSteps.has(step.step) && "rotate-180"
                    )} />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                  {/* Formula Display */}
                  {step.formula && (
                    <div className="p-2 bg-background/50 rounded font-mono text-xs">
                      <span className="text-muted-foreground">Formula: </span>
                      {step.formula}
                    </div>
                  )}
                  
                  {/* Input Values */}
                  {step.inputs && Object.keys(step.inputs).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(step.inputs).map(([key, value]) => (
                        <span key={key} className="text-xs bg-muted px-2 py-1 rounded">
                          <span className="text-muted-foreground">{key}: </span>
                          <span className="font-mono font-medium">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Threshold Info */}
                  {step.threshold !== undefined && (
                    <div className={cn(
                      "flex items-center gap-2 text-xs p-2 rounded",
                      step.status === "pass" ? "bg-success/10" : "bg-danger/10"
                    )}>
                      <Scale className="w-3 h-3" />
                      <span>
                        Threshold: {step.threshold} → 
                        <span className={cn(
                          "font-bold ml-1",
                          step.status === "pass" ? "text-success" : "text-danger"
                        )}>
                          {step.status === "pass" ? "PASSED" : "FAILED"}
                        </span>
                      </span>
                    </div>
                  )}
                  
                  {/* Why Explanation */}
                  {step.whyExplanation && (
                    <div className="flex items-start gap-2 p-2 bg-primary/5 rounded text-xs">
                      <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-primary">Why {typeof step.result === 'number' ? `${(step.result * 100).toFixed(1)}%` : step.result}? </span>
                        <span className="text-muted-foreground">{step.whyExplanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {/* Summary */}
        <div className={cn(
          "p-3 rounded-lg border mt-4",
          isCompliant ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isCompliant ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-danger" />
              )}
              <span className="font-medium">
                Final Score: {overallScore}%
              </span>
            </div>
            <Badge 
              variant={isCompliant ? "default" : "destructive"}
              className="font-bold"
            >
              {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
            </Badge>
          </div>
          {!isCompliant && euAIActReference && (
            <p className="text-xs text-danger mt-2">
              ⚠️ Fails {euAIActReference} requirements. Remediation required before deployment.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
