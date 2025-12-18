import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Scale, Loader2, Brain, Sparkles, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { instrumentPageLoad } from "@/lib/telemetry";
import { CustomPromptTest } from "@/components/engines/CustomPromptTest";
import { InputOutputScope } from "@/components/engines/InputOutputScope";
import { ComputationBreakdown } from "@/components/engines/ComputationBreakdown";
import { RawDataLog } from "@/components/engines/RawDataLog";
import { EvidencePackage } from "@/components/engines/EvidencePackage";
import { MetricWeightGrid } from "@/components/engines/MetricWeightGrid";
import { WhyScorePanel } from "@/components/engines/WhyScorePanel";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { ComponentErrorBoundary } from "@/components/error/ErrorBoundary";
import { EngineSkeleton } from "@/components/engines/EngineSkeleton";
import { EngineLoadingStatus, EvalStatus } from "@/components/engines/EngineLoadingStatus";
import { EngineErrorCard } from "@/components/engines/EngineErrorCard";
import { NoEndpointWarning } from "@/components/engines/NoModelConnected";
import { EngineResultsLayout } from "@/components/engines/EngineResultsLayout";
import { EngineActionBar } from "@/components/engines/EngineActionBar";
import { sanitizeErrorMessage } from "@/lib/ui-helpers";
import { cn } from "@/lib/utils";
import { REGULATORY_REFERENCES } from "@/core/evaluator-harness";

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

const FAIRNESS_METRICS = [
  { key: 'demographic_parity', name: 'Demographic Parity', weight: 0.25, description: 'Selection rate equality across groups' },
  { key: 'equal_opportunity', name: 'Equal Opportunity', weight: 0.25, description: 'True positive rate equality' },
  { key: 'equalized_odds', name: 'Equalized Odds', weight: 0.25, description: 'TPR + FPR equality across groups' },
  { key: 'group_loss_ratio', name: 'Group Loss Ratio', weight: 0.15, description: 'Loss distribution across groups' },
  { key: 'bias_tag_rate', name: 'Bias Tag Rate', weight: 0.10, description: 'LLM-judged bias detection' },
];

const FORMULA = "0.25×DP + 0.25×EO + 0.25×EOdds + 0.15×GLR + 0.10×Bias";

