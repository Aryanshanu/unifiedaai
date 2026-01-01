/**
 * RiskIndicator - Consistent risk level display for the Fractal Design System
 * 
 * Used across Dashboard, Alerts, Incidents, HITL, Gateway decisions.
 * Provides a unified visual language for risk communication.
 */

import { cn } from "@/lib/utils";
import { 
  FRACTAL_RISK, 
  type RiskLevel,
  normalizeRiskLevel,
} from "@/lib/fractal-theme";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RiskIndicatorProps {
  /** Risk level: critical, high, medium, low */
  level: RiskLevel | string | null | undefined;
  /** Show as dot only */
  dotOnly?: boolean;
  /** Show full card with description */
  showDescription?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Optional score to display */
  score?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
}

export function RiskIndicator({
  level,
  dotOnly = false,
  showDescription = false,
  showTooltip = true,
  score,
  size = "md",
  className,
}: RiskIndicatorProps) {
  const riskLevel = normalizeRiskLevel(level);
  const config = FRACTAL_RISK[riskLevel];
  const Icon = config.icon;

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Dot only mode
  if (dotOnly) {
    const dot = (
      <span
        className={cn(
          "rounded-full",
          dotSizes[size],
          config.bg.replace("/10", ""),
          className
        )}
        style={{
          boxShadow: riskLevel === "critical" || riskLevel === "high" 
            ? `0 0 8px hsl(var(--risk-${riskLevel}))` 
            : undefined,
        }}
      />
    );

    if (!showTooltip) return dot;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{dot}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full indicator
  const indicator = (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        showDescription && "flex-col items-start",
        className
      )}
    >
      <div className={cn("flex items-center gap-1.5", config.text)}>
        <Icon className={iconSizes[size]} />
        <span className={cn("font-medium", textSizes[size])}>
          {config.label}
        </span>
        {typeof score === "number" && (
          <span className={cn("opacity-70", textSizes[size])}>
            ({score.toFixed(1)})
          </span>
        )}
      </div>
      {showDescription && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}
    </div>
  );

  if (!showTooltip || showDescription) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
