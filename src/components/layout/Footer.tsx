import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn(
      "border-t border-border/50 bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">F</span>
            </div>
            <div>
            <span className="text-sm font-semibold text-foreground">Fractal Unified-OS</span>
              <span className="text-xs text-muted-foreground ml-2">
                Autonomous Governance Platform
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>v2.0.0</span>
            <span>•</span>
            <span>December 2025</span>
            <span>•</span>
            <span>100% Open Source</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
