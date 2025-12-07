import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Play, Loader2, CheckCircle, XCircle, Info, Brain, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { telemetry, traceAsync, instrumentPageLoad } from "@/lib/telemetry";
import { useRAIReasoning } from "@/hooks/useRAIReasoning";
import { ReasoningChainDisplay } from "@/components/engines/ReasoningChainDisplay";

interface HallucinationMetrics {
  factuality_score: number;
  groundedness_score: number;
  claim_verification: number;
  citation_accuracy: number;
}

interface ReasoningStep {
  step: number;
  thought: string;
  observation: string;
  conclusion: string;
}

interface HallucinationResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: HallucinationMetrics;
  explanations: {
    reasoning_chain?: ReasoningStep[];
    transparency_summary?: string;
    evidence?: string[];
    risk_factors?: string[];
    recommendations?: string[];
    analysis_model?: string;
    analysis_method?: string;
    detected_issues?: string[];
    verified_claims?: number;
    unverified_claims?: number;
  };
}

export default function HallucinationEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const { data: models } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { runReasoningEvaluation, isEvaluating } = useRAIReasoning();

  useEffect(() => {
    const endTrace = instrumentPageLoad('HallucinationEngine');
    return () => endTrace();
  }, []);

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ["hallucination-results", selectedModelId],
    queryFn: async () => {
      if (!selectedModelId) return [];
      const { data, error } = await supabase
        .from("evaluation_runs")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("engine_type", "hallucination")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as HallucinationResult[];
    },
    enabled: !!selectedModelId,
  });

  const latestResult = results?.[0];

  const runEvaluation = async () => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    const model = models?.find(m => m.id === selectedModelId);
    const endpoint = model?.huggingface_endpoint || model?.endpoint || (model as any)?.system?.endpoint;
    const apiToken = model?.huggingface_api_token || (model as any)?.system?.api_token_encrypted;

    if (!endpoint) {
      toast({ 
        title: "Model Configuration Missing", 
        description: "This model doesn't have an API endpoint configured.",
        variant: "destructive" 
      });
      return;
    }

    if (!apiToken) {
      toast({ 
        title: "API Token Missing", 
        description: "This model doesn't have an API token configured.",
        variant: "destructive" 
      });
      return;
    }

    await traceAsync('hallucination.evaluation', async () => {
      await runReasoningEvaluation(selectedModelId, "hallucination");
      queryClient.invalidateQueries({ queryKey: ["hallucination-results", selectedModelId] });
    }, { 'engine.type': 'hallucination', 'model.id': selectedModelId });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5 text-warning" />;
    return <XCircle className="w-5 h-5 text-danger" />;
  };

  const hasReasoningChain = latestResult?.explanations?.reasoning_chain && 
    latestResult.explanations.reasoning_chain.length > 0;

  return (
    <MainLayout 
      title="Hallucination Engine" 
      subtitle="Detect factuality issues, false claims, and groundedness with K2 Chain-of-Thought"
    >
      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          Powered by Gemini 2.5 Pro
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          K2 Deep Reasoning
        </Badge>
      </div>

      {/* Model Selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">Select Model</label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a registered model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.model_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-6">
              <Button 
                onClick={runEvaluation} 
                disabled={!selectedModelId || isEvaluating}
                size="lg"
                className="gap-2"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reasoning...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Run Factuality Check
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Model Selected */}
      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to detect hallucinations with K2 reasoning</p>
        </div>
      )}

      {/* Results Display */}
      {selectedModelId && latestResult && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Card className="lg:col-span-1 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Factuality Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {getScoreIcon(latestResult.overall_score)}
                  <span className={`text-4xl font-bold ${getScoreColor(latestResult.overall_score)}`}>
                    {latestResult.overall_score}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {latestResult.metric_details && Object.entries(latestResult.metric_details).map(([key, value]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <span className={`text-2xl font-bold ${getScoreColor(value as number)}`}>
                      {value}%
                    </span>
                    <Progress value={value as number} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reasoning Chain Display */}
          {hasReasoningChain && (
            <div className="mb-6">
              <ReasoningChainDisplay
                reasoningChain={latestResult.explanations.reasoning_chain!}
                transparencySummary={latestResult.explanations.transparency_summary || ""}
                evidence={latestResult.explanations.evidence}
                riskFactors={latestResult.explanations.risk_factors}
                recommendations={latestResult.explanations.recommendations}
                analysisModel={latestResult.explanations.analysis_model}
              />
            </div>
          )}

          {/* Legacy display */}
          {!hasReasoningChain && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-danger" />
                    Detected Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestResult.explanations?.detected_issues?.length ? (
                    <ul className="space-y-2">
                      {latestResult.explanations.detected_issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm p-2 bg-danger/10 rounded-lg">
                          <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-5 h-5" />
                      <span>No hallucinations detected</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Claim Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                    <span className="text-sm text-muted-foreground">Verified Claims</span>
                    <Badge variant="outline" className="text-success border-success">
                      {latestResult.explanations?.verified_claims || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-danger/10 rounded-lg">
                    <span className="text-sm text-muted-foreground">Unverified Claims</span>
                    <Badge variant="outline" className="text-danger border-danger">
                      {latestResult.explanations?.unverified_claims || 0}
                    </Badge>
                  </div>

                  {latestResult.explanations?.recommendations?.length ? (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium mb-2">Recommendations:</p>
                      <ul className="space-y-1">
                        {latestResult.explanations.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Evaluation History */}
          {results && results.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Evaluation History</CardTitle>
                <CardDescription>Past hallucination detection runs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.slice(1).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                        {result.explanations?.analysis_method && (
                          <Badge variant="outline" className="text-xs">
                            {result.explanations.analysis_method}
                          </Badge>
                        )}
                      </div>
                      <Badge className={getScoreColor(result.overall_score)}>
                        {result.overall_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No Results Yet */}
      {selectedModelId && !latestResult && !loadingResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first K2 factuality analysis for this model</p>
          <Button onClick={runEvaluation} disabled={isEvaluating} className="gap-2">
            <Brain className="w-4 h-4" />
            Run Factuality Check
          </Button>
        </div>
      )}

      {loadingResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading Results</h3>
        </div>
      )}
    </MainLayout>
  );
}
