import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PredictiveRisk {
  id: string;
  entity_type: string;
  entity_id: string;
  prediction_type: string;
  risk_score: number;
  confidence: number;
  predicted_timeframe_hours: number;
  factors: Record<string, unknown>;
  created_at: string;
}

export function usePredictiveGovernance(entityType?: string, limit = 20) {
  return useQuery({
    queryKey: ["predictive-governance", entityType, limit],
    queryFn: async () => {
      let query = supabase
        .from("predictive_governance")
        .select("*")
        .order("risk_score", { ascending: false })
        .limit(limit);
      
      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PredictiveRisk[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000, // Refresh every 2 minutes
  });
}

export function useHighRiskPredictions(minRiskScore = 40) {
  return useQuery({
    queryKey: ["high-risk-predictions", minRiskScore],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictive_governance")
        .select("*")
        .gte("risk_score", minRiskScore)
        .order("risk_score", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as PredictiveRisk[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function usePredictionsByEntity(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["predictions-by-entity", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictive_governance")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as PredictiveRisk[];
    },
    enabled: !!entityType && !!entityId,
  });
}

export function usePredictionSummary() {
  return useQuery({
    queryKey: ["prediction-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictive_governance")
        .select("prediction_type, risk_score")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const predictions = data || [];
      
      return {
        total: predictions.length,
        high_risk: predictions.filter(p => p.risk_score >= 70).length,
        medium_risk: predictions.filter(p => p.risk_score >= 40 && p.risk_score < 70).length,
        low_risk: predictions.filter(p => p.risk_score < 40).length,
        by_type: predictions.reduce((acc, p) => {
          acc[p.prediction_type] = (acc[p.prediction_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        avg_risk: predictions.length > 0
          ? Math.round(predictions.reduce((sum, p) => sum + p.risk_score, 0) / predictions.length)
          : 0,
      };
    },
    refetchInterval: 60000,
  });
}

export function useRunPredictiveAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('predictive-governance', {
        body: { action: 'analyze_all' }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-governance'] });
      queryClient.invalidateQueries({ queryKey: ['high-risk-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction-summary'] });
      toast.success("Predictive analysis complete");
    },
    onError: (error: Error) => {
      toast.error("Analysis failed", { description: error.message });
    }
  });
}
