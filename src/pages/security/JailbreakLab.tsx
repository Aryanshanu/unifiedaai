import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FlaskConical, Play, Zap, Search, Plus, RefreshCw, Shield, ShieldX } from 'lucide-react';
import { useSystems } from '@/hooks/useSystems';
import { useAttackLibrary, Attack } from '@/hooks/useAttackLibrary';
import { AttackCard } from '@/components/security/AttackCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  blocked: boolean;
  response: string;
  confidence: number;
}

export default function JailbreakLab() {
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningAttackId, setRunningAttackId] = useState<string | null>(null);
  const [results, setResults] = useState<AttackResult[]>([]);

  const systemsQuery = useSystems();
  const systems = systemsQuery.data || [];
  const { attacks, isLoading } = useAttackLibrary(categoryFilter === 'all' ? undefined : categoryFilter);

  const filteredAttacks = attacks.filter(attack =>
    attack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attack.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecuteAttack = async (attack: Attack) => {
    if (!selectedSystemId) {
      toast.error('Please select a system first');
      return;
    }

    setRunningAttackId(attack.id);
    try {
      const { data, error } = await supabase.functions.invoke('agent-jailbreaker', {
        body: {
          action: 'execute',
          systemId: selectedSystemId,
          attackId: attack.id,
        },
      });

      if (error) throw error;

      setResults(prev => [{
        attackId: attack.id,
        attackName: attack.name,
        blocked: data?.blocked || false,
        response: data?.response || 'No response',
        confidence: data?.confidence || 0,
      }, ...prev]);

      toast.success(data?.blocked ? 'Attack blocked!' : 'Attack succeeded - vulnerability found');
    } catch (error) {
      console.error('Attack failed:', error);
      toast.error('Failed to execute attack');
    } finally {
      setRunningAttackId(null);
    }
  };

  const handleRunAll = async () => {
    if (!selectedSystemId) {
      toast.error('Please select a system first');
      return;
    }

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-jailbreaker', {
        body: {
          action: 'automated',
          systemId: selectedSystemId,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
        },
      });

      if (error) throw error;

      if (data?.results) {
        setResults(data.results);
      }

      toast.success(`Completed ${data?.total || 0} attack tests`);
    } catch (error) {
      console.error('Automated run failed:', error);
      toast.error('Failed to run automated tests');
    } finally {
      setIsRunning(false);
    }
  };

  const blockedCount = results.filter(r => r.blocked).length;
  const successCount = results.filter(r => !r.blocked).length;

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
              Adversarial attack testing with 50+ curated scenarios
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select target system" />
            </SelectTrigger>
            <SelectContent>
              {systems.map((system) => (
                <SelectItem key={system.id} value={system.id}>
                  {system.name}
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
        </div>

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
                  <div className="p-3 rounded-lg bg-green-100">
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
                  <div className="p-3 rounded-lg bg-red-100">
                    <ShieldX className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{successCount}</div>
                    <div className="text-sm text-muted-foreground">Successful (Vulnerabilities)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attack Library */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Attack Library ({filteredAttacks.length})</h2>
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
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
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredAttacks.map((attack) => (
                  <AttackCard
                    key={attack.id}
                    attack={attack}
                    onExecute={handleExecuteAttack}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Test Results</h2>
            {results.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results yet</p>
                  <p className="text-sm">Execute an attack to see results</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {results.map((result, idx) => (
                  <Card key={idx} className={result.blocked ? 'border-green-200' : 'border-red-200'}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {result.blocked ? (
                            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <ShieldX className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{result.attackName}</div>
                            <Badge className={result.blocked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {result.blocked ? 'Blocked' : 'Succeeded'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Confidence</div>
                          <div className="font-medium">{(result.confidence * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-muted rounded text-xs font-mono max-h-20 overflow-y-auto">
                        {result.response.slice(0, 200)}...
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
