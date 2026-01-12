import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AISummary {
  brief_summary: string;
  priority_categories: {
    high: { issues: string[]; count: number; action: string };
    medium: { issues: string[]; count: number; action: string };
    low: { issues: string[]; count: number; action: string };
  };
  recommendations: string[];
  data_quality_verdict: 'Ready for Production' | 'Needs Review' | 'Critical Issues Found';
  confidence_score: number;
  generated_at: string;
  model_used: string;
}

export interface AnalysisDetails {
  column_analysis?: Array<{
    column: string;
    type: string;
    total_values: number;
    null_count: number;
    null_percentage: number;
    unique_values: number;
    unique_percentage: number;
    min?: number;
    max?: number;
    mean?: number;
    std_dev?: number;
    sample_values: (string | number | null)[];
    range_violations: number;
    format_violations: number;
    status: 'pass' | 'warn' | 'fail';
  }>;
  computation_steps?: Array<{
    step: number;
    name: string;
    formula: string;
    inputs: Record<string, number | string>;
    result: number | string;
    threshold?: number;
    status: 'pass' | 'warn' | 'fail' | 'info';
    weight?: number;
    whyExplanation: string;
  }>;
  raw_logs?: Array<{
    id: string;
    timestamp: string;
    type: 'input' | 'computation' | 'output' | 'error';
    data: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>;
  evidence_hash?: string;
  inferred_schema?: Record<string, string>;
  weighted_formula?: string;
  weights?: Record<string, number>;
  verdict?: string;
  compliance_threshold?: number;
  is_compliant?: boolean;
  ai_summary?: AISummary;
}

export interface UploadStatus {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  status: 'pending' | 'processing' | 'analyzing' | 'completed' | 'failed';
  quality_score: number | null;
  error_message: string | null;
  parsed_row_count: number | null;
  parsed_column_count: number | null;
  metadata: Record<string, unknown> | null;
  analysis_details: AnalysisDetails | null;
  created_at: string;
  completed_at: string | null;
  processing_time_ms: number | null;
  contract_id: string | null;
  contract_check_status: 'pending' | 'passed' | 'failed' | 'skipped' | null;
  contract_violations: Record<string, unknown> | null;
}

export interface QualityIssue {
  id: string;
  upload_id: string | null;
  dataset_id: string | null;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  column_name: string | null;
  row_reference: number | null;
  value_sample: string | null;
  suggested_fix: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  created_at: string;
}

export function useFileUploadStatus(uploadId: string | null) {
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!uploadId) return;
    
    setLoading(true);
    try {
      const [uploadResult, issuesResult] = await Promise.all([
        supabase
          .from('data_uploads')
          .select('*')
          .eq('id', uploadId)
          .single(),
        supabase
          .from('quality_issues')
          .select('*')
          .eq('upload_id', uploadId)
          .order('created_at', { ascending: false })
      ]);

      if (uploadResult.data) {
        setStatus(uploadResult.data as UploadStatus);
      }
      if (issuesResult.data) {
        setIssues(issuesResult.data as QualityIssue[]);
      }
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!uploadId) return;

    const uploadsChannel = supabase
      .channel(`upload-status-${uploadId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'data_uploads', 
          filter: `id=eq.${uploadId}` 
        },
        (payload) => {
          if (payload.new) {
            setStatus(payload.new as UploadStatus);
          }
        }
      )
      .subscribe();

    const issuesChannel = supabase
      .channel(`upload-issues-${uploadId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'quality_issues', 
          filter: `upload_id=eq.${uploadId}` 
        },
        (payload) => {
          if (payload.new) {
            setIssues(prev => [payload.new as QualityIssue, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(issuesChannel);
    };
  }, [uploadId]);

  return { status, issues, loading, refetch: fetchData };
}

export function useAllUploads() {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUploads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('data_uploads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setUploads(data as UploadStatus[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  // Subscribe to real-time updates for all uploads
  useEffect(() => {
    const channel = supabase
      .channel('all-uploads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'data_uploads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setUploads(prev => [payload.new as UploadStatus, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUploads(prev => 
              prev.map(u => u.id === payload.new.id ? payload.new as UploadStatus : u)
            );
          } else if (payload.eventType === 'DELETE') {
            setUploads(prev => prev.filter(u => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { uploads, loading, refetch: fetchUploads };
}

export function useQualityStats() {
  const [stats, setStats] = useState({
    totalFiles: 0,
    processing: 0,
    avgScore: 0,
    criticalIssues: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [uploadsResult, issuesResult] = await Promise.all([
          supabase.from('data_uploads').select('status, quality_score'),
          supabase.from('quality_issues').select('severity').eq('severity', 'critical').eq('status', 'open')
        ]);

        if (uploadsResult.data) {
          const uploads = uploadsResult.data;
          const completed = uploads.filter(u => u.status === 'completed' && u.quality_score !== null);
          
          setStats({
            totalFiles: uploads.length,
            processing: uploads.filter(u => ['pending', 'processing', 'analyzing'].includes(u.status)).length,
            avgScore: completed.length > 0 
              ? Math.round(completed.reduce((sum, u) => sum + (u.quality_score || 0), 0) / completed.length)
              : 0,
            criticalIssues: issuesResult.data?.length || 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('quality-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_uploads' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_issues' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading };
}
