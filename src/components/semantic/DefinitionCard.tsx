import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DriftScoreIndicator } from './DriftScoreIndicator';
import { Pencil, Trash2, Hash, Clock } from 'lucide-react';
import type { SemanticDefinition } from '@/hooks/useSemanticDefinitions';
import { formatDistanceToNow } from 'date-fns';

interface DefinitionCardProps {
  definition: SemanticDefinition;
  onEdit: (def: SemanticDefinition) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success border-success/20',
  deprecated: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function DefinitionCard({ definition, onEdit, onDelete }: DefinitionCardProps) {
  // Simulate drift score from metadata or default to 0
  const driftScore = (definition.metadata as any)?.drift_score ?? 0;

  return (
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              {definition.display_name || definition.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{definition.name}</p>
          </div>
          <Badge variant="outline" className={statusColors[definition.status]}>
            {definition.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {definition.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{definition.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {definition.grain && (
            <Badge variant="secondary" className="text-xs">grain: {definition.grain}</Badge>
          )}
          {definition.synonyms?.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />v{definition.version}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(definition.updated_at), { addSuffix: true })}
            </span>
          </div>
          <DriftScoreIndicator score={driftScore} />
        </div>

        {definition.definition_hash && (
          <p className="text-[10px] font-mono text-muted-foreground/50 truncate">
            SHA-256: {definition.definition_hash}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => onEdit(definition)}>
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(definition.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
