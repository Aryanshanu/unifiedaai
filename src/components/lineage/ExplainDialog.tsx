import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  GitBranch
} from "lucide-react";

interface ExplainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: {
    question?: string;
    explanation?: string;
    graph_context?: {
      relevant_nodes?: Array<{ id: string; label: string; entity_type: string }>;
      relevant_edges?: Array<{ relationship_type: string; evidence?: any }>;
      path_summary?: string;
    };
    compliance_status?: string;
    risk_factors?: string[];
    recommendations?: string[];
  } | null;
  isLoading?: boolean;
  nodeName?: string;
}

export function ExplainDialog({
  open,
  onOpenChange,
  explanation,
  isLoading,
  nodeName,
}: ExplainDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Explanation: {nodeName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/30 rounded-full animate-pulse" />
                <Brain className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Analyzing knowledge graph relationships...
              </p>
            </div>
          ) : explanation ? (
            <div className="space-y-4 p-1">
              {/* Question */}
              {explanation.question && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Question</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {explanation.question}
                  </p>
                </div>
              )}

              {/* Compliance Status */}
              {explanation.compliance_status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Compliance:</span>
                  <Badge
                    variant={
                      explanation.compliance_status === 'compliant'
                        ? 'default'
                        : explanation.compliance_status === 'non_compliant'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="gap-1"
                  >
                    {explanation.compliance_status === 'compliant' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {explanation.compliance_status}
                  </Badge>
                </div>
              )}

              {/* Explanation */}
              {explanation.explanation && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Explanation</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {explanation.explanation}
                  </p>
                </div>
              )}

              <Separator />

              {/* Graph Context */}
              {explanation.graph_context && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <GitBranch className="w-4 h-4" />
                    Graph Context
                  </h4>

                  {explanation.graph_context.path_summary && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {explanation.graph_context.path_summary}
                    </p>
                  )}

                  {explanation.graph_context.relevant_nodes &&
                    explanation.graph_context.relevant_nodes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {explanation.graph_context.relevant_nodes.map((node, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {node.label} ({node.entity_type})
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Risk Factors */}
              {explanation.risk_factors && explanation.risk_factors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Risk Factors
                  </h4>
                  <ul className="space-y-1">
                    {explanation.risk_factors.map((factor, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-warning">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {explanation.recommendations && explanation.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Lightbulb className="w-4 h-4 text-success" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {explanation.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-success">{i + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 opacity-30 mb-4" />
              <p>No explanation available</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
