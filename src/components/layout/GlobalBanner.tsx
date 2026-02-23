import { Globe, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={cn(
      "w-full bg-gradient-to-r from-primary via-primary/80 to-primary",
      "text-primary-foreground py-2 px-4 flex items-center justify-center gap-3 relative"
    )}>
      <Globe className="w-4 h-4 animate-pulse" />
      <span className="text-sm font-medium">
        Fractal Unified Autonomous Governance Platform
      </span>
      <Button
        variant="ghost"
        size="iconSm"
        className="absolute right-2 hover:bg-primary-foreground/10"
        onClick={() => setDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
