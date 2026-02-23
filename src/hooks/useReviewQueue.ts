import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ReviewStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ReviewItem {
  id: string;
  review_type: string;
  model_id: string | null;
  incident_id: string | null;
  title: string;
  description: string | null;
  context: Record<string, any>;
  severity: SeverityLevel;
  status: ReviewStatus;
  assignee_id: string | null;
  sla_deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  review_id: string;
  decision: string;
  rationale: string | null;
  conditions: string | null;
  reviewer_id: string;
  decided_at: string;
}

export function useReviewQueue(filters?: { status?: ReviewStatus }) {
  return useQuery({
    queryKey: ['review-queue', filters],
    queryFn: async () => {
      let query = supabase
        .from('review_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ReviewItem[];
    },
  });
}

export function useReviewQueueStats() {
  return useQuery({
    queryKey: ['review-queue', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('review_queue')
        .select('status, sla_deadline');
      
      if (error) throw error;
      
      const now = new Date();
      const pending = data.filter(r => r.status === 'pending').length;
      const inProgress = data.filter(r => r.status === 'in_progress').length;
      const overdue = data.filter(r => 
        r.status === 'pending' && 
        r.sla_deadline && 
        new Date(r.sla_deadline) < now
      ).length;
      
      return { pending, inProgress, overdue, total: data.length };
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ReviewItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('review_queue')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ReviewItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReviewItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('review_queue')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ReviewItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

export function useCreateDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { review_id: string; decision: string; rationale?: string; conditions?: string }) => {
      // Create the decision
      const { data: decisionData, error: decisionError } = await supabase
        .from('decisions')
        .insert({
          ...input,
          reviewer_id: user?.id,
        })
        .select()
        .single();
      
      if (decisionError) throw decisionError;

      // Update the review status based on decision
      const newStatus = input.decision === 'approve' ? 'approved' : 
                        input.decision === 'reject' ? 'rejected' : 
                        input.decision === 'escalate' ? 'escalated' : 'in_progress';
      
      await supabase
        .from('review_queue')
        .update({ status: newStatus })
        .eq('id', input.review_id);

      return decisionData as Decision;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
    },
  });
}

export function useDecisions(reviewId: string) {
  return useQuery({
    queryKey: ['decisions', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('review_id', reviewId)
        .order('decided_at', { ascending: false });
      
      if (error) throw error;
      return data as Decision[];
    },
    enabled: !!reviewId,
  });
}
