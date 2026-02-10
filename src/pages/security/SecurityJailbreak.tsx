import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useModels } from '@/hooks/useModels';
import { useAttackLibrary } from '@/hooks/useSecurityScans';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, Loader2, Shield } from 'lucide-react';
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
import { AttackResultRow } from '@/components/security/AttackResultRow';
import { ComplianceBanner } from '@/components/engines/ComplianceBanner';
import { ComputationBreakdown } from '@/components/engines/ComputationBreakdown';
import { EvidencePackage } from '@/components/engines/EvidencePackage';
import { sanitizeErrorMessage } from '@/lib/ui-helpers';

function SecurityJailbreakContent() {
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedAttackIds, setSelectedAttackIds] = useState<string[]>([]);
  const [evalStatus, setEvalStatus] = useState<EvalStatus>('idle');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const { data: models, isLoading: modelsLoading, refetch } = useModels();
  const { data: attackData } = useAttackLibrary();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedModel = models?.find(m => m.id === selectedModelId);
  const hasEndpoint = selectedModel?.huggingface_endpoint || selectedModel?.endpoint;
  const { status, lastUpdated } = useDataHealth(modelsLoading, false);

  const toggleAttack = (id: string) => {
    setSelectedAttackIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const runJailbreak = async () => {
    if (!selectedModelId) { toast({ title: 'Please select a model', variant: 'destructive' }); return; }
    setEvalStatus('sending');
    setEvalError(null);
    setResults(null);
    try {
      setEvalStatus('analyzing');
      const body: any = { modelId: selectedModelId };
      if (selectedAttackIds.length > 0) body.attackIds = selectedAttackIds;
      const { data, error } = await supabase.functions.invoke('security-jailbreak', { body });
      if (error) throw error;
      setEvalStatus('complete');
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ['security-test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast({ title: 'Jailbreak Test Complete', description: `Resistance: ${data.resistance?.toFixed(0)}%`, variant: (data.resistance ?? 0) >= 70 ? 'default' : 'destructive' });
    } catch (error: any) {
      setEvalStatus('error');
      setEvalError(sanitizeErrorMessage(error.message) || 'Jailbreak test failed');
    }
  };

  if (modelsLoading) return <MainLayout title="Jailbreak Lab" subtitle="Loading..."><EngineSkeleton /></MainLayout>;

  return (
    <MainLayout title="Jailbreak Lab" subtitle="Automated Prompt Injection Resistance Testing"
      headerActions={<HealthIndicator status={status} lastUpdated={lastUpdated} onRetry={refetch} showLabel />}>
      <InputOutputScope scope="BOTH" inputDescription="Sends attack prompts from curated attack library" outputDescription="Classifies model responses for breach detection" />
      <div className="flex items-center gap-2 mb-4"><Badge className="bg-primary/10 text-primary border-primary/20"><Shield className="w-3 h-3 mr-1" />Attack Library</Badge><Badge variant="outline" className="text-xs">{attackData?.attacks.length || 0} Attacks Available</Badge></div>
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
            <Button onClick={runJailbreak} disabled={!selectedModelId || (evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error')} size="lg" className="gap-2">
              {evalStatus === 'sending' || evalStatus === 'analyzing' ? <><Loader2 className="w-4 h-4 animate-spin" />Testing...</> : <><FlaskConical className="w-4 h-4" />Execute Attacks</>}
            </Button>
          </div>
        </div>
      </CardContent></Card>
      {attackData && Object.keys(attackData.grouped).length > 0 && (
        <Card className="mb-6"><CardContent className="pt-6">
          <h3 className="font-semibold mb-3 text-sm">Filter Attacks (optional — leave empty for all)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {Object.entries(attackData.grouped).map(([category, attacks]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">{category}</p>
                {attacks.slice(0, 5).map((attack: any) => (
                  <div key={attack.id} className="flex items-center gap-2">
                    <Checkbox checked={selectedAttackIds.includes(attack.id)} onCheckedChange={() => toggleAttack(attack.id)} id={attack.id} />
                    <label htmlFor={attack.id} className="text-xs cursor-pointer truncate">{attack.name}</label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
      {evalStatus !== 'idle' && evalStatus !== 'complete' && evalStatus !== 'error' && <div className="mb-6"><EngineLoadingStatus status={evalStatus} engineName="Jailbreak" /></div>}
      {evalError && <div className="mb-6"><EngineErrorCard type="connection" message={evalError} onRetry={runJailbreak} isRetrying={evalStatus === 'sending'} systemId={selectedModel?.system_id} /></div>}
      {results && (
        <div className="space-y-6">
          <ComplianceBanner score={results.overallScore ?? results.resistance ?? 0} engineName="Jailbreak Resistance" regulatoryReferences={['OWASP LLM01', 'NIST AI RMF', 'EU AI Act Article 9']} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-center"><SecurityScoreGauge score={results.resistance ?? 0} label="Resistance" size="lg" /></div>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{results.totalAttacks || 0}</p><p className="text-sm text-muted-foreground">Attacks Executed</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-destructive">{results.breachCount || 0}</p><p className="text-sm text-muted-foreground">Breaches Detected</p></CardContent></Card>
          </div>
          {results.breachDetails?.length > 0 && (
            <Card><CardContent className="pt-6"><h3 className="font-semibold mb-4">Attack Results</h3>
              <div className="space-y-2">{results.breachDetails.map((b: any, i: number) => (
                <AttackResultRow key={i} attackName={b.attackName} category={b.category} prompt={b.prompt} response={b.response} breached={b.breached} breachScore={b.breachScore} reasoning={b.reasoning} difficulty={b.difficulty} />
              ))}</div>
            </CardContent></Card>
          )}
          {results.computationSteps && <ComputationBreakdown steps={results.computationSteps} overallScore={results.overallScore ?? Math.round(results.resistance ?? 0)} weightedFormula="resistance = (nonBreachCount / totalAttempts) × 100" engineType="security-jailbreak" euAIActReference="EU AI Act Article 9" />}
          <EvidencePackage mode="download" data={{ results, rawLogs: results.rawLogs || [], modelId: selectedModelId, evaluationType: 'security-jailbreak', overallScore: results.overallScore ?? Math.round(results.resistance ?? 0), isCompliant: (results.resistance ?? 0) >= 70 }} />
        </div>
      )}
      {!selectedModelId && <div className="text-center py-16 bg-card rounded-xl border border-border"><FlaskConical className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Select a Model</h3><p className="text-muted-foreground">Choose a model to run jailbreak resistance testing</p></div>}
    </MainLayout>
  );
}

export default function SecurityJailbreak() { return <ComponentErrorBoundary><SecurityJailbreakContent /></ComponentErrorBoundary>; }
