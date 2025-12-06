import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImpactMatrixProps {
  riskTier?: string;
  impactScore?: number;
  className?: string;
}

export function ImpactMatrix({ riskTier, impactScore, className }: ImpactMatrixProps) {
  const getRiskIndex = (tier?: string): number => {
    switch (tier) {
      case "critical": return 2;
      case "high": return 2;
      case "medium": return 1;
      default: return 0;
    }
  };

  const getImpactIndex = (score?: number): number => {
    if (!score) return 0;
    if (score > 60) return 2;
    if (score > 30) return 1;
    return 0;
  };

  const riskIndex = getRiskIndex(riskTier);
  const impactIndex = getImpactIndex(impactScore);

  const cells = [
    // Low Impact column
    [
      { label: "Accept", color: "bg-green-500/20 border-green-500/30", textColor: "text-green-500" },
      { label: "Monitor", color: "bg-yellow-500/20 border-yellow-500/30", textColor: "text-yellow-500" },
      { label: "Review", color: "bg-orange-500/20 border-orange-500/30", textColor: "text-orange-500" },
    ],
    // Medium Impact column
    [
      { label: "Monitor", color: "bg-yellow-500/20 border-yellow-500/30", textColor: "text-yellow-500" },
      { label: "Review", color: "bg-orange-500/20 border-orange-500/30", textColor: "text-orange-500" },
      { label: "Approve", color: "bg-red-500/20 border-red-500/30", textColor: "text-red-500" },
    ],
    // High Impact column
    [
      { label: "Review", color: "bg-orange-500/20 border-orange-500/30", textColor: "text-orange-500" },
      { label: "Approve", color: "bg-red-500/20 border-red-500/30", textColor: "text-red-500" },
      { label: "Block", color: "bg-red-600/30 border-red-600/40", textColor: "text-red-400" },
    ],
  ];

  const riskLabels = ["Low", "Medium", "High"];
  const impactLabels = ["Low", "Medium", "High"];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Risk × Impact Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Y-axis label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-medium whitespace-nowrap">
            Risk Level →
          </div>

          <div className="pl-6">
            {/* Matrix Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {riskLabels.map((_, rIdx) => 
                impactLabels.map((_, iIdx) => {
                  const reversedRIdx = 2 - rIdx; // Reverse for visual (high at top)
                  const cell = cells[iIdx][reversedRIdx];
                  const isActive = reversedRIdx === riskIndex && iIdx === impactIndex;
                  
                  return (
                    <div
                      key={`${rIdx}-${iIdx}`}
                      className={cn(
                        "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all",
                        cell.color,
                        cell.textColor,
                        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg"
                      )}
                    >
                      {cell.label}
                    </div>
                  );
                })
              )}
            </div>

            {/* X-axis labels */}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {impactLabels.map((label) => (
                <div key={label} className="text-center text-xs text-muted-foreground">
                  {label}
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-muted-foreground mt-1">
              Impact Level →
            </div>
          </div>
        </div>

        {/* Current position indicator */}
        {riskTier && impactScore !== undefined && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm">
              <span className="text-muted-foreground">Current Position: </span>
              <span className="font-medium capitalize">{riskTier} Risk</span>
              <span className="text-muted-foreground"> × </span>
              <span className="font-medium">{impactLabels[impactIndex]} Impact</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
