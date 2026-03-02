import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AIVendor {
  id: string;
  name: string;
  vendor_type: string;
  website: string | null;
  contact_email: string | null;
  risk_tier: string;
  contract_status: string;
  data_processing_location: string | null;
  compliance_certifications: string[];
  ai_services: Record<string, unknown>;
  last_assessment_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useVendors() {
  return useQuery({
    queryKey: ['ai-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_vendors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AIVendor[];
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vendor: Partial<AIVendor>) => {
      const { data, error } = await supabase
        .from('ai_vendors')
        .insert({ ...vendor, created_by: user?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-vendors'] });
      toast.success('Vendor registered');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
