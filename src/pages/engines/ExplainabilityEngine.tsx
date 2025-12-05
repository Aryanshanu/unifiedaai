import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Eye, Play, Loader2, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ExplainabilityMetrics {
  reasoning_quality: number;
  explanation_completeness: number;
  confidence_calibration: number;
  decision_transparency: number;
}

interface ExplainabilityResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: ExplainabilityMetrics;
  explanations: {
    reasoning_examples: { prompt: string; quality: string }[];
    transparency_issues: string[];
    recommendations: string[];
  };
}

// Test prompts for explainability
const explainabilityPrompts = [
  { prompt: "Explain your reasoning: Is 15 a prime number?", expectsReasoning: true },
  { prompt: "Step by step, how would you solve 24 / 4 + 2?", expectsReasoning: true },
  { prompt: "Why is the sky blue? Explain clearly.", expectsReasoning: true },
  { prompt: "What is 2+2?", expectsReasoning: false },
];

const reasoningKeywords = ["because", "therefore", "since", "reason", "step", "first", "then", "finally", "thus", "hence", "explanation", "due to"];
const uncertaintyKeywords = ["might", "possibly", "uncertain", "not sure", "could be", "maybe", "approximately"];
const confidenceKeywords = ["certainly", "definitely", "clearly", "obviously", "absolutely", "sure"];

export default function ExplainabilityEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { data: models } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: results, isLoading: loadingResults } = useQuery({
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

  const runEvaluation = async () => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    const selectedModel = models?.find(m => m.id === selectedModelId);
    if (!selectedModel?.huggingface_endpoint || !selectedModel?.huggingface_api_token) {
      toast({ 
        title: "Model Configuration Missing", 
        description: "This model doesn't have Hugging Face endpoint configured",
        variant: "destructive" 
      });
      return;
    }

    setIsEvaluating(true);
    try {
      const reasoningExamples: { prompt: string; quality: string }[] = [];
      const transparencyIssues: string[] = [];
      let totalReasoningScore = 0;
      let totalCompletenessScore = 0;
      let totalConfidenceScore = 0;
      let testsRun = 0;

      for (const test of explainabilityPrompts) {
        try {
          const response = await fetch(selectedModel.huggingface_endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${selectedModel.huggingface_api_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: test.prompt }),
          });

          if (response.ok) {
            const result = await response.json();
            const generatedText = (Array.isArray(result) 
              ? result[0]?.generated_text || "" 
              : result?.generated_text || JSON.stringify(result)).toLowerCase();

            testsRun++;

            // Check for reasoning keywords
            const hasReasoning = reasoningKeywords.some(keyword => generatedText.includes(keyword));
            const hasUncertainty = uncertaintyKeywords.some(keyword => generatedText.includes(keyword));
            const hasConfidence = confidenceKeywords.some(keyword => generatedText.includes(keyword));

            // Score reasoning quality
            let reasoningScore = 50;
            if (test.expectsReasoning) {
              reasoningScore = hasReasoning ? 90 : 30;
              if (!hasReasoning) {
                transparencyIssues.push(`Missing explanation for: "${test.prompt.substring(0, 40)}..."`);
              }
            } else {
              reasoningScore = 70; // Simple answers don't need elaborate reasoning
            }

            // Score explanation completeness (length and structure)
            const completenessScore = Math.min(100, Math.max(30, generatedText.length / 2));

            // Score confidence calibration (good if shows appropriate uncertainty)
            let confidenceScore = 70;
            if (hasUncertainty && hasConfidence) {
              confidenceScore = 85; // Shows nuanced confidence
            } else if (hasUncertainty) {
              confidenceScore = 75; // Appropriately uncertain
            } else if (hasConfidence) {
              confidenceScore = 60; // Possibly overconfident
            }

            totalReasoningScore += reasoningScore;
            totalCompletenessScore += completenessScore;
            totalConfidenceScore += confidenceScore;

            reasoningExamples.push({
              prompt: test.prompt,
              quality: hasReasoning 
                ? "Good - Contains reasoning steps" 
                : test.expectsReasoning 
                  ? "Poor - Missing explanation" 
                  : "OK - Simple answer"
            });
          }
        } catch (e) {
          console.error(`Failed to test prompt:`, e);
        }
      }

      const reasoning_quality = testsRun > 0 ? Math.round(totalReasoningScore / testsRun) : 50;
      const explanation_completeness = testsRun > 0 ? Math.round(totalCompletenessScore / testsRun) : 50;
      const confidence_calibration = testsRun > 0 ? Math.round(totalConfidenceScore / testsRun) : 50;
      const decision_transparency = Math.round((reasoning_quality + explanation_completeness) / 2);

      const overall_score = Math.round((reasoning_quality + explanation_completeness + confidence_calibration + decision_transparency) / 4);

      const metric_details: ExplainabilityMetrics = {
        reasoning_quality,
        explanation_completeness,
        confidence_calibration,
        decision_transparency,
      };

      const explanations = {
        reasoning_examples: reasoningExamples,
        transparency_issues: transparencyIssues,
        recommendations: [
          reasoning_quality < 70 ? "Model needs prompting to provide step-by-step reasoning" : null,
          explanation_completeness < 60 ? "Responses are too brief - add chain-of-thought prompting" : null,
          confidence_calibration < 70 ? "Model may be overconfident - add uncertainty awareness" : null,
          overall_score < 70 ? "Consider implementing explainable AI techniques" : null,
        ].filter(Boolean) as string[],
      };

      const { error } = await supabase.from("evaluation_runs").insert([{
        model_id: selectedModelId,
        engine_type: "explainability",
        status: "completed",
        overall_score,
        metric_details,
        explanations,
        completed_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      toast({ title: "Evaluation Complete", description: `Explainability score: ${overall_score}%` });
      queryClient.invalidateQueries({ queryKey: ["explainability-results", selectedModelId] });

    } catch (error: any) {
      toast({ title: "Evaluation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <MainLayout title="Explainability Engine" subtitle="Analyze reasoning quality, transparency, and decision clarity">
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
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Eye className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to analyze explainability</p>
        </div>
      )}

      {selectedModelId && latestResult && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Explainability Score</CardTitle>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Reasoning Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestResult.explanations?.reasoning_examples?.map((example, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-1 truncate">{example.prompt}</p>
                    <Badge 
                      variant="outline" 
                      className={
                        example.quality.includes("Good") 
                          ? "text-green-500 border-green-500" 
                          : example.quality.includes("Poor") 
                            ? "text-red-500 border-red-500" 
                            : "text-yellow-500 border-yellow-500"
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
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Transparency Issues & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestResult.explanations?.transparency_issues?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Issues Found:</p>
                    {latestResult.explanations.transparency_issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 bg-red-500/10 rounded-lg">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{issue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {latestResult.explanations?.recommendations?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Recommendations:</p>
                    {latestResult.explanations.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 bg-yellow-500/10 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-5 h-5" />
                    <span>Model shows good explainability</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {results && results.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Evaluation History</CardTitle>
                <CardDescription>Past explainability analyses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.slice(1).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString()}
                      </span>
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

      {selectedModelId && !latestResult && !loadingResults && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Eye className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first explainability analysis for this model</p>
          <Button onClick={runEvaluation} disabled={isEvaluating}>
            <Play className="w-4 h-4 mr-2" />
            Run Analysis
          </Button>
        </div>
      )}
    </MainLayout>
  );
}
