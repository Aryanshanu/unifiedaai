import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, Brain, Sparkles, Layers, Shield } from "lucide-react";
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
import { ComplianceBanner } from "@/components/engines/ComplianceBanner";
import { ComputationBreakdown } from "@/components/engines/ComputationBreakdown";
import { EvidencePackage } from "@/components/engines/EvidencePackage";
import { EngineResultsLayout } from "@/components/engines/EngineResultsLayout";
import { RawDataLog } from "@/components/engines/RawDataLog";
import { sanitizeErrorMessage } from "@/lib/ui-helpers";

function PrivacyEngineContent() {
  const [searchParams] = useSearchParams();
  const [selectedModelId, setSelectedModelId] = useState<string>(() => localStorage.getItem('rai-privacy-model') || '');
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalResults, setEvalResults] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasAutoRun = useRef(false);
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const autorunModelId = searchParams.get('modelId');
  const shouldAutorun = searchParams.get('autorun') === '1';

  useEffect(() => { const endTrace = instrumentPageLoad('PrivacyEngine'); return () => endTrace(); }, []);
  useEffect(() => { if (selectedModelId) localStorage.setItem('rai-privacy-model', selectedModelId); }, [selectedModelId]);

  useEffect(() => {
    if (autorunModelId && shouldAutorun && !hasAutoRun.current && models && models.length > 0) {
      const modelExists = models.some(m => m.id === autorunModelId);
      if (modelExists) { hasAutoRun.current = true; setSelectedModelId(autorunModelId); setTimeout(() => runPrivacyEvaluation(), 500); }
    }
  }, [autorunModelId, shouldAutorun, models]);

  const selectedModel = models?.find(m => m.id === selectedModelId);
  const hasEndpoint = selectedModel?.huggingface_endpoint || selectedModel?.endpoint;
  const { status, lastUpdated } = useDataHealth(modelsLoading, false);

  const runPrivacyEvaluation = async (isRetry = false) => {
    if (!selectedModelId) { toast({ title: "Please select a model", variant: "destructive" }); return; }
    setEvalStatus('sending'); setEvalError(null);
    try {
      setEvalStatus('analyzing');
      const { data, error } = await supabase.functions.invoke('eval-privacy-hf', { body: { modelId: selectedModelId } });
      if (error) throw error;
      setEvalStatus('computing');
      queryClient.invalidateQueries({ queryKey: ["privacy-results", selectedModelId] });
      setEvalStatus('complete'); setRetryCount(0); setEvalResults(data);
      toast({ title: "Privacy Evaluation Complete", description: `Score: ${data.overallScore}% - ${data.verdict}`, variant: data.overallScore >= 70 ? "default" : "destructive" });
    } catch (error: any) {
      console.error("Privacy evaluation error:", error); setEvalStatus('error');
      if (!isRetry && retryCount < 2) { setRetryCount(prev => prev + 1); toast({ title: "Temporary issue — retrying..." }); setTimeout(() => runPrivacyEvaluation(true), 2000); }
      else { setEvalError(sanitizeErrorMessage(error.message) || "Evaluation failed."); setRetryCount(0); }
    }
  };

  const buildBullets = (data: any) => {
    const b: { type: 'success' | 'warning' | 'error' | 'info'; text: string }[] = [];
    if (!data) return b;
    const s = data.overallScore ?? 0;
    b.push({ type: s >= 80 ? 'success' : s >= 70 ? 'warning' : 'error', text: `Overall privacy score: ${s}% — ${data.verdict || (s >= 70 ? 'COMPLIANT' : 'NON-COMPLIANT')}` });
    if (data.metricDetails) Object.entries(data.metricDetails).forEach(([k, v]: [string, any]) => {
      const ms = typeof v === 'number' ? v : v?.score;
      if (ms != null) b.push({ type: ms < 70 ? 'error' : 'success', text: `${k}: ${ms}%` });
    });
    return b;
  };

  if (modelsLoading) return <MainLayout title="Privacy Engine" subtitle="Loading..."><EngineSkeleton /></MainLayout>;

  return (
    <MainLayout title="Privacy Engine" subtitle="2025 SOTA: PII/PHI Detection, Aadhaar/PAN, Secrets, GDPR/DPDP Compliance"
      headerActions={<HealthIndicator status={status} lastUpdated={lastUpdated} onRetry={refetchModels} showLabel />}>
      <InputOutputScope scope="BOTH" inputDescription="Scans prompts for unnecessary PII and sensitive data" outputDescription="Detects PII leakage, PHI exposure, API keys, and secrets in responses" />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge className="bg-primary/10 text-primary border-primary/20"><Brain className="w-3 h-3 mr-1" />Presidio + Gemini 2.5 Pro</Badge>
        <Badge variant="outline" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />K2 Reasoning</Badge>
        <Badge variant="outline" className="text-xs bg-success/5 text-success border-success/20"><Layers className="w-3 h-3 mr-1" />5 Weighted Metrics</Badge>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20"><Shield className="w-3 h-3 mr-1" />India PII (Aadhaar/PAN)</Badge>
      </div>
      <Card className="mb-6"><CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">Select Model</label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger><SelectValue placeholder="Choose a registered model" /></SelectTrigger>
              <SelectContent>{models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.model_type})</SelectItem>)}</SelectContent>
            </Select>
            {selectedModelId && !hasEndpoint && <div className="mt-2"><NoEndpointWarning systemId={selectedModel?.system_id} /></div>}
          </div>
          <div className="pt-6">
            <Button onClick={() => runPrivacyEvaluation()} disabled={!selectedModelId || (evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error')} size="lg" className="gap-2">
              {evalStatus === 'sending' || evalStatus === 'analyzing' || evalStatus === 'computing' ? <><Loader2 className="w-4 h-4 animate-spin" />Evaluating...</> : <><Lock className="w-4 h-4" />Run Privacy Audit</>}
            </Button>
          </div>
        </div>
      </CardContent></Card>

      {evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error' && <div className="mb-6"><EngineLoadingStatus status={evalStatus} engineName="Privacy" /></div>}
      {evalError && <div className="mb-6"><EngineErrorCard type="connection" message={evalError} onRetry={() => runPrivacyEvaluation()} isRetrying={evalStatus === 'sending'} systemId={selectedModel?.system_id} /></div>}

      {evalResults && (
        <div className="space-y-6 mb-6">
          <ComplianceBanner score={evalResults.overallScore ?? 0} engineName="Privacy" regulatoryReferences={['GDPR Article 5', 'DPDP Act 2023', 'EU AI Act Article 10']} />
          <EngineResultsLayout score={evalResults.overallScore ?? 0} engineName="Privacy" keyInsight={evalResults.verdict || `Score: ${evalResults.overallScore}%`}
            summaryBullets={buildBullets(evalResults)} recommendations={evalResults.recommendations || []}
            metricsContent={evalResults.computationSteps ? <ComputationBreakdown steps={evalResults.computationSteps} overallScore={evalResults.overallScore ?? 0} weightedFormula="0.30×PII + 0.20×PHI + 0.20×Redact + 0.20×Secrets + 0.10×Min" engineType="privacy" euAIActReference="GDPR Article 5" /> : <div className="text-center py-8 text-muted-foreground">Computation steps available after evaluation.</div>}
            rawDataContent={<RawDataLog logs={(evalResults.rawLogs || [{ timestamp: new Date().toISOString(), type: 'evaluation', data: evalResults }]).map((e: any, i: number) => ({ id: String(i), ...e }))} />}
            evidenceContent={<EvidencePackage mode="download" data={{ results: evalResults, rawLogs: evalResults.rawLogs || [], modelId: selectedModelId, evaluationType: 'privacy', overallScore: evalResults.overallScore, isCompliant: (evalResults.overallScore ?? 0) >= 70 }} />}
          />
        </div>
      )}

      {!selectedModelId && !evalResults && <div className="text-center py-16 bg-card rounded-xl border border-border"><Lock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3><p className="text-muted-foreground">Choose a model to run privacy evaluation</p></div>}
      {selectedModelId && <div className="mt-6"><CustomPromptTest modelId={selectedModelId} engineType="privacy" engineName="Privacy" /></div>}
    </MainLayout>
  );
}

export default function PrivacyEngine() { return <ComponentErrorBoundary><PrivacyEngineContent /></ComponentErrorBoundary>; }
