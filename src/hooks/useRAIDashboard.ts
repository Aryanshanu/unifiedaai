import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PillarScore {
  pillar: string;
  score: number | null;
  trend: 'up' | 'down' | 'stable';
  lastEvaluated: string | null;
}

export interface ModelRAIScores {
  modelId: string;
  modelName: string;
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
  composite: number | null;
}

// Weights based on EU AI Act risk priority
const PILLAR_WEIGHTS = {
  fairness: 0.25,
  toxicity: 0.20,
  privacy: 0.20,
  hallucination: 0.20,
  explainability: 0.15,
};

/**
 * Calculate composite RAI score from pillar scores
 */
export function calculateCompositeScore(scores: Partial<Record<string, number | null>>): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [pillar, weight] of Object.entries(PILLAR_WEIGHTS)) {
    const score = scores[pillar];
    if (score !== null && score !== undefined) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight * (1 / totalWeight) * totalWeight) : 0;
}

/**
 * Hook to fetch all models with their RAI scores
 */
export function useModelRAIScores() {
  return useQuery({
    queryKey: ["rai-dashboard-models"],
    queryFn: async (): Promise<ModelRAIScores[]> => {
      // Fetch all models
      const { data: models, error: modelsError } = await supabase
        .from("models")
        .select("id, name, overall_score, fairness_score, toxicity_score, privacy_score");
      
      if (modelsError) throw modelsError;
      
      // Fetch latest evaluation runs for each model
      const { data: evaluations, error: evalError } = await supabase
        .from("evaluation_runs")
        .select("model_id, engine_type, overall_score, created_at")
        .order("created_at", { ascending: false });
      
      if (evalError) throw evalError;
      
      // Group evaluations by model
      const evalsByModel = new Map<string, Map<string, { score: number; date: string }>>();
      
      for (const eval_ of (evaluations || [])) {
        if (!eval_.model_id || !eval_.engine_type || eval_.overall_score === null) continue;
        
        if (!evalsByModel.has(eval_.model_id)) {
          evalsByModel.set(eval_.model_id, new Map());
        }
        
        const modelEvals = evalsByModel.get(eval_.model_id)!;
        if (!modelEvals.has(eval_.engine_type)) {
          modelEvals.set(eval_.engine_type, {
            score: eval_.overall_score,
            date: eval_.created_at,
          });
        }
      }
      
      // Build model scores
      return (models || []).map(model => {
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
        const isCompliant = pillarScores.every(ps => ps.score === null || ps.score >= 70);
        const lastEvaluated = pillarScores
          .filter(ps => ps.lastEvaluated)
          .sort((a, b) => new Date(b.lastEvaluated!).getTime() - new Date(a.lastEvaluated!).getTime())[0]?.lastEvaluated ?? null;
        
        return {
          modelId: model.id,
          modelName: model.name,
          compositeScore,
          pillarScores,
          isCompliant,
          lastEvaluated,
        };
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch trend data for the dashboard
 */
export function useDashboardTrends(days: number = 30) {
  return useQuery({
    queryKey: ["rai-dashboard-trends", days],
    queryFn: async (): Promise<DashboardTrend[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: evaluations, error } = await supabase
        .from("evaluation_runs")
        .select("engine_type, overall_score, created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Group by date
      const byDate = new Map<string, Map<string, number[]>>();
      
      for (const eval_ of (evaluations || [])) {
        if (!eval_.engine_type || eval_.overall_score === null) continue;
        
        const date = eval_.created_at.split('T')[0];
        
        if (!byDate.has(date)) {
          byDate.set(date, new Map());
        }
        
        const dateMap = byDate.get(date)!;
        if (!dateMap.has(eval_.engine_type)) {
          dateMap.set(eval_.engine_type, []);
        }
        dateMap.get(eval_.engine_type)!.push(eval_.overall_score);
      }
      
      // Build trend data
      const trends: DashboardTrend[] = [];
      const sortedDates = Array.from(byDate.keys()).sort();
      
      for (const date of sortedDates) {
        const dateScores = byDate.get(date)!;
        
        const getAvg = (pillar: string) => {
          const scores = dateScores.get(pillar);
          return scores && scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        };
        
        const pillarScores = {
          fairness: getAvg('fairness'),
          toxicity: getAvg('toxicity'),
          privacy: getAvg('privacy'),
          hallucination: getAvg('hallucination'),
          explainability: getAvg('explainability'),
        };
        
        trends.push({
          date,
          ...pillarScores,
          composite: calculateCompositeScore(pillarScores),
        });
      }
      
      return trends;
    },
  });
}

/**
 * Hook to fetch aggregated stats
 */
export function useRAIDashboardStats() {
  return useQuery({
    queryKey: ["rai-dashboard-stats"],
    queryFn: async () => {
      const { data: evaluations, error } = await supabase
        .from("evaluation_runs")
        .select("engine_type, overall_score, status")
        .eq("status", "completed");
      
      if (error) throw error;
      
      const stats = {
        totalEvaluations: evaluations?.length || 0,
        byPillar: {} as Record<string, { count: number; avgScore: number; compliantCount: number }>,
        overallCompliance: 0,
      };
      
      const pillarData = new Map<string, { scores: number[]; compliant: number }>();
      
      for (const eval_ of (evaluations || [])) {
        if (!eval_.engine_type || eval_.overall_score === null) continue;
        
        if (!pillarData.has(eval_.engine_type)) {
          pillarData.set(eval_.engine_type, { scores: [], compliant: 0 });
        }
        
        const data = pillarData.get(eval_.engine_type)!;
        data.scores.push(eval_.overall_score);
        if (eval_.overall_score >= 70) data.compliant++;
      }
      
      let totalCompliant = 0;
      let totalEvals = 0;
      
      for (const [pillar, data] of pillarData) {
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        stats.byPillar[pillar] = {
          count: data.scores.length,
          avgScore: Math.round(avgScore),
          compliantCount: data.compliant,
        };
        totalCompliant += data.compliant;
        totalEvals += data.scores.length;
      }
      
      stats.overallCompliance = totalEvals > 0 ? Math.round((totalCompliant / totalEvals) * 100) : 0;
      
      return stats;
    },
  });
}
