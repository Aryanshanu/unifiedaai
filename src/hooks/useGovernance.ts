import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ControlStatus = 'not_started' | 'in_progress' | 'compliant' | 'non_compliant' | 'not_applicable';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ControlFramework {
  id: string;
  name: string;
  version: string;
  description: string | null;
  total_controls: number;
  created_at: string;
  updated_at: string;
}

export interface Control {
  id: string;
  framework_id: string;
  code: string;
  title: string;
  description: string | null;
  severity: SeverityLevel;
  created_at: string;
}

export interface ControlAssessment {
  id: string;
  model_id: string;
  control_id: string;
  status: ControlStatus;
  evidence: string | null;
  notes: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attestation {
  id: string;
  title: string;
  framework_id: string | null;
  model_id: string | null;
  status: string;
  document_url: string | null;
  signed_by: string | null;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useControlFrameworks() {
  return useQuery({
    queryKey: ['control-frameworks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_frameworks')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ControlFramework[];
    },
  });
}

export function useControls(frameworkId?: string) {
  return useQuery({
    queryKey: ['controls', frameworkId],
    queryFn: async () => {
      let query = supabase
        .from('controls')
        .select('*')
        .order('code');
      
      if (frameworkId) {
        query = query.eq('framework_id', frameworkId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Control[];
    },
  });
}

export function useControlAssessments(modelId?: string) {
  return useQuery({
    queryKey: ['control-assessments', modelId],
    queryFn: async () => {
      let query = supabase
        .from('control_assessments')
        .select('*');
      
      if (modelId) {
        query = query.eq('model_id', modelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ControlAssessment[];
    },
  });
}

export function useComplianceStats() {
  return useQuery({
    queryKey: ['compliance', 'stats'],
    queryFn: async () => {
      const [frameworksRes, assessmentsRes, attestationsRes] = await Promise.all([
        supabase.from('control_frameworks').select('id, name, total_controls'),
        supabase.from('control_assessments').select('control_id, status'),
        supabase.from('attestations').select('status'),
      ]);
      
      if (frameworksRes.error) throw frameworksRes.error;
      if (assessmentsRes.error) throw assessmentsRes.error;
      if (attestationsRes.error) throw attestationsRes.error;
      
      const totalControls = frameworksRes.data.reduce((acc, f) => acc + f.total_controls, 0);
      const compliantAssessments = assessmentsRes.data.filter(a => a.status === 'compliant').length;
      const complianceScore = totalControls > 0 
        ? Math.round((compliantAssessments / totalControls) * 100) 
        : 0;
      
      const pendingAttestations = attestationsRes.data.filter(a => a.status === 'pending').length;
      const signedAttestations = attestationsRes.data.filter(a => a.status === 'approved').length;
      
      return {
        totalControls,
        compliantAssessments,
        complianceScore,
        pendingAttestations,
        signedAttestations,
        frameworks: frameworksRes.data,
      };
    },
  });
}

export function useAttestations() {
  return useQuery({
    queryKey: ['attestations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attestations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Attestation[];
    },
  });
}

export function useUpdateControlAssessment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ControlAssessment> & { id: string }) => {
      const { data, error } = await supabase
        .from('control_assessments')
        .update({
          ...updates,
          assessed_by: user?.id,
          assessed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ControlAssessment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    },
  });
}
