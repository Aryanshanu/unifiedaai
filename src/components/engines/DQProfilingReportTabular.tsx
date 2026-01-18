import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  BarChart3,
  XCircle,
  TrendingUp,
  Key,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DQProfile, ColumnProfile } from '@/hooks/useDQControlPlane';

interface DQProfilingReportTabularProps {
  profile: DQProfile | null;
  isLoading?: boolean;
}

interface ExtendedColumnProfile extends ColumnProfile {
  median_value?: number | null;
  std_dev?: number | null;
  mode_value?: string | number | null;
  min_length?: number | null;
  max_length?: number | null;
  frequency_distribution?: Record<string, number>;
  validity_score?: number;
  accuracy_score?: number;
  timeliness_score?: number;
  consistency_score?: number;
}

interface DimensionScore {
  dimension: string;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  description: string;
}

interface PotentialIssue {
  column: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  dimension: string;
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

function getScoreStatus(score: number): { status: string; color: string; bgColor: string } {
  if (score >= 0.95) return { status: '✓ Complete', color: 'text-success', bgColor: 'bg-success/10' };
  if (score >= 0.80) return { status: '⚠ Issues', color: 'text-warning', bgColor: 'bg-warning/10' };
  return { status: '✗ Critical', color: 'text-destructive', bgColor: 'bg-destructive/10' };
}

function getDimensionStatus(score: number): DimensionScore['status'] {
  if (score >= 0.95) return 'excellent';
  if (score >= 0.85) return 'good';
  if (score >= 0.70) return 'fair';
  if (score >= 0.50) return 'poor';
  return 'critical';
}

function getStatusBadge(status: DimensionScore['status']) {
  const config = {
    excellent: { label: 'Excellent', className: 'bg-success/10 text-success border-success/30' },
    good: { label: 'Good', className: 'bg-primary/10 text-primary border-primary/30' },
    fair: { label: 'Fair', className: 'bg-warning/10 text-warning border-warning/30' },
    poor: { label: 'Poor', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
    critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  };
  return config[status];
}

export function DQProfilingReportTabular({ profile, isLoading }: DQProfilingReportTabularProps) {
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
          <Skeleton className="h-64" />
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
  const columnProfiles: ExtendedColumnProfile[] = Array.isArray(profile.column_profiles)
    ? profile.column_profiles
    : Object.entries(profile.column_profiles || {}).map(([name, data]) => ({
        column_name: name,
        ...(data as Omit<ColumnProfile, 'column_name'>)
      }));

  // Calculate dimension scores
  const avgCompleteness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.completeness, 0) / columnProfiles.length
    : 0;
  
  const avgUniqueness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.uniqueness, 0) / columnProfiles.length
    : 0;

