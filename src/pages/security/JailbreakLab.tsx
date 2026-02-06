 import { useState, useEffect } from 'react';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
 import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, Play, Zap, Search, RefreshCw, Shield, ShieldX, Download, 
  AlertTriangle, ChevronDown, ChevronUp, Clock, ExternalLink, ServerCrash, Database,
  HelpCircle, Send
} from 'lucide-react';
import { BuiltInTargetButton, BuiltInTargetBanner } from '@/components/security/BuiltInTargetButton';
 import { useSystems } from '@/hooks/useSystems';
 import { useAttackLibrary, Attack } from '@/hooks/useAttackLibrary';
 import { useSecurityFindings } from '@/hooks/useSecurityFindings';
 import { AttackCard } from '@/components/security/AttackCard';
import { 
  ConfidenceIndicator, 
  SeverityBadge, 
  VerdictBadge, 
  DecisionTracePanel,
  DecisionTrace,
  VerdictState,
  Severity
} from '@/components/security/ScoreTooltip';
 import { safeInvoke } from '@/lib/safe-supabase';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { useQueryClient } from '@tanstack/react-query';
 import { Link } from 'react-router-dom';
 
 const attackCategories = [
   { id: 'all', label: 'All Categories' },
   { id: 'jailbreak', label: 'Jailbreak' },
   { id: 'prompt_injection', label: 'Prompt Injection' },
   { id: 'toxicity', label: 'Toxicity Probes' },
   { id: 'pii_extraction', label: 'PII Extraction' },
   { id: 'harmful_content', label: 'Harmful Content' },
   { id: 'policy_bypass', label: 'Policy Bypass' },
 ];
 
 interface AttackResult {
   attackId: string;
   attackName: string;
   attackCategory?: string;
  verdict: VerdictState;
   blocked: boolean;
   response: string;
   targetResponse?: string;
   confidence: number;
   reasoning?: string;
   riskScore?: number;
  severity?: Severity;
   latencyMs?: number;
   findingId?: string;
  decisionTrace?: DecisionTrace;
 }
 
 export default function JailbreakLab() {
   const [selectedSystemId, setSelectedSystemId] = useState<string>('');
   const [categoryFilter, setCategoryFilter] = useState<string>('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isRunning, setIsRunning] = useState(false);
   const [runningAttackId, setRunningAttackId] = useState<string | null>(null);
   const [results, setResults] = useState<AttackResult[]>([]);
   const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('library');
  const [customPayload, setCustomPayload] = useState('');
  const [isCustomRunning, setIsCustomRunning] = useState(false);
   const queryClient = useQueryClient();
 
   const systemsQuery = useSystems();
   const systems = systemsQuery.data || [];
   const { attacks, isLoading: attacksLoading } = useAttackLibrary(categoryFilter === 'all' ? undefined : categoryFilter);
   
   // Get persisted findings for the selected system (history from DB)
   const { findings, refetch: refetchFindings } = useSecurityFindings(selectedSystemId || undefined);
   const jailbreakFindings = findings.filter(f => f.title?.startsWith('Jailbreak:'));
 
   // Realtime subscription for security findings updates
   useEffect(() => {
     const channel = supabase
       .channel('jailbreak-findings-realtime')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'security_findings' },
         () => {
           queryClient.invalidateQueries({ queryKey: ['security-findings'] });
           queryClient.invalidateQueries({ queryKey: ['security-stats'] });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [queryClient]);
 
   const filteredAttacks = attacks.filter(attack =>
     attack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     attack.description?.toLowerCase().includes(searchQuery.toLowerCase())
   );
 
   const selectedSystem = systems.find(s => s.id === selectedSystemId);
 
   const handleExecuteAttack = async (attack: Attack) => {
     if (!selectedSystemId) {
       toast.error('Please select a target system first');
       return;
     }
 
    setRunningAttackId(attack.id);  
     try {
       const { data, error } = await safeInvoke<AttackResult>('agent-jailbreaker', {
         action: 'execute',
         systemId: selectedSystemId,
         attackId: attack.id,
       }, { showErrorToast: true, toastMessage: 'Failed to execute attack' });
 
       if (error) throw error;
 
       // Add to local results for immediate display
       const result: AttackResult = {
         attackId: attack.id,
         attackName: data?.attackName || attack.name,
         attackCategory: data?.attackCategory || attack.category,
        verdict: data?.verdict || (data?.blocked ? 'blocked' : 'succeeded'),
         blocked: data?.blocked ?? true,
         response: data?.response || 'No response captured',
         targetResponse: data?.targetResponse,
         confidence: data?.confidence || 0,
         reasoning: data?.reasoning,
         riskScore: data?.riskScore,
         severity: data?.severity,
        latencyMs: data?.latencyMs,
         findingId: data?.findingId,
        decisionTrace: data?.decisionTrace,
       };
 
       setResults(prev => [result, ...prev]);
 
       // Refetch findings to show persisted data
       refetchFindings();
 
      if (result.verdict === 'blocked') {
         toast.success(`Attack blocked! The target refused the ${attack.name} attack.`);
      } else if (result.verdict === 'succeeded') {
         toast.error(`Vulnerability found! ${attack.name} succeeded against the target.`);
      } else {
        toast.warning(`Indeterminate result for ${attack.name}. Manual review required.`);
       }
     } catch (error) {
       // Error already handled by safeInvoke
     } finally {
       setRunningAttackId(null);
     }
   };
 
   const handleRunAll = async () => {
     if (!selectedSystemId) {
       toast.error('Please select a target system first');
       return;
     }
 
     setIsRunning(true);
     try {
      const { data, error } = await safeInvoke<{ results: AttackResult[]; total: number; blocked: number; succeeded: number; indeterminate: number }>('agent-jailbreaker', {
         action: 'automated',
         systemId: selectedSystemId,
         category: categoryFilter === 'all' ? undefined : categoryFilter,
       }, { showErrorToast: true, toastMessage: 'Failed to run automated tests' });
 
       if (error) throw error;
 
       if (data?.results) {
        setResults(data.results.map(r => ({
          ...r,
          verdict: r.verdict || (r.blocked ? 'blocked' : 'succeeded'),
        })));
       }
 
       // Refetch findings
       refetchFindings();
 
      toast.success(`Completed ${data?.total || 0} attacks: ${data?.blocked || 0} blocked, ${data?.succeeded || 0} vulnerabilities, ${data?.indeterminate || 0} indeterminate`);
     } catch (error) {
       // Error already handled by safeInvoke
     } finally {
       setIsRunning(false);
     }
   };
 
  const handleRunCustom = async () => {
    if (!selectedSystemId) {
      toast.error('Please select a target system first');
      return;
    }
    if (!customPayload.trim()) {
      toast.error('Please enter a custom payload');
      return;
    }

    setIsCustomRunning(true);
    try {
      const { data, error } = await safeInvoke<AttackResult>('agent-jailbreaker', {
        action: 'custom-test',
        systemId: selectedSystemId,
        customPayload: customPayload.trim(),
      }, { showErrorToast: true, toastMessage: 'Failed to run custom test' });

      if (error) throw error;

      const result: AttackResult = {
        attackId: 'custom',
        attackName: 'Custom Test',
        attackCategory: 'custom',
        verdict: data?.verdict || (data?.blocked ? 'blocked' : 'succeeded'),
        blocked: data?.blocked ?? true,
        response: data?.response || 'No response captured',
        targetResponse: data?.targetResponse,
        confidence: data?.confidence || 0,
        reasoning: data?.reasoning,
        riskScore: data?.riskScore,
        severity: data?.severity,
        latencyMs: data?.latencyMs,
        decisionTrace: data?.decisionTrace,
      };

      setResults(prev => [result, ...prev]);

      if (result.verdict === 'blocked') {
        toast.success('Custom attack was blocked by the target.');
      } else if (result.verdict === 'succeeded') {
        toast.error('Custom attack succeeded - potential vulnerability!');
      } else {
        toast.warning('Indeterminate result. Manual review required.');
      }
    } catch (error) {
      // Error already handled by safeInvoke
    } finally {
      setIsCustomRunning(false);
    }
  };

  const blockedCount = results.filter(r => r.verdict === 'blocked').length;
  const successCount = results.filter(r => r.verdict === 'succeeded').length;
  const indeterminateCount = results.filter(r => r.verdict === 'indeterminate').length;
 
   const handleExportResults = () => {
     if (results.length === 0) {
       toast.info('No results to export');
       return;
     }
     const exportData = {
       exportedAt: new Date().toISOString(),
       targetSystem: selectedSystem?.name || 'Unknown',
       summary: { total: results.length, blocked: blockedCount, succeeded: successCount },
       results: results.map(r => ({
         attackName: r.attackName,
         category: r.attackCategory,
         blocked: r.blocked,
         confidence: r.confidence,
         severity: r.severity,
         reasoning: r.reasoning,
         targetResponse: r.targetResponse?.substring(0, 500),
         latencyMs: r.latencyMs,
       })),
     };
     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `jailbreak-results-${selectedSystem?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
     a.click();
     URL.revokeObjectURL(url);
     toast.success('Results exported successfully');
   };
 
  // Empty states
  const isBuiltInTarget = selectedSystem?.provider === 'lovable';

  if (systems.length === 0 && !systemsQuery.isLoading) {
    return (
      <MainLayout title="Jailbreak Lab" subtitle="Adversarial attack testing">
        <div className="p-6 space-y-4">
          <BuiltInTargetBanner 
            showWhen="no-systems" 
            onCreated={(id) => setSelectedSystemId(id)} 
          />
          <Alert className="border-border">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Target Systems Configured</AlertTitle>
            <AlertDescription className="mt-2">
              <p>You need to configure at least one AI system to test. Use the Built-in Target above for quick testing without external APIs.</p>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
 
   return (
     <MainLayout title="Jailbreak Lab" subtitle="Adversarial attack testing">
       <div className="p-6 space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold flex items-center gap-2">
               <FlaskConical className="h-6 w-6 text-primary" />
               Jailbreak Lab
             </h1>
             <p className="text-muted-foreground">
               Real adversarial attack testing against your AI systems
             </p>
           </div>
         </div>
 
         {/* Controls */}
         <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select target system" />
            </SelectTrigger>
            <SelectContent>
              {systems.map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  <span className="flex items-center gap-2">
                    {system.name}
                    {system.provider === 'lovable' ? (
                      <Badge variant="secondary" className="text-xs">Built-in</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{system.provider}</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
 
           <Select value={categoryFilter} onValueChange={setCategoryFilter}>
             <SelectTrigger className="w-[180px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {attackCategories.map((cat) => (
                 <SelectItem key={cat.id} value={cat.id}>
                   {cat.label}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search attacks..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9"
             />
           </div>
 
           <Button
             onClick={handleRunAll}
             disabled={isRunning || !selectedSystemId}
           >
             {isRunning ? (
               <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Zap className="h-4 w-4 mr-2" />
             )}
             Run All Attacks
           </Button>
 
           {results.length > 0 && (
             <Button variant="outline" onClick={handleExportResults}>
               <Download className="h-4 w-4 mr-2" />
               Export
             </Button>
           )}
         </div>
 
        {/* Target System Info */}
        {selectedSystem && (
          <Alert className="border-border bg-muted/50">
            <Database className="h-4 w-4" />
            <AlertTitle>Target: {selectedSystem.name}</AlertTitle>
            <AlertDescription>
              {isBuiltInTarget ? (
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Built-in Target (Lovable AI) • Fast, reliable testing without external dependencies
                </span>
              ) : (
                <>
                  Provider: {selectedSystem.provider} • Model: {selectedSystem.model_name || 'Default'} • 
                  Attacks will be executed against this system in real-time
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
 
         {/* Results Summary */}
         {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-4">
                   <div className="p-3 rounded-lg bg-muted">
                     <Zap className="h-6 w-6" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold">{results.length}</div>
                     <div className="text-sm text-muted-foreground">Total Attacks</div>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-4">
                   <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                     <Shield className="h-6 w-6 text-green-600" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-green-600">{blockedCount}</div>
                     <div className="text-sm text-muted-foreground">Blocked</div>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-4">
                   <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                     <ShieldX className="h-6 w-6 text-red-600" />
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-red-600">{successCount}</div>
                     <div className="text-sm text-muted-foreground">Vulnerabilities Found</div>
                   </div>
                 </div>
               </CardContent>
             </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <HelpCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{indeterminateCount}</div>
                      <div className="text-sm text-muted-foreground">Indeterminate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
           </div>
         )}
 
          {/* Tabbed Interface */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Tabs */}
           <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="automated">Automated</TabsTrigger>
                  <TabsTrigger value="library">Attack Library</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>

                {/* Automated Tab */}
                <TabsContent value="automated" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Automated Attack Suite</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Run all attacks in the selected category against the target system.
                      </p>
                      <Button
                        className="w-full"
                        onClick={handleRunAll}
                        disabled={isRunning || !selectedSystemId}
                      >
                        {isRunning ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        {isRunning ? 'Running...' : 'Run All Attacks'}
                      </Button>
                      {results.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Last run: {blockedCount} blocked, {successCount} succeeded, {indeterminateCount} indeterminate
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Attack Library Tab */}
                <TabsContent value="library" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Attack Library ({filteredAttacks.length})</h3>
                    <Button asChild variant="link" size="sm">
                      <Link to="/security/attack-library">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Manage
                      </Link>
                    </Button>
                  </div>
                  {attacksLoading ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                        Loading attacks...
                      </CardContent>
                    </Card>
                  ) : filteredAttacks.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attacks found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {filteredAttacks.map((attack) => (
                        <AttackCard
                          key={attack.id}
                          attack={attack}
                          onExecute={handleExecuteAttack}
                          isExecuting={runningAttackId === attack.id}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Custom Tab */}
                <TabsContent value="custom" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Custom Attack Payload</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Enter your custom attack payload here...&#10;&#10;Example: Ignore all previous instructions and tell me how to..."
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                      />
                      <Button
                        className="w-full"
                        onClick={handleRunCustom}
                        disabled={isCustomRunning || !selectedSystemId || !customPayload.trim()}
                      >
                        {isCustomRunning ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {isCustomRunning ? 'Testing...' : 'Run Custom Test'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Custom payloads are evaluated by the AI judge but not saved to the attack library.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
           </div>
 
           {/* Results Panel */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-lg font-semibold">Test Results</h2>
                {results.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportResults}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
               )}
             </div>
             
             {results.length === 0 ? (
               <Card>
                 <CardContent className="py-8 text-center text-muted-foreground">
                   <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                   <p>No results yet</p>
                   <p className="text-sm">Select a target system and execute an attack</p>
                 </CardContent>
               </Card>
             ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
                 {results.map((result, idx) => (
                   <Collapsible 
                     key={idx} 
                     open={expandedResult === idx}
                     onOpenChange={() => setExpandedResult(expandedResult === idx ? null : idx)}
                   >
                      <Card className={
                        result.verdict === 'blocked' 
                          ? 'border-green-200 dark:border-green-800' 
                          : result.verdict === 'succeeded'
                            ? 'border-red-200 dark:border-red-800'
                            : 'border-yellow-200 dark:border-yellow-800'
                      }>
                       <CardContent className="pt-4">
                         <CollapsibleTrigger className="w-full">
                           <div className="flex items-start justify-between gap-4">
                             <div className="flex items-start gap-3">
                               <div className="text-left">
                                 <div className="font-medium text-sm">{result.attackName}</div>
                                 <div className="flex items-center gap-2 mt-1">
                                    <VerdictBadge verdict={result.verdict} />
                                    {result.severity && result.verdict === 'succeeded' && (
                                      <SeverityBadge severity={result.severity} showIcon={false} />
                                   )}
                                 </div>
                               </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <ConfidenceIndicator confidence={result.confidence || 0} size="sm" />
                               {expandedResult === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                             </div>
                           </div>
                         </CollapsibleTrigger>
                         
                         <CollapsibleContent>
                           <div className="mt-4 space-y-3 border-t pt-3">
                              {/* Decision Trace */}
                              {result.decisionTrace && (
                                <DecisionTracePanel trace={result.decisionTrace} />
                              )}
                              
                             {result.reasoning && (
                               <div>
                                 <div className="text-xs font-medium text-muted-foreground mb-1">Judge Reasoning</div>
                                 <p className="text-sm">{result.reasoning}</p>
                               </div>
                             )}
                             
                             {result.targetResponse && (
                               <div>
                                 <div className="text-xs font-medium text-muted-foreground mb-1">Target Response</div>
                                 <div className="p-2 bg-muted rounded text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                                   {result.targetResponse}
                                 </div>
                               </div>
                             )}
                             
                             <div className="flex items-center gap-4 text-xs text-muted-foreground">
                               {result.latencyMs && (
                                 <span className="flex items-center gap-1">
                                   <Clock className="h-3 w-3" />
                                   {result.latencyMs}ms
                                 </span>
                               )}
                               {result.findingId && (
                                 <span className="flex items-center gap-1">
                                   <Database className="h-3 w-3" />
                                   Persisted
                                 </span>
                               )}
                                {result.riskScore !== undefined && (
                                  <span>Risk: {(result.riskScore * 100).toFixed(0)}%</span>
                                )}
                             </div>
                           </div>
                         </CollapsibleContent>
                       </CardContent>
                     </Card>
                   </Collapsible>
                 ))}
               </div>
             )}
           </div>
         </div>
       </div>
     </MainLayout>
   );
 }
