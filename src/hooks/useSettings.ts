import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OrganizationSettings {
  id: string;
  user_id: string;
  organization_name: string;
  default_workspace: string;
  timezone: string;
  data_retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsInput {
  organization_name?: string;
  default_workspace?: string;
  timezone?: string;
  data_retention_days?: number;
}

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as OrganizationSettings | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Try to update first
      const { data: existing } = await supabase
        .from("organization_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("organization_settings")
          .update(input)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data as OrganizationSettings;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("organization_settings")
          .insert({
            user_id: user.id,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;
        return data as OrganizationSettings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
