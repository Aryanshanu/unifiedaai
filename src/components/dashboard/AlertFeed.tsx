import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock } from "lucide-react";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  timestamp: string;
  model?: string;
}

interface AlertFeedProps {
  alerts: Alert[];
  maxItems?: number;
}

const alertIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const alertStyles = {
  critical: "border-l-danger bg-danger/5",
  warning: "border-l-warning bg-warning/5",
  info: "border-l-primary bg-primary/5",
  success: "border-l-success bg-success/5",
};

const iconStyles = {
  critical: "text-danger",
  warning: "text-warning",
  info: "text-primary",
  success: "text-success",
};

export function AlertFeed({ alerts, maxItems = 5 }: AlertFeedProps) {
  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <div className="metric-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Alerts</h3>
        <span className="text-xs text-muted-foreground">{alerts.length} total</span>
      </div>

      <div className="space-y-2">
        {displayAlerts.map((alert) => {
          const Icon = alertIcons[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                "border-l-2 rounded-r-lg p-3 transition-all hover:translate-x-1",
                alertStyles[alert.type]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", iconStyles[alert.type])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  {alert.model && (
                    <span className="inline-block mt-1 text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">
                      {alert.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alerts.length > maxItems && (
        <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
          View all {alerts.length} alerts →
        </button>
      )}
    </div>
  );
}
