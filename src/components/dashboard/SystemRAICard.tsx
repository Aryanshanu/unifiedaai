import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Server, Calendar, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { calculateCompositeScore, isModelCompliant } from '@/hooks/useRAIDashboard';

interface SystemRAICardProps {
  systemId: string;
}

export function SystemRAICard({ systemId }: SystemRAICardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['system-rai-score', systemId],
    queryFn: async () => {
      const { data: system } = await supabase
        .from('systems')
        .select('id, name, provider, deployment_status, system_type')
        .eq('id', systemId)
        .single();

      if (!system) return null;

      const { count: modelCount } = await supabase
        .from('models')
        .select('id', { count: 'exact', head: true })
        .eq('system_id', systemId);

      const { data: models } = await supabase
        .from('models')
        .select('id')
        .eq('system_id', systemId);

      const modelIds = models?.map(m => m.id) || [];

      const emptyScores = { fairness: null as number | null, toxicity: null as number | null, privacy: null as number | null, hallucination: null as number | null, explainability: null as number | null };
      if (modelIds.length === 0) {
        return { system, compositeScore: 0, isCompliant: false, pillarScores: emptyScores, lastEvaluated: null, modelCount: 0 };
      }

      const { data: evalRuns } = await supabase
        .from('evaluation_runs')
        .select('engine_type, overall_score, completed_at')
        .in('model_id', modelIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      const latestByEngine: Record<string, number> = {};
      const seenEngines = new Set<string>();
      for (const run of evalRuns || []) {
        if (run.engine_type && !seenEngines.has(run.engine_type) && run.overall_score !== null) {
          latestByEngine[run.engine_type] = run.overall_score;
          seenEngines.add(run.engine_type);
        }
      }

      const scores = {
        fairness: latestByEngine['fairness'] ?? null,
        toxicity: latestByEngine['toxicity'] ?? null,
        privacy: latestByEngine['privacy'] ?? null,
        hallucination: latestByEngine['hallucination'] ?? null,
        explainability: latestByEngine['explainability'] ?? null,
      };

      return {
        system,
        compositeScore: Math.round(calculateCompositeScore(scores) * 10) / 10,
        isCompliant: isModelCompliant(scores),
        pillarScores: scores,
        lastEvaluated: evalRuns?.[0]?.completed_at || null,
        modelCount: modelCount || 0,
      };
    },
    enabled: !!systemId,
  });

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-24 w-full" /></CardContent></Card>;
  if (!data) return <Card><CardContent className="py-8 text-center text-muted-foreground">System not found</CardContent></Card>;

  const pillars = [
    { name: 'Fairness', score: data.pillarScores.fairness },
    { name: 'Toxicity', score: data.pillarScores.toxicity },
    { name: 'Privacy', score: data.pillarScores.privacy },
    { name: 'Hallucination', score: data.pillarScores.hallucination },
    { name: 'Explainability', score: data.pillarScores.explainability },
  ];

  return (
    <Card className="border-2 border-secondary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-secondary-foreground" />
            <CardTitle className="text-lg">{data.system.name}</CardTitle>
          </div>
          <Badge variant={data.isCompliant ? 'default' : 'destructive'} className="gap-1">
            {data.isCompliant ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {data.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{data.system.provider}</span>
          <span className="capitalize">{data.system.system_type}</span>
          <span>{data.modelCount} models</span>
          {data.lastEvaluated && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(data.lastEvaluated), 'MMM d, yyyy')}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">System RAI Score</span>
          <span className="text-2xl font-bold">{data.compositeScore}%</span>
        </div>
        <Progress value={data.compositeScore} className="h-3" />
        <div className="grid grid-cols-5 gap-2 pt-2">
          {pillars.map((p) => (
            <div key={p.name} className="text-center">
              <div className={`text-lg font-semibold ${(p.score ?? 0) >= 70 ? 'text-green-500' : 'text-destructive'}`}>
                {p.score !== null ? `${p.score}%` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground truncate">{p.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
