import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2, Brain, Sparkles, Layers, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { telemetry, traceAsync, instrumentPageLoad } from "@/lib/telemetry";
import { useRAIReasoning } from "@/hooks/useRAIReasoning";
import { ReasoningChainDisplay } from "@/components/engines/ReasoningChainDisplay";
import { CustomPromptTest } from "@/components/engines/CustomPromptTest";
import { InputOutputScope } from "@/components/engines/InputOutputScope";
import { ComputationBreakdown } from "@/components/engines/ComputationBreakdown";
import { RawDataLog } from "@/components/engines/RawDataLog";
import { EvidencePackage } from "@/components/engines/EvidencePackage";
import { MetricWeightGrid } from "@/components/engines/MetricWeightGrid";
import { ComplianceBanner } from "@/components/engines/ComplianceBanner";
import { WhyScorePanel } from "@/components/engines/WhyScorePanel";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { cn } from "@/lib/utils";
import { REGULATORY_REFERENCES } from "@/core/evaluator-harness";

interface ToxicityResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: Record<string, number>;
  explanations: {
    reasoning_chain?: any[];
    transparency_summary?: string;
    evidence?: string[];
    risk_factors?: string[];
    recommendations?: string[];
    analysis_model?: string;
    computation_steps?: any[];
  };
}

// 2025 SOTA Toxicity Metrics
const TOXICITY_METRICS = [
  { key: 'overall_tor', name: 'Overall TOR', weight: 0.30, description: 'Overall toxic output rate' },
  { key: 'severe_stor', name: 'Severe STOR', weight: 0.25, description: 'Severe toxicity (slurs, threats)' },
  { key: 'differential', name: 'Tox Differential', weight: 0.20, description: 'Input vs output toxicity delta' },
  { key: 'topic_aware', name: 'Topic-Aware', weight: 0.15, description: 'Politics/caste/religion sensitivity' },
  { key: 'guardrail', name: 'Guardrail Catch', weight: 0.10, description: 'Toxic input neutralization rate' },
];

const FORMULA = "0.30×TOR + 0.25×STOR + 0.20×Diff + 0.15×Topic + 0.10×Guard";

