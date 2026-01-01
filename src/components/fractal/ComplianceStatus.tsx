/**
 * ComplianceStatus - Compliance state display for the Fractal Design System
 * 
 * Shows: Compliant / Non-Compliant / Pending Review / Not Assessed
 * Consistent across all governance screens.
 */

import { cn } from "@/lib/utils";
import { 
  FRACTAL_COMPLIANCE, 
  type ComplianceLevel,
} from "@/lib/fractal-theme";

interface ComplianceStatusProps {
  /** Compliance status */
  status: ComplianceLevel | string | null | undefined;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
}

function normalizeComplianceStatus(status: string | null | undefined): ComplianceLevel {
  if (!status) return "not-assessed";
  const normalized = status.toLowerCase().replace(/[_\s]/g, "-");
  if (normalized === "compliant" || normalized === "passed" || normalized === "approved") {
    return "compliant";
  }
  if (normalized === "non-compliant" || normalized === "failed" || normalized === "rejected") {
    return "non-compliant";
  }
  if (normalized === "pending" || normalized === "pending-review" || normalized === "in-progress") {
    return "pending";
  }
  return "not-assessed";
}

export function ComplianceStatus({
  status,
  showIcon = true,
  size = "md",
  className,
}: ComplianceStatusProps) {
  const normalizedStatus = normalizeComplianceStatus(status);
  const config = FRACTAL_COMPLIANCE[normalizedStatus];
  const Icon = config.icon;

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
      {config.label}
    </span>
  );
}
