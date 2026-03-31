import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModelCard as EngineCard } from "@/components/dashboard/ModelCard";
import { EngineRegistrationForm } from "@/components/engines/EngineRegistrationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useModels, ModelWithSystem as EngineWithSystem } from "@/hooks/useModels";
import { useIncidents } from "@/hooks/useIncidents";
import { Skeleton } from "@/components/ui/skeleton";

// Helper functions
function getEngineStatus(engine: EngineWithSystem): "healthy" | "warning" | "critical" {
  if (engine.system?.uri_score !== null && engine.system?.uri_score !== undefined) {
    const uriScore = engine.system.uri_score;
    if (uriScore >= 61) return "critical";
    if (uriScore >= 31) return "warning";
    return "healthy";
  }
  if (engine.fairness_score === null && engine.robustness_score === null) {
    return "warning";
  }
  const fairness = engine.fairness_score ?? Infinity;
  const robustness = engine.robustness_score ?? Infinity;
  const minScore = Math.min(fairness, robustness);
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
}

function getRiskLevel(engine: EngineWithSystem): "minimal" | "limited" | "high" | "critical" {
  if (engine.system?.risk_tier) {
    const tier = engine.system.risk_tier;
    if (tier === 'low') return 'minimal';
    if (tier === 'medium') return 'limited';
    if (tier === 'high') return 'high';
    return 'critical';
  }
  if (engine.fairness_score === null && engine.robustness_score === null) {
    return 'limited';
  }
  const fairness = engine.fairness_score;
  const robustness = engine.robustness_score;
  const minScore = Math.min(fairness ?? Infinity, robustness ?? Infinity);
  if (minScore >= 80) return 'minimal';
  if (minScore >= 60) return 'limited';
  if (minScore >= 40) return 'high';
  return 'critical';
}

function getEnvironment(engine: EngineWithSystem): "production" | "staging" | "development" {
  if (engine.project?.environment) {
    return engine.project.environment as "production" | "staging" | "development";
  }
  if (engine.system?.deployment_status === 'deployed') return 'production';
  if (engine.system?.deployment_status === 'approved') return 'staging';
  return 'development';
}

function getTeamName(engineType: string): string {
  const teams: Record<string, string> = {
    'llm': 'System Team',
    'classification': 'Data Engineering',
    'regression': 'Core Logic',
    'nlp': 'NLP Team',
    'vision': 'Computer Vision',
  };
  return teams[engineType.toLowerCase()] || 'Product Team';
}

export default function LogicEngines() {
  const [search, setSearch] = useState("");
  const [showRegistration, setShowRegistration] = useState(new URLSearchParams(window.location.search).get('register') === 'true');
  const navigate = useNavigate();
  
  const { data: models, isLoading, error } = useModels();
  const { data: incidents } = useIncidents();

  const incidentCountByModel = incidents?.data?.reduce((acc, inc) => {
    if (inc.model_id && inc.status !== 'resolved') {
      acc[inc.model_id] = (acc[inc.model_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const filteredModels = models?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.model_type.toLowerCase().includes(search.toLowerCase()) ||
    (m.description?.toLowerCase().includes(search.toLowerCase())) ||
    (m.project?.name?.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const totalModels = models?.length || 0;

  return (
    <MainLayout title="Engine Registry" subtitle="Manage and track all logic engines and autonomous systems">
      <div className="space-y-6">
        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search engines by name, type, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-card border-border text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              className="h-11 px-4 bg-gradient-primary text-primary-foreground" 
              onClick={() => setShowRegistration(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Engine
            </Button>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredModels.length}</span> of{" "}
          <span className="font-semibold text-foreground">{totalModels}</span> engines
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="text-right">
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-px w-full mb-3" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
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
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <p className="text-foreground font-medium text-lg">No engines found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {search ? "Try adjusting your search" : "Register your first engine to get started"}
            </p>
            {!search && (
              <Button 
                className="mt-6 bg-gradient-primary text-primary-foreground" 
                onClick={() => setShowRegistration(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Engine
              </Button>
            )}
          </div>
        )}

        {/* Model Grid */}
        {!isLoading && !error && filteredModels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredModels.map((model) => (
              <EngineCard
                key={model.id}
                id={model.id}
                name={model.name}
                type={model.model_type}
                version={model.version}
                description={model.description || undefined}
                status={getEngineStatus(model)}
                riskLevel={getRiskLevel(model)}
                environment={getEnvironment(model)}
                fairnessScore={model.fairness_score}
                robustnessScore={model.robustness_score}
                team={getTeamName(model.model_type)}
                incidents={incidentCountByModel[model.id] || 0}
                updatedAt={model.updated_at}
              />
            ))}
          </div>
        )}
      </div>

      {/* Registration Form Modal */}
      <EngineRegistrationForm open={showRegistration} onOpenChange={setShowRegistration} />
    </MainLayout>
  );
}
