import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModelCard } from "@/components/dashboard/ModelCard";
import { ModelRegistrationForm } from "@/components/models/ModelRegistrationForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, Plus, Settings } from "lucide-react";
import { useModels, ModelWithSystem } from "@/hooks/useModels";
import { useIncidents } from "@/hooks/useIncidents";
import { Skeleton } from "@/components/ui/skeleton";
import { HuggingFaceSettings } from "@/components/settings/HuggingFaceSettings";

// Helper to derive status from system data or fallback to model scores
function getModelStatus(model: ModelWithSystem): "healthy" | "warning" | "critical" {
  // If linked to a system, use uri_score
  if (model.system?.uri_score !== null && model.system?.uri_score !== undefined) {
    const uriScore = model.system.uri_score;
    if (uriScore >= 61) return "critical";
    if (uriScore >= 31) return "warning";
    return "healthy";
  }
  
  // No fake "100" defaults - use real scores only
  if (model.fairness_score === null && model.robustness_score === null) {
    return "warning"; // Unknown state shown as warning
  }
  
  // Use Infinity for null so only real scores participate in Math.min
  const fairness = model.fairness_score ?? Infinity;
  const robustness = model.robustness_score ?? Infinity;
  const minScore = Math.min(fairness, robustness);
  
  if (minScore < 60) return "critical";
  if (minScore < 80) return "warning";
  return "healthy";
}

// Get risk level from system
function getRiskLevel(model: ModelWithSystem): "minimal" | "limited" | "high" | "critical" {
  if (model.system?.risk_tier) {
    const tier = model.system.risk_tier;
    if (tier === 'low') return 'minimal';
    if (tier === 'medium') return 'limited';
    if (tier === 'high') return 'high';
    return 'critical';
  }
  
  // No fake defaults - if no scores exist, return undefined state
  if (model.fairness_score === null && model.robustness_score === null) {
    return 'limited'; // Unknown risk level
  }
  
  const fairness = model.fairness_score;
  const robustness = model.robustness_score;
  const minScore = Math.min(fairness ?? Infinity, robustness ?? Infinity);
  if (minScore >= 80) return 'minimal';
  if (minScore >= 60) return 'limited';
  if (minScore >= 40) return 'high';
  return 'critical';
}

// Get environment from system or project
function getEnvironment(model: ModelWithSystem): "production" | "staging" | "development" {
  if (model.project?.environment) {
    return model.project.environment as "production" | "staging" | "development";
  }
  if (model.system?.deployment_status === 'deployed') return 'production';
  if (model.system?.deployment_status === 'approved') return 'staging';
  return 'development';
}

// Generate team name based on model type
function getTeamName(modelType: string): string {
  const teams: Record<string, string> = {
    'llm': 'AI Team',
    'classification': 'Data Science',
    'regression': 'ML Engineering',
    'nlp': 'NLP Team',
    'vision': 'Computer Vision',
  };
  return teams[modelType.toLowerCase()] || 'Product Team';
}

export default function Models() {
  const [search, setSearch] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const navigate = useNavigate();
  
  const { data: models, isLoading, error } = useModels();
  const { data: incidents } = useIncidents();

  // Count incidents per model
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
    <MainLayout title="Model Registry" subtitle="Manage and track all AI models">
      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="huggingface" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            HuggingFace Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models by name, type, project..."
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
                Add Model
              </Button>
            </div>
          </div>

          {/* Count */}
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredModels.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalModels}</span> models
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
              <p className="text-foreground font-medium text-lg">No models found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {search ? "Try adjusting your search" : "Register your first model to get started"}
              </p>
              {!search && (
                <Button 
                  className="mt-6 bg-gradient-primary text-primary-foreground" 
                  onClick={() => setShowRegistration(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              )}
            </div>
          )}

          {/* Model Grid */}
          {!isLoading && !error && filteredModels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.id}
                  id={model.id}
                  name={model.name}
                  type={model.model_type}
                  version={model.version}
                  description={model.description || undefined}
                  status={getModelStatus(model)}
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
        </TabsContent>

        <TabsContent value="huggingface">
          <HuggingFaceSettings />
        </TabsContent>
      </Tabs>

      {/* Registration Form Modal */}
      <ModelRegistrationForm open={showRegistration} onOpenChange={setShowRegistration} />
    </MainLayout>
  );
}
