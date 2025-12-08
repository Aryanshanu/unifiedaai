import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Target, 
  GitBranch, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  MessageSquare,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeDetailPanelProps {
  node: {
    id: string;
    entity_id: string;
    entity_type: string;
    label: string;
    properties?: Record<string, any>;
    metadata?: Record<string, any>;
    hash?: string;
    version?: number;
    status?: string;
    source?: string;
    created_at: string;
  } | null;
  edges?: Array<{
    id: string;
    relationship_type: string;
    source_node_id: string;
    target_node_id: string;
    weight?: number;
  }>;
  allNodes?: Array<{ id: string; label: string; entity_type: string }>;
  onClose: () => void;
  onExplain: (nodeId: string) => void;
  onBlastRadius: (nodeId: string) => void;
  isExplaining?: boolean;
  blastRadiusNodes?: Set<string>;
}

const nodeColors: Record<string, string> = {
  dataset: "bg-blue-500/20 border-blue-500 text-blue-400",
  feature: "bg-purple-500/20 border-purple-500 text-purple-400",
  model: "bg-primary/20 border-primary text-primary",
  evaluation: "bg-warning/20 border-warning text-warning",
  control: "bg-success/20 border-success text-success",
  deployment: "bg-accent/20 border-accent text-accent",
  incident: "bg-destructive/20 border-destructive text-destructive",
  risk: "bg-orange-500/20 border-orange-500 text-orange-400",
  decision: "bg-cyan-500/20 border-cyan-500 text-cyan-400",
  outcome: "bg-emerald-500/20 border-emerald-500 text-emerald-400",
};

export function NodeDetailPanel({
  node,
  edges = [],
  allNodes = [],
  onClose,
  onExplain,
  onBlastRadius,
  isExplaining,
  blastRadiusNodes,
}: NodeDetailPanelProps) {
  if (!node) return null;

  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  
  const incomingEdges = edges.filter(e => e.target_node_id === node.id);
  const outgoingEdges = edges.filter(e => e.source_node_id === node.id);

  const isInBlastRadius = blastRadiusNodes?.has(node.id);

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-card border-l border-border shadow-xl z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            nodeColors[node.entity_type]?.split(' ')[0] || "bg-muted"
          )} />
          <h3 className="font-semibold text-sm truncate">{node.label}</h3>
        </div>
        <Button variant="ghost" size="iconSm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Type & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {node.entity_type}
            </Badge>
            {node.status && (
              <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                {node.status}
              </Badge>
            )}
            {node.version && (
              <Badge variant="outline">v{node.version}</Badge>
            )}
            {isInBlastRadius && (
              <Badge variant="destructive" className="gap-1">
                <Target className="w-3 h-3" />
                In Blast Radius
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => onExplain(node.id)}
              disabled={isExplaining}
            >
              {isExplaining ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <MessageSquare className="w-3 h-3" />
              )}
              Explain
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => onBlastRadius(node.id)}
            >
              <Target className="w-3 h-3" />
              Blast Radius
            </Button>
          </div>

          <Separator />

          {/* Hash Verification */}
          {node.hash && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="w-3 h-3" />
                Hash Integrity
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded truncate flex-1">
                  {node.hash.substring(0, 16)}...
                </code>
                <ShieldCheck className="w-4 h-4 text-success" />
              </div>
            </div>
          )}

          {/* Properties */}
          {node.properties && Object.keys(node.properties).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Properties
              </h4>
              <div className="space-y-1">
                {Object.entries(node.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Incoming Relationships */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <GitBranch className="w-3 h-3 rotate-180" />
              Incoming ({incomingEdges.length})
            </h4>
            {incomingEdges.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incoming relationships</p>
            ) : (
              <div className="space-y-1">
                {incomingEdges.map(edge => {
                  const sourceNode = nodeMap.get(edge.source_node_id);
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
                    >
                      <span className="text-muted-foreground truncate">
                        {sourceNode?.label || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {edge.relationship_type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing Relationships */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Outgoing ({outgoingEdges.length})
            </h4>
            {outgoingEdges.length === 0 ? (
              <p className="text-xs text-muted-foreground">No outgoing relationships</p>
            ) : (
              <div className="space-y-1">
                {outgoingEdges.map(edge => {
                  const targetNode = nodeMap.get(edge.target_node_id);
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
                    >
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {edge.relationship_type}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {targetNode?.label || 'Unknown'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entity ID</span>
                <span className="font-mono truncate max-w-32">{node.entity_id}</span>
              </div>
              {node.source && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{node.source}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(node.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
