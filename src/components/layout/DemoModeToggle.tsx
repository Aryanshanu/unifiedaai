import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { cn } from "@/lib/utils";

export function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode, isInitializing } = useDemoMode();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1.5 transition-colors",
          isDemoMode ? "bg-primary/10 border-primary text-primary" : "bg-muted"
        )}
      >
        <Sparkles className={cn("w-3 h-3", isInitializing && "animate-pulse")} />
        Demo
      </Badge>
      <Switch
        id="demo-mode"
        checked={isDemoMode}
        onCheckedChange={toggleDemoMode}
        disabled={isInitializing}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
