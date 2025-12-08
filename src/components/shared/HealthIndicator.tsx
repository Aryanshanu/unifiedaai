import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { HealthStatus } from "@/hooks/useSelfHealing";
import { formatDistanceToNow } from "date-fns";

interface HealthIndicatorProps {
  status: HealthStatus;
  lastUpdated?: Date | null;
  retryCount?: number;
  onRetry?: () => void;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<HealthStatus, { 
  color: string; 
  bgColor: string;
  icon: React.ReactNode; 
  label: string 
}> = {
  healthy: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Healthy",
  },
  loading: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    label: "Loading",
  },
  retrying: {
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
    label: "Retrying",
  },
  failed: {
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
    label: "Failed",
  },
};

export function HealthIndicator({
  status,
  lastUpdated,
  retryCount = 0,
  onRetry,
  className,
  showLabel = false,
}: HealthIndicatorProps) {
  const config = statusConfig[status];

  const tooltipContent = (
    <div className="text-xs space-y-1">
      <div className="font-medium">{config.label}</div>
      {lastUpdated && (
        <div className="text-muted-foreground">
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </div>
      )}
      {status === 'retrying' && retryCount > 0 && (
        <div className="text-muted-foreground">
          Retry attempt {retryCount}/3
        </div>
      )}
      {status === 'failed' && onRetry && (
        <div className="text-muted-foreground">
          Click to retry
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={status === 'failed' ? onRetry : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors",
              config.bgColor,
              config.color,
              status === 'failed' && onRetry && "cursor-pointer hover:opacity-80",
              className
            )}
          >
            {config.icon}
            {showLabel && (
              <span className="text-xs font-medium">{config.label}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card border-border">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact dot version for inline use
export function HealthDot({ 
  status, 
  className 
}: { 
  status: HealthStatus; 
  className?: string 
}) {
  const colorMap: Record<HealthStatus, string> = {
    healthy: "bg-emerald-500",
    loading: "bg-blue-500 animate-pulse",
    retrying: "bg-amber-500 animate-pulse",
    failed: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        colorMap[status],
        className
      )}
    />
  );
}
