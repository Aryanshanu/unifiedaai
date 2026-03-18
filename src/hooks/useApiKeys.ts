import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  permissions: string[];
  expires_at: string | null;
  last_used_at: string | null;
  rate_limit: number;
  is_active: boolean;
  created_at: string;
}

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'rai_';
  let key = prefix;
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useApiKeys() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["api-keys", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; permissions?: string[]; expires_at?: string; rate_limit?: number }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const rawKey = generateKey();
      const keyHash = await hashKey(rawKey);
      const keyPreview = rawKey.slice(0, 8) + '...' + rawKey.slice(-4);

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          name: input.name,
          key_hash: keyHash,
          key_preview: keyPreview,
          permissions: input.permissions || ['read'],
          expires_at: input.expires_at || null,
          rate_limit: input.rate_limit || 1000,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, rawKey } as ApiKey & { rawKey: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}
