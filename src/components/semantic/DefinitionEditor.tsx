import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertTriangle, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import type { SemanticDefinition, CreateDefinitionInput } from '@/hooks/useSemanticDefinitions';
import { validateMetricYaml } from '@/lib/semantic-validator';
import type { ValidationError } from '@/lib/semantic-validator';

const DEFAULT_YAML = `metric:
  name: my_metric
  display_name: "My Metric"
  description: "Describe what this metric measures"
  owner: team@company.com
  grain: entity
  sql: |
    SELECT COUNT(*)
    FROM my_table
    WHERE status = 'active'
  synonyms:
    - alias1
    - alias2
  ai_context: "How AI agents should interpret this metric."
  governance:
    eu_ai_act_article: "Article 13"
    sensitivity: "business-critical"
    refresh_cadence: "daily"`;

interface DefinitionEditorProps {
  definition?: SemanticDefinition | null;
  onSave: (input: CreateDefinitionInput & { id?: string }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function DefinitionEditor({ definition, onSave, onCancel, saving }: DefinitionEditorProps) {
  const [yaml, setYaml] = useState(definition?.definition_yaml || DEFAULT_YAML);
  const [status, setStatus] = useState<'draft' | 'active' | 'deprecated'>(definition?.status || 'draft');

  useEffect(() => {
    if (definition) {
      setYaml(definition.definition_yaml);
      setStatus(definition.status);
    }
  }, [definition]);

  // Live validation as user types
  const { parsed, errors } = useMemo(() => validateMetricYaml(yaml), [yaml]);
  const criticalErrors = errors.filter((e: ValidationError) => e.severity === 'error');
  const warnings = errors.filter((e: ValidationError) => e.severity === 'warning');
  const isValid = criticalErrors.length === 0;

  const handleSave = async () => {
    if (!isValid) return;

    await onSave({
      id: definition?.id,
      name: parsed.name!,
      display_name: parsed.display_name,
      description: parsed.description,
      definition_yaml: yaml,
      owner_email: parsed.owner,
      status,
      grain: parsed.grain,
      sql_logic: parsed.sql,
      synonyms: parsed.synonyms,
      ai_context: parsed.ai_context,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {definition ? 'Edit Definition' : 'New Semantic Definition'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {definition && (
          <div>
            <Label className="text-xs text-muted-foreground">Version</Label>
            <Badge variant="outline" className="block mt-1 text-center">v{definition.version}</Badge>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground">Schema</Label>
          <Badge variant={isValid ? 'default' : 'destructive'} className="block mt-1 text-center">
            {isValid ? 'Valid' : `${criticalErrors.length} error${criticalErrors.length !== 1 ? 's' : ''}`}
          </Badge>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Definition YAML (OSI v1.0 Schema)</Label>
        <Textarea
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          className="font-mono text-sm min-h-[350px] bg-secondary/50"
          spellCheck={false}
        />
      </div>

      {/* Live validation errors */}
      {criticalErrors.length > 0 && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {criticalErrors.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="text-xs bg-destructive/10 px-1 rounded">{e.field}</code>
                <span>{e.message}</span>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="bg-warning/10 border-warning/20">
          <ShieldAlert className="w-4 h-4 text-yellow-500" />
          <AlertDescription className="text-yellow-600 dark:text-yellow-400">
            {warnings.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="text-xs bg-yellow-500/10 px-1 rounded">{e.field}</code>
                <span>{e.message}</span>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {isValid && warnings.length === 0 && yaml !== DEFAULT_YAML && (
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <AlertDescription className="text-success">
            YAML is valid against OSI v1.0 schema. Ready to save.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !isValid} className="bg-gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {definition ? 'Update Definition' : 'Create Definition'}
        </Button>
      </div>
    </div>
  );
}
