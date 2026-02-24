import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DefinitionCard } from '@/components/semantic/DefinitionCard';
import { DefinitionEditor } from '@/components/semantic/DefinitionEditor';
import { VersionHistoryPanel } from '@/components/semantic/VersionHistoryPanel';
import { SemanticHealthDashboard } from '@/components/semantic/SemanticHealthDashboard';
import { DriftAlertsTable } from '@/components/semantic/DriftAlertsTable';
import { SemanticSearchBar } from '@/components/semantic/SemanticSearchBar';
import { useSemanticDefinitions, useCreateDefinition, useUpdateDefinition, useDeleteDefinition, useRunDriftCheck } from '@/hooks/useSemanticDefinitions';
import type { SemanticDefinition, CreateDefinitionInput } from '@/hooks/useSemanticDefinitions';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { toast } from 'sonner';
import { Plus, BookOpen, Search, Loader2, Radar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SemanticDefinitions() {
  const { data: definitions, isLoading } = useSemanticDefinitions();
  const createMutation = useCreateDefinition();
  const updateMutation = useUpdateDefinition();
  const deleteMutation = useDeleteDefinition();
  const driftCheckMutation = useRunDriftCheck();

  const [editing, setEditing] = useState<SemanticDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editorYaml, setEditorYaml] = useState<string | null>(null);

  const showEditor = creating || editing !== null;

  const filtered = definitions?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.synonyms?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const handleSave = async (input: CreateDefinitionInput & { id?: string }) => {
    try {
      if (input.id) {
        const { id, ...updates } = input;
        await updateMutation.mutateAsync({ id, ...updates } as any);
        toast.success('Definition updated');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Definition created');
      }
      setCreating(false);
      setEditing(null);
      setEditorYaml(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save definition');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Definition deleted');
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleRunDriftCheck = async () => {
    try {
      const result = await driftCheckMutation.mutateAsync();
      toast.success(`Drift check complete: ${result?.alerts_created ?? 0} alerts created`);
    } catch (error: any) {
      toast.error(error.message || 'Drift check failed');
    }
  };

  // Handle rollback from version history
  const handleRollback = (yaml: string) => {
    setEditorYaml(yaml);
    toast.info('YAML rolled back. Review and save to apply.');
  };

  return (
    <MainLayout title="Semantic Layer" subtitle="Definition IS the Code — declare once, use everywhere">
      <Alert className="mb-6 bg-primary/5 border-primary/20">
        <BookOpen className="w-4 h-4 text-primary" />
        <AlertDescription className="text-foreground">
          Business metric definitions are written once in declarative YAML and become the executable specification.
          Every BI tool, data platform, and AI agent consumes the same semantic contract — eliminating semantic drift.
        </AlertDescription>
      </Alert>

      {showEditor ? (
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="pt-6">
              <DefinitionEditor
                definition={editing ? { ...editing, definition_yaml: editorYaml ?? editing.definition_yaml } : undefined}
                onSave={handleSave}
                onCancel={() => { setCreating(false); setEditing(null); setEditorYaml(null); }}
                saving={createMutation.isPending || updateMutation.isPending}
              />
            </CardContent>
          </Card>
          {editing && (
            <VersionHistoryPanel
              definitionId={editing.id}
              currentYaml={editorYaml ?? editing.definition_yaml}
              onRollback={handleRollback}
            />
          )}
        </div>
      ) : (
        <Tabs defaultValue="registry" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <TabsList>
              <TabsTrigger value="registry">Registry</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="drift">Drift Alerts</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunDriftCheck}
                disabled={driftCheckMutation.isPending}
              >
                {driftCheckMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Radar className="w-4 h-4 mr-1" />}
                Run Drift Check
              </Button>
              <Button className="bg-gradient-primary text-primary-foreground" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Definition
              </Button>
            </div>
          </div>

          {/* Registry Tab */}
          <TabsContent value="registry" className="space-y-4">
            {/* Semantic Search */}
            <SemanticSearchBar onSelect={(id) => {
              const def = definitions?.find(d => d.id === id);
              if (def) setEditing(def);
            }} />

            {/* Text filter */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter by name, synonym..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-card border-border"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> definitions
            </p>

            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-foreground font-medium">No semantic definitions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first definition to establish a single source of truth for your metrics.
                </p>
                <Button className="mt-4 bg-gradient-primary text-primary-foreground" onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Definition
                </Button>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((def) => (
                  <DefinitionCard key={def.id} definition={def} onEdit={setEditing} onDelete={setDeleteId} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health">
            <SemanticHealthDashboard />
          </TabsContent>

          {/* Drift Alerts Tab */}
          <TabsContent value="drift">
            <DriftAlertsTable />
          </TabsContent>
        </Tabs>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Semantic Definition"
        description="This will permanently remove this definition. Any downstream consumers will lose access to this semantic contract."
        isDeleting={deleteMutation.isPending}
      />
    </MainLayout>
  );
}
