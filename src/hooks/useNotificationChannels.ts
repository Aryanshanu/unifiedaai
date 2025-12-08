import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface NotificationChannel {
  id: string;
  user_id: string;
  channel_type: 'email' | 'slack' | 'teams' | 'webhook';
  name: string;
  enabled: boolean;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelInput {
  channel_type: 'email' | 'slack' | 'teams' | 'webhook';
  name: string;
  config: Record<string, string>;
}

export function useNotificationChannels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-channels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NotificationChannel[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateChannelInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_channels")
        .insert({
          user_id: user.id,
          channel_type: input.channel_type,
          name: input.name,
          config: input.config,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled, config, name }: { 
      id: string; 
      enabled?: boolean; 
      config?: Record<string, string>;
      name?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (config !== undefined) updateData.config = config;
      if (name !== undefined) updateData.name = name;

      const { data, error } = await supabase
        .from("notification_channels")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_channels")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
}
