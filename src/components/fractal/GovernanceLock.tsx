/**
 * GovernanceLock - Visual indicator for locked/governed/enforced features
 * 
 * Used in sidebar, cards, and headers to indicate governance state.
 */

import { cn } from "@/lib/utils";
import { 
  FRACTAL_GOVERNANCE, 
  type GovernanceStatus,
} from "@/lib/fractal-theme";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GovernanceLockProps {
  /** Governance status */
  status: GovernanceStatus;
  /** Show label text */
  showLabel?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
}

export function GovernanceLock({
  status,
  showLabel = false,
  tooltip,
  size = "md",
  className,
}: GovernanceLockProps) {
  const config = FRACTAL_GOVERNANCE[status];
  const Icon = config.icon;

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const lock = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        config.text,
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && (
        <span className="text-xs font-medium">{config.label}</span>
      )}
    </div>
  );

  if (!tooltip) return lock;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{lock}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
