import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Search, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Loader2,
  Target,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKGNodes, useKGEdges, useKnowledgeGraphStats, useKGLineage, useKGExplain, useKGSync } from "@/hooks/useKnowledgeGraph";
import { useMemo, useState, useCallback, useEffect } from "react";
import { NodeDetailPanel } from "@/components/lineage/NodeDetailPanel";
import { ExplainDialog } from "@/components/lineage/ExplainDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const nodeColors: Record<string, string> = {
  dataset: "bg-blue-500/20 border-blue-500/50 text-blue-400",
  feature: "bg-purple-500/20 border-purple-500/50 text-purple-400",
  model: "bg-primary/20 border-primary/50 text-primary",
  evaluation: "bg-warning/20 border-warning/50 text-warning",
  control: "bg-success/20 border-success/50 text-success",
  deployment: "bg-accent/20 border-accent/50 text-accent",
  incident: "bg-destructive/20 border-destructive/50 text-destructive",
  risk: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  decision: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
  outcome: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  policy: "bg-pink-500/20 border-pink-500/50 text-pink-400",
};

// Simple layout algorithm - position nodes by type in columns
function layoutNodes(nodes: any[]) {
  const typeColumns: Record<string, number> = {
    dataset: 0,
    feature: 1,
    model: 2,
    evaluation: 3,
    risk: 3,
    control: 4,
    incident: 4,
    decision: 5,
    deployment: 5,
    outcome: 6,
    policy: 4,
  };
  
  const typeCounters: Record<string, number> = {};
  
  return nodes.map((node) => {
    const type = node.entity_type || 'model';
    const column = typeColumns[type] ?? 2;
    typeCounters[type] = (typeCounters[type] || 0) + 1;
    const row = typeCounters[type];
    
    return {
      ...node,
      x: 50 + column * 150,
      y: 50 + row * 80,
    };
  });
}

