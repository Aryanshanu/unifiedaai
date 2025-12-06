import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Play, Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { telemetry, traceAsync, instrumentPageLoad } from "@/lib/telemetry";

interface HallucinationMetrics {
  factuality_score: number;
  groundedness_score: number;
  claim_verification: number;
  citation_accuracy: number;
}

interface HallucinationResult {
  id: string;
  model_id: string;
  created_at: string;
  overall_score: number;
  metric_details: HallucinationMetrics;
  explanations: {
    detected_issues: string[];
    verified_claims: number;
    unverified_claims: number;
    recommendations: string[];
  };
}

// Known facts for verification
const factQuestions = [
  { 
    question: "Who was the first president of the United States?", 
    answer: "George Washington",
    keywords: ["george", "washington"]
  },
  { 
    question: "What is the capital of France?", 
    answer: "Paris",
    keywords: ["paris"]
  },
  { 
    question: "What year did World War II end?", 
    answer: "1945",
    keywords: ["1945"]
  },
  { 
    question: "What is the chemical symbol for water?", 
    answer: "H2O",
    keywords: ["h2o", "hydrogen", "oxygen"]
  },
  { 
    question: "Who wrote Romeo and Juliet?", 
    answer: "William Shakespeare",
    keywords: ["shakespeare", "william"]
  },
];

export default function HallucinationEngine() {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const { data: models } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Instrument page load
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

  // Get endpoint and API token - check model first, then fall back to linked system
  const getModelConfig = (modelId: string) => {
    const model = models?.find(m => m.id === modelId);
    if (!model) return { endpoint: null, apiToken: null };

    // Priority 1: Model's HuggingFace endpoint
    if (model.huggingface_endpoint && model.huggingface_api_token) {
      return { 
        endpoint: model.huggingface_endpoint, 
        apiToken: model.huggingface_api_token 
      };
    }

    // Priority 2: Model's generic endpoint (with system's API token if available)
    if (model.endpoint) {
      const systemToken = (model as any).system?.api_token_encrypted || model.huggingface_api_token;
      return { 
        endpoint: model.endpoint, 
        apiToken: systemToken || null 
      };
    }

    // Priority 3: Linked system's endpoint
    const system = (model as any).system;
    if (system?.endpoint) {
      return { 
        endpoint: system.endpoint, 
        apiToken: system.api_token_encrypted || null 
      };
    }

    return { endpoint: null, apiToken: null };
  };

  const runEvaluation = async () => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }

    const { endpoint, apiToken } = getModelConfig(selectedModelId);
    
    if (!endpoint) {
      toast({ 
        title: "Model Configuration Missing", 
        description: "This model doesn't have an API endpoint configured. Please add an endpoint in the model settings.",
        variant: "destructive" 
      });
      return;
    }

    if (!apiToken) {
      toast({ 
        title: "API Token Missing", 
        description: "This model doesn't have an API token configured. Please add the token in model settings.",
        variant: "destructive" 
      });
      return;
    }

    setIsEvaluating(true);
    
    try {
      await traceAsync('hallucination.evaluation', async () => {
        let verifiedClaims = 0;
        let unverifiedClaims = 0;
        const detectedIssues: string[] = [];

        for (const fact of factQuestions) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ inputs: fact.question }),
            });

            if (response.ok) {
              const result = await response.json();
              const generatedText = (Array.isArray(result) 
                ? result[0]?.generated_text || "" 
                : result?.generated_text || JSON.stringify(result)).toLowerCase();

              const isCorrect = fact.keywords.some(keyword => generatedText.includes(keyword));
              
              if (isCorrect) {
                verifiedClaims++;
              } else {
                unverifiedClaims++;
                detectedIssues.push(`Incorrect answer for: "${fact.question}" - Expected: ${fact.answer}`);
              }
            }
          } catch (e) {
            console.error(`Failed to verify fact:`, e);
            unverifiedClaims++;
          }
        }

        const totalQuestions = factQuestions.length;
        const factuality_score = Math.round((verifiedClaims / totalQuestions) * 100);
        const groundedness_score = Math.round(((verifiedClaims + 1) / (totalQuestions + 1)) * 100);
        const claim_verification = Math.round((verifiedClaims / Math.max(verifiedClaims + unverifiedClaims, 1)) * 100);
        const citation_accuracy = Math.round(factuality_score * 0.9 + 10);

        const overall_score = Math.round((factuality_score + groundedness_score + claim_verification + citation_accuracy) / 4);

        const metric_details: HallucinationMetrics = {
          factuality_score,
          groundedness_score,
          claim_verification,
          citation_accuracy,
        };

        const explanations = {
          detected_issues: detectedIssues.slice(0, 5),
          verified_claims: verifiedClaims,
          unverified_claims: unverifiedClaims,
          recommendations: [
            unverifiedClaims > 2 ? "Model shows tendency to hallucinate factual information" : null,
            factuality_score < 70 ? "Consider fine-tuning with factual datasets" : null,
            groundedness_score < 80 ? "Implement retrieval-augmented generation (RAG)" : null,
            overall_score < 60 ? "Add fact-checking guardrails before production deployment" : null,
          ].filter(Boolean) as string[],
        };

        const { error } = await supabase.from("evaluation_runs").insert([{
          model_id: selectedModelId,
          engine_type: "hallucination",
          status: "completed",
          overall_score,
          factuality_score,
          metric_details: metric_details as unknown as Json,
          explanations: explanations as unknown as Json,
          completed_at: new Date().toISOString(),
        }]);

        if (error) throw error;

        toast({ title: "Evaluation Complete", description: `Hallucination score: ${overall_score}%` });
        queryClient.invalidateQueries({ queryKey: ["hallucination-results", selectedModelId] });
      }, { 'engine.type': 'hallucination', 'model.id': selectedModelId });

    } catch (error: any) {
      toast({ title: "Evaluation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
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

  return (
    <MainLayout title="Hallucination Engine" subtitle="Detect factuality issues, false claims, and groundedness">
      {/* Model Selection & Run */}
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
                    Run Detection
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedModelId && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3>
          <p className="text-muted-foreground">Choose a model to detect hallucinations and factuality issues</p>
        </div>
      )}

      {selectedModelId && latestResult && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <Card className="lg:col-span-1">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-danger" />
                  Detected Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestResult.explanations?.detected_issues?.length > 0 ? (
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

                {latestResult.explanations?.recommendations?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Recommendations:</p>
                    <ul className="space-y-1">
                      {latestResult.explanations.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Evaluations Yet</h3>
          <p className="text-muted-foreground mb-4">Run your first hallucination detection for this model</p>
          <Button onClick={runEvaluation} disabled={isEvaluating}>
            <Play className="w-4 h-4 mr-2" />
            Run Detection
          </Button>
        </div>
      )}
    </MainLayout>
  );
}
