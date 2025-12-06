import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, ChevronRight, Shield, Database, Server, Calendar, Building2, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useDeleteProject, type Project } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: Project;
  systemCount?: number;
}

export function ProjectCard({ project, systemCount = 0 }: ProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const deleteProject = useDeleteProject();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = user?.id === project.owner_id;

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case "low": return "bg-success/10 text-success border-success/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "development": return "bg-primary/10 text-primary border-primary/20";
      case "staging": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "production": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCriticalityColor = (score: number) => {
    if (score <= 3) return "text-success";
    if (score <= 5) return "text-warning";
    if (score <= 7) return "text-orange-500";
    return "text-destructive";
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      toast({
        title: "Project deleted",
        description: `"${project.name}" has been permanently deleted.`,
      });
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to delete project",
        description: error.message || "An error occurred while deleting the project.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="group hover:border-primary/50 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer flex-1"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                {project.organization && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {project.organization}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
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
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <ChevronRight 
                className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all cursor-pointer" 
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getEnvironmentColor(project.environment)}>
              <Server className="h-3 w-3 mr-1" />
              {project.environment}
            </Badge>
            <Badge variant="outline" className={getSensitivityColor(project.business_sensitivity)}>
              <Shield className="h-3 w-3 mr-1" />
              Business: {project.business_sensitivity}
            </Badge>
            <Badge variant="outline" className={getSensitivityColor(project.data_sensitivity)}>
              <Database className="h-3 w-3 mr-1" />
              Data: {project.data_sensitivity}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Criticality: </span>
                <span className={`font-semibold ${getCriticalityColor(project.criticality)}`}>
                  {project.criticality}/10
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Systems: </span>
                <span className="font-semibold">{systemCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(project.created_at), "MMM d, yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This will also delete all associated systems and models. This action cannot be undone.`}
        onConfirm={handleDelete}
        isDeleting={deleteProject.isPending}
      />
    </>
  );
}
