import { cn } from "@/lib/utils";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ControlGroup {
  name: string;
  satisfied: number;
  total: number;
}

interface ComplianceGaugeProps {
  overallScore: number;
  controlGroups: ControlGroup[];
}

export function ComplianceGauge({ overallScore, controlGroups }: ComplianceGaugeProps) {
  const status = overallScore >= 90 ? "success" : overallScore >= 70 ? "warning" : "danger";
  const StatusIcon = status === "success" ? CheckCircle : status === "warning" ? AlertTriangle : XCircle;

  const statusColors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="metric-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Compliance Posture</h3>
      </div>

      {/* Main gauge */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
              strokeDasharray="188.5 251.3"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className={cn(
                "transition-all duration-700",
                status === "success" ? "stroke-success" : status === "warning" ? "stroke-warning" : "stroke-danger"
              )}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(overallScore / 100) * 188.5} 251.3`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono">{overallScore}%</span>
            <StatusIcon className={cn("w-4 h-4", statusColors[status])} />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {controlGroups.map((group) => {
            const pct = (group.satisfied / group.total) * 100;
            return (
              <div key={group.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{group.name}</span>
                  <span className="font-mono text-foreground">
                    {group.satisfied}/{group.total}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      pct >= 90 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-danger"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
