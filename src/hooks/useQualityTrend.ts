import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrendPoint {
  date: string;
  score: number;
  fileName?: string;
  uploadId?: string;
}

export function useQualityTrend(limit: number = 10) {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrend = useCallback(async () => {
    setLoading(true);
    try {
      const { data: uploads, error } = await supabase
        .from('data_uploads')
        .select('id, file_name, quality_score, created_at')
        .eq('status', 'completed')
        .not('quality_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const trendData: TrendPoint[] = (uploads || []).map(u => ({
        date: u.created_at,
        score: u.quality_score || 0,
        fileName: u.file_name,
        uploadId: u.id
      })).reverse(); // Reverse to show oldest first for sparkline

      setData(trendData);
    } catch (error) {
      console.error('Failed to fetch quality trend:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  // Subscribe to new uploads
  useEffect(() => {
    const channel = supabase
      .channel('quality-trend')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'data_uploads' },
        (payload) => {
          if (payload.new.status === 'completed' && payload.new.quality_score !== null) {
            setData(prev => {
              const newPoint: TrendPoint = {
                date: payload.new.created_at,
                score: payload.new.quality_score,
                fileName: payload.new.file_name,
                uploadId: payload.new.id
              };
              const updated = [...prev.filter(p => p.uploadId !== newPoint.uploadId), newPoint];
              return updated.slice(-limit);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { data, loading, refetch: fetchTrend };
}

export function useGoldMetrics() {
  const [metrics, setMetrics] = useState<{
    date: string;
    overall_score: number;
    trust_grade: string;
    files_processed: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('gold_quality_metrics')
          .select('metric_date, overall_score, trust_grade, files_processed')
          .eq('user_id', user.id)
          .order('metric_date', { ascending: false })
          .limit(30);

        if (error) throw error;

        setMetrics((data || []).map(m => ({
          date: m.metric_date,
          overall_score: Number(m.overall_score) * 100,
          trust_grade: m.trust_grade || 'C',
          files_processed: m.files_processed || 0
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading };
}
