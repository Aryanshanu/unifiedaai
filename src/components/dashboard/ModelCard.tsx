import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Database, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useDeleteModel } from "@/hooks/useModels";
import { useAuth } from "@/hooks/useAuth";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModelCardProps {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  status: "healthy" | "warning" | "critical";
  riskLevel?: "minimal" | "limited" | "high" | "critical";
  environment?: "production" | "staging" | "development";
  team?: string;
  fairnessScore?: number | null;
  robustnessScore?: number | null;
  lastEval?: string;
  incidents?: number;
  updatedAt?: string;
}

const typeColors: Record<string, string> = {
  classification: "text-primary",
  llm: "text-accent",
  regression: "text-warning",
  nlp: "text-success",
  vision: "text-pink-400",
};

const envColors: Record<string, string> = {
  production: "text-muted-foreground",
  staging: "text-muted-foreground",
  development: "text-muted-foreground",
};

const riskColors: Record<string, string> = {
  minimal: "text-success",
  limited: "text-warning",
  high: "text-danger",
  critical: "text-risk-critical",
};

function getEnvFromStatus(status: string): "production" | "staging" | "development" {
  if (status === "healthy") return "production";
  if (status === "warning") return "staging";
  return "development";
}

function getRiskFromScores(fairness?: number | null, robustness?: number | null): "minimal" | "limited" | "high" | "critical" {
  // No fake defaults - if both scores are null, return unknown state
  if (fairness === null && robustness === null) {
    return "limited"; // Unknown displayed as limited risk
  }
  
  // Use real scores only
  const scores: number[] = [];
  if (fairness !== null && fairness !== undefined) scores.push(fairness);
  if (robustness !== null && robustness !== undefined) scores.push(robustness);
  
  if (scores.length === 0) return "limited";
  
  const minScore = Math.min(...scores);
  if (minScore >= 80) return "minimal";
  if (minScore >= 60) return "limited";
  if (minScore >= 40) return "high";
  return "critical";
}

export function ModelCard({
  id,
  name,
  type,
  version,
  description,
  status,
  riskLevel,
  environment,
  team,
  fairnessScore,
  robustnessScore,
  updatedAt,
}: ModelCardProps) {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const { toast } = useToast();
  const deleteModel = useDeleteModel();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const canDelete = hasAnyRole(['admin', 'analyst']);
  const displayEnv = environment || getEnvFromStatus(status);
  const displayRisk = riskLevel || getRiskFromScores(fairnessScore, robustnessScore);
  const typeKey = type.toLowerCase().replace(/[^a-z]/g, '');
  const formattedDate = updatedAt ? format(new Date(updatedAt), 'MM/dd/yyyy') : '-';
  
  const handleClick = () => {
    navigate(`/models/${id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteModel.mutateAsync(id);
      toast({
        title: "Model deleted",
        description: `"${name}" has been permanently deleted.`,
      });
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to delete model",
        description: error.message || "An error occurred while deleting the model.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <div 
        className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer group"
      >
        {/* Header with icon and badges */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
            onClick={handleClick}
          >
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", typeColors[typeKey] || "text-primary")}>
                {type}
              </p>
              <p className={cn("text-xs uppercase tracking-wide mt-0.5", envColors[displayEnv])}>
                {displayEnv}
              </p>
            </div>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Model
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Model Name & Description - Clickable */}
        <div onClick={handleClick}>
          <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description || `${type} model for AI operations`}
          </p>
        </div>

        {/* Version & Risk Level */}
        <div className="flex items-center justify-between mb-3" onClick={handleClick}>
          <div>
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="text-sm font-medium text-foreground">{version}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Risk Level</p>
            <p className={cn("text-sm font-medium", riskColors[displayRisk])}>
              {displayRisk}
            </p>
          </div>
        </div>

        {/* Footer: Team & Updated */}
        <div className="flex items-center justify-between pt-3 border-t border-border" onClick={handleClick}>
          <p className="text-xs text-muted-foreground">{team || 'AI Team'}</p>
          <p className="text-xs text-muted-foreground">Updated {formattedDate}</p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Model"
        description={`Are you sure you want to delete "${name}"? This will also delete the linked system and all associated data. This action cannot be undone.`}
        onConfirm={handleDelete}
        isDeleting={deleteModel.isPending}
      />
    </>
  );
}
