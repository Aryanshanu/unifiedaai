import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { DeploymentStatusBadge } from "@/components/governance/DeploymentStatusBadge";
import { useProjectModels, ModelWithSystem } from "@/hooks/useModels";
import { Plus, Brain, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectModelsTabProps {
  projectId: string;
  onAddModel: () => void;
}

export function ProjectModelsTab({ projectId, onAddModel }: ProjectModelsTabProps) {
  const navigate = useNavigate();
  const { data: models, isLoading } = useProjectModels(projectId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Brain className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Models Yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Register AI models in this project to track governance and evaluations.
          </p>
          <Button onClick={onAddModel} className="mt-6 gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Model
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {models.map((model) => (
        <ModelProjectCard key={model.id} model={model} />
      ))}
    </div>
  );
}

function ModelProjectCard({ model }: { model: ModelWithSystem }) {
  const navigate = useNavigate();
  
  const riskTier = model.system?.risk_tier || 'low';

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/models/${model.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{model.name}</h4>
              <p className="text-xs text-muted-foreground">v{model.version}</p>
            </div>
          </div>
          <Badge variant="outline">{model.model_type}</Badge>
        </div>

        {model.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {model.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <RiskBadge tier={riskTier} />
          {model.system && (
            <DeploymentStatusBadge status={model.system.deployment_status} />
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{model.provider || 'Custom'}</span>
          </div>
          {model.system && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/systems/${model.system!.id}`);
              }}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              System
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
