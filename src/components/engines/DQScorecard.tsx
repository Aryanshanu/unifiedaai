import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  FileDown,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Scale,
  Clock,
  Hash,
  FileCheck,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  ruleCount?: number;
  passRate?: number;
}

interface DQScorecardProps {
  datasetId: string;
  datasetName: string;
  overallScore: number;
  verdict: 'PASS' | 'WARN' | 'FAIL';
  dimensions: DimensionScore[];
  evaluatedAt: string;
  evidenceHash?: string;
  rowCount?: number;
  cdeCount?: number;
  highImpactCount?: number;
  euAiActReference?: string;
  onExport?: () => void;
}

const dimensionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  completeness: FileCheck,
  validity: CheckCircle2,
  uniqueness: Hash,
  accuracy: Target,
  timeliness: Clock,
  consistency: Scale,
};

const dimensionColors: Record<string, string> = {
  completeness: 'text-blue-600',
  validity: 'text-green-600',
  uniqueness: 'text-purple-600',
  accuracy: 'text-orange-600',
  timeliness: 'text-yellow-600',
  consistency: 'text-pink-600',
};

function TrendIndicator({ trend, value }: { trend?: 'up' | 'down' | 'stable'; value?: number }) {
  if (!trend || trend === 'stable') {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  
  if (trend === 'up') {
    return (
      <span className="flex items-center text-success text-xs">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        {value !== undefined && `+${value.toFixed(1)}%`}
      </span>
    );
  }
  
  return (
    <span className="flex items-center text-destructive text-xs">
      <TrendingDown className="h-3 w-3 mr-0.5" />
      {value !== undefined && `${value.toFixed(1)}%`}
    </span>
  );
}

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-success';
    if (s >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'bg-success/10 border-success/30';
    if (s >= 60) return 'bg-warning/10 border-warning/30';
    return 'bg-destructive/10 border-destructive/30';
  };

  if (size === 'sm') {
    return (
      <div className={cn('p-2 rounded-lg border', getScoreBg(score))}>
        <span className={cn('text-2xl font-bold', getScoreColor(score))}>
          {score.toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn('p-6 rounded-xl border-2 text-center', getScoreBg(score))}>
      <div className={cn('text-5xl font-bold mb-1', getScoreColor(score))}>
        {score.toFixed(1)}%
      </div>
      <p className="text-sm text-muted-foreground">Overall Quality Score</p>
    </div>
  );
}

export function DQScorecard({
  datasetId,
  datasetName,
  overallScore,
  verdict,
  dimensions,
  evaluatedAt,
  evidenceHash,
  rowCount,
  cdeCount,
  highImpactCount,
  euAiActReference = 'EU AI Act Article 10',
  onExport,
}: DQScorecardProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (onExport) {
        await onExport();
      } else {
        // Default export: create JSON blob
        const scorecardData = {
          datasetId,
          datasetName,
          overallScore,
          verdict,
          dimensions,
          evaluatedAt,
          evidenceHash,
          rowCount,
          cdeCount,
          highImpactCount,
          euAiActReference,
          exportedAt: new Date().toISOString(),
        };
        
        const blob = new Blob([JSON.stringify(scorecardData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dq-scorecard-${datasetId}-${format(new Date(), 'yyyy-MM-dd')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const VerdictIcon = verdict === 'PASS' ? CheckCircle2 : verdict === 'WARN' ? AlertTriangle : XCircle;
  const verdictColor = verdict === 'PASS' ? 'text-success' : verdict === 'WARN' ? 'text-warning' : 'text-destructive';

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Data Quality Scorecard</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              verdict === 'PASS' ? 'bg-success/10 text-success border-success/30' :
              verdict === 'WARN' ? 'bg-warning/10 text-warning border-warning/30' :
              'bg-destructive/10 text-destructive border-destructive/30'
            )}>
              <VerdictIcon className="h-3.5 w-3.5 mr-1" />
              {verdict}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={isExporting}
            >
              <FileDown className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <CardDescription>
          {datasetName} • Evaluated {format(new Date(evaluatedAt), 'MMM d, yyyy HH:mm')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-start gap-6">
          <ScoreGauge score={overallScore} />
          
          <div className="flex-1 space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              {rowCount !== undefined && (
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-semibold">{rowCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Rows Analyzed</p>
                </div>
              )}
              {cdeCount !== undefined && (
                <div className="p-2 bg-primary/10 rounded-lg text-center">
                  <p className="text-lg font-semibold text-primary">{cdeCount}</p>
                  <p className="text-xs text-muted-foreground">CDEs Covered</p>
                </div>
              )}
              {highImpactCount !== undefined && (
                <div className="p-2 bg-destructive/10 rounded-lg text-center">
                  <p className="text-lg font-semibold text-destructive">{highImpactCount}</p>
                  <p className="text-xs text-muted-foreground">High Impact Rules</p>
                </div>
              )}
            </div>

            {/* Regulation Badge */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Compliance reference: <span className="font-medium text-foreground">{euAiActReference}</span>
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Dimension Scores */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Dimension Breakdown
          </h4>
          
          <div className="grid gap-3">
            {dimensions.map((dim) => {
              const DimIcon = dimensionIcons[dim.name.toLowerCase()] || FileCheck;
              const dimColor = dimensionColors[dim.name.toLowerCase()] || 'text-primary';
              
              return (
                <div 
                  key={dim.name}
                  className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn('p-2 rounded-lg bg-background', dimColor)}>
                          <DimIcon className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Weight: {(dim.weight * 100).toFixed(0)}%</p>
                        {dim.ruleCount !== undefined && <p>Rules: {dim.ruleCount}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{dim.name}</span>
                      <div className="flex items-center gap-2">
                        <TrendIndicator trend={dim.trend} value={dim.trendValue} />
                        <span className={cn(
                          'text-sm font-bold',
                          dim.score >= 80 ? 'text-success' :
                          dim.score >= 60 ? 'text-warning' : 'text-destructive'
                        )}>
                          {dim.score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={dim.score} 
                      className={cn(
                        'h-2',
                        dim.score >= 80 ? '[&>div]:bg-success' :
                        dim.score >= 60 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence Hash */}
        {evidenceHash && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Evidence Hash (SHA-256)</span>
              <code className="font-mono bg-muted px-2 py-1 rounded">
                {evidenceHash.substring(0, 16)}...{evidenceHash.substring(evidenceHash.length - 8)}
              </code>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
