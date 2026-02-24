import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Database,
  BarChart3,
  Flame,
  Timer,
  PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ErrorRateExplanation, PassRateExplanation } from './ErrorRateExplanation';

interface DimensionData {
  name: string;
  score: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface HotspotData {
  column: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  score: number;
}

interface StreamingMetrics {
  overallScore: number;
  errorRate: number;
  nullRate: number;
  duplicateRate: number;
  rulesExecuted: number;
  rulesPassed: number;
  rulesFailed: number;
  lastUpdated: Date;
}

interface DQStreamingDashboardProps {
  datasetId?: string;
  executionId?: string;
  isActive?: boolean;
}

// Animated counter component
function AnimatedCounter({ 
  value, 
  suffix = '', 
  decimals = 1,
  className = ''
}: { 
  value: number; 
  suffix?: string; 
  decimals?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  return (
    <span className={className}>
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// Pulsing score ring
function ScoreRing({ score, size = 120, isUpdating = false }: { score: number; size?: number; isUpdating?: boolean }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getGrade = (s: number) => {
    if (s >= 90) return { grade: 'A', color: 'text-success' };
    if (s >= 80) return { grade: 'B', color: 'text-primary' };
    if (s >= 70) return { grade: 'C', color: 'text-warning' };
    if (s >= 60) return { grade: 'D', color: 'text-orange-500' };
    return { grade: 'F', color: 'text-destructive' };
  };

  const { grade, color } = getGrade(score);
  const strokeColor = score >= 90 ? 'stroke-success' : score >= 70 ? 'stroke-warning' : 'stroke-destructive';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className={cn("transform -rotate-90", isUpdating && "animate-pulse")} width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="8"
          fill="none"
          className={cn(strokeColor, "transition-all duration-700 ease-out")}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold", color)}>{grade}</span>
        <AnimatedCounter value={score} suffix="%" className="text-sm font-mono text-muted-foreground" />
      </div>
      {isUpdating && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}
    </div>
  );
}

// Animated dimension bar
function DimensionBar({ dimension, isUpdating }: { dimension: DimensionData; isUpdating: boolean }) {
  const [animatedScore, setAnimatedScore] = useState(dimension.previousScore);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(dimension.score), 100);
    return () => clearTimeout(timer);
  }, [dimension.score]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{dimension.name}</span>
        <div className="flex items-center gap-2">
          {dimension.trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
          {dimension.trend === 'down' && <TrendingUp className="h-3 w-3 text-destructive rotate-180" />}
          <AnimatedCounter value={dimension.score} suffix="%" className="font-mono text-xs" />
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
            dimension.score >= 90 ? "bg-success" :
            dimension.score >= 70 ? "bg-warning" :
            "bg-destructive",
            isUpdating && "animate-pulse"
          )}
          style={{ width: `${animatedScore}%` }}
        />
      </div>
    </div>
  );
}

