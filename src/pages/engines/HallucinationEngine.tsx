import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Brain, Sparkles, Layers, FileCheck } from "lucide-react";
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

interface HallucinationResult {
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

const HALLUCINATION_METRICS = [
  { key: 'response_hr', name: 'Response HR', weight: 0.30, description: 'Response-level hallucination rate' },
  { key: 'claim_chf', name: 'Claim CHF', weight: 0.25, description: 'Claim-level hallucination fraction' },
  { key: 'faithfulness', name: 'Faithfulness', weight: 0.25, description: 'LLM-judged faithfulness to context' },
  { key: 'span_ratio', name: 'Span Ratio', weight: 0.10, description: 'Unsupported token span ratio' },
  { key: 'abstention', name: 'Abstention', weight: 0.10, description: 'Appropriate "I don\'t know" rate' },
];

const FORMULA = "0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain";

function HallucinationEngineContent() {
  const [searchParams] = useSearchParams();
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [computationSteps, setComputationSteps] = useState<any[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [realEvalResult, setRealEvalResult] = useState<any>(null);
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasAutoRun = useRef(false);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Autorun support for Golden Demo
  const autorunModelId = searchParams.get('modelId');
  const shouldAutorun = searchParams.get('autorun') === '1';

  useEffect(() => {
    const endTrace = instrumentPageLoad('HallucinationEngine');
    return () => endTrace();
  }, []);

  // Autorun effect - trigger evaluation when navigated from Golden Demo
  useEffect(() => {
    if (autorunModelId && shouldAutorun && !hasAutoRun.current && models && models.length > 0) {
      const modelExists = models.some(m => m.id === autorunModelId);
      if (modelExists) {
        hasAutoRun.current = true;
        setSelectedModelId(autorunModelId);
        setTimeout(() => {
          runHallucinationEvaluation();
        }, 500);
      }
    }
  }, [autorunModelId, shouldAutorun, models]);

  const { data: results, isLoading: loadingResults, isError: resultsError, refetch: refetchResults } = useQuery({
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

  const runHallucinationEvaluation = async (isRetry = false) => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    setEvalStatus('sending');
    setEvalError(null);

    try {
      setEvalStatus('analyzing');
      const { data, error } = await supabase.functions.invoke('eval-hallucination-hf', {
        body: { modelId: selectedModelId },
      });

      if (error) throw error;

      setEvalStatus('computing');
      setComputationSteps(data.computationSteps || []);
      setRawLogs(data.rawLogs || []);
      setRealEvalResult(data);

      queryClient.invalidateQueries({ queryKey: ["hallucination-results", selectedModelId] });
      
      setEvalStatus('complete');
      setRetryCount(0);
      
      toast({ 
        title: "Hallucination Evaluation Complete", 
        description: `Score: ${data.overallScore}% - ${data.verdict}`,
        variant: data.overallScore >= 70 ? "default" : "destructive"
      });
    } catch (error: any) {
      console.error("Hallucination evaluation error:", error);
      setEvalStatus('error');
      
      if (!isRetry && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast({ 
          title: "Temporary issue — retrying...", 
          description: `Attempt ${retryCount + 2} of 3`,
        });
        setTimeout(() => runHallucinationEvaluation(true), 2000);
      } else {
        setEvalError(sanitizeErrorMessage(error.message) || "Evaluation failed. Please try again.");
        setRetryCount(0);
      }
    }
  };

  // Use ONLY real data - no hardcoded fallbacks
  const getMetricsForGrid = () => {
    const details = realEvalResult?.metricDetails || latestResult?.metric_details || {};
    return HALLUCINATION_METRICS.map(m => ({
      key: m.key,
      name: m.name,
      score: details[m.key] ?? details[m.key.replace(/_/g, '')] ?? null,
      weight: m.weight,
      description: m.description,
    }));
  };

  const overallScore = realEvalResult?.overallScore ?? latestResult?.overall_score ?? 0;

  const getMetricBreakdown = () => {
    const metrics = getMetricsForGrid();
    return metrics.filter(m => m.score !== null).map(m => ({
      name: m.name,
      score: m.score!,
      weight: m.weight,
      contribution: m.score! * m.weight,
    }));
  };

  // Use ONLY real data from API - no hardcoded fallbacks
  const getSummaryBullets = () => {
    const bullets: Array<{ type: 'success' | 'warning' | 'error' | 'info'; text: string }> = [];
    
    const riskFactors = latestResult?.explanations?.risk_factors || realEvalResult?.riskFactors || [];
    const evidence = latestResult?.explanations?.evidence || realEvalResult?.evidence || [];
    
    riskFactors.forEach((factor: any) => {
      const text = typeof factor === 'string' ? factor : (factor?.text || factor?.description || JSON.stringify(factor));
      if (text) bullets.push({ type: 'warning', text });
    });
    
    evidence.forEach((item: any) => {
      if (typeof item === 'string') {
        bullets.push({ type: 'success', text: item });
      } else if (item && typeof item === 'object') {
        const text = item.text || item.description || 
          (item.input ? `Test: "${item.input}" → ${item.prediction || item.output || 'evaluated'}` : null);
        if (text) bullets.push({ type: 'success', text });
      }
    });
    
    return bullets;
  };

  const getKeyInsight = () => {
    const realSummary = latestResult?.explanations?.transparency_summary || realEvalResult?.transparencySummary;
    if (realSummary) return realSummary;
    return overallScore >= 70 ? "Evaluation complete - see detailed metrics" : "Review required - see detailed metrics";
  };

  const getRecommendations = () => {
    return latestResult?.explanations?.recommendations || realEvalResult?.recommendations || [];
  };

  if (modelsLoading) {
    return (
      <MainLayout title="Hallucination Engine" subtitle="Loading...">
        <EngineSkeleton />
      </MainLayout>
    );
  }

  const hasResults = (latestResult || realEvalResult) && !evalError;

  return (
    <MainLayout 
      title="Hallucination Engine" 
      subtitle="2025 SOTA: Claim-Level Verification, Faithfulness, Domain Packs (Clinical/Legal/Finance)"
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
        inputDescription="Provides grounding context for fact-checking"
        outputDescription="Extracts and verifies individual claims against ground truth"
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          Vectara + Gemini 2.5 Pro
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          K2 Reasoning
        </Badge>
        <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20">
          <Layers className="w-3 h-3 mr-1" />
          5 Weighted Metrics
        </Badge>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
          <FileCheck className="w-3 h-3 mr-1" />
          Claim-Level
        </Badge>
      </div>

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
                onClick={() => runHallucinationEvaluation()} 
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
                    <AlertCircle className="w-4 h-4" />
                    Run Factuality Check
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error' && (
        <div className="mb-6">
          <EngineLoadingStatus status={evalStatus} engineName="Hallucination" />
        </div>
      )}

      {evalError && (
        <div className="mb-6">
          <EngineErrorCard 
            type="connection"
            message={evalError}
            onRetry={() => runHallucinationEvaluation()}
            isRetrying={evalStatus === 'sending'}
            systemId={selectedModel?.system_id}
          />
        </div>
      )}

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to run 2025 SOTA hallucination detection</p>
        </div>
      )}

