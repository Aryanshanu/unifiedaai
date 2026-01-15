import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Columns, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Hash,
  Type,
  Binary,
  Calendar,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ColumnProfile {
  column_name: string;
  dtype: string;
  completeness: number;
  uniqueness: number;
  null_count: number;
  distinct_count: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
  mean_value?: number | null;
  sample_values: (string | number | null)[];
}

interface DQProfile {
  id: string;
  dataset_id: string;
  dataset_version: string | null;
  row_count: number;
  column_profiles: ColumnProfile[] | Record<string, ColumnProfile>;
  profile_ts: string;
  execution_time_ms: number | null;
}

interface DQProfilingReportProps {
  profile: DQProfile | null;
  isLoading?: boolean;
}

function getTypeIcon(dtype: string) {
  switch (dtype?.toLowerCase()) {
    case 'integer':
    case 'float':
    case 'number':
      return <Hash className="h-4 w-4" />;
    case 'string':
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'boolean':
      return <Binary className="h-4 w-4" />;
    case 'datetime':
    case 'date':
    case 'timestamp':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
}

function getCompletenessColor(value: number): string {
  if (value >= 0.95) return 'text-success';
  if (value >= 0.8) return 'text-warning';
  return 'text-destructive';
}

function getUniquenessColor(value: number): string {
  if (value >= 0.9) return 'text-success';
  if (value >= 0.5) return 'text-warning';
  return 'text-muted-foreground';
}

export function DQProfilingReport({ profile, isLoading }: DQProfilingReportProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No profiling data yet</p>
          <p className="text-sm text-muted-foreground">Run the pipeline to generate profiling report</p>
        </CardContent>
      </Card>
    );
  }

  // Normalize column_profiles to array
  const columnProfiles: ColumnProfile[] = Array.isArray(profile.column_profiles)
    ? profile.column_profiles
    : Object.entries(profile.column_profiles || {}).map(([name, data]) => ({
        column_name: name,
        ...(data as Omit<ColumnProfile, 'column_name'>)
      }));

  // Calculate aggregates
  const avgCompleteness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.completeness, 0) / columnProfiles.length
    : 0;
  
  const avgUniqueness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.uniqueness, 0) / columnProfiles.length
    : 0;

  const totalNulls = columnProfiles.reduce((sum, c) => sum + (c.null_count || 0), 0);
  
  const potentialIssues = columnProfiles.filter(c => c.completeness < 0.95 || c.null_count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            STEP 1: DATA PROFILING
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {profile.execution_time_ms}ms
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Profiled: {format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')} | 
          {profile.row_count.toLocaleString()} rows | 
          {columnProfiles.length} columns
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Database className="h-4 w-4" />
              Rows
            </div>
            <p className="text-2xl font-bold">{profile.row_count.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Columns className="h-4 w-4" />
              Columns
            </div>
            <p className="text-2xl font-bold">{columnProfiles.length}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Completeness
            </div>
            <p className={cn("text-2xl font-bold", getCompletenessColor(avgCompleteness))}>
              {(avgCompleteness * 100).toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Issues
            </div>
            <p className={cn(
              "text-2xl font-bold",
              potentialIssues.length === 0 ? "text-success" : "text-warning"
            )}>
              {potentialIssues.length}
            </p>
          </div>
        </div>

        {/* Potential Issues Alert */}
        {potentialIssues.length > 0 && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Potential Issues Detected
            </div>
            <ul className="text-sm space-y-1">
              {potentialIssues.slice(0, 5).map((col) => (
                <li key={col.column_name} className="text-muted-foreground">
                  • <span className="font-medium">{col.column_name}</span>: 
                  {col.completeness < 0.95 && ` ${((1 - col.completeness) * 100).toFixed(1)}% missing`}
                  {col.null_count > 0 && ` (${col.null_count} nulls)`}
                </li>
              ))}
              {potentialIssues.length > 5 && (
                <li className="text-muted-foreground">
                  ... and {potentialIssues.length - 5} more issues
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Column Profiles */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Column Profiles
          </h4>
          
          {columnProfiles.map((col) => (
            <div key={col.column_name} className="border rounded-lg overflow-hidden">
              {/* Column Header */}
              <div className="p-4 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded">
                    {getTypeIcon(col.dtype)}
                  </div>
                  <div>
                    <p className="font-medium">{col.column_name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{col.dtype}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {col.completeness >= 0.99 && (
                    <Badge className="bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {col.uniqueness >= 0.99 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Unique
                    </Badge>
                  )}
                </div>
              </div>

              {/* Column Stats */}
              <div className="p-4 space-y-4">
                {/* Counts Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-medium">{profile.row_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Non-Null:</span>
                    <span className="ml-2 font-medium">
                      {(profile.row_count - (col.null_count || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Null:</span>
                    <span className={cn("ml-2 font-medium", col.null_count > 0 ? "text-warning" : "")}>
                      {col.null_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Distinct:</span>
                    <span className="ml-2 font-medium">{col.distinct_count || 'N/A'}</span>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completeness</span>
                      <span className={cn("font-medium", getCompletenessColor(col.completeness))}>
                        {(col.completeness * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={col.completeness * 100} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uniqueness</span>
                      <span className={cn("font-medium", getUniquenessColor(col.uniqueness))}>
                        {(col.uniqueness * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={col.uniqueness * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Stats Row for Numeric Columns */}
                {(col.dtype === 'integer' || col.dtype === 'float' || col.dtype === 'number') && (
                  <div className="grid grid-cols-3 gap-4 text-sm p-3 bg-muted/30 rounded">
                    <div>
                      <span className="text-muted-foreground">Min:</span>
                      <span className="ml-2 font-mono font-medium">
                        {col.min_value !== null ? String(col.min_value) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max:</span>
                      <span className="ml-2 font-mono font-medium">
                        {col.max_value !== null ? String(col.max_value) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mean:</span>
                      <span className="ml-2 font-mono font-medium">
                        {col.mean_value !== null && col.mean_value !== undefined 
                          ? col.mean_value.toFixed(2) 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sample Values */}
                {col.sample_values && col.sample_values.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Sample Values:</span>
                    <div className="flex flex-wrap gap-2">
                      {col.sample_values.slice(0, 5).map((val, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {val === null ? 'null' : String(val).slice(0, 30)}
                          {String(val).length > 30 && '...'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