export function DQStreamingDashboard({ datasetId, executionId, isActive = true }: DQStreamingDashboardProps) {
  const [metrics, setMetrics] = useState<StreamingMetrics>({
    overallScore: 0,
    errorRate: 0,
    nullRate: 0,
    duplicateRate: 0,
    rulesExecuted: 0,
    rulesPassed: 0,
    rulesFailed: 0,
    lastUpdated: new Date()
  });
  
  // ALLOWED DIMENSIONS ONLY - Consistency and Accuracy removed (cannot compute without external data)
  const [dimensions, setDimensions] = useState<DimensionData[]>([
    { name: 'Completeness', score: 0, previousScore: 0, trend: 'stable', color: 'bg-blue-500' },
    { name: 'Validity', score: 0, previousScore: 0, trend: 'stable', color: 'bg-green-500' },
    { name: 'Uniqueness', score: 0, previousScore: 0, trend: 'stable', color: 'bg-purple-500' },
    { name: 'Timeliness', score: 0, previousScore: 0, trend: 'stable', color: 'bg-orange-500' },
  ]);

  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!datasetId || !isActive) return;

    const fetchLatestData = async () => {
      try {
        // Fetch latest execution
        const { data: execution } = await supabase
          .from('dq_rule_executions')
          .select('*')
          .eq('dataset_id', datasetId)
          .order('execution_ts', { ascending: false })
          .limit(1)
          .single();

        let metricsData: Record<string, unknown>[] = [];
        
        if (execution) {
          const summary = execution.summary as Record<string, number> || {};
          metricsData = execution.metrics as Record<string, unknown>[] || [];

          // Calculate dimension scores from metrics
          const dimensionScores: Record<string, number[]> = {};
          metricsData.forEach((m: Record<string, unknown>) => {
            const dim = (m.dimension as string) || 'unknown';
            const rate = (m.success_rate as number) || 0;
            if (!dimensionScores[dim]) dimensionScores[dim] = [];
            dimensionScores[dim].push(rate * 100);
          });

          setDimensions(prev => prev.map(d => {
            const scores = dimensionScores[d.name.toLowerCase()] || [];
            const newScore = scores.length > 0 
              ? scores.reduce((a, b) => a + b, 0) / scores.length 
              : 0;
            return {
              ...d,
              previousScore: d.score,
              score: newScore,
              trend: newScore > d.score ? 'up' : newScore < d.score ? 'down' : 'stable'
            };
          }));

          const passed = summary.passed || 0;
          const failed = summary.failed || 0;
          const total = passed + failed;

          // REAL COMPUTATION: Derive nullRate from completeness rules, duplicateRate from uniqueness rules
          const completenessRules = metricsData.filter((m: Record<string, unknown>) => 
            (m.dimension as string)?.toLowerCase() === 'completeness'
          );
          const uniquenessRules = metricsData.filter((m: Record<string, unknown>) => 
            (m.dimension as string)?.toLowerCase() === 'uniqueness'
          );
          
          const computedNullRate = completenessRules.length > 0
            ? completenessRules.reduce((sum: number, m: Record<string, unknown>) => 
                sum + (1 - ((m.success_rate as number) || 0)), 0) / completenessRules.length * 100
            : 0;
          
          const computedDuplicateRate = uniquenessRules.length > 0
            ? uniquenessRules.reduce((sum: number, m: Record<string, unknown>) => 
                sum + (1 - ((m.success_rate as number) || 0)), 0) / uniquenessRules.length * 100
            : 0;

          setMetrics({
            overallScore: total > 0 ? (passed / total) * 100 : 0,
            errorRate: summary.error_rate || (total > 0 ? (failed / total) * 100 : 0),
            nullRate: computedNullRate,
            duplicateRate: computedDuplicateRate,
            rulesExecuted: total,
            rulesPassed: passed,
            rulesFailed: failed,
            lastUpdated: new Date()
          });
        }

        // Fetch incidents as hotspots
        const { data: incidents } = await supabase
          .from('dq_incidents')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5);

        if (incidents) {
          // Derive hotspot scores from matching rule execution metrics
          setHotspots(incidents.map(inc => {
            // Try to find matching rule metric to get a real score
            const matchingMetric = metricsData?.find((m: Record<string, unknown>) => 
              (m.rule_name as string)?.includes(inc.dimension || '') ||
              (m.column as string) === inc.dimension
            );
            const derivedScore = matchingMetric 
              ? Math.round((1 - ((matchingMetric.success_rate as number) || 0)) * 100)
              : -1; // -1 = no data available
            
            return {
              column: inc.dimension || 'Unknown',
              issue: inc.action || 'Data quality issue detected',
              severity: inc.severity as 'critical' | 'warning' | 'info',
              score: derivedScore
            };
          }));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch DQ data:', error);
        setIsLoading(false);
      }
    };

    fetchLatestData();

    // Set up real-time subscription
    const channel = supabase
      .channel('dq-streaming-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dq_rule_executions', filter: `dataset_id=eq.${datasetId}` },
        () => {
          setIsUpdating(true);
          fetchLatestData();
          setTimeout(() => setIsUpdating(false), 1000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dq_incidents', filter: `dataset_id=eq.${datasetId}` },
        () => {
          setIsUpdating(true);
          fetchLatestData();
          setTimeout(() => setIsUpdating(false), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [datasetId, isActive]);

  // Update "seconds ago" counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - metrics.lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [metrics.lastUpdated]);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isUpdating ? "border-primary shadow-lg shadow-primary/20" : "border-primary/20"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className={cn("h-5 w-5 text-primary", isUpdating && "animate-pulse")} />
            {/* GOVERNANCE FIX: Renamed from "REAL-TIME" - data is polled, not streamed */}
            QUALITY DASHBOARD
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
            <Timer className="h-4 w-4" />
            <span className="font-mono">{secondsAgo}s ago</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Score + Quick Stats */}
        <div className="flex items-center gap-8">
          <ScoreRing score={metrics.overallScore} isUpdating={isUpdating} />
          
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Error Rate */}
            <div className={cn(
              "p-3 rounded-lg transition-colors",
              metrics.errorRate > 10 ? "bg-destructive/10" : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <XCircle className={cn("h-4 w-4", metrics.errorRate > 10 ? "text-destructive" : "text-muted-foreground")} />
                <span className="text-xs text-muted-foreground">Error Rate</span>
              </div>
              <AnimatedCounter 
                value={metrics.errorRate} 
                suffix="%" 
                className={cn("text-2xl font-bold", metrics.errorRate > 10 ? "text-destructive" : "")}
              />
            </div>

            {/* Null Rate */}
            <div className={cn(
              "p-3 rounded-lg transition-colors",
              metrics.nullRate > 5 ? "bg-warning/10" : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Null Rate</span>
              </div>
              <AnimatedCounter 
                value={metrics.nullRate} 
                suffix="%" 
                className={cn("text-2xl font-bold", metrics.nullRate > 5 ? "text-warning" : "")}
              />
            </div>

            {/* Rules Passed */}
            <div className="p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Passed</span>
              </div>
              <AnimatedCounter 
                value={metrics.rulesPassed} 
                decimals={0}
                className="text-2xl font-bold text-success"
              />
              <span className="text-xs text-muted-foreground"> / {metrics.rulesExecuted}</span>
            </div>

            {/* Rules Failed */}
            <div className={cn(
              "p-3 rounded-lg",
              metrics.rulesFailed > 0 ? "bg-destructive/10" : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={cn("h-4 w-4", metrics.rulesFailed > 0 ? "text-destructive" : "text-muted-foreground")} />
                <span className="text-xs text-muted-foreground">Failed</span>
              </div>
              <AnimatedCounter 
                value={metrics.rulesFailed} 
                decimals={0}
                className={cn("text-2xl font-bold", metrics.rulesFailed > 0 ? "text-destructive" : "")}
              />
            </div>
          </div>
        </div>

        {/* Error Rate Calculation Transparency */}
        {metrics.rulesExecuted > 0 && (
          <ErrorRateExplanation
            failedRules={metrics.rulesFailed}
            totalRules={metrics.rulesExecuted}
            errorRate={metrics.errorRate}
          />
        )}

        {/* FIX #6: Real Charts - Bar Chart for Dimension Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dimension Scores Bar Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Dimension Scores
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={dimensions.map(d => ({ 
                    name: d.name.slice(0, 4), 
                    fullName: d.name,
                    score: Math.round(d.score)
                  }))}
                  layout="vertical"
                >
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={40} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                            <p className="font-medium">{data.fullName}</p>
                            <p className="text-primary">{data.score}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pass/Fail Pie Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Rules Pass/Fail
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Passed', value: metrics.rulesPassed, color: 'hsl(var(--success))' },
                      { name: 'Failed', value: metrics.rulesFailed, color: 'hsl(var(--destructive))' }
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    <Cell fill="hsl(142.1 76.2% 36.3%)" />
                    <Cell fill="hsl(0 84.2% 60.2%)" />
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                            <p className="font-medium">{payload[0].name}</p>
                            <p>{payload[0].value} rules</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={24}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hotspots */}
        {hotspots.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Flame className="h-4 w-4" />
              Active Hotspots ({hotspots.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hotspots.map((hotspot, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    hotspot.severity === 'critical' ? "bg-destructive/5 border-destructive/30" :
                    hotspot.severity === 'warning' ? "bg-warning/5 border-warning/30" :
                    "bg-muted/50 border-border",
                    isUpdating && "animate-pulse"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        hotspot.severity === 'critical' ? "border-destructive text-destructive" :
                        hotspot.severity === 'warning' ? "border-warning text-warning" :
                        "border-muted-foreground"
                      )}
                    >
                      {hotspot.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">{hotspot.column}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {hotspot.issue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FIX #6: Only show activity indicator when actively listening AND have an execution */}
        {executionId && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div 
                  key={i}
                  className={cn(
                    "w-1 bg-primary rounded-full transition-all",
                    isUpdating ? "animate-bounce" : ""
                  )}
                  style={{ 
                    height: `${8 + (i * 3)}px`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {isUpdating ? 'Receiving updates...' : 'Ready'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
