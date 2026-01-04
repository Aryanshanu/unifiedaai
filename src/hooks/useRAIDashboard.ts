import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Pillar weights based on EU AI Act risk priority
export const PILLAR_WEIGHTS = {
  fairness: 0.25,
  hallucination: 0.20,
  toxicity: 0.20,
  privacy: 0.20,
  explainability: 0.15,
};

export interface PillarScore {
  pillar: string;
  score: number | null;
  trend: 'up' | 'down' | 'stable';
  lastEvaluated: string | null;
}

export interface ModelRAIScores {
  modelId: string;
  modelName: string;
  projectId: string;
  systemId: string;
  compositeScore: number;
  pillarScores: PillarScore[];
  isCompliant: boolean;
  lastEvaluated: string | null;
}

export interface DashboardTrend {
  date: string;
  fairness: number | null;
  toxicity: number | null;
  privacy: number | null;
  hallucination: number | null;
  explainability: number | null;
  composite?: number | null;
}

export function calculateCompositeScore(scores: Partial<Record<string, number | null>>): number {
  const weighted =
    (scores.fairness ?? 0) * PILLAR_WEIGHTS.fairness +
    (scores.hallucination ?? 0) * PILLAR_WEIGHTS.hallucination +
    (scores.toxicity ?? 0) * PILLAR_WEIGHTS.toxicity +
    (scores.privacy ?? 0) * PILLAR_WEIGHTS.privacy +
    (scores.explainability ?? 0) * PILLAR_WEIGHTS.explainability;

  return Math.round(weighted * 10) / 10;
}

export function isModelCompliant(scores: Partial<Record<string, number | null>>): boolean {
  const hasAnyScore = Object.values(scores).some(s => s !== null && s !== undefined);
  if (!hasAnyScore) return false;
  
  return (
    (scores.fairness === null || scores.fairness === undefined || scores.fairness >= 70) &&
    (scores.toxicity === null || scores.toxicity === undefined || scores.toxicity >= 70) &&
    (scores.privacy === null || scores.privacy === undefined || scores.privacy >= 70) &&
    (scores.hallucination === null || scores.hallucination === undefined || scores.hallucination >= 70) &&
    (scores.explainability === null || scores.explainability === undefined || scores.explainability >= 70)
  );
}

// Helper to get a pillar score from the pillarScores array
export function getPillarScore(model: ModelRAIScores, pillar: string): number | null {
  const ps = model.pillarScores.find(p => p.pillar === pillar);
  return ps?.score ?? null;
}

