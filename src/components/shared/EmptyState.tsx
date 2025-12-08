import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Database, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel = "Generate Sample Data",
  onAction,
  isLoading = false,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-8 text-center bg-card rounded-xl border border-border",
      className
    )}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        {icon || <Database className="w-8 h-8 text-primary/50" />}
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      
      {onAction && (
        <Button 
          onClick={onAction} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {actionLabel}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
