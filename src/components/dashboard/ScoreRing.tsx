import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  status?: "success" | "warning" | "danger";
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = "md",
  label,
  status,
}: ScoreRingProps) {
  const percentage = (score / maxScore) * 100;
  
  const sizeConfig = {
    sm: { diameter: 48, stroke: 4, fontSize: "text-sm" },
    md: { diameter: 72, stroke: 5, fontSize: "text-xl" },
    lg: { diameter: 96, stroke: 6, fontSize: "text-2xl" },
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const autoStatus = percentage >= 80 ? "success" : percentage >= 60 ? "warning" : "danger";
  const finalStatus = status || autoStatus;

  const statusColors = {
    success: "stroke-success",
    warning: "stroke-warning",
    danger: "stroke-danger",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="score-ring">
        <svg width={config.diameter} height={config.diameter}>
          {/* Background circle */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            fill="none"
            className={cn(statusColors[finalStatus], "transition-all duration-700")}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
          />
        </svg>
        <span className={cn("absolute font-bold font-mono", config.fontSize)}>
          {Math.round(score)}
        </span>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
    </div>
  );
}
