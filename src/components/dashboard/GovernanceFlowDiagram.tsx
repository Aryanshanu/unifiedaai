import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Upload, Database, ShieldCheck, Brain, 
  Shield, Activity, ArrowRight, CheckCircle2, 
  Clock, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StageStatus {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "complete" | "in_progress" | "pending" | "warning";
  path: string;
  metrics?: { label: string; value: string | number }[];
}

interface GovernanceFlowDiagramProps {
  stages?: StageStatus[];
}

const defaultStages: StageStatus[] = [
  {
    id: 1,
    name: "Data Ingestion",
    description: "Capture & validate source data",
    icon: Upload,
    status: "complete",
    path: "/engine/data-quality",
    metrics: [{ label: "Sources", value: "3" }]
  },
  {
    id: 2,
    name: "Data Quality",
    description: "Profile, validate & certify",
    icon: Database,
    status: "in_progress",
    path: "/engine/data-quality",
    metrics: [{ label: "Quality Score", value: "87%" }]
  },
  {
    id: 3,
    name: "AI Readiness",
    description: "Lineage, bias checks & approval",
    icon: ShieldCheck,
    status: "pending",
    path: "/engine/data-quality",
    metrics: [{ label: "Approved", value: "2" }]
  },
  {
    id: 4,
    name: "AI Development",
    description: "Model registration & traceability",
    icon: Brain,
    status: "pending",
    path: "/models",
    metrics: [{ label: "Models", value: "3" }]
  },
  {
    id: 5,
    name: "RAI Controls",
    description: "Fairness, safety & compliance",
    icon: Shield,
    status: "pending",
    path: "/engine/fairness",
    metrics: [{ label: "Evaluations", value: "0" }]
  },
  {
    id: 6,
    name: "Monitoring",
    description: "Drift, violations & feedback",
    icon: Activity,
    status: "pending",
    path: "/observability",
    metrics: [{ label: "Incidents", value: "164" }]
  }
];

const statusConfig = {
  complete: { 
    badge: "Complete", 
    className: "bg-success/10 text-success border-success/30",
    icon: CheckCircle2,
    bgClass: "bg-success/5 border-success/30"
  },
  in_progress: { 
    badge: "In Progress", 
    className: "bg-primary/10 text-primary border-primary/30",
    icon: Clock,
    bgClass: "bg-primary/5 border-primary/30"
  },
  pending: { 
    badge: "Pending", 
    className: "bg-muted text-muted-foreground border-muted",
    icon: Clock,
    bgClass: "bg-muted/30 border-muted"
  },
  warning: { 
    badge: "Needs Attention", 
    className: "bg-warning/10 text-warning border-warning/30",
    icon: AlertTriangle,
    bgClass: "bg-warning/5 border-warning/30"
  }
};

export function GovernanceFlowDiagram({ stages = defaultStages }: GovernanceFlowDiagramProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          6-Stage Governance Pipeline
        </CardTitle>
        <CardDescription>
          End-to-end responsible AI governance flow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 hidden lg:block" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stages.map((stage, index) => {
              const config = statusConfig[stage.status];
              const Icon = stage.icon;
              const StatusIcon = config.icon;
              
              return (
                <div key={stage.id} className="relative">
                  {/* Arrow between stages */}
                  {index < stages.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hidden lg:block z-10" />
                  )}
                  
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full h-auto p-4 flex flex-col items-center gap-2 rounded-xl border-2 transition-all hover:scale-105",
                      config.bgClass
                    )}
                    onClick={() => navigate(stage.path)}
                  >
                    {/* Stage number */}
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold">
                      {stage.id}
                    </div>
                    
                    {/* Icon */}
                    <div className={cn("p-3 rounded-full", config.className.replace("text-", "bg-").replace("/10", "/20"))}>
                      <Icon className={cn("h-5 w-5", config.className.split(" ")[1])} />
                    </div>
                    
                    {/* Name */}
                    <span className="font-medium text-sm text-center leading-tight">
                      {stage.name}
                    </span>
                    
                    {/* Status badge */}
                    <Badge variant="outline" className={cn("text-xs", config.className)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.badge}
                    </Badge>
                    
                    {/* Metrics */}
                    {stage.metrics && stage.metrics.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {stage.metrics[0].label}: <span className="font-semibold">{stage.metrics[0].value}</span>
                      </div>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
