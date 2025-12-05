import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitBranch, Search, Filter, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

const nodes = [
  { id: "1", type: "dataset", name: "Customer Data", x: 50, y: 100 },
  { id: "2", type: "dataset", name: "Transaction History", x: 50, y: 200 },
  { id: "3", type: "feature", name: "Feature Store", x: 200, y: 150 },
  { id: "4", type: "model", name: "Credit Scoring v2", x: 350, y: 100 },
  { id: "5", type: "model", name: "Fraud Detection v3", x: 350, y: 200 },
  { id: "6", type: "evaluation", name: "Fairness Suite", x: 500, y: 100 },
  { id: "7", type: "control", name: "EU AI Act", x: 500, y: 200 },
  { id: "8", type: "deployment", name: "Production", x: 650, y: 150 },
];

const edges = [
  { from: "1", to: "3" },
  { from: "2", to: "3" },
  { from: "3", to: "4" },
  { from: "3", to: "5" },
  { from: "4", to: "6" },
  { from: "5", to: "7" },
  { from: "6", to: "8" },
  { from: "7", to: "8" },
];

const nodeColors = {
  dataset: "bg-blue-500/20 border-blue-500/50 text-blue-400",
  feature: "bg-purple-500/20 border-purple-500/50 text-purple-400",
  model: "bg-primary/20 border-primary/50 text-primary",
  evaluation: "bg-warning/20 border-warning/50 text-warning",
  control: "bg-success/20 border-success/50 text-success",
  deployment: "bg-accent/20 border-accent/50 text-accent",
};

export default function Lineage() {
  return (
    <MainLayout title="Knowledge Graph" subtitle="End-to-end lineage from data to models to risks to deployments">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Nodes"
          value="2,412"
          subtitle="Models, Data, Controls"
          icon={<GitBranch className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Relations"
          value="8,147"
          subtitle="Edges in graph"
        />
        <MetricCard
          title="Lineage Depth"
          value="7"
          subtitle="Max path length"
        />
        <MetricCard
          title="Impact Radius"
          value="12"
          subtitle="Avg downstream"
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
        <div className="relative h-[500px] bg-background grid-bg overflow-hidden">
          {/* SVG for edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={i}
                  x1={fromNode.x + 60}
                  y1={fromNode.y + 20}
                  x2={toNode.x}
                  y2={toNode.y + 20}
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                "absolute px-4 py-2 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
                nodeColors[node.type as keyof typeof nodeColors]
              )}
              style={{ left: node.x, top: node.y }}
            >
              <p className="text-xs font-medium whitespace-nowrap">{node.name}</p>
              <p className="text-[10px] opacity-70 capitalize">{node.type}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 p-4 border-t border-border">
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
