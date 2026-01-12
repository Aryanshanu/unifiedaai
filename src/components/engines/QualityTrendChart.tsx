import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TrendPoint {
  date: string;
  score: number;
  fileName?: string;
  uploadId?: string;
}

interface QualityTrendChartProps {
  data: TrendPoint[];
  onPointClick?: (point: TrendPoint) => void;
  className?: string;
  showCard?: boolean;
}

export function QualityTrendChart({ data, onPointClick, className, showCard = true }: QualityTrendChartProps) {
  const { trend, trendPercent, sparklinePoints, avgScore } = useMemo(() => {
    if (data.length < 2) {
      return { trend: 'stable' as const, trendPercent: 0, sparklinePoints: '', avgScore: data[0]?.score || 0 };
    }

    const scores = data.map(d => d.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = Math.round(secondAvg - firstAvg);
    
    const trend = diff > 2 ? 'up' as const : diff < -2 ? 'down' as const : 'stable' as const;
    
    // Calculate sparkline SVG path
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore || 1;
    const width = 120;
    const height = 32;
    const padding = 2;
    
    const points = scores.map((score, i) => {
      const x = padding + (i / (scores.length - 1)) * (width - padding * 2);
      const y = height - padding - ((score - minScore) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');
    
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return { trend, trendPercent: diff, sparklinePoints: points, avgScore };
  }, [data]);

  const content = (
    <div className={cn('space-y-4', className)}>
      {/* Summary Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sparkline */}
          <div className="bg-muted/50 rounded-lg p-2">
            <svg width="120" height="32" className="text-primary">
              {sparklinePoints && (
                <>
                  {/* Gradient background */}
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <polygon 
                    points={`2,30 ${sparklinePoints} 118,30`}
                    fill="url(#sparklineGradient)"
                  />
                  {/* Line */}
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Latest point dot */}
                  {data.length > 0 && (
                    <circle
                      cx={118}
                      cy={sparklinePoints.split(' ').pop()?.split(',')[1] || 16}
                      r="3"
                      fill="currentColor"
                    />
                  )}
                </>
              )}
            </svg>
          </div>
          
          {/* Trend Badge */}
          <Badge 
            variant="outline"
            className={cn(
              'gap-1',
              trend === 'up' ? 'text-success border-success/30 bg-success/10' :
              trend === 'down' ? 'text-destructive border-destructive/30 bg-destructive/10' :
              'text-muted-foreground'
            )}
          >
            {trend === 'up' ? (
              <><TrendingUp className="h-3 w-3" /> +{trendPercent}%</>
            ) : trend === 'down' ? (
              <><TrendingDown className="h-3 w-3" /> {trendPercent}%</>
            ) : (
              <><Minus className="h-3 w-3" /> Stable</>
            )}
          </Badge>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold">{avgScore}%</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </div>
      </div>

      {/* File count summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          {data.filter(d => d.score >= 70).length} passed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
          {data.filter(d => d.score < 70).length} need attention
        </span>
      </div>

      {/* Recent uploads mini-list */}
      {data.length > 0 && (
        <div className="space-y-1">
          {data.slice(0, 5).map((point, i) => (
            <div 
              key={point.uploadId || i}
              className={cn(
                'flex items-center justify-between py-1.5 px-2 rounded-md text-sm',
                'hover:bg-muted/50 cursor-pointer transition-colors'
              )}
              onClick={() => onPointClick?.(point)}
            >
              <span className="truncate max-w-[200px]">{point.fileName || point.date}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  'ml-2',
                  point.score >= 85 ? 'text-success border-success/30' :
                  point.score >= 70 ? 'text-warning border-warning/30' :
                  'text-destructive border-destructive/30'
                )}
              >
                {point.score}%
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Quality Trend
        </CardTitle>
        <CardDescription>
          Last {data.length} uploads
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

// Simple inline sparkline without card
export function InlineSparkline({ scores, className }: { scores: number[]; className?: string }) {
  if (scores.length < 2) return null;

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;
  const width = 60;
  const height = 16;
  
  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((score - minScore) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={cn('text-primary', className)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
