import { Globe, X, Shield, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex flex-col">
      {/* Truth Banner - All fake data deleted */}
      <div className={cn(
        "w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500",
        "text-white py-2 px-4 flex items-center justify-center gap-2"
      )}>
        <Shield className="w-4 h-4" />
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">
          All fake data deleted on Dec 11, 2025. Only real traffic flows here.
        </span>
      </div>
      
      {/* Main Banner */}
      <div className={cn(
        "w-full bg-gradient-to-r from-primary via-primary/80 to-primary",
        "text-primary-foreground py-2 px-4 flex items-center justify-center gap-3 relative"
      )}>
        <Globe className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-medium">
          Fractal RAI-OS — The World's First Responsible AI Operating System — Now Live
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
    </div>
  );
}
