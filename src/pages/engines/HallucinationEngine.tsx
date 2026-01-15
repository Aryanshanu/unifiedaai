import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Brain, Sparkles, Layers, FileCheck, Stethoscope, Scale, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { instrumentPageLoad } from "@/lib/telemetry";
import { CustomPromptTest } from "@/components/engines/CustomPromptTest";
import { InputOutputScope } from "@/components/engines/InputOutputScope";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { useDataHealth } from "@/components/shared/DataHealthWrapper";
import { ComponentErrorBoundary } from "@/components/error/ErrorBoundary";
import { EngineSkeleton } from "@/components/engines/EngineSkeleton";
import { EngineLoadingStatus, EvalStatus } from "@/components/engines/EngineLoadingStatus";
import { EngineErrorCard } from "@/components/engines/EngineErrorCard";
import { NoEndpointWarning } from "@/components/engines/NoModelConnected";
import { sanitizeErrorMessage } from "@/lib/ui-helpers";
import { getDomainRegulatoryBadges, type HallucinationDomain } from "@/lib/test-datasets";

const DOMAIN_OPTIONS: { value: HallucinationDomain; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'general', label: 'General', icon: <Brain className="w-4 h-4" />, description: 'Standard fact-checking prompts' },
  { value: 'clinical', label: 'Clinical/Medical', icon: <Stethoscope className="w-4 h-4" />, description: 'HIPAA-aware medical prompts' },
  { value: 'legal', label: 'Legal', icon: <Scale className="w-4 h-4" />, description: 'Legal domain with ABA compliance' },
  { value: 'finance', label: 'Finance', icon: <Landmark className="w-4 h-4" />, description: 'SEC/FINRA regulatory prompts' },
];

function HallucinationEngineContent() {
  const [searchParams] = useSearchParams();
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<HallucinationDomain>('general');
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasAutoRun = useRef(false);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const autorunModelId = searchParams.get('modelId');
  const shouldAutorun = searchParams.get('autorun') === '1';

  useEffect(() => {
    const endTrace = instrumentPageLoad('HallucinationEngine');
    return () => endTrace();
  }, []);

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

  const selectedModel = models?.find(m => m.id === selectedModelId);
  const hasEndpoint = selectedModel?.huggingface_endpoint || selectedModel?.endpoint;
  const { status, lastUpdated } = useDataHealth(modelsLoading, false);

  const handleRetry = () => {
    setEvalError(null);
    refetchModels();
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
        body: { modelId: selectedModelId, domain: selectedDomain },
      });

      if (error) throw error;

      setEvalStatus('computing');
      queryClient.invalidateQueries({ queryKey: ["hallucination-results", selectedModelId] });
      
      setEvalStatus('complete');
      setRetryCount(0);
      
      const domainLabel = DOMAIN_OPTIONS.find(d => d.value === selectedDomain)?.label || 'General';
      toast({ 
        title: `${domainLabel} Hallucination Evaluation Complete`, 
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

  if (modelsLoading) {
    return (
      <MainLayout title="Hallucination Engine" subtitle="Loading...">
        <EngineSkeleton />
      </MainLayout>
    );
  }

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
        {selectedDomain !== 'general' && getDomainRegulatoryBadges(selectedDomain).map(badge => (
          <Badge key={badge.label} variant="outline" className="text-xs bg-warning/5 text-warning border-warning/20" title={badge.description}>
            {badge.label}
          </Badge>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
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
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2 block">Domain Test Pack</label>
              <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as HallucinationDomain)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_OPTIONS.map((domain) => (
                    <SelectItem key={domain.value} value={domain.value}>
                      <div className="flex items-center gap-2">
                        {domain.icon}
                        <span>{domain.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {DOMAIN_OPTIONS.find(d => d.value === selectedDomain)?.description}
              </p>
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
                    Run {selectedDomain !== 'general' ? DOMAIN_OPTIONS.find(d => d.value === selectedDomain)?.label : ''} Check
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

      {selectedModelId && (
        <div className="mt-6">
          <CustomPromptTest
            modelId={selectedModelId}
            engineType="hallucination"
            engineName="Hallucination"
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
