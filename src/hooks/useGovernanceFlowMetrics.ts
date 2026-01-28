import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StageMetrics {
  id: number;
  name: string;
  description: string;
  path: string;
  status: 'complete' | 'in_progress' | 'pending' | 'warning';
  metrics: { label: string; value: string | number }[];
}

interface GovernanceFlowData {
  stages: StageMetrics[];
  isLoading: boolean;
  error: Error | null;
}

export function useGovernanceFlowMetrics(): GovernanceFlowData {
  const { data, isLoading, error } = useQuery({
    queryKey: ['governance-flow-metrics'],
    queryFn: async () => {
      // Fetch all metrics in parallel
      const [
        sourcesRes,
        uploadsRes,
        profilesRes,
        datasetsRes,
        approvedDatasetsRes,
        modelsRes,
        evaluationRunsRes,
        incidentsRes,
      ] = await Promise.all([
        supabase.from('data_sources').select('id', { count: 'exact', head: true }),
        supabase.from('data_uploads').select('id', { count: 'exact', head: true }),
        supabase.from('dq_profiles').select('dimension_scores, profile_ts').order('profile_ts', { ascending: false }).limit(1),
        supabase.from('datasets').select('id', { count: 'exact', head: true }),
        supabase.from('datasets').select('id', { count: 'exact', head: true }).eq('ai_approval_status', 'approved'),
        supabase.from('models').select('id', { count: 'exact', head: true }),
        supabase.from('evaluation_runs').select('id, engine_type', { count: 'exact' }),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      ]);

      const sourcesCount = (sourcesRes.count || 0) + (uploadsRes.count || 0);
      const latestProfile = profilesRes.data?.[0];
      const approvedCount = approvedDatasetsRes.count || 0;
      const modelsCount = modelsRes.count || 0;
      const evaluationsCount = evaluationRunsRes.count || 0;
      const openIncidentsCount = incidentsRes.count || 0;

      // Calculate quality score from latest profile
      let qualityScore: number | null = null;
      if (latestProfile?.dimension_scores) {
        const scores = latestProfile.dimension_scores as Record<string, number>;
        const validScores = Object.values(scores).filter(s => typeof s === 'number' && !isNaN(s));
        if (validScores.length > 0) {
          qualityScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
        }
      }

      return {
        sourcesCount,
        qualityScore,
        approvedCount,
        modelsCount,
        evaluationsCount,
        openIncidentsCount,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate stage statuses based on metrics
  const getStageStatus = (stageId: number): 'complete' | 'in_progress' | 'pending' | 'warning' => {
    if (!data) return 'pending';

    switch (stageId) {
      case 1: // Data Ingestion
        return data.sourcesCount > 0 ? 'complete' : 'pending';
      case 2: // Data Quality
        if (data.qualityScore === null) return 'pending';
        if (data.qualityScore >= 80) return 'complete';
        if (data.qualityScore >= 60) return 'in_progress';
        return 'warning';
      case 3: // AI Readiness
        return data.approvedCount > 0 ? 'complete' : 'pending';
      case 4: // AI Development
        return data.modelsCount > 0 ? 'in_progress' : 'pending';
      case 5: // RAI Controls
        if (data.evaluationsCount === 0) return 'pending';
        // Check if we have at least 5 evaluations (one per engine)
        return data.evaluationsCount >= 5 ? 'complete' : 'in_progress';
      case 6: // Monitoring
        if (data.openIncidentsCount === 0) return 'complete';
        if (data.openIncidentsCount > 50) return 'warning';
        return 'in_progress';
      default:
        return 'pending';
    }
  };

  const stages: StageMetrics[] = data ? [
    {
      id: 1,
      name: "Data Ingestion",
      description: "Capture & validate source data",
      path: "/engine/data-quality",
      status: getStageStatus(1),
      metrics: [{ label: "Sources", value: data.sourcesCount ?? 0 }]
    },
    {
      id: 2,
      name: "Data Quality",
      description: "Profile, validate & certify",
      path: "/engine/data-quality",
      status: getStageStatus(2),
      metrics: [{ label: "Quality Score", value: data.qualityScore != null ? `${data.qualityScore}%` : 'N/A' }]
    },
    {
      id: 3,
      name: "AI Readiness",
      description: "Lineage, bias checks & approval",
      path: "/engine/data-quality",
      status: getStageStatus(3),
      metrics: [{ label: "Approved", value: data.approvedCount ?? 0 }]
    },
    {
      id: 4,
      name: "AI Development",
      description: "Model registration & traceability",
      path: "/models",
      status: getStageStatus(4),
      metrics: [{ label: "Models", value: data.modelsCount ?? 0 }]
    },
    {
      id: 5,
      name: "RAI Controls",
      description: "Fairness, safety & compliance",
      path: "/engine/fairness",
      status: getStageStatus(5),
      metrics: [{ label: "Evaluations", value: data.evaluationsCount ?? 0 }]
    },
    {
      id: 6,
      name: "Monitoring",
      description: "Drift, violations & feedback",
      path: "/observability",
      status: getStageStatus(6),
      metrics: [{ label: "Open Incidents", value: data.openIncidentsCount ?? 0 }]
    }
  ] : [];

  return {
    stages,
    isLoading,
    error: error as Error | null,
  };
}
