import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DQProfile, ColumnProfile, DimensionScore as BackendDimensionScore } from '@/hooks/useDQControlPlane';

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
}

// TRUTH CONTRACT: Frontend dimension display
interface DimensionDisplay {
  dimension: string;
  score: number | null;
  computed: boolean;
  reason?: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unavailable';
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

function getDimensionStatus(score: number | null): DimensionDisplay['status'] {
  if (score === null) return 'unavailable';
  if (score >= 0.95) return 'excellent';
  if (score >= 0.85) return 'good';
  if (score >= 0.70) return 'fair';
  if (score >= 0.50) return 'poor';
  return 'critical';
}

function getStatusBadge(status: DimensionDisplay['status']) {
  const config = {
    excellent: { label: 'Excellent', className: 'bg-success/10 text-success border-success/30' },
    good: { label: 'Good', className: 'bg-primary/10 text-primary border-primary/30' },
    fair: { label: 'Fair', className: 'bg-warning/10 text-warning border-warning/30' },
    poor: { label: 'Poor', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
    critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/30' },
    unavailable: { label: 'N/A', className: 'bg-muted text-muted-foreground border-muted' },
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

  // ============================================
  // TRUTH CONTRACT: Use backend dimension scores ONLY
  // NO fallback calculations, NO simulated values
  // ============================================
  const backendDimScores: BackendDimensionScore[] = profile.dimension_scores || [];
  
  // Map backend scores to display format
  const dimensionScores: DimensionDisplay[] = [
    'completeness', 'uniqueness', 'validity', 'accuracy', 'timeliness', 'consistency'
  ].map(dimName => {
    const backend = backendDimScores.find(d => d.dimension.toLowerCase() === dimName);
    
    // TRUTH CONTRACT: If no backend score or not computed, show N/A
    const score = backend?.computed ? backend.score : null;
    const reason = backend?.reason || (backend?.computed === false ? 'Not computed by backend' : undefined);
    
    const descriptions: Record<string, string> = {
      completeness: 'Percentage of non-null values',
      uniqueness: 'Percentage of distinct values',
      validity: reason || 'Data conforming to format rules',
      accuracy: reason || 'Data matching real-world facts',
      timeliness: reason || 'Data freshness and currency',
      consistency: reason || 'Cross-system uniformity',
    };

    return {
      dimension: dimName.charAt(0).toUpperCase() + dimName.slice(1),
      score,
      computed: backend?.computed ?? false,
      reason,
      status: getDimensionStatus(score),
      description: descriptions[dimName],
    };
  });

  // Calculate metrics from COMPUTED dimensions only
  const computedDimensions = dimensionScores.filter(d => d.computed && d.score !== null);
  const unavailableDimensions = dimensionScores.filter(d => !d.computed || d.score === null);

  // Detect potential issues from column profiles
  const potentialIssues: PotentialIssue[] = [];
  columnProfiles.forEach(col => {
    if (col.completeness < 90) {
      potentialIssues.push({
        column: col.column_name,
        issue: `${((100 - col.completeness)).toFixed(1)}% missing values (${col.null_count} nulls)`,
        severity: col.completeness < 70 ? 'critical' : 'warning',
        dimension: 'Completeness'
      });
    }
    if (col.uniqueness < 50 && !col.column_name.includes('id')) {
      potentialIssues.push({
        column: col.column_name,
        issue: `Low uniqueness: ${col.uniqueness.toFixed(1)}%`,
        severity: 'info',
        dimension: 'Uniqueness'
      });
    }
  });

  const totalNulls = columnProfiles.reduce((sum, c) => sum + (c.null_count || 0), 0);
  
  // TRUTH CONTRACT: Overall score = average of COMPUTED dimensions only
  const overallScore = computedDimensions.length > 0
    ? computedDimensions.reduce((sum, d) => sum + (d.score || 0), 0) / computedDimensions.length
    : null;

  // Base stats from column profiles
  const avgCompleteness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.completeness, 0) / columnProfiles.length
    : 0;
  
  const avgUniqueness = columnProfiles.length > 0
    ? columnProfiles.reduce((sum, c) => sum + c.uniqueness, 0) / columnProfiles.length
    : 0;

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
            {overallScore !== null ? (
              <Badge 
                className={cn(
                  overallScore >= 0.85 ? 'bg-success/10 text-success border-success/30' :
                  overallScore >= 0.70 ? 'bg-warning/10 text-warning border-warning/30' :
                  'bg-destructive/10 text-destructive border-destructive/30'
                )}
              >
                {(overallScore * 100).toFixed(1)}% Overall
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Partial Data
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Profiled: {format(new Date(profile.profile_ts), 'MMM d, yyyy HH:mm:ss')} | 
          {profile.row_count.toLocaleString()} rows | 
          {columnProfiles.length} columns
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FIX #4: REMOVED warning message about unavailable dimensions - all dimensions now computed */}

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
            <p className={cn("text-2xl font-bold", avgCompleteness >= 95 ? "text-success" : "text-warning")}>
              {avgCompleteness.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Completeness</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Key className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{avgUniqueness.toFixed(1)}%</p>
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
                    <TableRow key={dim.dimension} className={cn(!dim.computed && "opacity-60")}>
                      <TableCell className="font-medium">{dim.dimension}</TableCell>
                      <TableCell className="font-mono font-bold">
                        {dim.computed && dim.score !== null ? `${(dim.score * 100).toFixed(1)}%` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {dim.computed && dim.score !== null ? (
                          <Progress value={dim.score * 100} className="h-2" />
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not Available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dim.computed ? dim.description : (dim.reason || dim.description)}
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
                  const scoreStatus = getScoreStatus(col.completeness / 100);
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
                        {col.distinct_count}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono",
                        col.uniqueness < 50 ? "text-destructive" : col.uniqueness < 80 ? "text-warning" : ""
                      )}>
                        {col.uniqueness.toFixed(1)}%
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isNumeric && col.min_value !== undefined ? col.min_value : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isNumeric && col.max_value !== undefined ? col.max_value : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isNumeric && col.mean_value !== undefined ? col.mean_value : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium", scoreStatus.color)}>
                          {scoreStatus.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detected Issues */}
        {potentialIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Detected Issues ({potentialIssues.length})
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
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
                        <Badge className={cn(
                          issue.severity === 'critical' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                          issue.severity === 'warning' ? 'bg-warning/10 text-warning border-warning/30' :
                          'bg-primary/10 text-primary border-primary/30'
                        )}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{issue.column}</TableCell>
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
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Relationship Metrics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Potential Primary Keys</p>
              <p className="text-lg font-bold mt-1">
                {columnProfiles.filter(c => c.uniqueness > 99).map(c => c.column_name).join(', ') || 'None detected'}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Cardinality</p>
              <p className="text-lg font-bold mt-1">
                {columnProfiles.length} columns
              </p>
              <p className="text-xs text-muted-foreground">
                {columnProfiles.filter(c => c.uniqueness > 99).length} unique identifiers
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Orphaned Records</p>
              <p className="text-lg font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground">No orphaned records detected</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
