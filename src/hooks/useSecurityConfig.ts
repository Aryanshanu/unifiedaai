import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SecurityConfig {
  id: string;
  user_id: string;
  mfa_enabled: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  require_special_chars: boolean;
  require_uppercase: boolean;
  require_numbers: boolean;
  audit_retention_days: number;
  created_at: string;
  updated_at: string;
}

export function useSecurityConfig() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["security-config", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("security_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as SecurityConfig | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateSecurityConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<Omit<SecurityConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("security_config")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("security_config")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return data as SecurityConfig;
      } else {
        const { data, error } = await supabase
          .from("security_config")
          .insert({ user_id: user.id, ...input })
          .select()
          .single();
        if (error) throw error;
        return data as SecurityConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-config"] });
    },
  });
}