      {selectedModelId && hasResults && (
        <EngineResultsLayout
          score={overallScore}
          threshold={70}
          engineName="Hallucination"
          keyInsight={getKeyInsight()}
          summaryBullets={getSummaryBullets()}
          recommendations={getRecommendations()}
          metricsContent={
            <div className="space-y-6">
              <MetricWeightGrid
                metrics={getMetricsForGrid().filter(m => m.score !== null)}
                overallScore={overallScore}
                engineName="Hallucination"
                formula={FORMULA}
                complianceThreshold={70}
              />
              <WhyScorePanel
                score={overallScore}
                engineName="Hallucination"
                computationSteps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
                weightedFormula={`Score = ${FORMULA} = ${overallScore.toFixed(0)}%`}
                metricBreakdown={getMetricBreakdown()}
                threshold={70}
              />
              {(computationSteps.length > 0 || realEvalResult?.computationSteps) && (
                <ComputationBreakdown 
                  steps={computationSteps.length > 0 ? computationSteps : realEvalResult?.computationSteps || []}
                  overallScore={overallScore}
                  engineType="hallucination"
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
                evaluationType: "hallucination",
                overallScore: overallScore,
                isCompliant: overallScore >= 70
              }}
            />
          }
        />
      )}

      {selectedModelId && (
        <div className="mt-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="hallucination"
            engineName="Hallucination"
          />
        </div>
      )}

      {selectedModelId && !latestResult && !realEvalResult && !loadingResults && !evalError && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first 2025 SOTA hallucination detection</p>
          <Button onClick={() => runHallucinationEvaluation()} disabled={evalStatus !== 'idle'} className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Run Factuality Check
          </Button>
        </div>
      )}

      {loadingResults && <EngineSkeleton showMetrics={false} />}

      {selectedModelId && hasResults && (
        <div className="mt-6">
          <EngineActionBar
            onRetry={() => runHallucinationEvaluation()}
            modelId={selectedModelId}
            systemId={selectedModel?.system_id}
            engineName="Hallucination"
            score={overallScore}
            isRetrying={evalStatus === 'sending' || evalStatus === 'analyzing'}
          />
        </div>
      )}
    </MainLayout>
  );
}

export default function HallucinationEngine() {
  return (
    <ComponentErrorBoundary>
      <HallucinationEngineContent />
    </ComponentErrorBoundary>
  );
}