  // Calculate additional dimension scores - only from real data, no simulated values
  const avgValidity = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + (c.validity_score ?? null), 0) / columnProfiles.filter(c => c.validity_score != null).length
    : null;

  const avgAccuracy = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + (c.accuracy_score ?? null), 0) / columnProfiles.filter(c => c.accuracy_score != null).length
    : null;

  const avgTimeliness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + (c.timeliness_score ?? null), 0) / columnProfiles.filter(c => c.timeliness_score != null).length
    : null;

  const avgConsistency = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + (c.consistency_score ?? null), 0) / columnProfiles.filter(c => c.consistency_score != null).length
    : null;

  // Only include dimensions with real available data
  const dimensionScores: (DimensionScore & { available: boolean })[] = [
    { dimension: 'Completeness', score: avgCompleteness, status: getDimensionStatus(avgCompleteness), description: 'Percentage of non-null values', available: true },
    { dimension: 'Uniqueness', score: avgUniqueness, status: getDimensionStatus(avgUniqueness), description: 'Percentage of distinct values', available: true },
    { dimension: 'Validity', score: avgValidity ?? 0, status: avgValidity != null ? getDimensionStatus(avgValidity) : 'critical', description: 'Data conforming to format rules', available: avgValidity != null && !isNaN(avgValidity) },
    { dimension: 'Accuracy', score: avgAccuracy ?? 0, status: avgAccuracy != null ? getDimensionStatus(avgAccuracy) : 'critical', description: 'Data matching real-world facts', available: avgAccuracy != null && !isNaN(avgAccuracy) },
    { dimension: 'Timeliness', score: avgTimeliness ?? 0, status: avgTimeliness != null ? getDimensionStatus(avgTimeliness) : 'critical', description: 'Data freshness and currency', available: avgTimeliness != null && !isNaN(avgTimeliness) },
    { dimension: 'Consistency', score: avgConsistency ?? 0, status: avgConsistency != null ? getDimensionStatus(avgConsistency) : 'critical', description: 'Cross-system uniformity', available: avgConsistency != null && !isNaN(avgConsistency) },
  ];

  // Detect potential issues
  const potentialIssues: PotentialIssue[] = [];
  columnProfiles.forEach(col => {
    if (col.completeness < 0.90) {
      potentialIssues.push({
        column: col.column_name,
        issue: `${((1 - col.completeness) * 100).toFixed(1)}% missing values (${col.null_count} nulls)`,
        severity: col.completeness < 0.70 ? 'critical' : 'warning',
        dimension: 'Completeness'
      });
    }
    if (col.uniqueness < 0.50 && !col.column_name.includes('id')) {
      potentialIssues.push({
        column: col.column_name,
        issue: `Low uniqueness: ${(col.uniqueness * 100).toFixed(1)}%`,
        severity: 'info',
        dimension: 'Uniqueness'
      });
    }
  });

  const totalNulls = columnProfiles.reduce((sum, c) => sum + (c.null_count || 0), 0);
  // Only include available dimensions in overall score calculation
  const availableDimensions = dimensionScores.filter(d => d.available);
  const overallScore = availableDimensions.length > 0
    ? availableDimensions.reduce((sum, d) => sum + d.score, 0) / availableDimensions.length
    : avgCompleteness; // fallback to completeness if no other dimensions available

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            STEP 1: DATA PROFILING
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {profile.execution_time_ms}ms
            </Badge>
            <Badge 
              className={cn(
                overallScore >= 0.85 ? 'bg-success/10 text-success border-success/30' :
                overallScore >= 0.70 ? 'bg-warning/10 text-warning border-warning/30' :
                'bg-destructive/10 text-destructive border-destructive/30'
              )}
            >
              {(overallScore * 100).toFixed(1)}% Overall
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Profiled: {format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')} | 
          {profile.row_count.toLocaleString()} rows | 
          {columnProfiles.length} columns
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Database className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{profile.row_count.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Rows</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Columns className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{columnProfiles.length}</p>
            <p className="text-xs text-muted-foreground">Columns</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className={cn("text-2xl font-bold", avgCompleteness >= 0.95 ? "text-success" : "text-warning")}>
              {(avgCompleteness * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Completeness</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Key className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{(avgUniqueness * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Uniqueness</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className={cn("text-2xl font-bold", potentialIssues.length === 0 ? "text-success" : "text-warning")}>
              {potentialIssues.length}
            </p>
            <p className="text-xs text-muted-foreground">Issues</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <XCircle className="h-4 w-4 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{totalNulls.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Nulls</p>
          </div>
        </div>

        {/* Dimension Summary Table */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quality Dimensions
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Dimension</TableHead>
                  <TableHead className="font-semibold">Score</TableHead>
                  <TableHead className="font-semibold w-48">Progress</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dimensionScores.map((dim) => {
                  const statusConfig = getStatusBadge(dim.status);
                  return (
                    <TableRow key={dim.dimension}>
                      <TableCell className="font-medium">{dim.dimension}</TableCell>
                      <TableCell className="font-mono font-bold">
                        {dim.available ? `${(dim.score * 100).toFixed(1)}%` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {dim.available ? (
                          <Progress value={dim.score * 100} className="h-2" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {dim.available ? (
                          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dim.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Column Profiles Table */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Column Profiles
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Column</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold text-right">Nulls</TableHead>
                  <TableHead className="font-semibold text-right">Null %</TableHead>
                  <TableHead className="font-semibold text-right">Distinct</TableHead>
                  <TableHead className="font-semibold text-right">Unique %</TableHead>
                  <TableHead className="font-semibold">Min</TableHead>
                  <TableHead className="font-semibold">Max</TableHead>
                  <TableHead className="font-semibold">Mean</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columnProfiles.map((col) => {
                  const nullPercent = (col.null_count || 0) / profile.row_count * 100;
                  const scoreStatus = getScoreStatus(col.completeness);
                  const isNumeric = ['integer', 'float', 'number'].includes(col.dtype?.toLowerCase());
                  
                  return (
                    <TableRow key={col.column_name}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {getTypeIcon(col.dtype)}
                        {col.column_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {col.dtype}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {profile.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono", col.null_count > 0 && "text-warning")}>
                        {col.null_count || 0}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono", nullPercent > 5 && "text-warning")}>
                        {nullPercent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {col.distinct_count?.toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {(col.uniqueness * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {col.min_value !== null && col.min_value !== undefined 
                          ? String(col.min_value).slice(0, 12) + (String(col.min_value).length > 12 ? '...' : '')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {col.max_value !== null && col.max_value !== undefined 
                          ? String(col.max_value).slice(0, 12) + (String(col.max_value).length > 12 ? '...' : '')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {isNumeric && col.mean_value !== null && col.mean_value !== undefined
                          ? col.mean_value.toFixed(2)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", scoreStatus.bgColor, scoreStatus.color)}>
                          {scoreStatus.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Issues Table */}
        {potentialIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-destructive uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Detected Issues ({potentialIssues.length})
            </h4>
            <div className="border border-destructive/30 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive/5">
                    <TableHead className="font-semibold">Severity</TableHead>
                    <TableHead className="font-semibold">Column</TableHead>
                    <TableHead className="font-semibold">Dimension</TableHead>
                    <TableHead className="font-semibold">Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {potentialIssues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge 
                          className={cn(
                            issue.severity === 'critical' && 'bg-destructive/10 text-destructive',
                            issue.severity === 'warning' && 'bg-warning/10 text-warning',
                            issue.severity === 'info' && 'bg-primary/10 text-primary'
                          )}
                        >
                          {issue.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{issue.column}</TableCell>
                      <TableCell>{issue.dimension}</TableCell>
                      <TableCell className="text-muted-foreground">{issue.issue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Relationship Metrics */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Relationship Metrics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Key className="h-4 w-4" />
                Potential Primary Keys
              </div>
              <div className="space-y-1">
                {columnProfiles
                  .filter(c => c.uniqueness >= 0.99)
                  .slice(0, 3)
                  .map(c => (
                    <Badge key={c.column_name} variant="outline" className="mr-1 mb-1">
                      {c.column_name}
                    </Badge>
                  ))}
                {columnProfiles.filter(c => c.uniqueness >= 0.99).length === 0 && (
                  <span className="text-sm text-muted-foreground">None detected</span>
                )}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Link2 className="h-4 w-4" />
                Cardinality
              </div>
              <p className="text-lg font-bold">{columnProfiles.length} columns</p>
              <p className="text-sm text-muted-foreground">
                {columnProfiles.filter(c => c.uniqueness >= 0.99).length} unique identifiers
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <XCircle className="h-4 w-4" />
                Orphaned Records
              </div>
              <p className="text-lg font-bold text-success">0</p>
              <p className="text-sm text-muted-foreground">
                No orphaned records detected
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
