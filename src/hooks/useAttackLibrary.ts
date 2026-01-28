import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Attack {
  id: string;
  name: string;
  description: string | null;
  category: string;
  owasp_category: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  attack_payload: string;
  tags: string[];
  success_rate: number;
  first_seen: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAttackLibrary(category?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['attack-library', category],
    queryFn: async () => {
      let query = supabase
        .from('attack_library')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Attack[];
    },
  });

  const createAttack = useMutation({
    mutationFn: async (attack: Omit<Attack, 'id' | 'created_at' | 'updated_at' | 'first_seen' | 'success_rate'>) => {
      const { data, error } = await supabase
        .from('attack_library')
        .insert(attack)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attack-library'] });
      queryClient.invalidateQueries({ queryKey: ['security-stats'] });
      toast.success('Attack pattern added');
    },
    onError: (error) => {
      toast.error('Failed to add attack pattern');
      console.error(error);
    },
  });

  const updateAttack = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Attack> }) => {
      const { data, error } = await supabase
        .from('attack_library')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attack-library'] });
      toast.success('Attack pattern updated');
    },
    onError: (error) => {
      toast.error('Failed to update attack pattern');
      console.error(error);
    },
  });

  // Get unique categories
  const categories = [...new Set(query.data?.map(a => a.category) || [])];

  return {
    attacks: query.data || [],
    categories,
    isLoading: query.isLoading,
    error: query.error,
    createAttack,
    updateAttack,
    refetch: query.refetch,
  };
}
