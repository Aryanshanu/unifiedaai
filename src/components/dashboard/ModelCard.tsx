import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ScoreRing } from "./ScoreRing";
import { Activity, Clock, AlertTriangle } from "lucide-react";

interface ModelCardProps {
  name: string;
  type: string;
  version: string;
  status: "healthy" | "warning" | "critical";
  fairnessScore: number;
  robustnessScore: number;
  lastEval: string;
  incidents: number;
}

export function ModelCard({
  name,
  type,
  version,
  status,
  fairnessScore,
  robustnessScore,
  lastEval,
  incidents,
}: ModelCardProps) {
  return (
    <div className="metric-card border border-border hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {type} • v{version}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-6 mb-4">
        <ScoreRing score={fairnessScore} size="sm" label="Fairness" />
        <ScoreRing score={robustnessScore} size="sm" label="Robustness" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{lastEval}</span>
        </div>
        
        {incidents > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle className="w-3 h-3" />
            <span>{incidents} incidents</span>
          </div>
        )}
      </div>
    </div>
  );
}
