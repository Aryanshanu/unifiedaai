/**
 * ColumnAnalysisGrid - Display per-column statistics for data quality
 * Shows type, nulls, unique values, min/max/mean, violations, and status
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Hash, 
  Type, 
  Calendar,
  Mail,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnAnalysis {
  column: string;
  type: string;
  total_values: number;
  null_count: number;
  null_percentage: number;
  unique_values: number;
  unique_percentage: number;
  min?: number;
  max?: number;
  mean?: number;
  std_dev?: number;
  sample_values?: (string | number | null)[];
  range_violations: number;
  format_violations: number;
  status: 'pass' | 'warn' | 'fail';
}

interface ColumnAnalysisGridProps {
  columns: ColumnAnalysis[];
  showDetails?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  integer: <Hash className="w-3 h-3" />,
  float: <Hash className="w-3 h-3" />,
  number: <Hash className="w-3 h-3" />,
  string: <Type className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
};

export function ColumnAnalysisGrid({ columns, showDetails = true }: ColumnAnalysisGridProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-success/10 text-success border-success/20">PASS</Badge>;
      case 'warn':
        return <Badge className="bg-warning/10 text-warning border-warning/20">WARN</Badge>;
      case 'fail':
        return <Badge className="bg-danger/10 text-danger border-danger/20">FAIL</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getNullBgColor = (percentage: number) => {
    if (percentage <= 5) return 'bg-success';
    if (percentage <= 20) return 'bg-warning';
    return 'bg-danger';
  };

  if (columns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            Column Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No column data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="w-5 h-5 text-primary" />
          Column Analysis
          <Badge variant="outline" className="ml-2 text-xs">
            {columns.length} columns
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Column</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="w-[120px]">Nulls</TableHead>
                <TableHead className="w-[120px]">Unique</TableHead>
                {showDetails && (
                  <>
                    <TableHead className="w-[80px]">Min</TableHead>
                    <TableHead className="w-[80px]">Max</TableHead>
                    <TableHead className="w-[80px]">Mean</TableHead>
                  </>
                )}
                <TableHead className="w-[100px]">Violations</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((col) => (
                <TableRow key={col.column}>
                  <TableCell className="font-medium">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block max-w-[140px] cursor-help">
                            {col.column}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{col.column}</p>
                            {col.sample_values && col.sample_values.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <p>Sample values:</p>
                                <ul className="list-disc list-inside">
                                  {col.sample_values.slice(0, 3).map((v, i) => (
                                    <li key={i}>{String(v)}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {TYPE_ICONS[col.type] || <Type className="w-3 h-3" />}
                      <span className="text-xs text-muted-foreground capitalize">
                        {col.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{col.null_count}</span>
                        <span className="text-muted-foreground">
                          {col.null_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={100 - col.null_percentage} 
                        className={cn("h-1", getNullBgColor(col.null_percentage))}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{col.unique_values}</span>
                        <span className="text-muted-foreground">
                          {col.unique_percentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={col.unique_percentage} 
                        className="h-1"
                      />
                    </div>
                  </TableCell>
                  {showDetails && (
                    <>
                      <TableCell className="text-xs text-muted-foreground">
                        {col.min !== undefined ? col.min.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {col.max !== undefined ? col.max.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {col.mean !== undefined ? col.mean.toLocaleString() : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {col.range_violations + col.format_violations > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="destructive" 
                                className="text-xs cursor-help"
                              >
                                {col.range_violations + col.format_violations}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 text-xs">
                                <p>Range violations: {col.range_violations}</p>
                                <p>Format violations: {col.format_violations}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge variant="outline" className="text-xs">0</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(col.status)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-success" />
            <span>{columns.filter(c => c.status === 'pass').length} passed</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            <span>{columns.filter(c => c.status === 'warn').length} warnings</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-danger" />
            <span>{columns.filter(c => c.status === 'fail').length} failed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
