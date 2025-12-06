import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Shield, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";

interface RiskBadgeProps {
  tier: string | null | undefined;
  score?: number | null;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ tier, score, showScore = false, size = "md" }: RiskBadgeProps) {
  const getConfig = (t: string | null | undefined) => {
    switch (t) {
      case "low":
        return { 
          color: "bg-green-500/10 text-green-500 border-green-500/20",
          icon: ShieldCheck,
          label: "Low"
        };
      case "medium":
        return { 
          color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
          icon: Shield,
          label: "Medium"
        };
      case "high":
        return { 
          color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
          icon: ShieldAlert,
          label: "High"
        };
      case "critical":
        return { 
          color: "bg-red-500/10 text-red-500 border-red-500/20",
          icon: ShieldX,
          label: "Critical"
        };
      default:
        return { 
          color: "bg-muted text-muted-foreground border-muted",
          icon: AlertTriangle,
          label: "Not Assessed"
        };
    }
  };

  const config = getConfig(tier);
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
          {showScore && score !== undefined && score !== null && (
            <span className="ml-1 opacity-80">({Math.round(score)})</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {tier ? (
          <p>{config.label} Risk{score !== undefined && score !== null ? ` - Score: ${Math.round(score)}/100` : ""}</p>
        ) : (
          <p>No risk assessment completed</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
