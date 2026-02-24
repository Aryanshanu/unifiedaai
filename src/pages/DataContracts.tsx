import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Plus, AlertTriangle, CheckCircle2, XCircle, AlertCircle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

function DataContractsContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const navigate = useNavigate();
  const [newContract, setNewContract] = useState({
    name: '',
    freshness_sla_hours: 24,
    completeness_threshold: 0.95,
    validity_threshold: 0.99,
    uniqueness_threshold: 0.95,
    enforcement_mode: 'warn'
  });
  const queryClient = useQueryClient();

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('datasets').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: contracts } = useQuery({
    queryKey: ['data-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('data_contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: violations } = useQuery({
    queryKey: ['contract-violations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('data_contract_violations').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  // Consuming semantic definitions - definitions that reference datasets used by contracts
  const { data: consumingDefinitions } = useQuery({
    queryKey: ['consuming-semantic-definitions', contracts],
    queryFn: async () => {
      if (!contracts || contracts.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('semantic_definitions')
        .select('id, name, display_name, status, sql_logic, upstream_dependencies')
        .eq('status', 'active');
      if (error) return [];
      return data || [];
    },
    enabled: !!contracts && contracts.length > 0,
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDataset || !newContract.name) throw new Error('Dataset and name required');
      const { error } = await supabase.from('data_contracts').insert({
        dataset_id: selectedDataset,
        name: newContract.name,
        freshness_sla_hours: newContract.freshness_sla_hours,
        quality_thresholds: {
          completeness: newContract.completeness_threshold,
          validity: newContract.validity_threshold,
          uniqueness: newContract.uniqueness_threshold
        },
        enforcement_mode: newContract.enforcement_mode,
        status: 'active'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contract created');
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['data-contracts'] });
    },
    onError: (e) => toast.error(e.message)
  });

  const resolveViolationMutation = useMutation({
    mutationFn: async (violationId: string) => {
      const { error } = await supabase.from('data_contract_violations').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', violationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Resolved');
      queryClient.invalidateQueries({ queryKey: ['contract-violations'] });
    }
  });

  const openViolationsCount = violations?.filter((v: any) => v.status === 'open').length || 0;

  return (
    <MainLayout title="Data Contracts">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8 text-primary" />Data Contracts</h1>
            <p className="text-muted-foreground mt-1">Define and enforce data quality expectations</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create Contract</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Data Contract</DialogTitle>
                <DialogDescription>Define quality expectations</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Dataset</Label>
                  <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{datasets?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Name</Label><Input value={newContract.name} onChange={(e) => setNewContract({ ...newContract, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Freshness SLA (hours)</Label><Input type="number" value={newContract.freshness_sla_hours} onChange={(e) => setNewContract({ ...newContract, freshness_sla_hours: parseInt(e.target.value) })} /></div>
                  <div><Label>Enforcement</Label>
                    <Select value={newContract.enforcement_mode} onValueChange={(v) => setNewContract({ ...newContract, enforcement_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="audit_only">Audit Only</SelectItem>
                        <SelectItem value="warn">Warn</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => createContractMutation.mutate()} disabled={createContractMutation.isPending}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-4"><FileText className="h-6 w-6 text-primary" /><div><div className="text-2xl font-bold">{contracts?.length || 0}</div><div className="text-sm text-muted-foreground">Contracts</div></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><CheckCircle2 className="h-6 w-6 text-green-500" /><div><div className="text-2xl font-bold">{contracts?.filter((c: any) => c.status === 'active').length || 0}</div><div className="text-sm text-muted-foreground">Active</div></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-yellow-500" /><div><div className="text-2xl font-bold">{openViolationsCount}</div><div className="text-sm text-muted-foreground">Open Violations</div></div></CardContent></Card>
        </div>

        {openViolationsCount > 0 && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Violations</AlertTitle><AlertDescription>{openViolationsCount} require attention</AlertDescription></Alert>}

        {/* Consuming Semantic Definitions */}
        {consumingDefinitions && consumingDefinitions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-500" />
                Consuming Semantic Definitions
              </CardTitle>
              <CardDescription>Metric definitions that depend on contracted datasets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {consumingDefinitions.map((def: any) => (
                  <Badge 
                    key={def.id} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => navigate('/semantic-definitions')}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {def.display_name || def.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="contracts">
          <TabsList><TabsTrigger value="contracts">Contracts</TabsTrigger><TabsTrigger value="violations">Violations {openViolationsCount > 0 && <Badge className="ml-2" variant="destructive">{openViolationsCount}</Badge>}</TabsTrigger></TabsList>
          <TabsContent value="contracts" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {contracts && contracts.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Enforcement</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {contracts.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{c.enforcement_mode}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-center py-8 text-muted-foreground">No contracts yet</p>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="violations" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {violations && violations.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {violations.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.violation_type}</TableCell>
                          <TableCell><Badge variant={v.severity === 'critical' ? 'destructive' : 'secondary'}>{v.severity}</Badge></TableCell>
                          <TableCell><Badge variant={v.status === 'open' ? 'destructive' : 'default'}>{v.status}</Badge></TableCell>
                          <TableCell>{v.status === 'open' && <Button size="sm" variant="outline" onClick={() => resolveViolationMutation.mutate(v.id)}>Resolve</Button>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-center py-8 text-muted-foreground">No violations</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function DataContracts() {
  return <ErrorBoundary><DataContractsContent /></ErrorBoundary>;
}
