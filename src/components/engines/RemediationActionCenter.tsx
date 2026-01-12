import { useState } from 'react';
import { 
  Wrench, Play, CheckCircle2, XCircle, AlertTriangle, 
  Shield, ChevronDown, ChevronUp, Code, Loader2, 
  RotateCcw, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface RemediationAction {
  id: string;
  upload_id: string;
  issue_id?: string;
  action_type: 'DELETE_ROWS' | 'IMPUTE_MEAN' | 'IMPUTE_MODE' | 'NORMALIZE_FORMAT' | 
               'DEDUPLICATE' | 'TRIM_WHITESPACE' | 'FIX_ENCODING' | 'CAST_TYPE';
  description: string;
  sql_preview?: string;
  python_script?: string;
  affected_rows: number;
  affected_columns?: string[];
  safety_score: number;
  reversible: boolean;
  estimated_impact?: {
    before_score: number;
    after_score: number;
  };
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'reverted';
  created_at: string;
}

interface RemediationActionCenterProps {
  actions: RemediationAction[];
  onExecute?: (actionId: string) => Promise<void>;
  onExecuteAll?: (safetyThreshold: number) => Promise<void>;
  onRevert?: (actionId: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const ACTION_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  DELETE_ROWS: { label: 'Delete Rows', icon: <XCircle className="h-4 w-4" /> },
  IMPUTE_MEAN: { label: 'Fill with Mean', icon: <Sparkles className="h-4 w-4" /> },
  IMPUTE_MODE: { label: 'Fill with Mode', icon: <Sparkles className="h-4 w-4" /> },
  NORMALIZE_FORMAT: { label: 'Normalize Format', icon: <Wrench className="h-4 w-4" /> },
  DEDUPLICATE: { label: 'Remove Duplicates', icon: <CheckCircle2 className="h-4 w-4" /> },
  TRIM_WHITESPACE: { label: 'Trim Whitespace', icon: <Wrench className="h-4 w-4" /> },
  FIX_ENCODING: { label: 'Fix Encoding', icon: <Wrench className="h-4 w-4" /> },
  CAST_TYPE: { label: 'Cast Type', icon: <Code className="h-4 w-4" /> },
};

function SafetyBadge({ score }: { score: number }) {
  if (score >= 90) {
    return (
      <Badge className="bg-success/10 text-success border-success/30 gap-1">
        <Shield className="h-3 w-3" /> Safe ({score}%)
      </Badge>
    );
  }
  if (score >= 70) {
    return (
      <Badge className="bg-warning/10 text-warning border-warning/30 gap-1">
        <Shield className="h-3 w-3" /> Caution ({score}%)
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> Risky ({score}%)
    </Badge>
  );
}

function ActionCard({ 
  action, 
  onExecute, 
  onRevert,
  executing 
}: { 
  action: RemediationAction; 
  onExecute?: (id: string) => void;
  onRevert?: (id: string) => void;
  executing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = ACTION_TYPE_LABELS[action.action_type] || { label: action.action_type, icon: <Wrench className="h-4 w-4" /> };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className={cn(
        'border rounded-lg p-3 transition-colors',
        action.status === 'executed' ? 'bg-success/5 border-success/30' :
        action.status === 'failed' ? 'bg-destructive/5 border-destructive/30' :
        'hover:bg-muted/50'
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'p-2 rounded-lg shrink-0',
              action.safety_score >= 90 ? 'bg-success/10 text-success' :
              action.safety_score >= 70 ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            )}>
              {typeConfig.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-sm">{typeConfig.label}</span>
                <SafetyBadge score={action.safety_score} />
                {action.reversible && (
                  <Badge variant="outline" className="text-xs">Reversible</Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {action.description}
              </p>
              
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{action.affected_rows} rows affected</span>
                {action.estimated_impact && (
                  <span className="text-success">
                    Score: {action.estimated_impact.before_score}% → {action.estimated_impact.after_score}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {action.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={() => onExecute?.(action.id)}
                disabled={executing}
                className="gap-1"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Fix
              </Button>
            )}
            {action.status === 'executed' && action.reversible && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onRevert?.(action.id)}
                disabled={executing}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Revert
              </Button>
            )}
            {action.status === 'executed' && (
              <Badge className="bg-success/10 text-success border-success/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Done
              </Badge>
            )}
            {action.status === 'failed' && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Failed
              </Badge>
            )}
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t space-y-3">
            {action.sql_preview && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">SQL Preview:</p>
                <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto">
                  <code>{action.sql_preview}</code>
                </pre>
              </div>
            )}
            {action.python_script && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Python Script:</p>
                <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto">
                  <code>{action.python_script}</code>
                </pre>
              </div>
            )}
            {action.affected_columns && action.affected_columns.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Affected Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {action.affected_columns.map(col => (
                    <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function RemediationActionCenter({ 
  actions, 
  onExecute, 
  onExecuteAll,
  onRevert,
  loading = false,
  className 
}: RemediationActionCenterProps) {
  const [executing, setExecuting] = useState<string | null>(null);

  const pendingActions = actions.filter(a => a.status === 'pending');
  const executedActions = actions.filter(a => a.status === 'executed');
  const safeActions = pendingActions.filter(a => a.safety_score >= 90);

  const handleExecute = async (actionId: string) => {
    if (!onExecute) return;
    setExecuting(actionId);
    try {
      await onExecute(actionId);
      toast.success('Remediation applied successfully');
    } catch (error) {
      toast.error('Failed to apply remediation');
    } finally {
      setExecuting(null);
    }
  };

  const handleExecuteAllSafe = async () => {
    if (!onExecuteAll) return;
    setExecuting('all');
    try {
      await onExecuteAll(90);
      toast.success(`Applied ${safeActions.length} safe remediations`);
    } catch (error) {
      toast.error('Failed to apply some remediations');
    } finally {
      setExecuting(null);
    }
  };

  const handleRevert = async (actionId: string) => {
    if (!onRevert) return;
    setExecuting(actionId);
    try {
      await onRevert(actionId);
      toast.success('Remediation reverted');
    } catch (error) {
      toast.error('Failed to revert remediation');
    } finally {
      setExecuting(null);
    }
  };

  if (actions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
          <p>No remediation actions needed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Action Center
            </CardTitle>
            <CardDescription>
              {pendingActions.length} pending fixes • {executedActions.length} applied
            </CardDescription>
          </div>
          
          {safeActions.length > 0 && (
            <Button 
              onClick={handleExecuteAllSafe}
              disabled={loading || executing === 'all'}
              className="gap-2"
            >
              {executing === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Apply All Safe ({safeActions.length})
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Progress summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {executedActions.length}/{actions.length} complete
            </span>
          </div>
          <Progress 
            value={(executedActions.length / actions.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Actions list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {/* Pending actions first, sorted by safety */}
            {pendingActions
              .sort((a, b) => b.safety_score - a.safety_score)
              .map(action => (
                <ActionCard 
                  key={action.id}
                  action={action}
                  onExecute={handleExecute}
                  onRevert={handleRevert}
                  executing={executing === action.id}
                />
              ))}
            
            {/* Executed actions */}
            {executedActions.map(action => (
              <ActionCard 
                key={action.id}
                action={action}
                onExecute={handleExecute}
                onRevert={handleRevert}
                executing={executing === action.id}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
