import { AlertTriangle } from "lucide-react";

interface SandboxBannerProps {
  show?: boolean;
}

export function SandboxBanner({ show = true }: SandboxBannerProps) {
  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Sandbox / Demo Environment — Not Production Governance
        </span>
        <AlertTriangle className="h-4 w-4" />
      </div>
    </div>
  );
}