function FairnessEngineContent() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [computationSteps, setComputationSteps] = useState<any[]>([]);
  const [realEvalResult, setRealEvalResult] = useState<any>(null);
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const selectedModel = models?.find(m => m.id === selectedModelId);
  const hasEndpoint = selectedModel?.huggingface_endpoint || selectedModel?.endpoint;
  const latestResult = results?.[0];
  const isLoading = modelsLoading || loadingResults;
  const { status, lastUpdated } = useDataHealth(isLoading, resultsError);

  const handleRetry = () => {
    setEvalError(null);
    refetchModels();
    if (selectedModelId) refetchResults();
  };

  const runRealFairnessEvaluation = async (isRetry = false) => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    setEvalStatus('sending');
    setEvalError(null);
    
    try {
      setEvalStatus('analyzing');
      const { data, error } = await supabase.functions.invoke('eval-fairness', {
        body: { modelId: selectedModelId },
      });

      if (error) throw error;

      setEvalStatus('computing');
      setComputationSteps(data.computationSteps || []);
      setRawLogs(data.rawLogs || []);
      setRealEvalResult(data);

      queryClient.invalidateQueries({ queryKey: ["fairness-results", selectedModelId] });
      
      setEvalStatus('complete');
      setRetryCount(0);
      
      toast({ 
        title: "Fairness Evaluation Complete", 
        description: `Score: ${data.overallScore}%`,
        variant: data.overallScore >= 70 ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error("Fairness evaluation error:", error);
      setEvalStatus('error');
      
      if (!isRetry && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast({ 
          title: "Temporary issue — retrying...", 
          description: `Attempt ${retryCount + 2} of 3`,
        });
        setTimeout(() => runRealFairnessEvaluation(true), 2000);
      } else {
        setEvalError(sanitizeErrorMessage(error.message) || "Evaluation failed. Please try again.");
        setRetryCount(0);
      }
    }
  };

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

  const getMetricBreakdown = () => {
    const metrics = getMetricsForGrid();
    return metrics.map(m => ({
      name: m.name,
      score: m.score,
      weight: m.weight,
      contribution: m.score * m.weight,
    }));
  };

  // Use ONLY real data from API - no hardcoded fallbacks
  const getSummaryBullets = () => {
    const bullets: Array<{ type: 'success' | 'warning' | 'error' | 'info'; text: string }> = [];
    
    // Get real risk factors from evaluation
    const riskFactors = latestResult?.explanations?.risk_factors || realEvalResult?.riskFactors || [];
    const evidence = latestResult?.explanations?.evidence || realEvalResult?.evidence || [];
    
    // Add real risk factors as warnings/errors
    riskFactors.forEach((factor: any) => {
      // Handle both string and object formats
      const text = typeof factor === 'string' ? factor : (factor?.text || factor?.description || JSON.stringify(factor));
      if (text) bullets.push({ type: 'warning', text });
    });
    
    // Add evidence as success items - handle object format {input, output, prediction, demographic}
    evidence.forEach((item: any) => {
      if (typeof item === 'string') {
        bullets.push({ type: 'success', text: item });
      } else if (item && typeof item === 'object') {
        // Format evidence object into readable text
        const text = item.text || item.description || 
          (item.input ? `Test: "${item.input}" → ${item.prediction || item.output || 'evaluated'}` : null);
        if (text) bullets.push({ type: 'success', text });
      }
    });
    
    return bullets;
  };

  const getKeyInsight = () => {
    // Use real transparency summary from API if available
    const realSummary = latestResult?.explanations?.transparency_summary || realEvalResult?.transparencySummary;
    if (realSummary) return realSummary;
    
    // Minimal fallback based on compliance status only
    return overallScore >= 70 ? "Evaluation complete - see detailed metrics" : "Review required - see detailed metrics";
  };

  const getRecommendations = () => {
    // Use ONLY real recommendations from API - no hardcoded fallbacks
    return latestResult?.explanations?.recommendations || realEvalResult?.recommendations || [];
  };

  if (modelsLoading) {
    return (
      <MainLayout title="Fairness Engine" subtitle="Loading...">
        <EngineSkeleton />
      </MainLayout>
    );
  }

  const hasResults = (latestResult || realEvalResult) && !evalError;

  return (
    <MainLayout 
      title="Fairness Engine" 
      subtitle="2025 SOTA: Demographic Parity, Equal Opportunity, Equalized Odds"
      headerActions={
        <HealthIndicator 
          status={status} 
          lastUpdated={lastUpdated} 
          onRetry={handleRetry}
          showLabel 
        />
      }
    >
      <InputOutputScope 
        scope="BOTH" 
        inputDescription="Analyzes model inputs for fairness indicators"
        outputDescription="Evaluates predictions for demographic parity and disparate impact"
      />

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
              {selectedModelId && !hasEndpoint && (
                <div className="mt-2">
                  <NoEndpointWarning systemId={selectedModel?.system_id} />
                </div>
              )}
            </div>
            <div className="pt-6">
              <Button 
                onClick={() => runRealFairnessEvaluation()} 
                disabled={!selectedModelId || (evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error')}
                size="lg"
                className="gap-2"
              >
                {evalStatus === 'sending' || evalStatus === 'analyzing' || evalStatus === 'computing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    Run Evaluation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Status */}
      {evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error' && (
        <div className="mb-6">
          <EngineLoadingStatus status={evalStatus} engineName="Fairness" />
        </div>
      )}

      {/* Error Card */}
      {evalError && (
        <div className="mb-6">
          <EngineErrorCard 
            type="connection"
            message={evalError}
            onRetry={() => runRealFairnessEvaluation()}
            isRetrying={evalStatus === 'sending'}
            systemId={selectedModel?.system_id}
          />
        </div>
      )}


      {/* Empty State */}
      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Scale className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to run fairness evaluation</p>
        </div>
      )}

      {/* Results - Professional Tabbed Layout */}
      {selectedModelId && hasResults && (
        <EngineResultsLayout
          score={overallScore}
          threshold={70}
          engineName="Fairness"
          keyInsight={getKeyInsight()}
          summaryBullets={getSummaryBullets()}
          recommendations={getRecommendations()}
          metricsContent={
            <div className="space-y-6">
              <MetricWeightGrid
                metrics={getMetricsForGrid()}
                overallScore={overallScore}
                engineName="Fairness"
                formula={FORMULA}
                complianceThreshold={70}
              />
              <WhyScorePanel
                score={overallScore}
                engineName="Fairness"
                computationSteps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
                weightedFormula={`Score = ${FORMULA} = ${overallScore.toFixed(0)}%`}
                metricBreakdown={getMetricBreakdown()}
                delta={0.1}
                threshold={70}
              />
              {(computationSteps.length > 0 || realEvalResult?.computationSteps) && (
                <ComputationBreakdown 
                  steps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
                  overallScore={overallScore}
                  engineType="fairness"
                />
              )}
            </div>
          }
          rawDataContent={
            <div className="space-y-4">
              {rawLogs.length > 0 ? (
                <RawDataLog logs={rawLogs.map((log, idx) => ({
                  id: `log-${idx}`,
                  timestamp: new Date().toISOString(),
                  type: 'computation' as const,
                  data: typeof log === 'object' ? log : { value: log },
                  metadata: log.demographic ? { demographic: String(log.demographic) } : undefined
                }))} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Raw data logs will appear here after running an evaluation</p>
                </div>
              )}
            </div>
          }
          evidenceContent={
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
          }
        />
      )}

      {/* Custom Prompt Test */}
      {selectedModelId && (
        <div className="mt-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="fairness"
            engineName="Fairness"
          />
        </div>
      )}

      {/* No Results Yet */}
      {selectedModelId && !latestResult && !realEvalResult && !loadingResults && !evalError && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first fairness evaluation</p>
          <Button onClick={() => runRealFairnessEvaluation()} disabled={evalStatus !== 'idle'} className="gap-2">
            <Scale className="w-4 h-4" />
            Run Evaluation
          </Button>
        </div>
      )}

      {loadingResults && <EngineSkeleton showMetrics={false} />}

      {/* Action Bar */}
      {selectedModelId && hasResults && (
        <div className="mt-6">
          <EngineActionBar
            onRetry={() => runRealFairnessEvaluation()}
            modelId={selectedModelId}
            systemId={selectedModel?.system_id}
            engineName="Fairness"
            score={overallScore}
            isRetrying={evalStatus === 'sending' || evalStatus === 'analyzing'}
          />
        </div>
      )}
    </MainLayout>
  );
}

export default function FairnessEngine() {
  return (
    <ComponentErrorBoundary>
      <FairnessEngineContent />
    </ComponentErrorBoundary>
  );
}
