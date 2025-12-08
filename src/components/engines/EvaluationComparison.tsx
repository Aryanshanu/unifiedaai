import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EvaluationRun {
  id: string;
  created_at: string;
  overall_score: number | null;
  fairness_score: number | null;
  robustness_score: number | null;
  privacy_score: number | null;
  toxicity_score: number | null;
}

interface EvaluationComparisonProps {
  evaluations: EvaluationRun[];
}

export function EvaluationComparison({ evaluations }: EvaluationComparisonProps) {
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  const leftEval = evaluations.find(e => e.id === leftId);
  const rightEval = evaluations.find(e => e.id === rightId);

  const metrics = [
    { key: 'overall_score', label: 'Overall' },
    { key: 'fairness_score', label: 'Fairness' },
    { key: 'robustness_score', label: 'Robustness' },
    { key: 'privacy_score', label: 'Privacy' },
    { key: 'toxicity_score', label: 'Safety' },
  ];

  const getDiff = (left: number | null, right: number | null): { value: number; direction: 'up' | 'down' | 'same' } => {
    if (left === null || right === null) return { value: 0, direction: 'same' };
    const diff = right - left;
    return {
      value: Math.abs(diff),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
    };
  };

  const getHeatmapColor = (diff: number, direction: 'up' | 'down' | 'same'): string => {
    if (direction === 'same' || diff === 0) return 'bg-muted';
    if (direction === 'up') {
      if (diff >= 10) return 'bg-success/30';
      if (diff >= 5) return 'bg-success/20';
      return 'bg-success/10';
    } else {
      if (diff >= 10) return 'bg-danger/30';
      if (diff >= 5) return 'bg-danger/20';
      return 'bg-danger/10';
    }
  };

  if (evaluations.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Need at least 2 evaluations to compare</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="w-4 h-4" />
          Side-by-Side Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Baseline (Left)</label>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger>
                <SelectValue placeholder="Select evaluation" />
              </SelectTrigger>
              <SelectContent>
                {evaluations.map((e) => (
                  <SelectItem key={e.id} value={e.id} disabled={e.id === rightId}>
                    {format(new Date(e.created_at), 'MMM d, yyyy HH:mm')} - {e.overall_score ?? 'N/A'}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Compare (Right)</label>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger>
                <SelectValue placeholder="Select evaluation" />
              </SelectTrigger>
              <SelectContent>
                {evaluations.map((e) => (
                  <SelectItem key={e.id} value={e.id} disabled={e.id === leftId}>
                    {format(new Date(e.created_at), 'MMM d, yyyy HH:mm')} - {e.overall_score ?? 'N/A'}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Grid */}
        {leftEval && rightEval && (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium">
              <div>Metric</div>
              <div className="text-center">Baseline</div>
              <div className="text-center">Compare</div>
              <div className="text-center">Delta</div>
            </div>

            {/* Metrics */}
            {metrics.map((metric) => {
              const leftValue = (leftEval as any)[metric.key];
              const rightValue = (rightEval as any)[metric.key];
              const diff = getDiff(leftValue, rightValue);

              return (
                <div 
                  key={metric.key}
                  className={cn(
                    "grid grid-cols-4 gap-2 items-center p-2 rounded-lg",
                    getHeatmapColor(diff.value, diff.direction)
                  )}
                >
                  <div className="font-medium text-sm">{metric.label}</div>
                  <div className="text-center font-mono text-sm">
                    {leftValue !== null ? `${leftValue}%` : 'N/A'}
                  </div>
                  <div className="text-center font-mono text-sm">
                    {rightValue !== null ? `${rightValue}%` : 'N/A'}
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "gap-1 text-xs",
                        diff.direction === 'up' && "border-success text-success",
                        diff.direction === 'down' && "border-danger text-danger",
                        diff.direction === 'same' && "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {diff.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                      {diff.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                      {diff.direction === 'same' && <Minus className="w-3 h-3" />}
                      {diff.direction === 'up' ? '+' : diff.direction === 'down' ? '-' : ''}
                      {diff.value}%
                    </Badge>
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success/30" /> Improved
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-danger/30" /> Regressed
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted" /> No Change
              </span>
            </div>
          </div>
        )}

        {(!leftEval || !rightEval) && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Select two evaluations to compare metrics
          </div>
        )}
      </CardContent>
    </Card>
  );
}
