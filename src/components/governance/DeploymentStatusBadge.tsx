import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FileCheck, Clock, AlertTriangle, CheckCircle, XCircle, Rocket 
} from "lucide-react";

interface DeploymentStatusBadgeProps {
  status: string;
  requiresApproval?: boolean;
  size?: "sm" | "md" | "lg";
}

export function DeploymentStatusBadge({ status, requiresApproval, size = "md" }: DeploymentStatusBadgeProps) {
  const getConfig = (s: string) => {
    switch (s) {
      case "draft":
        return { 
          color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          icon: Clock,
          label: "Draft"
        };
      case "ready_for_review":
        return { 
          color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
          icon: FileCheck,
          label: "Ready for Review"
        };
      case "pending_approval":
        return { 
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
          icon: AlertTriangle,
          label: "Pending Approval"
        };
      case "approved":
        return { 
          color: "bg-green-500/10 text-green-500 border-green-500/20",
          icon: CheckCircle,
          label: "Approved"
        };
      case "blocked":
        return { 
          color: "bg-red-500/10 text-red-500 border-red-500/20",
          icon: XCircle,
          label: "Blocked"
        };
      case "deployed":
        return { 
          color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          icon: Rocket,
          label: "Deployed"
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground border-muted",
          icon: Clock,
          label: status
        };
    }
  };

  const config = getConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`${config.color} ${sizeClasses[size]} gap-1`}>
          <Icon className={iconSizes[size]} />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
        {requiresApproval && status !== "approved" && status !== "deployed" && (
          <p className="text-xs text-muted-foreground">Requires approval before deployment</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
