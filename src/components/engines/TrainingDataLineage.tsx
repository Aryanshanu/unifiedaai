import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Database,
  ArrowRight,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Shield,
  GitBranch,
  ExternalLink,
  FileCheck,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TrainingDataLineageProps {
  modelId: string;
  trainingDatasetId?: string | null;
}

interface DatasetInfo {
  id: string;
  name: string;
  ai_approval_status: string;
  ai_approved_at: string | null;
  version: string | null;
  row_count: number | null;
  business_impact: string | null;
  sensitivity_level: string | null;
}

interface QualityRunInfo {
  id: string;
  overall_score: number | null;
  completeness_score: number | null;
  validity_score: number | null;
  uniqueness_score: number | null;
  created_at: string;
  verdict: string;
}

interface BiasReportInfo {
  id: string;
  overall_bias_score: number | null;
  scan_timestamp: string | null;
  recommendations: string[] | null;
}

export function TrainingDataLineage({ modelId, trainingDatasetId }: TrainingDataLineageProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['training-data-lineage', modelId, trainingDatasetId],
    queryFn: async () => {
      if (!trainingDatasetId) return null;

      // Fetch dataset info
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', trainingDatasetId)
        .single();

      if (datasetError) throw datasetError;

      // Fetch latest quality run at time of model creation
      const { data: qualityRun } = await supabase
        .from('dataset_quality_runs')
        .select('*')
        .eq('dataset_id', trainingDatasetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch bias report
      const { data: biasReport } = await supabase
        .from('dataset_bias_reports')
        .select('*')
        .eq('dataset_id', trainingDatasetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch model info
      const { data: model } = await supabase
        .from('models')
        .select('name, version, created_at, status')
        .eq('id', modelId)
        .single();

      return {
        dataset: dataset as DatasetInfo,
        qualityRun: qualityRun as QualityRunInfo | null,
        biasReport: biasReport as BiasReportInfo | null,
        model,
      };
    },
    enabled: !!trainingDatasetId,
  });

  if (!trainingDatasetId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No training dataset linked</p>
          <p className="text-sm text-muted-foreground mt-1">
            Link a training dataset to enable lineage tracking
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
          <p className="text-muted-foreground">Could not load training data info</p>
        </CardContent>
      </Card>
    );
  }

  const { dataset, qualityRun, biasReport, model } = data;
  const isApproved = dataset.ai_approval_status === 'approved';
  const overallQuality = qualityRun?.overall_score ? qualityRun.overall_score * 100 : null;
  const biasScore = biasReport?.overall_bias_score ? biasReport.overall_bias_score * 100 : null;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Training Data Lineage</CardTitle>
        </div>
        <CardDescription>
          Traceability from model to training dataset
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lineage Flow */}
        <div className="flex items-center gap-4">
          {/* Dataset Node */}
          <div className="flex-1 p-4 bg-muted/30 rounded-lg border-2 border-primary/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{dataset.name}</h4>
                <p className="text-xs text-muted-foreground">
                  v{dataset.version || '1.0'} • {(dataset.row_count || 0).toLocaleString()} rows
                </p>
              </div>
              {isApproved && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="bg-success/10 text-success border-success/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      AI-Approved on {dataset.ai_approved_at 
                        ? format(new Date(dataset.ai_approved_at), 'MMM d, yyyy')
                        : 'Unknown'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/lineage?dataset=${dataset.id}`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View Dataset
            </Button>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground shrink-0" />

          {/* Model Node */}
          <div className="flex-1 p-4 bg-muted/30 rounded-lg border-2 border-secondary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">
                <Brain className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <h4 className="font-medium">{model?.name || 'Model'}</h4>
                <p className="text-xs text-muted-foreground">
                  v{model?.version || '1.0'} • {model?.status || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Scores at Training Time */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quality Score */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quality at Training</span>
            </div>
            {overallQuality !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{overallQuality.toFixed(1)}%</span>
                  <Badge variant={qualityRun?.verdict === 'PASS' ? 'default' : 'destructive'}>
                    {qualityRun?.verdict}
                  </Badge>
                </div>
                <Progress 
                  value={overallQuality} 
                  className={cn(
                    'h-2',
                    overallQuality >= 80 ? '[&>div]:bg-success' :
                    overallQuality >= 60 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Evaluated {qualityRun?.created_at 
                    ? format(new Date(qualityRun.created_at), 'MMM d, yyyy HH:mm')
                    : 'Unknown'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No quality evaluation recorded</p>
            )}
          </div>

          {/* Bias Score */}
          <div className="p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Bias Assessment</span>
            </div>
            {biasScore !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{biasScore.toFixed(1)}%</span>
                  <Badge variant={biasScore >= 70 ? 'default' : 'destructive'}>
                    {biasScore >= 70 ? 'ACCEPTABLE' : 'CONCERN'}
                  </Badge>
                </div>
                <Progress 
                  value={biasScore} 
                  className={cn(
                    'h-2',
                    biasScore >= 80 ? '[&>div]:bg-success' :
                    biasScore >= 70 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                  )}
                />
                {biasReport?.recommendations && biasReport.recommendations.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {biasReport.recommendations.length} recommendation(s)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bias scan recorded</p>
            )}
          </div>
        </div>

        {/* Compliance Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Shield className="h-3.5 w-3.5" />
          <span>Training data traceability required by EU AI Act Article 10</span>
        </div>
      </CardContent>
    </Card>
  );
}
