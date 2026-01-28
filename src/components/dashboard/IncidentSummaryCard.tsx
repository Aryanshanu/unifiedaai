import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, AlertOctagon, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface IncidentSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  investigating: number;
}

export function IncidentSummaryCard() {
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['incident-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('severity, status')
        .neq('status', 'resolved');

      if (error) throw error;

      const incidents = data || [];
      return {
        total: incidents.length,
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
      } as IncidentSummary;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasIncidents = (summary?.total || 0) > 0;
  const hasCritical = (summary?.critical || 0) > 0;

  return (
    <Card className={cn(
      "transition-all",
      hasCritical && "border-destructive/50 bg-destructive/5",
      !hasCritical && hasIncidents && "border-warning/50 bg-warning/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {hasCritical ? (
            <AlertOctagon className="h-5 w-5 text-destructive" />
          ) : hasIncidents ? (
            <AlertTriangle className="h-5 w-5 text-warning" />
          ) : (
            <AlertCircle className="h-5 w-5 text-success" />
          )}
          <span>Open Incidents</span>
          <Badge 
            variant={hasCritical ? "destructive" : hasIncidents ? "secondary" : "outline"}
            className="ml-auto text-lg px-3"
          >
            {summary?.total || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasIncidents ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className={cn(
                "p-2 rounded-lg",
                (summary?.critical || 0) > 0 ? "bg-destructive/10" : "bg-muted/50"
              )}>
                <p className={cn(
                  "text-xl font-bold",
                  (summary?.critical || 0) > 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {summary?.critical || 0}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                (summary?.high || 0) > 0 ? "bg-warning/10" : "bg-muted/50"
              )}>
                <p className={cn(
                  "text-xl font-bold",
                  (summary?.high || 0) > 0 ? "text-warning" : "text-muted-foreground"
                )}>
                  {summary?.high || 0}
                </p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-muted-foreground">
                  {summary?.medium || 0}
                </p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xl font-bold text-muted-foreground">
                  {summary?.low || 0}
                </p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>

            {(summary?.investigating || 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>{summary?.investigating} currently under investigation</span>
              </div>
            )}

            <Button 
              variant={hasCritical ? "destructive" : "default"}
              size="sm" 
              className="w-full"
              onClick={() => navigate('/incidents')}
            >
              View All Incidents
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-success font-medium">All clear!</p>
            <p className="text-xs text-muted-foreground mt-1">No open incidents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
