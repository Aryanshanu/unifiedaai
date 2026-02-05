import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Plus, RefreshCw, Layers, Download, History, Zap, AlertTriangle, Server, Shield } from 'lucide-react';
import { useSystems } from '@/hooks/useSystems';
import { useThreatModels } from '@/hooks/useThreatModels';
import { ThreatVectorRow } from '@/components/security/ThreatVectorRow';
import { FrameworkBadge } from '@/components/security/FrameworkBadge';
import { safeInvoke } from '@/lib/safe-supabase';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const frameworks = [
  { id: 'STRIDE', label: 'STRIDE', description: 'Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation' },
  { id: 'MAESTRO', label: 'MAESTRO', description: 'Multi-layer AI Security Framework' },
  { id: 'ATLAS', label: 'ATLAS', description: 'Adversarial Threat Landscape for AI Systems' },
  { id: 'OWASP', label: 'OWASP', description: 'LLM Top 10 Vulnerabilities' },
];

export default function ThreatModeling() {
  const navigate = useNavigate();
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<string>('STRIDE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [customVectorTitle, setCustomVectorTitle] = useState('');
  const [customVectorDescription, setCustomVectorDescription] = useState('');
  const [customLikelihood, setCustomLikelihood] = useState<number>(3);
  const [customImpact, setCustomImpact] = useState<number>(3);
  const [validatingVectorId, setValidatingVectorId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const systemsQuery = useSystems();
  const systems = systemsQuery.data || [];
  const { models, vectors, createThreatModel, createThreatVector, updateThreatVector, isLoading } = useThreatModels(selectedSystemId || undefined);

  // Realtime subscription for threat model updates
  useEffect(() => {
    const channel = supabase
      .channel('threat-models-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threat_models' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['threat-models'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threat_vectors' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['threat-vectors'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const selectedSystem = systems.find(s => s.id === selectedSystemId);
  
  // Filter models for the selected system AND framework
  const systemModels = selectedSystemId 
    ? models.filter(m => m.system_id === selectedSystemId)
    : [];
  const activeModel = systemModels.find(m => m.framework === selectedFramework);
  const activeVectors = activeModel 
    ? vectors.filter(v => v.threat_model_id === activeModel.id)
    : [];
  
  // All models for history tab
  const historyModels = selectedSystemId
    ? models.filter(m => m.system_id === selectedSystemId)
    : [];

  const handleGenerateModel = async () => {
    if (!selectedSystemId) {
      toast.error('Please select a system first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await safeInvoke('agent-threat-modeler', {
          action: 'generate',
          systemId: selectedSystemId,
          framework: selectedFramework,
        }, { showErrorToast: true, toastMessage: 'Failed to generate threat model' });

      if (error) throw error;

      toast.success('Threat model generated successfully');
      // Refetch to get new model
      queryClient.invalidateQueries({ queryKey: ['threat-models'] });
    } catch (error) {
      // Error already handled by safeInvoke
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

  const handleValidateVector = async (vectorId: string) => {
    if (!selectedSystemId) {
      toast.error('No system selected');
      return;
    }
    
    setValidatingVectorId(vectorId);
    try {
      const { data, error } = await safeInvoke('agent-threat-modeler', {
        action: 'validate-vector',
        systemId: selectedSystemId,
        vectorId: vectorId,
      }, { showErrorToast: true, toastMessage: 'Failed to validate threat vector' });

      if (error) throw error;

      toast.success('Threat vector validated against target');
      queryClient.invalidateQueries({ queryKey: ['threat-vectors'] });
    } catch (error) {
      // Error handled by safeInvoke
    } finally {
      setValidatingVectorId(null);
    }
  };

  const handleAddCustomVector = async () => {
    if (!activeModel) {
      toast.error('Generate a threat model first');
      return;
    }
    if (!customVectorTitle.trim()) {
      toast.error('Vector title is required');
      return;
    }

    try {
      createThreatVector.mutate({
        threat_model_id: activeModel.id,
        title: customVectorTitle,
        description: customVectorDescription || null,
        likelihood: customLikelihood,
        impact: customImpact,
        confidence_level: 'medium',
        is_accepted: false,
        atlas_tactic: null,
        owasp_category: null,
        maestro_layer: null,
        mitigation_checklist: [],
      });

      // Reset form
      setCustomVectorTitle('');
      setCustomVectorDescription('');
      setCustomLikelihood(3);
      setCustomImpact(3);
      toast.success('Custom threat vector added');
    } catch (error) {
      toast.error('Failed to add custom vector');
    }
  };

  const totalRiskScore = activeVectors.reduce((sum, v) => {
    return sum + ((v.likelihood || 1) * (v.impact || 1));
  }, 0);

  const acceptedCount = activeVectors.filter(v => v.is_accepted).length;

  const handleExport = () => {
    if (!activeModel || activeVectors.length === 0) {
      toast.info('No threat model to export');
      return;
    }
    const exportData = {
      model: {
        name: activeModel.name,
        framework: activeModel.framework,
        risk_score: activeModel.risk_score,
        created_at: activeModel.created_at,
      },
      vectors: activeVectors.map(v => ({
        title: v.title,
        description: v.description,
        likelihood: v.likelihood,
        impact: v.impact,
        risk_score: (v.likelihood || 1) * (v.impact || 1),
        confidence_level: v.confidence_level,
        is_accepted: v.is_accepted,
        atlas_tactic: v.atlas_tactic,
        owasp_category: v.owasp_category,
        maestro_layer: v.maestro_layer,
        mitigation_checklist: v.mitigation_checklist,
      })),
      summary: {
        total_vectors: activeVectors.length,
        total_risk_score: totalRiskScore,
        accepted_risks: acceptedCount,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-model-${selectedFramework}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Threat model exported successfully');
  };

  // Empty state - No systems configured
  if (systems.length === 0 && !systemsQuery.isLoading) {
    return (
      <MainLayout title="Threat Modeling" subtitle="Multi-framework AI threat analysis">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No AI Systems Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure at least one AI system to run threat modeling analysis.
              </p>
              <Button onClick={() => navigate('/models')}>
                <Plus className="h-4 w-4 mr-2" />
                Add System
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

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
              <Button variant="outline" size="sm" onClick={handleExport}>
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
