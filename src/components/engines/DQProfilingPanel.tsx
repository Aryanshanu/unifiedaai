import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Clock, Hash, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DQProfile } from '@/hooks/useDQControlPlane';
import { format } from 'date-fns';

interface DQProfilingPanelProps {
  profile: DQProfile | null;
  isLoading?: boolean;
}

export function DQProfilingPanel({ profile, isLoading }: DQProfilingPanelProps) {
  if (!profile && !isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            DATA PROFILING
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No profiling data available</p>
            <p className="text-xs mt-1">Run the pipeline to generate profile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-primary animate-pulse" />
            DATA PROFILING
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const columns = profile?.column_profiles ? Object.entries(profile.column_profiles) : [];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            DATA PROFILING
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Hash className="h-3 w-3 mr-1" />
              {profile?.row_count?.toLocaleString()} rows
            </Badge>
            {profile?.execution_time_ms && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {profile.execution_time_ms}ms
              </Badge>
            )}
          </div>
        </div>
        {profile?.profile_ts && (
          <p className="text-xs text-muted-foreground mt-1">
            Profiled: {format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b border-border sticky top-0 bg-background">
              <div className="col-span-3">Column</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Completeness</div>
              <div className="col-span-3">Uniqueness</div>
              <div className="col-span-1">Stats</div>
            </div>
            
            {/* Rows */}
            {columns.map(([columnName, stats]) => {
              const completeness = (stats.completeness ?? 0) * 100;
              const uniqueness = (stats.uniqueness ?? 0) * 100;
              
              return (
                <div 
                  key={columnName}
                  className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="col-span-3 font-mono truncate" title={columnName}>
                    {columnName}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {stats.dtype?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Progress 
                      value={completeness} 
                      className={cn(
                        "h-2 flex-1",
                        completeness >= 95 ? "[&>div]:bg-green-500" : 
                        completeness >= 80 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-destructive"
                      )}
                    />
                    <span className="w-10 text-right font-mono">
                      {completeness.toFixed(1)}%
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Progress 
                      value={uniqueness} 
                      className="h-2 flex-1 [&>div]:bg-primary"
                    />
                    <span className="w-10 text-right font-mono">
                      {uniqueness.toFixed(1)}%
                    </span>
                  </div>
                  <div className="col-span-1 text-muted-foreground">
                    {stats.min_value !== undefined && stats.max_value !== undefined ? (
                      <span title={`${stats.min_value} - ${stats.max_value}`}>
                        {typeof stats.min_value === 'number' ? `${stats.min_value}-${stats.max_value}` : '—'}
                      </span>
                    ) : '—'}
                  </div>
                </div>
              );
            })}
            
            {columns.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No column profiles available
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
