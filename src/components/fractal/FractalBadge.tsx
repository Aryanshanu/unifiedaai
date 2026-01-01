/**
 * FractalBadge - Unified badge component for the Fractal Design System
 * 
 * Replaces ad-hoc Badge usage across the platform with a consistent,
 * governance-focused visual language.
 */

import { cn } from "@/lib/utils";
import { 
  FRACTAL_RISK, 
  FRACTAL_COMPLIANCE, 
  FRACTAL_GOVERNANCE,
  type RiskLevel,
  type ComplianceLevel,
  type GovernanceStatus,
  normalizeRiskLevel,
} from "@/lib/fractal-theme";

type BadgeType = "risk" | "compliance" | "governance" | "neutral";

interface FractalBadgeProps {
  /** The type of badge to render */
  type?: BadgeType;
  /** For risk badges: critical, high, medium, low */
  severity?: RiskLevel | string;
  /** For compliance badges: compliant, non-compliant, pending, not-assessed */
  compliance?: ComplianceLevel;
  /** For governance badges: enforced, governed, locked, open */
  governance?: GovernanceStatus;
  /** Custom label (overrides default) */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
}

export function FractalBadge({
  type = "neutral",
  severity,
  compliance,
  governance,
  label,
  showIcon = true,
  size = "md",
  className,
}: FractalBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-0.5 text-xs gap-1.5",
    lg: "px-3 py-1 text-sm gap-2",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  // Determine config based on type
  let config;
  let displayLabel: string;

  if (type === "risk" || severity) {
    const riskLevel = normalizeRiskLevel(severity);
    config = FRACTAL_RISK[riskLevel];
    displayLabel = label || config.label;
  } else if (type === "compliance" && compliance) {
    config = FRACTAL_COMPLIANCE[compliance];
    displayLabel = label || config.label;
  } else if (type === "governance" && governance) {
    config = FRACTAL_GOVERNANCE[governance];
    displayLabel = label || config.label;
  } else {
    // Neutral fallback
    displayLabel = label || "Unknown";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border font-medium",
          "bg-muted text-muted-foreground border-border",
          sizeClasses[size],
          className
        )}
      >
        {displayLabel}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {displayLabel}
    </span>
  );
}