// Hook to fetch RAI scores for models with optional filtering
export function useModelRAIScores(
  projectId?: string | null,
  systemId?: string | null,
  modelId?: string | null
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rai-dashboard-models', projectId, systemId, modelId],
    queryFn: async (): Promise<ModelRAIScores[]> => {
      // Get models based on filters
      let modelsQuery = supabase
        .from('models')
        .select('id, name, project_id, system_id, fairness_score, toxicity_score, privacy_score');

      if (modelId) {
        modelsQuery = modelsQuery.eq('id', modelId);
      } else if (systemId) {
        modelsQuery = modelsQuery.eq('system_id', systemId);
      } else if (projectId) {
        modelsQuery = modelsQuery.eq('project_id', projectId);
      }

      const { data: models, error: modelsError } = await modelsQuery;
      if (modelsError) throw modelsError;
      if (!models || models.length === 0) return [];

      const modelIds = models.map((m) => m.id);

      // Get all completed evaluation runs for these models
      const { data: evalRuns } = await supabase
        .from('evaluation_runs')
        .select('model_id, engine_type, overall_score, completed_at')
        .in('model_id', modelIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      // Group evaluations by model
      const evalsByModel = new Map<string, Map<string, { score: number; date: string }>>();
      
      for (const eval_ of (evalRuns || [])) {
        if (!eval_.model_id || !eval_.engine_type || eval_.overall_score === null) continue;
        
        if (!evalsByModel.has(eval_.model_id)) {
          evalsByModel.set(eval_.model_id, new Map());
        }
        
        const modelEvals = evalsByModel.get(eval_.model_id)!;
        if (!modelEvals.has(eval_.engine_type)) {
          modelEvals.set(eval_.engine_type, {
            score: eval_.overall_score,
            date: eval_.completed_at || '',
          });
        }
      }

      // Build the result
      const results: ModelRAIScores[] = models.map((model) => {
        const modelEvals = evalsByModel.get(model.id) || new Map();

        const pillarScores: PillarScore[] = [
          {
            pillar: 'fairness',
            score: modelEvals.get('fairness')?.score ?? model.fairness_score ?? null,
            trend: 'stable',
            lastEvaluated: modelEvals.get('fairness')?.date ?? null,
          },
          {
            pillar: 'toxicity',
            score: modelEvals.get('toxicity')?.score ?? model.toxicity_score ?? null,
            trend: 'stable',
            lastEvaluated: modelEvals.get('toxicity')?.date ?? null,
          },
          {
            pillar: 'privacy',
            score: modelEvals.get('privacy')?.score ?? model.privacy_score ?? null,
            trend: 'stable',
            lastEvaluated: modelEvals.get('privacy')?.date ?? null,
          },
          {
            pillar: 'hallucination',
            score: modelEvals.get('hallucination')?.score ?? null,
            trend: 'stable',
            lastEvaluated: modelEvals.get('hallucination')?.date ?? null,
          },
          {
            pillar: 'explainability',
            score: modelEvals.get('explainability')?.score ?? null,
            trend: 'stable',
            lastEvaluated: modelEvals.get('explainability')?.date ?? null,
          },
        ];

        const scores = Object.fromEntries(
          pillarScores.map(ps => [ps.pillar, ps.score])
        );

        const compositeScore = calculateCompositeScore(scores);
        const compliant = isModelCompliant(scores);
        const lastEvaluated = pillarScores
          .filter(ps => ps.lastEvaluated)
          .sort((a, b) => new Date(b.lastEvaluated!).getTime() - new Date(a.lastEvaluated!).getTime())[0]?.lastEvaluated ?? null;

        return {
          modelId: model.id,
          modelName: model.name,
          projectId: model.project_id,
          systemId: model.system_id,
          compositeScore,
          pillarScores,
          isCompliant: compliant,
          lastEvaluated,
        };
      });

      return results;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('rai-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evaluation_runs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rai-dashboard-models'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rai_composite_scores',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rai-dashboard-models'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook to fetch dashboard trends over time
export function useDashboardTrends(
  days: number = 30,
  projectId?: string | null,
  systemId?: string | null
) {
  return useQuery({
    queryKey: ['rai-dashboard-trends', days, projectId, systemId],
    queryFn: async (): Promise<DashboardTrend[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get evaluation runs
      const { data: evalRuns, error } = await supabase
        .from('evaluation_runs')
        .select('engine_type, overall_score, completed_at, model_id')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;
      if (!evalRuns || evalRuns.length === 0) return [];

      // If filtering by project/system, get relevant model IDs
      let allowedModelIds: Set<string> | null = null;
      if (projectId || systemId) {
        let modelsQuery = supabase.from('models').select('id');
        if (systemId) {
          modelsQuery = modelsQuery.eq('system_id', systemId);
        } else if (projectId) {
          modelsQuery = modelsQuery.eq('project_id', projectId);
        }
        const { data: models } = await modelsQuery;
        allowedModelIds = new Set((models || []).map(m => m.id));
      }

      // Filter runs
      let filtered = evalRuns;
      if (allowedModelIds) {
        filtered = evalRuns.filter(r => r.model_id && allowedModelIds!.has(r.model_id));
      }

      // Group by date
      const groupedByDate: Record<string, Record<string, number[]>> = {};

      for (const run of filtered) {
        if (!run.completed_at || !run.engine_type || run.overall_score === null) continue;

        const date = run.completed_at.split('T')[0];
        if (!groupedByDate[date]) {
          groupedByDate[date] = {};
        }
        if (!groupedByDate[date][run.engine_type]) {
          groupedByDate[date][run.engine_type] = [];
        }
        groupedByDate[date][run.engine_type].push(run.overall_score);
      }

      // Calculate daily averages
      const trends: DashboardTrend[] = Object.entries(groupedByDate).map(([date, engines]) => {
        const getAvg = (pillar: string) => {
          const scores = engines[pillar];
          return scores && scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        };

        const pillarScores = {
          fairness: getAvg('fairness'),
          toxicity: getAvg('toxicity'),
          privacy: getAvg('privacy'),
          hallucination: getAvg('hallucination'),
          explainability: getAvg('explainability'),
        };

        return {
          date,
          ...pillarScores,
          composite: calculateCompositeScore(pillarScores),
        };
      });

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

// Hook to fetch dashboard statistics
export function useRAIDashboardStats(
  projectId?: string | null,
  systemId?: string | null
) {
  return useQuery({
    queryKey: ['rai-dashboard-stats', projectId, systemId],
    queryFn: async () => {
      // Get evaluation runs
      const { data: evalRuns, error } = await supabase
        .from('evaluation_runs')
        .select('id, engine_type, overall_score, status, model_id')
        .eq('status', 'completed');

      if (error) throw error;

      // If filtering by project/system, get relevant model IDs
      let allowedModelIds: Set<string> | null = null;
      if (projectId || systemId) {
        let modelsQuery = supabase.from('models').select('id');
        if (systemId) {
          modelsQuery = modelsQuery.eq('system_id', systemId);
        } else if (projectId) {
          modelsQuery = modelsQuery.eq('project_id', projectId);
        }
        const { data: models } = await modelsQuery;
        allowedModelIds = new Set((models || []).map(m => m.id));
      }

      // Filter runs
      let filtered = evalRuns || [];
      if (allowedModelIds) {
        filtered = filtered.filter(r => r.model_id && allowedModelIds!.has(r.model_id));
      }

      const totalEvaluations = filtered.length;
      const pillarCounts: Record<string, { total: number; sum: number; compliant: number }> = {
        fairness: { total: 0, sum: 0, compliant: 0 },
        toxicity: { total: 0, sum: 0, compliant: 0 },
        privacy: { total: 0, sum: 0, compliant: 0 },
        hallucination: { total: 0, sum: 0, compliant: 0 },
        explainability: { total: 0, sum: 0, compliant: 0 },
      };

      for (const run of filtered) {
        if (run.engine_type && run.overall_score !== null && pillarCounts[run.engine_type]) {
          pillarCounts[run.engine_type].total++;
          pillarCounts[run.engine_type].sum += run.overall_score;
          if (run.overall_score >= 70) {
            pillarCounts[run.engine_type].compliant++;
          }
        }
      }

      const pillarAverages = Object.fromEntries(
        Object.entries(pillarCounts).map(([key, val]) => [
          key,
          val.total > 0 ? Math.round((val.sum / val.total) * 10) / 10 : null,
        ])
      ) as Record<string, number | null>;

      const overallCompliance =
        Object.values(pillarCounts).reduce((sum, p) => sum + p.compliant, 0) /
        Math.max(Object.values(pillarCounts).reduce((sum, p) => sum + p.total, 0), 1);

      return {
        totalEvaluations,
        pillarAverages,
        pillarCounts,
        overallComplianceRate: Math.round(overallCompliance * 100),
      };
    },
  });
}
