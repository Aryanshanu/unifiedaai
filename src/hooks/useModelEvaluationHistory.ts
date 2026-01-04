import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EvaluationHistoryEntry {
  id: string;
  model_id: string;
  engine_type: string | null;
  overall_score: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface ModelEvaluationSummary {
  modelId: string;
  modelName: string;
  latestScores: {
    fairness: number | null;
    toxicity: number | null;
    privacy: number | null;
    hallucination: number | null;
    explainability: number | null;
  };
  lastEvaluated: string | null;
  totalEvaluations: number;
}

export function useModelEvaluationHistory(modelId?: string) {
  return useQuery({
    queryKey: ['model-evaluation-history', modelId],
    queryFn: async (): Promise<EvaluationHistoryEntry[]> => {
      const query = supabase
        .from('evaluation_runs')
        .select('id, model_id, engine_type, overall_score, status, completed_at, created_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (modelId) {
        query.eq('model_id', modelId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

export function useModelsEvaluationSummary(
  projectId?: string | null,
  systemId?: string | null
) {
  return useQuery({
    queryKey: ['models-evaluation-summary', projectId, systemId],
    queryFn: async (): Promise<ModelEvaluationSummary[]> => {
      // First get models based on filters
      let modelsQuery = supabase.from('models').select('id, name, project_id, system_id');

      if (systemId) {
        modelsQuery = modelsQuery.eq('system_id', systemId);
      } else if (projectId) {
        modelsQuery = modelsQuery.eq('project_id', projectId);
      }

      const { data: models, error: modelsError } = await modelsQuery;

      if (modelsError) throw modelsError;
      if (!models || models.length === 0) return [];

      const modelIds = models.map((m) => m.id);

      // Get all completed evaluation runs for these models
      const { data: evalRuns, error: evalError } = await supabase
        .from('evaluation_runs')
        .select('id, model_id, engine_type, overall_score, completed_at')
        .in('model_id', modelIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (evalError) throw evalError;

      // Build summary for each model
      const summaries: ModelEvaluationSummary[] = models.map((model) => {
        const modelRuns = evalRuns?.filter((r) => r.model_id === model.id) || [];

        // Get latest score for each engine type
        const latestByEngine: Record<string, number | null> = {};
        const seenEngines = new Set<string>();

        for (const run of modelRuns) {
          if (run.engine_type && !seenEngines.has(run.engine_type)) {
            latestByEngine[run.engine_type] = run.overall_score;
            seenEngines.add(run.engine_type);
          }
        }

        return {
          modelId: model.id,
          modelName: model.name,
          latestScores: {
            fairness: latestByEngine['fairness'] ?? null,
            toxicity: latestByEngine['toxicity'] ?? null,
            privacy: latestByEngine['privacy'] ?? null,
            hallucination: latestByEngine['hallucination'] ?? null,
            explainability: latestByEngine['explainability'] ?? null,
          },
          lastEvaluated: modelRuns[0]?.completed_at || null,
          totalEvaluations: modelRuns.length,
        };
      });

      return summaries;
    },
    enabled: true,
  });
}

export function useEvaluationTrends(
  projectId?: string | null,
  systemId?: string | null,
  days: number = 30
) {
  return useQuery({
    queryKey: ['evaluation-trends', projectId, systemId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('evaluation_runs')
        .select('id, model_id, engine_type, overall_score, completed_at, models!inner(project_id, system_id)')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // Filter by project/system
      let filtered = data;
      if (systemId) {
        filtered = data.filter((r) => (r.models as any)?.system_id === systemId);
      } else if (projectId) {
        filtered = data.filter((r) => (r.models as any)?.project_id === projectId);
      }

      // Group by date and engine type
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
      const trends = Object.entries(groupedByDate).map(([date, engines]) => {
        const avgScores: Record<string, number | null> = {
          fairness: null,
          toxicity: null,
          privacy: null,
          hallucination: null,
          explainability: null,
        };

        for (const [engine, scores] of Object.entries(engines)) {
          if (scores.length > 0) {
            avgScores[engine] = scores.reduce((a, b) => a + b, 0) / scores.length;
          }
        }

        return {
          date,
          ...avgScores,
        };
      });

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: true,
  });
}
