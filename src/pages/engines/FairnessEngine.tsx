import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Scale, Loader2, AlertTriangle, CheckCircle, Brain, Sparkles, Users, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { telemetry, traceAsync, instrumentPageLoad } from "@/lib/telemetry";
import { useRAIReasoning } from "@/hooks/useRAIReasoning";
import { ReasoningChainDisplay } from "@/components/engines/ReasoningChainDisplay";
import { CustomPromptTest } from "@/components/engines/CustomPromptTest";
import { CohortSelector } from "@/components/engines/CohortSelector";
import { EvaluationComparison } from "@/components/engines/EvaluationComparison";
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
import { ENGINE_WEIGHTS, REGULATORY_REFERENCES } from "@/core/evaluator-harness";

interface FairnessResult {
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

// 2025 SOTA Fairness Metrics
const FAIRNESS_METRICS = [
  { key: 'demographic_parity', name: 'Demographic Parity', weight: 0.25, description: 'Selection rate equality across groups' },
  { key: 'equal_opportunity', name: 'Equal Opportunity', weight: 0.25, description: 'True positive rate equality' },
  { key: 'equalized_odds', name: 'Equalized Odds', weight: 0.25, description: 'TPR + FPR equality across groups' },
  { key: 'group_loss_ratio', name: 'Group Loss Ratio', weight: 0.15, description: 'Loss distribution across groups' },
  { key: 'bias_tag_rate', name: 'Bias Tag Rate', weight: 0.10, description: 'LLM-judged bias detection' },
];

const FORMULA = "0.25×DP + 0.25×EO + 0.25×EOdds + 0.15×GLR + 0.10×Bias";

export default function FairnessEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedCohorts, setSelectedCohorts] = useState<Record<string, string>>({});
  const [showComparison, setShowComparison] = useState(false);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [computationSteps, setComputationSteps] = useState<any[]>([]);
  const [realEvalResult, setRealEvalResult] = useState<any>(null);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { runReasoningEvaluation, isEvaluating } = useRAIReasoning();

  useEffect(() => {
    const endTrace = instrumentPageLoad('FairnessEngine');
    return () => endTrace();
  }, []);

  const { data: results, isLoading: loadingResults, isError: resultsError, refetch: refetchResults } = useQuery({
    queryKey: ["fairness-results", selectedModelId],
    queryFn: async () => {
      if (!selectedModelId) return [];
      const { data, error } = await supabase
        .from("evaluation_runs")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("engine_type", "fairness")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as unknown as FairnessResult[];
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

  const runRealFairnessEvaluation = async () => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('eval-fairness', {
        body: { modelId: selectedModelId },
      });

      if (error) throw error;

      setComputationSteps(data.computationSteps || []);
      setRawLogs(data.rawLogs || []);
      setRealEvalResult(data);

      queryClient.invalidateQueries({ queryKey: ["fairness-results", selectedModelId] });
      
      toast({ 
        title: "Fairness Evaluation Complete", 
        description: `Score: ${data.overallScore}% - ${data.status?.toUpperCase() || 'DONE'}`,
        variant: data.status === "pass" ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error("Fairness evaluation error:", error);
      toast({ 
        title: "Evaluation Failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  // Build metrics for grid display
  const getMetricsForGrid = () => {
    const details = realEvalResult?.metricDetails || latestResult?.metric_details || {};
    return FAIRNESS_METRICS.map(m => ({
      key: m.key,
      name: m.name,
      score: details[m.key] ?? details[m.key.replace(/_/g, '')] ?? 75,
      weight: m.weight,
      description: m.description,
    }));
  };

  const overallScore = realEvalResult?.overallScore ?? latestResult?.overall_score ?? 0;

  // Build computation breakdown for WhyScorePanel
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
      title="Fairness Engine" 
      subtitle="2025 SOTA: Demographic Parity, Equal Opportunity, Equalized Odds, GLR, Bias Detection"
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
        inputDescription="Analyzes input cohorts (age, gender, income, region, intersectional)"
        outputDescription="Evaluates predictions for demographic parity, equalized odds, and disparate impact"
      />

      {/* Header Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          AIF360 + Gemini 2.5 Pro
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          K2 Transparency
        </Badge>
        <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20">
          <Layers className="w-3 h-3 mr-1" />
          5 Weighted Metrics
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-auto"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? "Hide Comparison" : "Compare Evaluations"}
        </Button>
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
                onClick={runRealFairnessEvaluation} 
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
                    <Scale className="w-4 h-4" />
                    Run Fairness Evaluation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Selector */}
      {selectedModelId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              Cohort Analysis (Intersectional)
            </CardTitle>
            <CardDescription>
              Filter by demographics including India-specific packs (rural, caste, income)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CohortSelector 
              onCohortChange={(cohort, value) => setSelectedCohorts(prev => ({ ...prev, [cohort]: value }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Comparison View */}
      {showComparison && selectedModelId && (
        <div className="mb-6">
          <EvaluationComparison evaluations={results || []} />
        </div>
      )}

      {/* Custom Prompt Test */}
      {selectedModelId && (
        <div className="mb-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="fairness"
            engineName="Fairness"
          />
        </div>
      )}

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Scale className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to run 2025 SOTA fairness evaluation</p>
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
              engineName="Fairness"
              regulatoryReferences={REGULATORY_REFERENCES.fairness}
            />
          </div>

          {/* 5-Metric Weighted Grid */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                2025 SOTA Fairness Metrics
              </CardTitle>
              <CardDescription>
                Weighted formula: {FORMULA}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetricWeightGrid
                metrics={getMetricsForGrid()}
                overallScore={overallScore}
                engineName="Fairness"
                formula={FORMULA}
                complianceThreshold={70}
              />
            </CardContent>
          </Card>

          {/* Why Score Panel */}
          <div className="mb-6">
            <WhyScorePanel
              score={overallScore}
              engineName="Fairness"
              computationSteps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
              weightedFormula={`Score = ${FORMULA} = ${overallScore.toFixed(0)}%`}
              metricBreakdown={getMetricBreakdown()}
              delta={0.1}
              threshold={70}
            />
          </div>

          {/* Computation Breakdown */}
          {(computationSteps.length > 0 || realEvalResult?.computationSteps) && (
            <div className="mb-6">
              <ComputationBreakdown 
                steps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
                overallScore={overallScore}
                engineType="fairness"
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
              <RawDataLog logs={rawLogs} />
            </div>
          )}

          {/* Evidence Package */}
          <div className="mb-6">
            <EvidencePackage
              data={{
                results: realEvalResult?.metricDetails || latestResult?.metric_details,
                rawLogs: rawLogs,
                modelId: selectedModelId,
                evaluationType: "fairness",
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
                <CardDescription>Past fairness evaluations</CardDescription>
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
          <p className="text-muted-foreground mb-4">Run your first 2025 SOTA fairness evaluation</p>
          <Button onClick={runRealFairnessEvaluation} disabled={isEvaluating} className="gap-2">
            <Scale className="w-4 h-4" />
            Run Fairness Evaluation
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
