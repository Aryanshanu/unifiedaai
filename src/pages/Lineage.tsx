import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  GitBranch, 
  Search, 
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
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { NodeDetailPanel } from "@/components/lineage/NodeDetailPanel";
import { ExplainDialog } from "@/components/lineage/ExplainDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HealthIndicator } from "@/components/shared/HealthIndicator";
import { HealthStatus } from "@/hooks/useSelfHealing";

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
  semantic_definition: "bg-teal-500/20 border-teal-500/50 text-teal-400",
};

// Entity type filter options
const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'model', label: 'Model' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'incident', label: 'Incident' },
  { value: 'control', label: 'Control' },
  { value: 'decision', label: 'Decision' },
  { value: 'risk', label: 'Risk' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'semantic_definition', label: 'Semantic Definition' },
];

// Improved layout algorithm - 420px spacing with 5-pass collision detection
function layoutNodes(nodes: any[]) {
  const typeColumns: Record<string, number> = {
    dataset: 0,
    semantic_definition: 0.5,
    feature: 1,
    model: 2,
    evaluation: 3,
    risk: 4,
    control: 5,
    incident: 4.5,
    decision: 5.5,
    deployment: 6,
    outcome: 7,
    policy: 5,
  };
  
  const typeCounters: Record<string, number> = {};
  const columnWidth = 420; // Increased to 420px as required
  const rowHeight = 110; // Increased row height
  const startX = 120;
  const startY = 100;
  const nodeWidth = 140;
  const nodeHeight = 60;
  
  // Initial placement with larger spacing
  const positioned = nodes.map((node) => {
    const type = node.entity_type || 'model';
    const column = typeColumns[type] ?? 2;
    typeCounters[type] = (typeCounters[type] || 0) + 1;
    const row = typeCounters[type];
    
    // Stagger odd/even rows for visual separation
    const xOffset = (row % 2) * 50;
    const yOffset = (row % 3) * 30;
    
    return {
      ...node,
      x: startX + column * columnWidth + xOffset,
      y: startY + row * rowHeight + yOffset,
    };
  });
  
  // 5-pass collision detection and resolution for better separation
  const minDistance = Math.max(nodeWidth, nodeHeight) + 50;
  
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const dx = positioned[j].x - positioned[i].x;
        const dy = positioned[j].y - positioned[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance > 0) {
          // Push nodes apart with stronger force on later passes
          const force = 0.5 + (pass * 0.15);
          const pushX = (dx / distance) * (minDistance - distance) * force;
          const pushY = (dy / distance) * (minDistance - distance) * force;
          positioned[j].x += pushX;
          positioned[j].y += pushY;
          positioned[i].x -= pushX;
          positioned[i].y -= pushY;
        }
      }
    }
  }
  
  // Ensure no negative positions
  let minX = Infinity, minY = Infinity;
  positioned.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  });
  
  if (minX < 50 || minY < 50) {
    const offsetX = minX < 50 ? 50 - minX : 0;
    const offsetY = minY < 50 ? 50 - minY : 0;
    positioned.forEach(node => {
      node.x += offsetX;
      node.y += offsetY;
    });
  }
  
  return positioned;
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
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [zoomLevel, setZoomLevel] = useState(1);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const { data: lineageData, isLoading: lineageLoading } = useKGLineage(
    blastRadiusEntityId || '',
    selectedNode?.entity_type || 'model'
  );

  const { mutate: explain, isPending: isExplaining, data: explanation } = useKGExplain();
  const { mutate: syncKG, isPending: isSyncing } = useKGSync();

  const isLoading = nodesLoading || edgesLoading;
  
  // Health status tracking
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Debounce timer ref for auto-sync
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 2000; // 2 seconds

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Debounced sync function
  const debouncedSync = useCallback(() => {
    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current);
    }
    
    syncDebounceRef.current = setTimeout(() => {
      setHealthStatus('loading');
      syncKG(undefined, {
        onSuccess: () => {
          refetchNodes();
          refetchEdges();
          refetchStats();
          setHealthStatus('healthy');
          setLastUpdated(new Date());
        },
        onError: () => {
          setHealthStatus('failed');
        }
      });
    }, DEBOUNCE_DELAY);
  }, [syncKG, refetchNodes, refetchEdges, refetchStats]);

  // Auto-sync when models or evaluations change (with debouncing)
  useEffect(() => {
    const channel = supabase
      .channel('kg-auto-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        () => {
          toast.info("Model changed, syncing...", { duration: 1500 });
          debouncedSync();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evaluation_runs' },
        () => {
          toast.info("Evaluation updated, syncing...", { duration: 1500 });
          debouncedSync();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
      }
    };
  }, [debouncedSync]);
  
  // Set initial health status based on data loading
  useEffect(() => {
    if (nodesLoading || edgesLoading) {
      setHealthStatus('loading');
    } else if (nodes && edges) {
      setHealthStatus('healthy');
      if (!lastUpdated) {
        setLastUpdated(new Date());
      }
    }
  }, [nodesLoading, edgesLoading, nodes, edges, lastUpdated]);

  const handleSync = useCallback(() => {
    setHealthStatus('loading');
    const startTime = Date.now();
    
    syncKG(undefined, {
      onSuccess: (data: any) => {
        const duration = data?.duration_ms || (Date.now() - startTime);
        toast.success(`Synced in ${duration}ms`);
        refetchNodes();
        refetchEdges();
        refetchStats();
        setHealthStatus('healthy');
        setLastUpdated(new Date());
      },
      onError: (error) => {
        toast.error("Sync failed");
        console.error("KG Sync error:", error);
        setHealthStatus('failed');
      }
    });
  }, [syncKG, refetchNodes, refetchEdges, refetchStats]);
  
  const handleRetry = useCallback(() => {
    handleSync();
  }, [handleSync]);

  const layoutedNodes = useMemo(() => {
    if (!nodes) return [];
    return layoutNodes(nodes);
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    let result = layoutedNodes;
    
    // Filter by entity type
    if (entityTypeFilter && entityTypeFilter !== 'all') {
      result = result.filter(node => node.entity_type === entityTypeFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter(node => 
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [layoutedNodes, searchQuery, entityTypeFilter]);

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = useMemo(() => {
    if (!edges) return [];
    if (!searchQuery && entityTypeFilter === 'all') return edges;
    return edges.filter(edge => 
      filteredNodeIds.has(edge.source_node_id) && filteredNodeIds.has(edge.target_node_id)
    );
  }, [edges, searchQuery, entityTypeFilter, filteredNodeIds]);

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
    const MAX_BLAST_RADIUS_NODES = 200;
    if (lineageData?.blast_radius) {
      const affectedIds = new Set<string>();
      // blast_radius is an object with critical_paths array, not an array itself
      const criticalPaths = lineageData.blast_radius.critical_paths;
      if (Array.isArray(criticalPaths)) {
        for (const item of criticalPaths) {
          if (affectedIds.size >= MAX_BLAST_RADIUS_NODES) break;
          if ((item as any).node_id) affectedIds.add((item as any).node_id);
          if ((item as any).id) affectedIds.add((item as any).id);
        }
      }
      // Also add downstream nodes from lineage
      if (Array.isArray(lineageData.nodes) && affectedIds.size < MAX_BLAST_RADIUS_NODES) {
        for (const node of lineageData.nodes) {
          if (affectedIds.size >= MAX_BLAST_RADIUS_NODES) break;
          if ((node as any).direction === 'downstream' && (node as any).id) {
            affectedIds.add((node as any).id);
          }
        }
      }
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

  // Calculate blast radius percentage
  const blastRadiusPercentage = useMemo(() => {
    if (!nodes?.length || !blastRadiusNodes.size) return 0;
    return Math.round((blastRadiusNodes.size / nodes.length) * 100);
  }, [nodes, blastRadiusNodes]);

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
            
            {/* Entity Type Filter Dropdown */}
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-40 bg-secondary border-border">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {ENTITY_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Blast Radius Indicator */}
            {blastRadiusNodes.size > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Target className="w-3 h-3" />
                Blast Radius: {blastRadiusNodes.size} nodes ({blastRadiusPercentage}%)
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={clearBlastRadius}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <HealthIndicator 
              status={healthStatus}
              lastUpdated={lastUpdated}
              onRetry={handleRetry}
              showLabel
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono px-2 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomReset}
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
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
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleSync}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Knowledge Graph
              </Button>
            </div>
          ) : (
            <div 
              ref={graphContainerRef}
              className="origin-top-left transition-transform duration-200"
              style={{ 
                transform: `scale(${zoomLevel})`,
                width: `${100 / zoomLevel}%`,
                height: `${100 / zoomLevel}%`,
                minWidth: '1200px',
                minHeight: '600px'
              }}
            >
              {/* SVG for edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '1200px', minHeight: '600px' }}>
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
              <TooltipProvider>
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isInBlastRadius = blastRadiusNodes.has(node.id);
                  
                  return (
                    <Tooltip key={node.id}>
                      <TooltipTrigger asChild>
                        <div
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
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-popover border-border">
                        <div className="text-xs">
                          <p className="font-medium">{node.label}</p>
                          <p className="text-muted-foreground capitalize">{node.entity_type}</p>
                          {isInBlastRadius && (
                            <p className="text-destructive mt-1">
                              In blast radius ({blastRadiusPercentage}% of graph)
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
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
