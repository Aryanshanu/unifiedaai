import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformConfig {
  id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  category: string;
  version: number;
  description: string | null;
  updated_at: string;
}

export function usePlatformConfig(category?: string) {
  return useQuery({
    queryKey: ["platform-config", category],
    queryFn: async () => {
      let query = supabase.from("platform_config").select("*");
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query.order("config_key");
      
      if (error) throw error;
      return data as PlatformConfig[];
    },
  });
}

export function useConfigValue<T = Record<string, unknown>>(configKey: string) {
  return useQuery({
    queryKey: ["platform-config-value", configKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("config_value")
        .eq("config_key", configKey)
        .single();
      
      if (error) throw error;
      return data?.config_value as T;
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configKey, 
      value 
    }: { 
      configKey: string; 
      value: Record<string, unknown>;
    }) => {
      // Get current config for history
      const { data: current } = await supabase
        .from("platform_config")
        .select("id, config_value, version")
        .eq("config_key", configKey)
        .single();

      if (!current) {
        throw new Error(`Config key "${configKey}" not found`);
      }

      // Update config
      const { data, error } = await supabase
        .from("platform_config")
        .update({
          config_value: value as never,
          version: current.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", configKey)
        .select()
        .single();

      if (error) throw error;

      // Record history (skip type checking for Json compatibility)
      await supabase.from("platform_config_history").insert([{
        config_id: current.id,
        previous_value: current.config_value,
        new_value: value,
      }] as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
    },
  });
}

export function useConfigHistory(configId?: string) {
  return useQuery({
    queryKey: ["platform-config-history", configId],
    queryFn: async () => {
      if (!configId) return [];
      
      const { data, error } = await supabase
        .from("platform_config_history")
        .select("*")
        .eq("config_id", configId)
        .order("changed_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!configId,
  });
}

// Get all recent config history (for global history view)
export function useAllConfigHistory(limit = 20) {
  return useQuery({
    queryKey: ["platform-config-history-all", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_config_history")
        .select("*, platform_config:config_id(config_key, category)")
        .order("changed_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });
}

// Typed getters for specific configurations
export function useEngineWeights() {
  return useConfigValue<{
    fairness: number;
    hallucination: number;
    toxicity: number;
    privacy: number;
    explainability: number;
  }>("engine_weights");
}

export function useDQThresholds() {
  return useConfigValue<{
    completeness: number;
    validity: number;
    uniqueness: number;
    freshness: number;
    consistency: number;
    accuracy: number;
  }>("dq_thresholds");
}

export function useFairnessThresholds() {
  return useConfigValue<{
    demographic_parity: number;
    equalized_odds: number;
    equal_opportunity: number;
  }>("fairness_thresholds");
}

export function useSLOTargets() {
  return useConfigValue<{
    mttd_critical_minutes: number;
    mttd_high_minutes: number;
    mttr_critical_minutes: number;
    mttr_high_minutes: number;
  }>("slo_targets");
}

export function useEscalationRules() {
  return useConfigValue<{
    critical_sla_minutes: number;
    high_sla_minutes: number;
    auto_escalate: boolean;
  }>("escalation_rules");
}
