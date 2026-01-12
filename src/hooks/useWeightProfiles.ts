import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeightProfile {
  id: string;
  name: string;
  description: string | null;
  weights: {
    completeness: number;
    validity: number;
    uniqueness: number;
    freshness: number;
  };
  column_importance: Record<string, number> | null;
  use_case: string | null;
  is_default: boolean;
  created_at: string;
}

export function useWeightProfiles() {
  const [profiles, setProfiles] = useState<WeightProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_profiles')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;

      setProfiles((data || []).map(p => ({
        ...p,
        weights: p.weights as WeightProfile['weights'],
        column_importance: p.column_importance as Record<string, number> | null
      })));
    } catch (error) {
      console.error('Failed to fetch weight profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const getDefaultProfile = useCallback(() => {
    return profiles.find(p => p.is_default) || profiles[0];
  }, [profiles]);

  const getProfileForUseCase = useCallback((useCase: string) => {
    return profiles.find(p => p.use_case === useCase) || getDefaultProfile();
  }, [profiles, getDefaultProfile]);

  const createProfile = useCallback(async (profile: Omit<WeightProfile, 'id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('weight_profiles')
      .insert({
        ...profile,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchProfiles();
    return data;
  }, [fetchProfiles]);

  return {
    profiles,
    loading,
    refetch: fetchProfiles,
    getDefaultProfile,
    getProfileForUseCase,
    createProfile
  };
}

// Calculate weighted score using a profile
export function calculateWeightedScore(
  metrics: {
    completeness: number;
    validity: number;
    uniqueness: number;
    freshness: number;
  },
  weights: WeightProfile['weights']
): number {
  const score = 
    metrics.completeness * weights.completeness +
    metrics.validity * weights.validity +
    metrics.uniqueness * weights.uniqueness +
    metrics.freshness * weights.freshness;
  
  return Math.round(score * 100);
}
