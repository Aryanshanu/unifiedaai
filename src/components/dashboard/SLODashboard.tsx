import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLOMetric {
  metric_name: string;
  target_value: number;
  threshold_warning: number | null;
  threshold_critical: number | null;
  current_value: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function SLODashboard() {
  const { data: sloData, isLoading } = useQuery({
    queryKey: ['slo-dashboard'],
    queryFn: async () => {
      // Fetch SLO config
      const { data: sloConfig, error: configError } = await supabase
        .from('slo_config')
        .select('*')
        .eq('enabled', true);

      if (configError) throw configError;

      // Calculate current MTTD (Mean Time to Detect)
      const { data: recentIncidents } = await supabase
        .from('incidents')
        .select('created_at, detected_at, resolved_at, severity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate MTTD for critical incidents
      const criticalIncidents = recentIncidents?.filter(i => i.severity === 'critical') || [];
      const highIncidents = recentIncidents?.filter(i => i.severity === 'high') || [];

      const calculateMTTD = (incidents: typeof criticalIncidents) => {
        if (incidents.length === 0) return null;
        const times = incidents
          .filter(i => i.detected_at)
          .map(i => {
            const created = new Date(i.created_at).getTime();
            const detected = new Date(i.detected_at!).getTime();
            return (detected - created) / 1000 / 60; // minutes
          });
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
      };

      // Calculate MTTR for resolved incidents
      const calculateMTTR = (incidents: typeof criticalIncidents) => {
        const resolved = incidents.filter(i => i.resolved_at);
        if (resolved.length === 0) return null;
        const times = resolved.map(i => {
          const detected = new Date(i.detected_at || i.created_at).getTime();
          const resolvedAt = new Date(i.resolved_at!).getTime();
          return (resolvedAt - detected) / 1000 / 60; // minutes
        });
        return times.reduce((a, b) => a + b, 0) / times.length;
      };

      // Calculate audit completeness
      const { count: totalIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { count: documentedIncidents } = await supabase
        .from('decisions')
        .select('*', { count: 'exact', head: true })
        .gte('decided_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const auditCompleteness = totalIncidents && totalIncidents > 0 
        ? (documentedIncidents || 0) / totalIncidents 
        : 1;

      // Build metrics with current values
      const metrics: SLOMetric[] = (sloConfig || []).map(config => {
        let currentValue: number;
        
        switch (config.metric_name) {
          case 'mttd_critical_minutes':
            currentValue = calculateMTTD(criticalIncidents) ?? 0;
            break;
          case 'mttd_high_minutes':
            currentValue = calculateMTTD(highIncidents) ?? 0;
            break;
          case 'mttr_critical_minutes':
            currentValue = calculateMTTR(criticalIncidents) ?? 0;
            break;
          case 'mttr_high_minutes':
            currentValue = calculateMTTR(highIncidents) ?? 0;
            break;
          case 'audit_completeness':
            currentValue = auditCompleteness;
            break;
          default:
            currentValue = 0;
        }

        // Determine status based on thresholds
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        // For time metrics, lower is better; for rates, higher is better
        const isTimeMetric = config.metric_name.includes('mtt');
        
        if (isTimeMetric) {
          if (config.threshold_critical && currentValue > config.threshold_critical) {
            status = 'critical';
          } else if (config.threshold_warning && currentValue > config.threshold_warning) {
            status = 'warning';
          }
        } else {
          if (config.threshold_critical && currentValue < config.threshold_critical) {
            status = 'critical';
          } else if (config.threshold_warning && currentValue < config.threshold_warning) {
            status = 'warning';
          }
        }

        return {
          metric_name: config.metric_name,
          target_value: Number(config.target_value),
          threshold_warning: config.threshold_warning ? Number(config.threshold_warning) : null,
          threshold_critical: config.threshold_critical ? Number(config.threshold_critical) : null,
          current_value: currentValue,
          status,
        };
      });

      return metrics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            SLO Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMetricName = (name: string): string => {
    const labels: Record<string, string> = {
      'mttd_critical_minutes': 'MTTD (Critical)',
      'mttd_high_minutes': 'MTTD (High)',
      'mttr_critical_minutes': 'MTTR (Critical)',
      'mttr_high_minutes': 'MTTR (High)',
      'alert_precision': 'Precision',
      'alert_recall': 'Recall',
      'audit_completeness': 'Audit Completeness',
    };
    return labels[name] || name;
  };

  const formatValue = (metric: SLOMetric): string => {
    if (metric.metric_name.includes('mtt')) {
      return `${metric.current_value.toFixed(1)} min`;
    }
    if (metric.metric_name.includes('completeness') || 
        metric.metric_name.includes('precision') || 
        metric.metric_name.includes('recall')) {
      return `${(metric.current_value * 100).toFixed(0)}%`;
    }
    return metric.current_value.toFixed(2);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-success/30 bg-success/5';
      case 'warning':
        return 'border-warning/30 bg-warning/5';
      case 'critical':
        return 'border-destructive/30 bg-destructive/5';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          SLO Dashboard
          <Badge variant="outline" className="ml-auto">
            <Clock className="h-3 w-3 mr-1" />
            24h Window
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sloData?.slice(0, 4).map((metric) => (
            <div
              key={metric.metric_name}
              className={cn(
                "p-4 rounded-lg border-2 transition-colors",
                getStatusColor(metric.status)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatMetricName(metric.metric_name)}
                </span>
                {getStatusIcon(metric.status)}
              </div>
              <div className="text-2xl font-bold font-mono">
                {formatValue(metric)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: {metric.metric_name.includes('mtt') 
                  ? `≤${metric.target_value} min` 
                  : `≥${(metric.target_value * 100).toFixed(0)}%`}
              </div>
            </div>
          ))}
        </div>

        {sloData && sloData.length > 4 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {sloData.slice(4).map((metric) => (
              <div
                key={metric.metric_name}
                className={cn(
                  "p-3 rounded-lg border",
                  getStatusColor(metric.status)
                )}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="text-sm font-medium">
                    {formatMetricName(metric.metric_name)}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono mt-1">
                  {formatValue(metric)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
