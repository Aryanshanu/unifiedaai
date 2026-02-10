import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useModels } from '@/hooks/useModels';
import { useToast } from '@/hooks/use-toast';
import { Target, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { InputOutputScope } from '@/components/engines/InputOutputScope';
import { HealthIndicator } from '@/components/shared/HealthIndicator';
import { useDataHealth } from '@/components/shared/DataHealthWrapper';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';
import { EngineSkeleton } from '@/components/engines/EngineSkeleton';
import { EngineLoadingStatus, EvalStatus } from '@/components/engines/EngineLoadingStatus';
import { EngineErrorCard } from '@/components/engines/EngineErrorCard';
import { NoEndpointWarning } from '@/components/engines/NoModelConnected';
import { SecurityScoreGauge } from '@/components/security/SecurityScoreGauge';
import { ThreatVectorCard } from '@/components/security/ThreatVectorCard';
import { ComputationBreakdown } from '@/components/engines/ComputationBreakdown';
import { ComplianceBanner } from '@/components/engines/ComplianceBanner';
import { sanitizeErrorMessage } from '@/lib/ui-helpers';

const FRAMEWORKS = [
  { value: 'STRIDE', label: 'STRIDE', desc: 'Spoofing, Tampering, Repudiation, Info Disclosure, DoS, EoP' },
  { value: 'OWASP_LLM', label: 'OWASP LLM Top 10', desc: 'LLM-specific security risks' },
  { value: 'MAESTRO', label: 'MAESTRO', desc: 'Multi-Agent Security Threat Risk & Oversight' },
  { value: 'ATLAS', label: 'MITRE ATLAS', desc: 'Adversarial Threat Landscape for AI Systems' },
];

function SecurityThreatModelContent() {
  const [selectedModelId, setSelectedModelId] = useState('');
  const [framework, setFramework] = useState('STRIDE');
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const { data: models, isLoading: modelsLoading, refetch } = useModels();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedModel = models?.find(m => m.id === selectedModelId);
  const { status, lastUpdated } = useDataHealth(modelsLoading, false);

  const runThreatModel = async () => {
    if (!selectedModelId) { toast({ title: 'Please select a model', variant: 'destructive' }); return; }
    setEvalStatus('sending');
    setEvalError(null);
    setResults(null);
    try {
      setEvalStatus('analyzing');
      const { data, error } = await supabase.functions.invoke('security-threat-model', { body: { modelId: selectedModelId, framework } });
      if (error) throw error;
      setEvalStatus('complete');
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ['security-test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['threat-models'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast({ title: 'Threat Model Generated', description: `${data.threats?.length || 0} threats identified`, variant: (data.overallScore ?? 0) >= 70 ? 'default' : 'destructive' });
    } catch (error: any) {
      setEvalStatus('error');
      setEvalError(sanitizeErrorMessage(error.message) || 'Threat modeling failed');
    }
  };

  if (modelsLoading) return <MainLayout title="Threat Modeling Engine" subtitle="Loading..."><EngineSkeleton /></MainLayout>;

  return (
    <MainLayout title="Threat Modeling Engine" subtitle="STRIDE, OWASP LLM, MAESTRO, ATLAS Framework Analysis"
      headerActions={<HealthIndicator status={status} lastUpdated={lastUpdated} onRetry={refetch} showLabel />}>
      <InputOutputScope scope="OUTPUT" inputDescription="Model metadata and system context" outputDescription="AI-generated threat vectors with risk scoring" />
      <div className="flex items-center gap-2 mb-4"><Badge className="bg-primary/10 text-primary border-primary/20"><Shield className="w-3 h-3 mr-1" />4 Frameworks</Badge></div>
      <Card className="mb-6"><CardContent className="pt-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground mb-2 block">Select Model</label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger><SelectValue placeholder="Choose a registered model" /></SelectTrigger>
              <SelectContent>{models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.model_type})</SelectItem>)}</SelectContent>
            </Select>
            {selectedModelId && !(selectedModel?.huggingface_endpoint || selectedModel?.endpoint) && <div className="mt-2"><NoEndpointWarning systemId={selectedModel?.system_id} /></div>}
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-foreground mb-2 block">Framework</label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FRAMEWORKS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="pt-6">
            <Button onClick={runThreatModel} disabled={!selectedModelId || (evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error')} size="lg" className="gap-2">
              {evalStatus === 'sending' || evalStatus === 'analyzing' ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Target className="w-4 h-4" />Generate Threat Model</>}
            </Button>
          </div>
        </div>
      </CardContent></Card>
      {evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error' && <div className="mb-6"><EngineLoadingStatus status={evalStatus} engineName="Threat Model" /></div>}
      {evalError && <div className="mb-6"><EngineErrorCard type="connection" message={evalError} onRetry={runThreatModel} isRetrying={evalStatus === 'sending'} /></div>}
      {results && (
        <div className="space-y-6">
          <ComplianceBanner score={results.overallScore ?? 0} engineName="Threat Modeling" regulatoryReferences={[`${framework} Framework`, 'NIST AI RMF', 'EU AI Act Article 9']} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-center"><SecurityScoreGauge score={results.overallScore ?? 0} label="Threat Score" size="lg" /></div>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{results.threats?.length || 0}</p><p className="text-sm text-muted-foreground">Threats Identified</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><Badge variant="outline" className="text-lg px-4 py-2">{framework}</Badge><p className="text-sm text-muted-foreground mt-2">Framework Used</p></CardContent></Card>
          </div>
          {results.threats?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.threats.map((t: any, i: number) => (
                <ThreatVectorCard key={i} title={t.title} description={t.description} likelihood={t.likelihood} impact={t.impact} riskScore={t.riskScore} category={t.category} framework={framework} mitigations={t.mitigation_checklist || t.mitigations || []} />
              ))}
            </div>
          )}
          {results.computationSteps && <ComputationBreakdown steps={results.computationSteps} overallScore={results.overallScore ?? 0} weightedFormula="riskScore = avg(likelihood × impact) / 25" engineType="security-threat-model" euAIActReference="EU AI Act Article 9" />}
        </div>
      )}
      {!selectedModelId && <div className="text-center py-16 bg-card rounded-xl border border-border"><Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3><p className="text-muted-foreground">Choose a model to generate a threat model</p></div>}
    </MainLayout>
  );
}

export default function SecurityThreatModel() { return <ComponentErrorBoundary><SecurityThreatModelContent /></ComponentErrorBoundary>; }