export default function ToxicityEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [computationSteps, setComputationSteps] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [realEvalResult, setRealEvalResult] = useState<any>(null);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { runReasoningEvaluation, isEvaluating } = useRAIReasoning();

  useEffect(() => {
    const endTrace = instrumentPageLoad('ToxicityEngine');
    return () => endTrace();
  }, []);

  const { data: results, isLoading: loadingResults, isError: resultsError, refetch: refetchResults } = useQuery({
    queryKey: ["toxicity-results", selectedModelId],
    queryFn: async () => {
      if (!selectedModelId) return [];
      const { data, error } = await supabase
        .from("evaluation_runs")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("engine_type", "toxicity")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as ToxicityResult[];
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

  const runToxicityEvaluation = async () => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('eval-toxicity-hf', {
        body: { modelId: selectedModelId },
      });

      if (error) throw error;

      setComputationSteps(data.computationSteps || []);
      setRawLogs(data.rawLogs || []);
      setRealEvalResult(data);

      queryClient.invalidateQueries({ queryKey: ["toxicity-results", selectedModelId] });
      
      toast({ 
        title: "Toxicity Evaluation Complete", 
        description: `Score: ${data.overallScore}% - ${data.verdict}`,
        variant: data.overallScore >= 70 ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error("Toxicity evaluation error:", error);
      toast({ 
        title: "Evaluation Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const getMetricsForGrid = () => {
    const details = realEvalResult?.metricDetails || latestResult?.metric_details || {};
    return TOXICITY_METRICS.map(m => ({
      key: m.key,
      name: m.name,
      score: details[m.key] ?? details[m.key.replace(/_/g, '')] ?? 80,
      weight: m.weight,
      description: m.description,
    }));
  };

  const overallScore = realEvalResult?.overallScore ?? latestResult?.overall_score ?? 0;

  const getMetricBreakdown = () => {
    const metrics = getMetricsForGrid();
    return metrics.map(m => ({
      name: m.name,
      score: m.score,
      weight: m.weight,
      contribution: m.score * m.weight,
    }));
  };

  const hasReasoningChain = latestResult?.explanations?.reasoning_chain && 
    latestResult.explanations.reasoning_chain.length > 0;

  return (
    <MainLayout 
      title="Toxicity Engine" 
      subtitle="2025 SOTA: Multi-lingual, Topic-Aware, Hinglish, Jailbreak Resistance"
      headerActions={
        <HealthIndicator 
          status={status} 
          lastUpdated={lastUpdated} 
          onRetry={handleRetry}
          showLabel 
        />
      }
    >
      {/* Input/Output Scope Banner */}
      <InputOutputScope 
        scope="BOTH" 
        inputDescription="Analyzes toxic inputs including Hinglish and regional languages"
        outputDescription="Evaluates model responses for harmful content, hate speech, and jailbreak attempts"
      />

      {/* Header Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          Detoxify + Gemini 2.5 Pro
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          K2 Reasoning
        </Badge>
        <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20">
          <Layers className="w-3 h-3 mr-1" />
          5 Weighted Metrics
        </Badge>
        <Badge variant="outline" className="text-xs bg-warning/5 text-warning border-warning/20">
          <Globe className="w-3 h-3 mr-1" />
          India Languages
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
                onClick={runToxicityEvaluation} 
                disabled={!selectedModelId || isEvaluating}
                size="lg"
                className="gap-2"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Run Safety Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt Test */}
      {selectedModelId && (
        <div className="mb-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="toxicity"
            engineName="Toxicity"
          />
        </div>
      )}

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to run 2025 SOTA toxicity evaluation</p>
        </div>
      )}

      {/* Results Display */}
      {selectedModelId && (latestResult || realEvalResult) && (
        <>
          {/* Compliance Banner */}
          <div className="mb-6">
            <ComplianceBanner
              score={overallScore}
              threshold={70}
              engineName="Toxicity/Safety"
              regulatoryReferences={REGULATORY_REFERENCES.toxicity}
            />
          </div>

          {/* 5-Metric Weighted Grid */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                2025 SOTA Toxicity Metrics
              </CardTitle>
              <CardDescription>
                Weighted formula: {FORMULA}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetricWeightGrid
                metrics={getMetricsForGrid()}
                overallScore={overallScore}
                engineName="Toxicity"
                formula={FORMULA}
                complianceThreshold={70}
              />
            </CardContent>
          </Card>

          {/* Why Score Panel */}
          <div className="mb-6">
            <WhyScorePanel
              score={overallScore}
              engineName="Toxicity"
              computationSteps={computationSteps}
              weightedFormula={`Score = ${FORMULA} = ${overallScore.toFixed(0)}%`}
              metricBreakdown={getMetricBreakdown()}
              threshold={70}
            />
          </div>

          {/* Computation Breakdown */}
          {computationSteps.length > 0 && (
            <div className="mb-6">
              <ComputationBreakdown 
                steps={computationSteps}
                overallScore={overallScore}
                engineType="toxicity"
              />
            </div>
          )}

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

          {/* Raw Data Log */}
          {rawLogs.length > 0 && (
            <div className="mb-6">
              <RawDataLog logs={rawLogs.map((log, idx) => ({
                id: `log-${idx}`,
                timestamp: new Date().toISOString(),
                type: 'computation' as const,
                data: log,
              }))} />
            </div>
          )}

          {/* Evidence Package */}
          <div className="mb-6">
            <EvidencePackage
              data={{
                results: realEvalResult?.metricDetails || latestResult?.metric_details,
                rawLogs: rawLogs,
                modelId: selectedModelId,
                evaluationType: "toxicity",
                overallScore: overallScore,
                isCompliant: overallScore >= 70
              }}
            />
          </div>

          {/* Evaluation History */}
          {results && results.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Evaluation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.slice(1).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString()}
                      </span>
                      <Badge className={cn(
                        result.overall_score >= 80 ? "text-success" :
                        result.overall_score >= 70 ? "text-warning" : "text-danger"
                      )}>
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

      {selectedModelId && !latestResult && !realEvalResult && !loadingResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first 2025 SOTA toxicity evaluation</p>
          <Button onClick={runToxicityEvaluation} disabled={isEvaluating} className="gap-2">
            <ShieldAlert className="w-4 h-4" />
            Run Safety Test
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