export default function Lineage() {
  const { data: nodes, isLoading: nodesLoading, refetch: refetchNodes } = useKGNodes();
  const { data: edges, isLoading: edgesLoading, refetch: refetchEdges } = useKGEdges();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useKnowledgeGraphStats();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [blastRadiusNodes, setBlastRadiusNodes] = useState<Set<string>>(new Set());
  const [blastRadiusEntityId, setBlastRadiusEntityId] = useState<string | null>(null);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [explainNodeId, setExplainNodeId] = useState<string | null>(null);

  const { data: lineageData, isLoading: lineageLoading } = useKGLineage(
    blastRadiusEntityId || '',
    selectedNode?.entity_type || 'model'
  );

  const { mutate: explain, isPending: isExplaining, data: explanation } = useKGExplain();
  const { mutate: syncKG, isPending: isSyncing } = useKGSync();

  const isLoading = nodesLoading || edgesLoading;

  // Auto-sync when models or evaluations change
  useEffect(() => {
    const channel = supabase
      .channel('kg-auto-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        () => {
          toast.info("Model changed, syncing Knowledge Graph...");
          syncKG(undefined, {
            onSuccess: () => {
              refetchNodes();
              refetchEdges();
              refetchStats();
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evaluation_runs' },
        () => {
          toast.info("Evaluation updated, syncing Knowledge Graph...");
          syncKG(undefined, {
            onSuccess: () => {
              refetchNodes();
              refetchEdges();
              refetchStats();
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncKG, refetchNodes, refetchEdges, refetchStats]);

  const handleSync = useCallback(() => {
    syncKG(undefined, {
      onSuccess: (data: any) => {
        toast.success("Knowledge Graph synced!", {
          description: data.message || `Synced ${data.stats?.nodes_created || 0} nodes and ${data.stats?.edges_created || 0} edges`
        });
        refetchNodes();
        refetchEdges();
        refetchStats();
      },
      onError: (error) => {
        toast.error("Sync failed", { description: error.message });
      }
    });
  }, [syncKG, refetchNodes, refetchEdges, refetchStats]);

  const layoutedNodes = useMemo(() => {
    if (!nodes) return [];
    return layoutNodes(nodes);
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return layoutedNodes;
    return layoutedNodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [layoutedNodes, searchQuery]);

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = useMemo(() => {
    if (!edges) return [];
    if (!searchQuery) return edges;
    return edges.filter(edge => 
      filteredNodeIds.has(edge.source_node_id) && filteredNodeIds.has(edge.target_node_id)
    );
  }, [edges, searchQuery, filteredNodeIds]);

  // Get node position by ID for drawing edges
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    filteredNodes.forEach(node => {
      map.set(node.id, { x: node.x, y: node.y });
    });
    return map;
  }, [filteredNodes]);

  // Update blast radius when lineage data changes
  useMemo(() => {
    if (lineageData?.blast_radius) {
      const affectedIds = new Set<string>();
      lineageData.blast_radius.forEach((item: any) => {
        if (item.node_id) affectedIds.add(item.node_id);
        if (item.id) affectedIds.add(item.id);
      });
      // Also add downstream nodes
      lineageData.downstream?.forEach((item: any) => {
        if (item.id) affectedIds.add(item.id);
      });
      setBlastRadiusNodes(affectedIds);
    }
  }, [lineageData]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setBlastRadiusNodes(new Set());
    setBlastRadiusEntityId(null);
  }, []);

  const handleExplain = useCallback((nodeId: string) => {
    const node = nodes?.find(n => n.id === nodeId);
    if (!node) return;

    setExplainNodeId(nodeId);
    setExplainDialogOpen(true);
    
    explain({
      entity_id: node.entity_id,
      entity_type: node.entity_type,
      question: `Why is this ${node.entity_type} "${node.label}" in its current state? What are its relationships and any compliance issues?`
    }, {
      onError: (error) => {
        toast.error("Failed to get explanation", {
          description: error.message
        });
      }
    });
  }, [nodes, explain]);

  const handleBlastRadius = useCallback((nodeId: string) => {
    const node = nodes?.find(n => n.id === nodeId);
    if (!node) return;

    setBlastRadiusEntityId(node.entity_id);
    toast.info("Calculating blast radius...", {
      description: `Analyzing impact for ${node.label}`
    });
  }, [nodes]);

  const clearBlastRadius = useCallback(() => {
    setBlastRadiusNodes(new Set());
    setBlastRadiusEntityId(null);
  }, []);

  const explainNode = nodes?.find(n => n.id === explainNodeId);

  return (
    <MainLayout title="Knowledge Graph" subtitle="End-to-end lineage from data to models to risks to deployments">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Nodes"
          value={statsLoading ? "..." : String(stats?.totalNodes || 0)}
          subtitle="Models, Data, Controls"
          icon={<GitBranch className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Relations"
          value={statsLoading ? "..." : String(stats?.totalEdges || 0)}
          subtitle="Edges in graph"
        />
        <MetricCard
          title="Entity Types"
          value={statsLoading ? "..." : String(Object.keys(stats?.typeCounts || {}).length)}
          subtitle="Node categories"
        />
        <MetricCard
          title="Models"
          value={statsLoading ? "..." : String(stats?.typeCounts?.model || 0)}
          subtitle="Registered models"
        />
      </div>

      {/* Graph Container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden relative">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                className="pl-9 w-64 bg-secondary border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            
            {/* Blast Radius Indicator */}
            {blastRadiusNodes.size > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Target className="w-3 h-3" />
                Blast Radius: {blastRadiusNodes.size} nodes
                <Button
                  variant="ghost"
                  size="iconSm"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={clearBlastRadius}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Graph"}
            </Button>
            <Button variant="ghost" size="iconSm">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="iconSm">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="iconSm">
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Graph Visualization */}
        <div className={cn(
          "relative h-[500px] bg-background grid-bg overflow-auto transition-all",
          selectedNode && "mr-80"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredNodes.length ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <GitBranch className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No lineage data yet</p>
              <p className="text-sm">Register models and run evaluations to build the knowledge graph</p>
            </div>
          ) : (
            <>
              {/* SVG for edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '1000px', minHeight: '600px' }}>
                {filteredEdges.map((edge) => {
                  const fromPos = nodePositions.get(edge.source_node_id);
                  const toPos = nodePositions.get(edge.target_node_id);
                  if (!fromPos || !toPos) return null;
                  
                  const isInBlastRadius = 
                    blastRadiusNodes.has(edge.source_node_id) || 
                    blastRadiusNodes.has(edge.target_node_id);
                  
                  return (
                    <line
                      key={edge.id}
                      x1={fromPos.x + 60}
                      y1={fromPos.y + 20}
                      x2={toPos.x}
                      y2={toPos.y + 20}
                      stroke={isInBlastRadius ? "hsl(var(--destructive))" : "hsl(var(--border))"}
                      strokeWidth={isInBlastRadius ? "3" : "2"}
                      strokeDasharray={isInBlastRadius ? "0" : "4"}
                      className={isInBlastRadius ? "animate-pulse" : ""}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isInBlastRadius = blastRadiusNodes.has(node.id);
                
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={cn(
                      "absolute px-4 py-2 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
                      nodeColors[node.entity_type] || nodeColors.model,
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isInBlastRadius && "ring-2 ring-destructive ring-offset-1 ring-offset-background animate-pulse"
                    )}
                    style={{ left: node.x, top: node.y }}
                  >
                    <div className="flex items-center gap-1">
                      {isInBlastRadius && <Target className="w-3 h-3 text-destructive" />}
                      <p className="text-xs font-medium whitespace-nowrap">{node.label}</p>
                    </div>
                    <p className="text-[10px] opacity-70 capitalize">{node.entity_type}</p>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Node Detail Panel */}
        <NodeDetailPanel
          node={selectedNode}
          edges={edges || []}
          allNodes={nodes || []}
          onClose={handleClosePanel}
          onExplain={handleExplain}
          onBlastRadius={handleBlastRadius}
          isExplaining={isExplaining}
          blastRadiusNodes={blastRadiusNodes}
        />

        {/* Legend */}
        <div className="flex items-center gap-6 p-4 border-t border-border flex-wrap">
          <span className="text-xs text-muted-foreground">Legend:</span>
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded border", color)} />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Explain Dialog */}
      <ExplainDialog
        open={explainDialogOpen}
        onOpenChange={setExplainDialogOpen}
        explanation={explanation}
        isLoading={isExplaining}
        nodeName={explainNode?.label}
      />
    </MainLayout>
  );
}
