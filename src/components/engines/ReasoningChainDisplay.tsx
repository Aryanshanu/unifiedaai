import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Lightbulb, Eye, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ReasoningStep {
  step: number;
  thought: string;
  observation: string;
  conclusion: string;
}

interface ReasoningChainDisplayProps {
  reasoningChain: ReasoningStep[];
  transparencySummary: string;
  evidence?: string[];
  riskFactors?: string[];
  recommendations?: string[];
  analysisModel?: string;
}

export function ReasoningChainDisplay({
  reasoningChain,
  transparencySummary,
  evidence = [],
  riskFactors = [],
  recommendations = [],
  analysisModel = "google/gemini-2.5-pro",
}: ReasoningChainDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Analysis Model Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          K2 Chain-of-Thought Reasoning
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {analysisModel}
        </Badge>
      </div>

      {/* Transparency Summary */}
      {transparencySummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              AI Reasoning Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{transparencySummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Reasoning Chain Steps */}
      {reasoningChain && reasoningChain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Reasoning Chain ({reasoningChain.length} steps)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reasoningChain.map((step, index) => (
              <div 
                key={index}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(index)}
                  className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {step.step || index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">Step {step.step || index + 1}</span>
                  </div>
                  {expandedSteps.has(index) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-200",
                  expandedSteps.has(index) ? "max-h-96 p-3" : "max-h-0"
                )}>
                  <div className="space-y-3">
                    {step.thought && (
                      <div className="flex items-start gap-2">
                        <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-primary uppercase">Thought</span>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {typeof step.thought === 'object' ? JSON.stringify(step.thought) : String(step.thought)}
                          </p>
                        </div>
                      </div>
                    )}
                    {step.observation && (
                      <div className="flex items-start gap-2">
                        <Eye className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-warning uppercase">Observation</span>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {typeof step.observation === 'object' ? JSON.stringify(step.observation) : String(step.observation)}
                          </p>
                        </div>
                      </div>
                    )}
                    {step.conclusion && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-success uppercase">Conclusion</span>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {typeof step.conclusion === 'object' ? JSON.stringify(step.conclusion) : String(step.conclusion)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-info" />
              Evidence Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evidence.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-info mt-0.5">•</span>
                  <span className="text-muted-foreground">
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors & Recommendations side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {riskFactors.length > 0 && (
          <Card className="border-danger/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-danger">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {riskFactors.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm p-2 bg-danger/10 rounded-lg">
                    <span className="text-danger shrink-0">⚠</span>
                    <span className="text-muted-foreground">
                      {typeof risk === 'object' ? JSON.stringify(risk) : String(risk)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {recommendations.length > 0 && (
          <Card className="border-success/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm p-2 bg-success/10 rounded-lg">
                    <span className="text-success shrink-0">✓</span>
                    <span className="text-muted-foreground">
                      {typeof rec === 'object' ? JSON.stringify(rec) : String(rec)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
