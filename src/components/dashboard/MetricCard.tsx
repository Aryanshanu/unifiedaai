import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: ReactNode;
  status?: "success" | "warning" | "danger" | "neutral";
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  status = "neutral",
  className,
}: MetricCardProps) {
  const statusColors = {
    success: "border-success/30 hover:border-success/50",
    warning: "border-warning/30 hover:border-warning/50",
    danger: "border-danger/30 hover:border-danger/50",
    neutral: "border-border hover:border-primary/30",
  };

  const trendColors = {
    up: "text-success",
    down: "text-danger",
    neutral: "text-muted-foreground",
  };

  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "metric-card border transition-all duration-300 hover:shadow-lg",
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColors[trend.direction])}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
