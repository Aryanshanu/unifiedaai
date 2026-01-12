import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RemediationAction } from '@/components/engines/RemediationActionCenter';

export function useRemediationActions(uploadId: string | null) {
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActions = useCallback(async () => {
    if (!uploadId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('remediation_actions')
        .select('*')
        .eq('upload_id', uploadId)
        .order('safety_score', { ascending: false });

      if (error) throw error;
      
      // Transform database rows to RemediationAction type
      const transformed: RemediationAction[] = (data || []).map(row => ({
        id: row.id,
        upload_id: row.upload_id,
        issue_id: row.issue_id || undefined,
        action_type: row.action_type as RemediationAction['action_type'],
        description: row.description || '',
        sql_preview: row.sql_preview || undefined,
        python_script: row.python_script || undefined,
        affected_rows: row.affected_rows || 0,
        affected_columns: row.affected_columns || undefined,
        safety_score: row.safety_score || 0,
        reversible: row.reversible ?? true,
        estimated_impact: row.estimated_impact as { before_score: number; after_score: number } | undefined,
        status: row.status as RemediationAction['status'],
        created_at: row.created_at
      }));
      
      setActions(transformed);

    } catch (error) {
      console.error('Failed to fetch remediation actions:', error);
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!uploadId) return;

    const channel = supabase
      .channel(`remediation-${uploadId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'remediation_actions',
          filter: `upload_id=eq.${uploadId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setActions(prev => [...prev, payload.new as RemediationAction]);
          } else if (payload.eventType === 'UPDATE') {
            setActions(prev => 
              prev.map(a => a.id === payload.new.id ? payload.new as RemediationAction : a)
            );
          } else if (payload.eventType === 'DELETE') {
            setActions(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uploadId]);

  const executeAction = useCallback(async (actionId: string) => {
    const { error } = await supabase.functions.invoke('execute-remediation', {
      body: { action_id: actionId }
    });
    
    if (error) throw error;
    await fetchActions();
  }, [fetchActions]);

  const executeAllSafe = useCallback(async (safetyThreshold: number = 90) => {
    const safeActions = actions.filter(a => 
      a.status === 'pending' && a.safety_score >= safetyThreshold
    );

    for (const action of safeActions) {
      await executeAction(action.id);
    }
  }, [actions, executeAction]);

  const revertAction = useCallback(async (actionId: string) => {
    const { error } = await supabase.functions.invoke('revert-remediation', {
      body: { action_id: actionId }
    });
    
    if (error) throw error;
    await fetchActions();
  }, [fetchActions]);

  return {
    actions,
    loading,
    refetch: fetchActions,
    executeAction,
    executeAllSafe,
    revertAction
  };
}

export function useAllRemediationStats() {
  const [stats, setStats] = useState({
    pending: 0,
    executed: 0,
    failed: 0,
    totalImpact: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('remediation_actions')
          .select('status, estimated_impact');

        if (data) {
          const pending = data.filter(a => a.status === 'pending').length;
          const executed = data.filter(a => a.status === 'executed').length;
          const failed = data.filter(a => a.status === 'failed').length;
          
          // Calculate total estimated impact
          const totalImpact = data
            .filter(a => a.estimated_impact && a.status === 'pending')
            .reduce((sum, a) => {
              const impact = a.estimated_impact as { before_score: number; after_score: number } | null;
              return sum + (impact ? impact.after_score - impact.before_score : 0);
            }, 0);

          setStats({ pending, executed, failed, totalImpact: Math.round(totalImpact) });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('remediation-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'remediation_actions' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading };
}
