import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Plus, RefreshCw, Layers, Download } from 'lucide-react';
import { useSystems } from '@/hooks/useSystems';
import { useThreatModels } from '@/hooks/useThreatModels';
import { ThreatVectorRow } from '@/components/security/ThreatVectorRow';
import { FrameworkBadge } from '@/components/security/FrameworkBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const frameworks = [
  { id: 'STRIDE', label: 'STRIDE', description: 'Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation' },
  { id: 'MAESTRO', label: 'MAESTRO', description: 'Multi-layer AI Security Framework' },
  { id: 'ATLAS', label: 'ATLAS', description: 'Adversarial Threat Landscape for AI Systems' },
  { id: 'OWASP', label: 'OWASP', description: 'LLM Top 10 Vulnerabilities' },
];

export default function ThreatModeling() {
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('STRIDE');
  const [isGenerating, setIsGenerating] = useState(false);

  const systemsQuery = useSystems();
  const systems = systemsQuery.data || [];
  const { models, vectors, createThreatModel, updateThreatVector, isLoading } = useThreatModels(selectedSystemId || undefined);

  const selectedSystem = systems.find(s => s.id === selectedSystemId);
  const activeModel = models.find(m => m.framework === selectedFramework);
  const activeVectors = vectors.filter(v => v.threat_model_id === activeModel?.id);

  const handleGenerateModel = async () => {
    if (!selectedSystemId) {
      toast.error('Please select a system first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-threat-modeler', {
        body: {
          action: 'generate',
          systemId: selectedSystemId,
          framework: selectedFramework,
        },
      });

      if (error) throw error;

      toast.success('Threat model generated successfully');
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate threat model');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptRisk = (vectorId: string, accepted: boolean) => {
    updateThreatVector.mutate({
      id: vectorId,
      updates: { is_accepted: accepted },
    });
  };

  const totalRiskScore = activeVectors.reduce((sum, v) => {
    return sum + ((v.likelihood || 1) * (v.impact || 1));
  }, 0);

  const acceptedCount = activeVectors.filter(v => v.is_accepted).length;

  return (
    <MainLayout title="Threat Modeling" subtitle="Multi-framework AI threat analysis">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Threat Modeling
            </h1>
            <p className="text-muted-foreground">
              Multi-framework AI threat analysis (STRIDE, MAESTRO, ATLAS, OWASP)
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

          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frameworks.map((fw) => (
                <SelectItem key={fw.id} value={fw.id}>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {fw.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateModel}
            disabled={isGenerating || !selectedSystemId}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Threat Model
          </Button>
        </div>

        {/* Framework Description */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <FrameworkBadge framework={selectedFramework as any} size="lg" />
              <p className="text-sm text-muted-foreground">
                {frameworks.find(f => f.id === selectedFramework)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Overview */}
        {activeModel && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{activeVectors.length}</div>
                <div className="text-sm text-muted-foreground">Threat Vectors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">{totalRiskScore}</div>
                <div className="text-sm text-muted-foreground">Total Risk Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{acceptedCount}</div>
                <div className="text-sm text-muted-foreground">Accepted Risks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {activeModel.risk_score?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Overall Risk Score</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Threat Vectors Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Threat Vectors</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : activeVectors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No threat vectors found</p>
                <p className="text-sm">Generate a threat model to see vectors</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Threat</TableHead>
                    <TableHead>Framework Mapping</TableHead>
                    <TableHead className="text-center">Likelihood</TableHead>
                    <TableHead className="text-center">Impact</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeVectors.map((vector) => (
                    <ThreatVectorRow
                      key={vector.id}
                      vector={vector}
                      onAccept={handleAcceptRisk}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
