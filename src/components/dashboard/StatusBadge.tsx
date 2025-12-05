import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "healthy" | "warning" | "critical" | "unknown" | "compliant" | "non-compliant" | "pending";
  size?: "sm" | "md";
  showDot?: boolean;
}

const statusConfig = {
  healthy: { label: "Healthy", color: "bg-success/10 text-success border-success/30" },
  warning: { label: "Warning", color: "bg-warning/10 text-warning border-warning/30" },
  critical: { label: "Critical", color: "bg-danger/10 text-danger border-danger/30" },
  unknown: { label: "Unknown", color: "bg-muted text-muted-foreground border-border" },
  compliant: { label: "Compliant", color: "bg-success/10 text-success border-success/30" },
  "non-compliant": { label: "Non-Compliant", color: "bg-danger/10 text-danger border-danger/30" },
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/30" },
};

const dotColors = {
  healthy: "bg-success",
  warning: "bg-warning",
  critical: "bg-danger",
  unknown: "bg-muted-foreground",
  compliant: "bg-success",
  "non-compliant": "bg-danger",
  pending: "bg-warning",
};

export function StatusBadge({ status, size = "sm", showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[status])} />
      )}
      {config.label}
    </span>
  );
}
