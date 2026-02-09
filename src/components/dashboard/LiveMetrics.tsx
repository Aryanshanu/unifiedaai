import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { CHART_COLORS } from "@/lib/fractal-theme";

interface MetricStream {
  label: string;
  value: number;
  unit: string;
  trend: number[];
}

interface LiveMetricsProps {
  metrics: MetricStream[];
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function LiveMetrics({ metrics }: LiveMetricsProps) {
  return (
    <div className="metric-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary animate-pulse-glow" />
        <h3 className="font-semibold text-foreground">Live Metrics</h3>
        <span className="ml-auto text-[10px] text-success flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-bold font-mono text-foreground">
                {metric.value}
                <span className="text-xs text-muted-foreground ml-1">{metric.unit}</span>
              </p>
            </div>
            <MiniChart data={metric.trend} color="hsl(173, 80%, 45%)" />
          </div>
        ))}
      </div>
    </div>
  );
}
