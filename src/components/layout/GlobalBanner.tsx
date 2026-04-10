import { Globe, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GlobalBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={cn(
      "w-full bg-[#2D3A8C] text-white py-2 px-4 flex items-center justify-center gap-3 relative"
    )}>
      <span className="text-sm font-medium tracking-wide">
        Fractal Unified Autonomous Governance Platform
      </span>
      <Globe className="w-4 h-4 opacity-80" />
      <Button
        variant="ghost"
        size="iconSm"
        className="absolute right-2 hover:bg-white/10 text-white"
        onClick={() => setDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
