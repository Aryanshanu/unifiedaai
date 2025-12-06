import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Server, Globe, FileText, ChevronRight, Calendar, CheckCircle2, Clock, Archive } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { System } from "@/hooks/useSystems";

interface SystemCardProps {
  system: System;
}

export function SystemCard({ system }: SystemCardProps) {
  const navigate = useNavigate();

  const getSystemTypeIcon = (type: string) => {
    switch (type) {
      case "model": return Cpu;
      case "agent": return Server;
      case "provider": return Globe;
      case "pipeline": return FileText;
      default: return Cpu;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { 
          color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", 
          icon: CheckCircle2,
          label: "Active"
        };
      case "draft":
        return { 
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", 
          icon: Clock,
          label: "Draft"
        };
      case "deprecated":
        return { 
          color: "bg-orange-500/10 text-orange-500 border-orange-500/20", 
          icon: Archive,
          label: "Deprecated"
        };
      case "archived":
        return { 
          color: "bg-muted text-muted-foreground border-muted", 
          icon: Archive,
          label: "Archived"
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground", 
          icon: Clock,
          label: status
        };
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "openai": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "anthropic": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "google": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "huggingface": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "azure": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "aws": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    }
  };

  const Icon = getSystemTypeIcon(system.system_type);
  const statusConfig = getStatusConfig(system.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className="group hover:border-primary/50 transition-all cursor-pointer" 
      onClick={() => navigate(`/systems/${system.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {system.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {system.system_type}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
          <Badge variant="outline" className={getProviderColor(system.provider)}>
            {system.provider}
          </Badge>
          {system.model_name && (
            <Badge variant="outline" className="bg-muted">
              {system.model_name}
            </Badge>
          )}
        </div>

        {system.use_case && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {system.use_case}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-sm">
            {system.endpoint ? (
              <span className="text-muted-foreground truncate max-w-[200px] block">
                {new URL(system.endpoint).hostname}
              </span>
            ) : (
              <span className="text-muted-foreground">No endpoint configured</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(system.created_at), "MMM d, yyyy")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
