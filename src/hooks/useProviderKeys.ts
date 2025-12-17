import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type LLMProvider = "lovable" | "openai" | "anthropic" | "gemini" | "huggingface" | "perplexity" | "openrouter";

export interface ProviderKey {
  id: string;
  user_id: string;
  provider: LLMProvider;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Note: api_key_encrypted is never returned to frontend for security
  hasKey: boolean;
}

export function useProviderKeys() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provider-keys", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_provider_keys")
        .select("id, user_id, provider, is_active, created_at, updated_at")
        .eq("user_id", user.id)
        .order("provider");

      if (error) throw error;

      // Map to include hasKey flag without exposing actual key
      return (data || []).map(key => ({
        ...key,
        hasKey: true,
      })) as ProviderKey[];
    },
    enabled: !!user?.id,
  });
}

export function useAddProviderKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: LLMProvider; apiKey: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if key already exists for this provider
      const { data: existing } = await supabase
        .from("user_provider_keys")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_provider_keys")
          .update({ 
            api_key_encrypted: apiKey,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("user_provider_keys")
          .insert({
            user_id: user.id,
            provider,
            api_key_encrypted: apiKey,
            is_active: true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      toast.success("API key saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });
}

export function useDeleteProviderKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (provider: LLMProvider) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_provider_keys")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      toast.success("API key deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete API key: ${error.message}`);
    },
  });
}

export function useToggleProviderKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("user_provider_keys")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
    },
    onError: (error) => {
      toast.error(`Failed to update key: ${error.message}`);
    },
  });
}
