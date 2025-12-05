import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ScoreRing } from "./ScoreRing";
import { Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModelCardProps {
  name: string;
  type: string;
  version: string;
  status: "healthy" | "warning" | "critical";
  fairnessScore: number | null;
  robustnessScore: number | null;
  lastEval?: string;
  incidents?: number;
  updatedAt?: string;
}

export function ModelCard({
  name,
  type,
  version,
  status,
  fairnessScore,
  robustnessScore,
  lastEval,
  incidents = 0,
  updatedAt,
}: ModelCardProps) {
  const displayTime = lastEval || (updatedAt ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true }) : 'Never');
  
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
        <ScoreRing score={fairnessScore ?? 0} size="sm" label="Fairness" />
        <ScoreRing score={robustnessScore ?? 0} size="sm" label="Robustness" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{displayTime}</span>
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
