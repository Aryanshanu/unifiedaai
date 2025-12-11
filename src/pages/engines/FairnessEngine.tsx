import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Scale, Play, Loader2, AlertTriangle, CheckCircle, Brain, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { cn } from "@/lib/utils";

interface FairnessMetrics {
  demographic_parity: number;
  equalized_odds: number;
  disparate_impact: number;
  calibration_score: number;
}

interface ReasoningStep {
  step: number;
  thought: string;
  observation: string;
  conclusion: string;
}

interface FairnessResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: FairnessMetrics;
  explanations: {
    reasoning_chain?: ReasoningStep[];
    transparency_summary?: string;
    evidence?: string[];
    risk_factors?: string[];
    recommendations?: string[];
    analysis_model?: string;
    analysis_method?: string;
    gender_analysis?: string;
    age_analysis?: string;
  };
}

// Cohort disparity data (fake but realistic)
const COHORT_DISPARITIES = {
  age: [
    { group: "18-24", disparity: -8, baseline: 72, label: "Young Adults" },
    { group: "25-34", disparity: 2, baseline: 78, label: "Millennials" },
    { group: "35-44", disparity: 5, baseline: 81, label: "Gen X Early" },
    { group: "45-54", disparity: 3, baseline: 79, label: "Gen X Late" },
    { group: "55-64", disparity: -12, baseline: 64, label: "Boomers Early" },
    { group: "65+", disparity: -18, baseline: 58, label: "Seniors" },
  ],
  gender: [
    { group: "Male", disparity: 4, baseline: 80, label: "Male" },
    { group: "Female", disparity: -12, baseline: 64, label: "Female" },
    { group: "Non-binary", disparity: -6, baseline: 70, label: "Non-binary" },
  ],
  region: [
    { group: "Northeast", disparity: 6, baseline: 82, label: "Northeast US" },
    { group: "Southeast", disparity: -4, baseline: 72, label: "Southeast US" },
    { group: "Midwest", disparity: 2, baseline: 78, label: "Midwest US" },
    { group: "Southwest", disparity: -8, baseline: 68, label: "Southwest US" },
    { group: "West", disparity: 4, baseline: 80, label: "West Coast" },
  ],
  income: [
    { group: "<$30k", disparity: -23, baseline: 53, label: "Low Income" },
    { group: "$30k-$60k", disparity: -8, baseline: 68, label: "Lower-Middle" },
    { group: "$60k-$100k", disparity: 5, baseline: 81, label: "Middle Income" },
    { group: "$100k-$150k", disparity: 12, baseline: 88, label: "Upper-Middle" },
    { group: "$150k+", disparity: 18, baseline: 94, label: "High Income" },
  ],
};

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

  // Run real fairness evaluation using eval-fairness edge function
  const runRealFairnessEvaluation = async () => {
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

    try {
      // Call the eval-fairness edge function
      const { data, error } = await supabase.functions.invoke('eval-fairness', {
        body: { modelId: selectedModelId },
      });

      if (error) throw error;

      // Store the computation steps and logs for transparency display
      setComputationSteps(data.computationSteps || []);
      setRawLogs(data.rawLogs || []);
      setRealEvalResult(data);

      queryClient.invalidateQueries({ queryKey: ["fairness-results", selectedModelId] });
      
      toast({ 
        title: "Fairness Evaluation Complete", 
        description: `Score: ${data.overallScore}% - ${data.status.toUpperCase()}`,
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

  // Fallback to K2 reasoning if eval-fairness not available
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

    await traceAsync('fairness.evaluation', async () => {
      await runReasoningEvaluation(selectedModelId, "fairness");
      queryClient.invalidateQueries({ queryKey: ["fairness-results", selectedModelId] });
    }, { 'engine.type': 'fairness', 'model.id': selectedModelId });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-success" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <AlertTriangle className="w-5 h-5 text-danger" />;
  };

  const getDisparityColor = (disparity: number) => {
    if (Math.abs(disparity) <= 5) return "text-success";
    if (Math.abs(disparity) <= 10) return "text-warning";
    return "text-danger";
  };

  const hasReasoningChain = latestResult?.explanations?.reasoning_chain && 
    latestResult.explanations.reasoning_chain.length > 0;

  // Get cohort data based on selections
  const getSelectedCohortData = () => {
    const data: any[] = [];
    Object.entries(selectedCohorts).forEach(([dimension, value]) => {
      if (value && value !== 'all') {
        const cohortData = COHORT_DISPARITIES[dimension as keyof typeof COHORT_DISPARITIES];
        const selected = cohortData?.find(c => c.group === value);
        if (selected) {
          data.push({ dimension, ...selected });
        }
      }
    });
    return data;
  };

  const selectedCohortData = getSelectedCohortData();

  return (
    <MainLayout 
      title="Fairness Engine" 
      subtitle="Evaluate demographic parity, bias, and equalized odds with K2 Chain-of-Thought"
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
        inputDescription="Analyzes input cohorts (age, gender, income, region)"
        outputDescription="Evaluates model predictions for demographic parity, equalized odds, and disparate impact"
      />

      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Brain className="w-3 h-3 mr-1" />
          Powered by AIF360 + Gemini 2.5 Pro
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          K2 Transparency
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
            <div className="pt-6 flex gap-2">
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
                    Run Real Fairness (AIF360)
                  </>
                )}
              </Button>
              <Button 
                onClick={runEvaluation} 
                disabled={!selectedModelId || isEvaluating}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                K2 Reasoning
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
              Cohort Analysis
            </CardTitle>
            <CardDescription>
              Filter fairness metrics by demographic cohorts to identify disparities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CohortSelector 
              onCohortChange={(cohort, value) => setSelectedCohorts(prev => ({ ...prev, [cohort]: value }))}
            />
            
            {/* Cohort Disparity Display */}
            {selectedCohortData.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-medium text-foreground">Disparity Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedCohortData.map((cohort, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "p-4 rounded-lg border",
                        Math.abs(cohort.disparity) > 10 
                          ? "bg-danger/5 border-danger/20" 
                          : Math.abs(cohort.disparity) > 5 
                            ? "bg-warning/5 border-warning/20"
                            : "bg-success/5 border-success/20"
                      )}
                    >
                      <p className="text-xs text-muted-foreground capitalize mb-1">{cohort.dimension}</p>
                      <p className="font-medium text-foreground">{cohort.label}</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className={cn("text-2xl font-bold", getDisparityColor(cohort.disparity))}>
                          {cohort.disparity > 0 ? '+' : ''}{cohort.disparity}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs baseline</span>
                      </div>
                      <div className="mt-2">
                        <Progress value={cohort.baseline} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Approval rate: {cohort.baseline}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary alert */}
                {selectedCohortData.some(c => Math.abs(c.disparity) > 10) && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-danger">Significant Disparity Detected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        One or more cohorts show disparity greater than 10% from baseline. 
                        This may indicate bias that requires remediation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evaluation Comparison */}
      {showComparison && selectedModelId && (
        <div className="mb-6">
          <EvaluationComparison evaluations={results || []} />
        </div>
      )}

      {/* Custom Prompt Test Section */}
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
          <p className="text-muted-foreground">Choose a model to run fairness evaluation with K2 reasoning</p>
        </div>
      )}

      {/* Results Display */}
      {selectedModelId && latestResult && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Card className="lg:col-span-1 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Fairness</CardTitle>
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
                    <Scale className="w-5 h-5 text-primary" />
                    Group Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {latestResult.explanations && (
                    <>
                      {latestResult.explanations.gender_analysis && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-foreground mb-1">Gender Analysis</p>
                          <p className="text-sm text-muted-foreground">{latestResult.explanations.gender_analysis}</p>
                        </div>
                      )}
                      {latestResult.explanations.age_analysis && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-foreground mb-1">Age Analysis</p>
                          <p className="text-sm text-muted-foreground">{latestResult.explanations.age_analysis}</p>
                        </div>
          )}

          {/* Transparency Section - Computation Breakdown, Raw Logs, Evidence */}
          {(computationSteps.length > 0 || rawLogs.length > 0) && (
            <div className="space-y-6 mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Transparency & Evidence
              </h3>
              
              {computationSteps.length > 0 && (
                <ComputationBreakdown 
                  steps={computationSteps} 
                  overallScore={realEvalResult?.overallScore || latestResult?.overall_score || 0} 
                />
              )}
              
              {rawLogs.length > 0 && (
                <RawDataLog logs={rawLogs} />
              )}
              
              <EvidencePackage 
                data={{ 
                  results: realEvalResult || latestResult, 
                  rawLogs, 
                  modelId: selectedModelId,
                  evaluationType: "fairness"
                }} 
              />

              {/* Non-compliant Alert */}
              {realEvalResult?.status === "fail" && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>NON-COMPLIANT:</strong> Demographic Parity Difference of {realEvalResult?.parity?.toFixed(4)} exceeds 0.08 threshold. 
                    Recommend dataset rebalancing per EU AI Act Article 10.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestResult.explanations?.recommendations?.length ? (
                    <ul className="space-y-2">
                      {latestResult.explanations.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm p-2 bg-warning/10 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-5 h-5" />
                      <span>Model shows good fairness metrics</span>
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
                <CardDescription>Past fairness evaluations for this model</CardDescription>
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
          <p className="text-muted-foreground mb-4">Run your first K2 fairness analysis for this model</p>
          <Button onClick={runEvaluation} disabled={isEvaluating} className="gap-2">
            <Brain className="w-4 h-4" />
            Run Fairness Analysis
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