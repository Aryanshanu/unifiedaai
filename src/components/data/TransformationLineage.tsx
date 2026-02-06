import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GitBranch,
  ArrowRight,
  Database,
  Sparkles,
  Filter,
  Layers,
  Combine,
  Wand2,
  Eraser,
  Hash,
  Percent,
  Code,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Transformation {
  id: string;
  source_dataset_id: string | null;
  target_dataset_id: string | null;
  transformation_type: string;
  transformation_name: string | null;
  transformation_logic: string | null;
  columns_affected: string[] | null;
  row_count_before: number | null;
  row_count_after: number | null;
  quality_score_before: number | null;
  quality_score_after: number | null;
  executed_at: string;
  executed_by: string | null;
  metadata: Record<string, unknown>;
  source_dataset?: { id: string; name: string } | null;
  target_dataset?: { id: string; name: string } | null;
}

interface TransformationLineageProps {
  datasetId: string;
  showAsSource?: boolean; // Show transformations where this dataset is the source
  showAsTarget?: boolean; // Show transformations where this dataset is the target
}

const transformationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  filter: Filter,
  aggregate: Layers,
  join: Combine,
  derive: Wand2,
  clean: Eraser,
  sample: Percent,
  normalize: Hash,
  encode: Code,
};

const transformationColors: Record<string, string> = {
  filter: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  aggregate: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  join: 'bg-green-500/10 text-green-600 border-green-500/30',
  derive: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  clean: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  sample: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  normalize: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  encode: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
};

function TransformationCard({ transformation }: { transformation: Transformation }) {
  const Icon = transformationIcons[transformation.transformation_type] || Sparkles;
  const colorClass = transformationColors[transformation.transformation_type] || 'bg-muted text-muted-foreground';

  const rowChange = transformation.row_count_before && transformation.row_count_after
    ? ((transformation.row_count_after - transformation.row_count_before) / transformation.row_count_before * 100)
    : null;

  const qualityChange = transformation.quality_score_before && transformation.quality_score_after
    ? (transformation.quality_score_after - transformation.quality_score_before) * 100
    : null;

  return (
    <div className="flex items-stretch gap-4">
      {/* Source Dataset */}
      <div className="flex-1 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">
            {transformation.source_dataset?.name || 'Unknown Source'}
          </span>
        </div>
        {transformation.row_count_before && (
          <p className="text-xs text-muted-foreground">
            {transformation.row_count_before.toLocaleString()} rows
          </p>
        )}
        {transformation.quality_score_before && (
          <p className="text-xs text-muted-foreground">
            Quality: {(transformation.quality_score_before * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Transformation */}
      <div className="flex flex-col items-center justify-center min-w-[160px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('p-3 rounded-lg border cursor-help', colorClass)}>
                <Icon className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium capitalize">{transformation.transformation_type}</p>
                {transformation.transformation_name && (
                  <p className="text-sm">{transformation.transformation_name}</p>
                )}
                {transformation.transformation_logic && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {transformation.transformation_logic}
                  </pre>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Badge variant="outline" className={cn('mt-2 capitalize text-xs', colorClass)}>
          {transformation.transformation_type}
        </Badge>
        
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {format(new Date(transformation.executed_at), 'MMM d, HH:mm')}
        </div>

        {(rowChange !== null || qualityChange !== null) && (
          <div className="flex gap-2 mt-2 text-xs">
            {rowChange !== null && (
              <span className={cn(
                rowChange >= 0 ? 'text-success' : 'text-warning'
              )}>
                {rowChange >= 0 ? '+' : ''}{rowChange.toFixed(1)}% rows
              </span>
            )}
            {qualityChange !== null && (
              <span className={cn(
                qualityChange >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {qualityChange >= 0 ? '+' : ''}{qualityChange.toFixed(1)}% quality
              </span>
            )}
          </div>
        )}
      </div>

      {/* Arrow */}
      <ArrowRight className="h-5 w-5 text-muted-foreground self-center shrink-0" />

      {/* Target Dataset */}
      <div className="flex-1 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium truncate">
            {transformation.target_dataset?.name || 'Unknown Target'}
          </span>
        </div>
        {transformation.row_count_after && (
          <p className="text-xs text-muted-foreground">
            {transformation.row_count_after.toLocaleString()} rows
          </p>
        )}
        {transformation.quality_score_after && (
          <p className="text-xs text-muted-foreground">
            Quality: {(transformation.quality_score_after * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}

export function TransformationLineage({ 
  datasetId, 
  showAsSource = true, 
  showAsTarget = true 
}: TransformationLineageProps) {
  const { data: transformations, isLoading } = useQuery({
    queryKey: ['data-transformations', datasetId, showAsSource, showAsTarget],
    queryFn: async () => {
      const conditions = [];
      if (showAsSource) conditions.push(`source_dataset_id.eq.${datasetId}`);
      if (showAsTarget) conditions.push(`target_dataset_id.eq.${datasetId}`);
      
      if (conditions.length === 0) return [];

      const { data, error } = await supabase
        .from('data_transformations')
        .select(`
          *,
          source_dataset:datasets!data_transformations_source_dataset_id_fkey(id, name),
          target_dataset:datasets!data_transformations_target_dataset_id_fkey(id, name)
        `)
        .or(conditions.join(','))
        .order('executed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Transformation[];
    },
    enabled: !!datasetId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Data Transformation Lineage</CardTitle>
        </div>
        <CardDescription>
          Track how this dataset was created or transformed
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!transformations?.length ? (
          <div className="text-center py-8">
            <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No transformations recorded</p>
            <p className="text-sm text-muted-foreground">
              Transformations will appear here when you derive or modify datasets
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transformations.map((transformation) => (
              <TransformationCard 
                key={transformation.id} 
                transformation={transformation} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
