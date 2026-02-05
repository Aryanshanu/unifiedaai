 import { useState, useEffect } from 'react';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Input } from '@/components/ui/input';
 import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { 
   FlaskConical, Play, Zap, Search, RefreshCw, Shield, ShieldX, Download, 
   AlertTriangle, ChevronDown, ChevronUp, Clock, ExternalLink, ServerCrash, Database
 } from 'lucide-react';
 import { useSystems } from '@/hooks/useSystems';
 import { useAttackLibrary, Attack } from '@/hooks/useAttackLibrary';
 import { useSecurityFindings } from '@/hooks/useSecurityFindings';
 import { AttackCard } from '@/components/security/AttackCard';
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
   blocked: boolean;
   response: string;
   targetResponse?: string;
   confidence: number;
   reasoning?: string;
   riskScore?: number;
   severity?: string;
   latencyMs?: number;
   findingId?: string;
 }
 
 export default function JailbreakLab() {
   const [selectedSystemId, setSelectedSystemId] = useState<string>('');
   const [categoryFilter, setCategoryFilter] = useState<string>('all');
   const [searchQuery, setSearchQuery] = useState('');
   const [isRunning, setIsRunning] = useState(false);
   const [runningAttackId, setRunningAttackId] = useState<string | null>(null);
   const [results, setResults] = useState<AttackResult[]>([]);
   const [expandedResult, setExpandedResult] = useState<number | null>(null);
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
     const startTime = Date.now();
     
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
         blocked: data?.blocked ?? true,
         response: data?.response || 'No response captured',
         targetResponse: data?.targetResponse,
         confidence: data?.confidence || 0,
         reasoning: data?.reasoning,
         riskScore: data?.riskScore,
         severity: data?.severity,
         latencyMs: data?.latencyMs || (Date.now() - startTime),
         findingId: data?.findingId,
       };
 
       setResults(prev => [result, ...prev]);
 
       // Refetch findings to show persisted data
       refetchFindings();
 
       if (result.blocked) {
         toast.success(`Attack blocked! The target refused the ${attack.name} attack.`);
       } else {
         toast.error(`Vulnerability found! ${attack.name} succeeded against the target.`);
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
       const { data, error } = await safeInvoke<{ results: AttackResult[]; total: number; blocked: number; succeeded: number }>('agent-jailbreaker', {
         action: 'automated',
         systemId: selectedSystemId,
         category: categoryFilter === 'all' ? undefined : categoryFilter,
       }, { showErrorToast: true, toastMessage: 'Failed to run automated tests' });
 
       if (error) throw error;
 
       if (data?.results) {
         setResults(data.results);
       }
 
       // Refetch findings
       refetchFindings();
 
       toast.success(`Completed ${data?.total || 0} attacks: ${data?.blocked || 0} blocked, ${data?.succeeded || 0} vulnerabilities found`);
     } catch (error) {
       // Error already handled by safeInvoke
     } finally {
       setIsRunning(false);
     }
   };
 
   const blockedCount = results.filter(r => r.blocked).length;
   const successCount = results.filter(r => !r.blocked).length;
 
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
   if (systems.length === 0 && !systemsQuery.isLoading) {
     return (
       <MainLayout title="Jailbreak Lab" subtitle="Adversarial attack testing">
         <div className="p-6">
           <Alert className="border-yellow-500 bg-yellow-50">
             <AlertTriangle className="h-4 w-4 text-yellow-600" />
             <AlertTitle>No Target Systems Configured</AlertTitle>
             <AlertDescription className="mt-2">
               <p>You need to configure at least one AI system to test.</p>
               <Button asChild className="mt-3" variant="outline">
                 <Link to="/models">
                   <ServerCrash className="h-4 w-4 mr-2" />
                   Configure Target System
                 </Link>
               </Button>
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
                     <Badge variant="outline" className="text-xs">{system.provider}</Badge>
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
           <Alert className="border-blue-200 bg-blue-50/50">
             <Database className="h-4 w-4 text-blue-600" />
             <AlertTitle className="text-blue-800">Target: {selectedSystem.name}</AlertTitle>
             <AlertDescription className="text-blue-700">
               Provider: {selectedSystem.provider} • Model: {selectedSystem.model_name || 'Default'} • 
               Attacks will be executed against this system in real-time
             </AlertDescription>
           </Alert>
         )}
 
         {/* Results Summary */}
         {results.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
           </div>
         )}
 
         {/* Attack Library + Results Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Attack Library */}
           <div className="space-y-4">
             <h2 className="text-lg font-semibold">Attack Library ({filteredAttacks.length})</h2>
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
                   <p className="text-sm">Try adjusting your filters or</p>
                   <Button asChild variant="link" className="mt-2">
                     <Link to="/security/attack-library">
                       <ExternalLink className="h-4 w-4 mr-2" />
                       View Attack Library
                     </Link>
                   </Button>
                 </CardContent>
               </Card>
             ) : (
               <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
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
           </div>
 
           {/* Results Panel */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h2 className="text-lg font-semibold">Test Results</h2>
               {jailbreakFindings.length > 0 && (
                 <Badge variant="outline" className="text-xs">
                   {jailbreakFindings.length} persisted findings
                 </Badge>
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
               <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                 {results.map((result, idx) => (
                   <Collapsible 
                     key={idx} 
                     open={expandedResult === idx}
                     onOpenChange={() => setExpandedResult(expandedResult === idx ? null : idx)}
                   >
                     <Card className={result.blocked ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
                       <CardContent className="pt-4">
                         <CollapsibleTrigger className="w-full">
                           <div className="flex items-start justify-between gap-4">
                             <div className="flex items-start gap-3">
                               {result.blocked ? (
                                 <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                               ) : (
                                 <ShieldX className="h-5 w-5 text-red-500 mt-0.5" />
                               )}
                               <div className="text-left">
                                 <div className="font-medium text-sm">{result.attackName}</div>
                                 <div className="flex items-center gap-2 mt-1">
                                   <Badge className={result.blocked ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                                     {result.blocked ? 'Blocked' : 'Succeeded'}
                                   </Badge>
                                   {result.severity && !result.blocked && (
                                     <Badge variant="outline" className="text-xs capitalize">{result.severity}</Badge>
                                   )}
                                 </div>
                               </div>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="text-right">
                                 <div className="text-xs text-muted-foreground">Confidence</div>
                                 <div className="font-medium">{((result.confidence || 0) * 100).toFixed(0)}%</div>
                               </div>
                               {expandedResult === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                             </div>
                           </div>
                         </CollapsibleTrigger>
                         
                         <CollapsibleContent>
                           <div className="mt-4 space-y-3 border-t pt-3">
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
