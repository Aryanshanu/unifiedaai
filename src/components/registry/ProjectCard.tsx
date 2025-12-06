import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, ChevronRight, Shield, Database, Server, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/hooks/useProjects";

interface ProjectCardProps {
  project: Project;
  systemCount?: number;
}

export function ProjectCard({ project, systemCount = 0 }: ProjectCardProps) {
  const navigate = useNavigate();

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "development": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "staging": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "production": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCriticalityColor = (score: number) => {
    if (score <= 3) return "text-green-500";
    if (score <= 5) return "text-yellow-500";
    if (score <= 7) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Card className="group hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
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
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
  );
}
