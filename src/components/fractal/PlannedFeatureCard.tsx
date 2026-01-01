/**
 * PlannedFeatureCard - Honest UX for features not yet implemented
 * 
 * Replaces fake toggle controls in Settings with compliance-safe
 * read-only cards that explain what the control will do.
 */

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileText, Shield } from "lucide-react";

interface PlannedFeatureCardProps {
  /** Feature title */
  title: string;
  /** Description of what the feature will do */
  description: string;
  /** Related regulation or standard (optional) */
  regulation?: string;
  /** Current implementation status */
  status?: string;
  /** Expected availability (optional) */
  expectedDate?: string;
  /** Additional classes */
  className?: string;
}

export function PlannedFeatureCard({
  title,
  description,
  regulation,
  status = "Planned",
  expectedDate,
  className,
}: PlannedFeatureCardProps) {
  return (
    <Card className={cn("border-dashed border-border/50 bg-muted/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-foreground">{title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {regulation && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{regulation}</span>
                </div>
              )}
              {expectedDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{expectedDate}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <span className="inline-flex items-center rounded-md border border-border/50 bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
              {status}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
