import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Eye, Play, Loader2, CheckCircle, XCircle, AlertTriangle, Brain, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { telemetry, traceAsync, instrumentPageLoad } from "@/lib/telemetry";
import { useRAIReasoning } from "@/hooks/useRAIReasoning";
import { ReasoningChainDisplay } from "@/components/engines/ReasoningChainDisplay";
import { CustomPromptTest } from "@/components/engines/CustomPromptTest";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";

interface ExplainabilityMetrics {
  reasoning_quality: number;
  explanation_completeness: number;
  confidence_calibration: number;
  decision_transparency: number;
}

interface ReasoningStep {
  step: number;
  thought: string;
  observation: string;
  conclusion: string;
}

interface ExplainabilityResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: ExplainabilityMetrics;
  explanations: {
    reasoning_chain?: ReasoningStep[];
    transparency_summary?: string;
    evidence?: string[];
    risk_factors?: string[];
    recommendations?: string[];
    analysis_model?: string;
    analysis_method?: string;
    reasoning_examples?: { prompt: string; quality: string }[];
    transparency_issues?: string[];
  };
}

export default function ExplainabilityEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { runReasoningEvaluation, isEvaluating } = useRAIReasoning();

  useEffect(() => {
    const endTrace = instrumentPageLoad('ExplainabilityEngine');
    return () => endTrace();
  }, []);

  const { data: results, isLoading: loadingResults, isError: resultsError, refetch: refetchResults } = useQuery({
    queryKey: ["explainability-results", selectedModelId],
    queryFn: async () => {
      if (!selectedModelId) return [];
      const { data, error } = await supabase
        .from("evaluation_runs")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("engine_type", "explainability")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as ExplainabilityResult[];
    },
    enabled: !!selectedModelId,
  });

  const latestResult = results?.[0];
  
  const isLoading = modelsLoading || loadingResults;
  const { status, lastUpdated } = useDataHealth(isLoading, resultsError);
  
  const handleRetry = () => {
    refetchModels();
    if (selectedModelId) refetchResults();
  };

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

    await traceAsync('explainability.evaluation', async () => {
      await runReasoningEvaluation(selectedModelId, "explainability");
      queryClient.invalidateQueries({ queryKey: ["explainability-results", selectedModelId] });
    }, { 'engine.type': 'explainability', 'model.id': selectedModelId });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <XCircle className="w-5 h-5 text-danger" />;
  };

  const hasReasoningChain = latestResult?.explanations?.reasoning_chain && 
    latestResult.explanations.reasoning_chain.length > 0;

  return (
    <MainLayout 
      title="Explainability Engine" 
      subtitle="Analyze reasoning quality, transparency, and decision clarity with K2 Chain-of-Thought"
      headerActions={
        <HealthIndicator 
          status={status} 
          lastUpdated={lastUpdated} 
          onRetry={handleRetry}
          showLabel 
        />
      }
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
                    Run Deep Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt Test Section */}
      {selectedModelId && (
        <div className="mb-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="explainability"
            engineName="Explainability"
          />
        </div>
      )}

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Eye className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to analyze explainability with K2 reasoning</p>
        </div>
      )}

      {/* Results Display */}
      {selectedModelId && latestResult && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Card className="lg:col-span-1 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
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

          {/* Reasoning Chain Display - New Transparency Feature */}
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

          {/* Legacy display for old results without reasoning chain */}
          {!hasReasoningChain && latestResult.explanations?.reasoning_examples && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Reasoning Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestResult.explanations.reasoning_examples.map((example, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1 truncate">{example.prompt}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          example.quality.includes("Good") 
                            ? "text-success border-success" 
                            : example.quality.includes("Poor") 
                              ? "text-danger border-danger" 
                              : "text-warning border-warning"
                        }
                      >
                        {example.quality}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Issues & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {latestResult.explanations?.transparency_issues?.length ? (
                    <div className="space-y-2">
                      {latestResult.explanations.transparency_issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 bg-danger/10 rounded-lg">
                          <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{issue}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {latestResult.explanations?.recommendations?.length ? (
                    <div className="space-y-2">
                      {latestResult.explanations.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 bg-warning/10 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{rec}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-5 h-5" />
                      <span>Model shows good explainability</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Evaluation History */}
          {results && results.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Evaluation History</CardTitle>
                <CardDescription>Past explainability evaluations for this model</CardDescription>
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
          <p className="text-muted-foreground mb-4">Run your first K2 deep reasoning analysis for this model</p>
          <Button onClick={runEvaluation} disabled={isEvaluating} className="gap-2">
            <Brain className="w-4 h-4" />
            Run Deep Analysis
          </Button>
        </div>
      )}

      {/* Loading State */}
      {selectedModelId && loadingResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading Results</h3>
        </div>
      )}
    </MainLayout>
  );
}
