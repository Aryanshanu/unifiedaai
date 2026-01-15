import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  Copy, 
  Check,
  Database,
  AlertTriangle,
  BarChart3,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DQDashboardAsset {
  id: string;
  execution_id: string;
  dataset_id: string;
  summary_sql: string;
  hotspots_sql: string;
  dimension_breakdown_sql: string;
  generated_at: string;
}

interface DQDashboardAssetsFullProps {
  assets: DQDashboardAsset | null;
  isLoading?: boolean;
}

function SQLBlock({ 
  title, 
  description, 
  sql, 
  icon: Icon 
}: { 
  title: string; 
  description: string; 
  sql: string; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Add line numbers to SQL
  const sqlWithLineNumbers = sql
    .split('\n')
    .map((line, idx) => `${String(idx + 1).padStart(3, ' ')}  ${line}`)
    .join('\n');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="bg-muted rounded-lg overflow-hidden">
        <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre">
          {sqlWithLineNumbers}
        </pre>
      </div>
    </div>
  );
}

export function DQDashboardAssetsFull({ assets, isLoading }: DQDashboardAssetsFullProps) {
  const [copiedAll, setCopiedAll] = useState(false);

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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!assets) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No dashboard assets yet</p>
          <p className="text-sm text-muted-foreground">Run the pipeline to generate SQL queries</p>
        </CardContent>
      </Card>
    );
  }

  const handleCopyAll = async () => {
    const allSQL = `-- ===========================================
-- DATA QUALITY DASHBOARD ASSETS
-- Generated: ${assets.generated_at}
-- Asset ID: ${assets.id}
-- ===========================================

-- SUMMARY QUERY
${assets.summary_sql}

-- HOTSPOTS QUERY
${assets.hotspots_sql}

-- DIMENSION BREAKDOWN QUERY
${assets.dimension_breakdown_sql}`;

    await navigator.clipboard.writeText(allSQL);
    setCopiedAll(true);
    toast.success('All SQL copied to clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            STEP 4: DASHBOARD ASSETS
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="gap-2"
            >
              {copiedAll ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Copied All
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All SQL
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Generated: {format(new Date(assets.generated_at), 'MMM d, yyyy HH:mm:ss')}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Asset Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <span className="text-sm text-muted-foreground">Asset ID:</span>
            <p className="font-mono text-sm truncate">{assets.id}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Execution ID:</span>
            <p className="font-mono text-sm truncate">{assets.execution_id}</p>
          </div>
        </div>

        {/* Summary SQL */}
        <SQLBlock
          title="Summary SQL"
          description="Aggregate quality metrics across all dimensions for overview dashboards"
          sql={assets.summary_sql}
          icon={Database}
        />

        {/* Hotspots SQL */}
        <SQLBlock
          title="Hotspots SQL"
          description="Identify worst-performing columns and rules requiring immediate attention"
          sql={assets.hotspots_sql}
          icon={AlertTriangle}
        />

        {/* Dimension Breakdown SQL */}
        <SQLBlock
          title="Dimension Breakdown SQL"
          description="Drill-down by quality dimension for detailed analysis and trend tracking"
          sql={assets.dimension_breakdown_sql}
          icon={BarChart3}
        />

        {/* Usage Instructions */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            How to Use These Queries
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Copy and paste into your BI tool (Metabase, Looker, Tableau, etc.)</li>
            <li>Replace execution_id placeholder with actual execution ID if needed</li>
            <li>Schedule as recurring reports for continuous monitoring</li>
            <li>Use hotspots query for alerting when critical thresholds are breached</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
