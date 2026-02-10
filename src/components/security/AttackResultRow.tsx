import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttackResultRowProps {
  attackName: string;
  category: string;
  prompt: string;
  response: string;
  breached: boolean;
  breachScore: number;
  reasoning: string;
  difficulty?: string;
}

export function AttackResultRow({
  attackName,
  category,
  prompt,
  response,
  breached,
  breachScore,
  reasoning,
  difficulty,
}: AttackResultRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-colors',
      breached ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {breached ? (
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-success shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{attackName}</p>
            <p className="text-xs text-muted-foreground">{category}{difficulty ? ` • ${difficulty}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={breached ? 'destructive' : 'default'} className="text-xs">
            {breached ? 'BREACHED' : 'RESISTED'}
          </Badge>
          <span className="text-xs font-mono w-10 text-right">{(breachScore * 100).toFixed(0)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Attack Prompt</p>
            <p className="text-xs bg-muted p-2 rounded font-mono whitespace-pre-wrap">{prompt}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Model Response</p>
            <p className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{response || 'No response'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Analysis</p>
            <p className="text-xs text-muted-foreground">{reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
