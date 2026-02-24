import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { History, ChevronDown, ChevronUp, GitCompare, RotateCcw } from 'lucide-react';
import { useDefinitionVersions } from '@/hooks/useSemanticDefinitions';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistoryPanelProps {
  definitionId: string;
  currentYaml: string;
  onRollback: (yaml: string) => void;
}

export function VersionHistoryPanel({ definitionId, currentYaml, onRollback }: VersionHistoryPanelProps) {
  const { data: versions, isLoading } = useDefinitionVersions(definitionId);
  const [open, setOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<string | null>(null);

  const selectedVersion = versions?.find(v => v.id === diffVersion);

  // Simple line-by-line diff
  const computeDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const maxLen = Math.max(oldLines.length, newLines.length);
    const result: { line: string; type: 'same' | 'added' | 'removed' }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      if (oldLine === newLine) {
        result.push({ line: oldLine || '', type: 'same' });
      } else {
        if (oldLine !== undefined) result.push({ line: oldLine, type: 'removed' });
        if (newLine !== undefined) result.push({ line: newLine, type: 'added' });
      }
    }
    return result;
  };

  if (!definitionId) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Version History
            {versions && <Badge variant="secondary" className="text-xs">{versions.length}</Badge>}
          </span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Immutable Version Snapshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded" />)}

            {!isLoading && (!versions || versions.length === 0) && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No version history yet. Versions are created automatically when you update the YAML.
              </p>
            )}

            {versions?.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-2 rounded border border-border text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">v{v.version}</Badge>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {v.definition_hash && (
                    <p className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[200px]">
                      {v.definition_hash.slice(0, 16)}...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDiffVersion(diffVersion === v.id ? null : v.id)}
                  >
                    <GitCompare className="w-3 h-3 mr-1" /> Diff
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onRollback(v.definition_yaml)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                  </Button>
                </div>
              </div>
            ))}

            {/* Diff view */}
            {selectedVersion && (
              <div className="mt-3 p-3 bg-secondary/50 rounded border border-border overflow-x-auto">
                <p className="text-xs font-semibold mb-2 text-muted-foreground">
                  Diff: v{selectedVersion.version} → current
                </p>
                <pre className="text-[11px] font-mono leading-relaxed">
                  {computeDiff(selectedVersion.definition_yaml, currentYaml).map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === 'added' ? 'text-success bg-success/10' :
                        line.type === 'removed' ? 'text-destructive bg-destructive/10' :
                        'text-muted-foreground'
                      }
                    >
                      {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                      {line.line}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
