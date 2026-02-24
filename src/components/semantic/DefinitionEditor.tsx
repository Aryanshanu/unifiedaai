import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { SemanticDefinition, CreateDefinitionInput } from '@/hooks/useSemanticDefinitions';

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

interface ParsedYaml {
  name?: string;
  display_name?: string;
  description?: string;
  owner?: string;
  grain?: string;
  sql?: string;
  synonyms?: string[];
  ai_context?: string;
}

function parseSimpleYaml(yaml: string): { parsed: ParsedYaml; errors: string[] } {
  const errors: string[] = [];
  const parsed: ParsedYaml = {};

  try {
    // Basic YAML-like parsing for the metric block
    const lines = yaml.split('\n');
    let inSql = false;
    let sqlLines: string[] = [];
    let inSynonyms = false;
    const synonyms: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (inSql) {
        if (trimmed && !trimmed.startsWith('-') && !trimmed.includes(':') || line.startsWith('    ')) {
          if (line.startsWith('    ') || line.startsWith('\t\t')) {
            sqlLines.push(trimmed);
            continue;
          }
        }
        inSql = false;
        parsed.sql = sqlLines.join('\n');
      }

      if (inSynonyms) {
        if (trimmed.startsWith('- ')) {
          synonyms.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
          continue;
        }
        inSynonyms = false;
        parsed.synonyms = synonyms;
      }

      if (trimmed.startsWith('name:')) parsed.name = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      else if (trimmed.startsWith('display_name:')) parsed.display_name = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      else if (trimmed.startsWith('description:')) parsed.description = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      else if (trimmed.startsWith('owner:')) parsed.owner = trimmed.split(':').slice(1).join(':').trim();
      else if (trimmed.startsWith('grain:')) parsed.grain = trimmed.split(':').slice(1).join(':').trim();
      else if (trimmed.startsWith('ai_context:')) parsed.ai_context = trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
      else if (trimmed === 'sql: |') { inSql = true; sqlLines = []; }
      else if (trimmed === 'synonyms:') { inSynonyms = true; }
    }

    if (inSql && sqlLines.length > 0) parsed.sql = sqlLines.join('\n');
    if (inSynonyms && synonyms.length > 0) parsed.synonyms = synonyms;

    if (!parsed.name) errors.push('Missing required field: name');
  } catch {
    errors.push('Failed to parse YAML structure');
  }

  return { parsed, errors };
}

export function DefinitionEditor({ definition, onSave, onCancel, saving }: DefinitionEditorProps) {
  const [yaml, setYaml] = useState(definition?.definition_yaml || DEFAULT_YAML);
  const [status, setStatus] = useState<'draft' | 'active' | 'deprecated'>(definition?.status || 'draft');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationOk, setValidationOk] = useState(false);

  useEffect(() => {
    if (definition) {
      setYaml(definition.definition_yaml);
      setStatus(definition.status);
    }
  }, [definition]);

  const validate = () => {
    const { parsed, errors } = parseSimpleYaml(yaml);
    setValidationErrors(errors);
    setValidationOk(errors.length === 0);
    return { parsed, errors };
  };

  const handleSave = async () => {
    const { parsed, errors } = validate();
    if (errors.length > 0) return;

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
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Definition YAML</Label>
        <Textarea
          value={yaml}
          onChange={(e) => { setYaml(e.target.value); setValidationOk(false); setValidationErrors([]); }}
          className="font-mono text-sm min-h-[350px] bg-secondary/50"
          spellCheck={false}
        />
      </div>

      {validationErrors.length > 0 && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
          </AlertDescription>
        </Alert>
      )}

      {validationOk && (
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <AlertDescription className="text-success">
            YAML is valid. Ready to save.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={validate} type="button">
          Validate
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {definition ? 'Update Definition' : 'Create Definition'}
        </Button>
      </div>
    </div>
  );
}
