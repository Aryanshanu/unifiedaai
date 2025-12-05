import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModelCard } from "@/components/dashboard/ModelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Filter, Plus, Grid, List } from "lucide-react";
import { cn } from "@/lib/utils";

const models = [
  { id: "1", name: "Credit Scoring v2", type: "XGBoost", version: "2.3.1", status: "warning" as const, fairnessScore: 72, robustnessScore: 88, lastEval: "2h ago", incidents: 2, provider: "AWS SageMaker", useCase: "Financial Services" },
  { id: "2", name: "Fraud Detection v3", type: "Deep Learning", version: "3.1.0", status: "healthy" as const, fairnessScore: 91, robustnessScore: 94, lastEval: "1h ago", incidents: 0, provider: "Azure ML", useCase: "Banking" },
  { id: "3", name: "Support Chatbot", type: "LLM (GPT-4)", version: "1.2.0", status: "healthy" as const, fairnessScore: 85, robustnessScore: 79, lastEval: "30m ago", incidents: 1, provider: "OpenAI", useCase: "Customer Support" },
  { id: "4", name: "Loan Approval v1", type: "Ensemble", version: "1.0.5", status: "critical" as const, fairnessScore: 58, robustnessScore: 71, lastEval: "4h ago", incidents: 5, provider: "MLflow", useCase: "Financial Services" },
  { id: "5", name: "Resume Screener", type: "BERT", version: "2.0.0", status: "healthy" as const, fairnessScore: 88, robustnessScore: 92, lastEval: "45m ago", incidents: 0, provider: "AWS SageMaker", useCase: "HR Tech" },
  { id: "6", name: "Sentiment Analyzer", type: "Transformer", version: "1.1.2", status: "healthy" as const, fairnessScore: 94, robustnessScore: 89, lastEval: "2h ago", incidents: 0, provider: "Hugging Face", useCase: "Marketing" },
];

export default function Models() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout title="Model Registry" subtitle="Manage and monitor AI/ML models across your organization">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="iconSm"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="iconSm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="gradient" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Register Model
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-foreground">{models.length}</p>
          <p className="text-xs text-muted-foreground">Total Models</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-success">{models.filter(m => m.status === "healthy").length}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-warning">{models.filter(m => m.status === "warning").length}</p>
          <p className="text-xs text-muted-foreground">Warning</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-danger">{models.filter(m => m.status === "critical").length}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
      </div>

      {/* Model Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredModels.map((model) => (
            <ModelCard key={model.id} {...model} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fairness</th>
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Eval</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((model) => (
                <tr key={model.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{model.name}</p>
                      <p className="text-xs text-muted-foreground">v{model.version}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{model.type}</td>
                  <td className="p-4 text-sm text-muted-foreground">{model.provider}</td>
                  <td className="p-4"><StatusBadge status={model.status} /></td>
                  <td className="p-4">
                    <span className={cn(
                      "font-mono font-medium",
                      model.fairnessScore >= 80 ? "text-success" : model.fairnessScore >= 60 ? "text-warning" : "text-danger"
                    )}>
                      {model.fairnessScore}%
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{model.lastEval}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}
