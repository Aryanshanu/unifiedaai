import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface ComputationStep {
  step: number;
  name: string;
  formula?: string;
  inputs?: Record<string, number>;
  result: number | string;
  status: "pass" | "fail" | "info";
  threshold?: number;
}

interface ComputationBreakdownProps {
  steps: ComputationStep[];
  overallScore: number;
}

export function ComputationBreakdown({ steps, overallScore }: ComputationBreakdownProps) {
  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "fail") return <XCircle className="w-4 h-4 text-danger" />;
    return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "pass") return "bg-success/10 border-success/20";
    if (status === "fail") return "bg-danger/10 border-danger/20";
    return "bg-muted border-border";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-5 h-5 text-primary" />
          Computation Breakdown
          <Badge variant="outline" className="ml-auto">
            Overall: {overallScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.step}
            className={`p-3 rounded-lg border ${getStatusColor(step.status)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(step.status)}
                <span className="font-medium text-sm">
                  Step {step.step}: {step.name}
                </span>
              </div>
              <Badge variant={step.status === "pass" ? "default" : step.status === "fail" ? "destructive" : "outline"}>
                {typeof step.result === "number" ? step.result.toFixed(4) : step.result}
              </Badge>
            </div>
            
            {step.formula && (
              <div className="mt-2 p-2 bg-background/50 rounded font-mono text-xs">
                {step.formula}
              </div>
            )}
            
            {step.inputs && Object.keys(step.inputs).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(step.inputs).map(([key, value]) => (
                  <span key={key} className="text-xs text-muted-foreground">
                    {key}: <span className="font-mono">{value}</span>
                  </span>
                ))}
              </div>
            )}
            
            {step.threshold !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: {step.threshold} → {step.status === "pass" ? "COMPLIANT" : "NON-COMPLIANT"}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
