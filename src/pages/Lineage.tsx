import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, Search, Filter, ZoomIn, ZoomOut, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKGNodes, useKGEdges, useKnowledgeGraphStats } from "@/hooks/useKnowledgeGraph";
import { useMemo, useState } from "react";

const nodeColors: Record<string, string> = {
  dataset: "bg-blue-500/20 border-blue-500/50 text-blue-400",
  feature: "bg-purple-500/20 border-purple-500/50 text-purple-400",
  model: "bg-primary/20 border-primary/50 text-primary",
  evaluation: "bg-warning/20 border-warning/50 text-warning",
  control: "bg-success/20 border-success/50 text-success",
  deployment: "bg-accent/20 border-accent/50 text-accent",
  incident: "bg-danger/20 border-danger/50 text-danger",
  policy: "bg-orange-500/20 border-orange-500/50 text-orange-400",
};

// Simple layout algorithm - position nodes by type in columns
function layoutNodes(nodes: any[]) {
  const typeColumns: Record<string, number> = {
    dataset: 0,
    feature: 1,
    model: 2,
    evaluation: 3,
    policy: 3,
    control: 4,
    incident: 4,
    deployment: 5,
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
  const { data: nodes, isLoading: nodesLoading } = useKGNodes();
  const { data: edges, isLoading: edgesLoading } = useKGEdges();
  const { data: stats, isLoading: statsLoading } = useKnowledgeGraphStats();
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = nodesLoading || edgesLoading;

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
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
          </div>

          <div className="flex items-center gap-2">
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
        <div className="relative h-[500px] bg-background grid-bg overflow-auto">
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
                  return (
                    <line
                      key={edge.id}
                      x1={fromPos.x + 60}
                      y1={fromPos.y + 20}
                      x2={toPos.x}
                      y2={toPos.y + 20}
                      stroke="hsl(var(--border))"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "absolute px-4 py-2 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
                    nodeColors[node.entity_type] || nodeColors.model
                  )}
                  style={{ left: node.x, top: node.y }}
                >
                  <p className="text-xs font-medium whitespace-nowrap">{node.label}</p>
                  <p className="text-[10px] opacity-70 capitalize">{node.entity_type}</p>
                </div>
              ))}
            </>
          )}
        </div>

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
    </MainLayout>
  );
}
