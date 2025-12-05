import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModelCard } from "@/components/dashboard/ModelCard";
import { ModelRegistrationForm } from "@/components/models/ModelRegistrationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Filter, Plus, Grid, List, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels, Model } from "@/hooks/useModels";
import { useIncidents } from "@/hooks/useIncidents";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

// Helper to derive status from scores
function getModelStatus(model: Model): "healthy" | "warning" | "critical" {
  const fairness = model.fairness_score ?? 100;
  const robustness = model.robustness_score ?? 100;
  const minScore = Math.min(fairness, robustness);
  
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
}

export default function Models() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const navigate = useNavigate();
  
  const { data: models, isLoading, error } = useModels();
  const { data: incidents } = useIncidents();

  // Count incidents per model
  const incidentCountByModel = incidents?.reduce((acc, inc) => {
    if (inc.model_id && inc.status !== 'resolved') {
      acc[inc.model_id] = (acc[inc.model_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const filteredModels = models?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stats = {
    total: models?.length || 0,
    healthy: models?.filter(m => getModelStatus(m) === "healthy").length || 0,
    warning: models?.filter(m => getModelStatus(m) === "warning").length || 0,
    critical: models?.filter(m => getModelStatus(m) === "critical").length || 0,
  };

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
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-none h-8 w-8"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-none h-8 w-8"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="default" size="sm" className="bg-gradient-primary" onClick={() => setShowRegistration(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Register Model
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Models</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-success">{stats.healthy}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-warning">{stats.warning}</p>
          <p className="text-xs text-muted-foreground">Warning</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold font-mono text-danger">{stats.critical}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-3 w-24 mb-4" />
              <div className="flex gap-6 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load models</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredModels.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-foreground font-medium">No models found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try adjusting your search" : "Register your first model to get started"}
          </p>
          {!search && (
            <Button variant="default" size="sm" className="mt-4 bg-gradient-primary" onClick={() => setShowRegistration(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Register Model
            </Button>
          )}
        </div>
      )}

      {/* Model Grid/List */}
      {!isLoading && !error && filteredModels.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  id={model.id}
                  name={model.name}
                  type={model.model_type}
                  version={model.version}
                  status={getModelStatus(model)}
                  fairnessScore={model.fairness_score}
                  robustnessScore={model.robustness_score}
                  incidents={incidentCountByModel[model.id] || 0}
                  updatedAt={model.updated_at}
                />
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
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map((model) => (
                    <tr 
                      key={model.id} 
                      className="border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/models/${model.id}`)}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{model.name}</p>
                          <p className="text-xs text-muted-foreground">v{model.version}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{model.model_type}</td>
                      <td className="p-4 text-sm text-muted-foreground">{model.provider || '-'}</td>
                      <td className="p-4"><StatusBadge status={getModelStatus(model)} /></td>
                      <td className="p-4">
                        <span className={cn(
                          "font-mono font-medium",
                          (model.fairness_score ?? 0) >= 80 ? "text-success" : (model.fairness_score ?? 0) >= 60 ? "text-warning" : "text-danger"
                        )}>
                          {model.fairness_score ?? '-'}%
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(model.updated_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Registration Form Modal */}
      <ModelRegistrationForm open={showRegistration} onOpenChange={setShowRegistration} />
    </MainLayout>
  );
}
