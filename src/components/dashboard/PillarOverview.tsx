import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PillarOverviewProps {
  title: string;
  icon: ReactNode;
  score: number;
  metrics: { label: string; value: string | number }[];
  href: string;
  accentColor?: "primary" | "accent" | "success" | "warning";
}

const accentStyles = {
  primary: "hover:border-primary/50 group-hover:text-primary",
  accent: "hover:border-accent/50 group-hover:text-accent",
  success: "hover:border-success/50 group-hover:text-success",
  warning: "hover:border-warning/50 group-hover:text-warning",
};

export function PillarOverview({
  title,
  icon,
  score,
  metrics,
  href,
  accentColor = "primary",
}: PillarOverviewProps) {
  return (
    <Link to={href} className="block group">
      <div
        className={cn(
          "metric-card border border-border transition-all duration-300",
          accentStyles[accentColor]
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">Overall Score</p>
            </div>
          </div>
          <ScoreRing score={score} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-secondary/50 rounded-lg p-2">
              <p className="text-lg font-bold font-mono text-foreground">{metric.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
          <span>View details</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
