import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PipelineStep = 1 | 2 | 3 | 4 | 5;
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed';
export type PipelineStatus = 'idle' | 'running' | 'success' | 'error';

export interface PipelineInput {
  dataset_id: string;
  dataset_version?: string | null;
  execution_mode: 'FULL' | 'INCREMENTAL';
  last_execution_ts?: string | null;
}

export interface ColumnProfile {
  column_name: string;
  dtype: string;
  completeness: number;
  uniqueness: number;
  null_count: number;
  distinct_count: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
  mean_value?: number | null;
  sample_values: (string | number | null)[];
}

// TRUTH CONTRACT: DimensionScore with computed flag
export interface DimensionScore {
  dimension: string;
  score: number | null;
  computed: boolean;
  reason?: string;
  weight: number;
  details: Record<string, number>;
}

export interface DQProfile {
  id: string;
  dataset_id: string;
  dataset_version: string | null;
  row_count: number;
  column_profiles: ColumnProfile[] | Record<string, ColumnProfile>;
  dimension_scores?: DimensionScore[];
  profile_ts: string;
  execution_time_ms: number | null;
}

export interface DQRule {
  id: string;
  dataset_id: string;
  profile_id: string | null;
  version: number;
  dimension: string;
  rule_name: string;
  logic_type: string;
  logic_code: string;
  column_name: string | null;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  confidence: number | null;
  business_impact: string | null;
  is_active: boolean;
}

export interface DQExecutionMetric {
  rule_id: string;
  dimension: string;
  severity: string;
  success_rate: number;
  failed_count: number;
  total_count: number;
  threshold: number;
  violated: boolean;
}

export interface DQExecution {
  id: string;
  dataset_id: string;
  profile_id: string | null;
  rules_version: number;
  execution_mode: string;
  metrics: DQExecutionMetric[];
  summary: {
    total_rules: number;
    passed: number;
    failed: number;
    critical_failures: number;
    critical_failure: boolean;
    execution_mode: string;
  };
  execution_ts: string;
  execution_time_ms: number | null;
}

export interface DQDashboardAsset {
  id: string;
  execution_id: string;
  dataset_id: string;
  summary_sql: string;
  hotspots_sql: string;
  dimension_breakdown_sql: string;
  generated_at: string;
}

export interface DQIncident {
  id: string;
  dataset_id: string;
  rule_id: string | null;
  execution_id: string | null;
  dimension: string;
  severity: 'P0' | 'P1' | 'P2';
  action: string;
  example_failed_rows: unknown[] | null;
  profiling_reference: string | null;
  failure_signature: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

export interface TrustReport {
  discarded_metrics: string[];
  deduplicated_rules: number;
  inconsistencies_found: string[];
  truth_score: number;
  // Enhanced governance fields
  missing_dimensions_count?: number;
  simulated_metrics_count?: number;
  critical_inconsistencies?: string[];
  warning_inconsistencies?: string[];
  score_breakdown?: {
    base: number;
    dimension_penalty: number;
    simulated_penalty: number;
    critical_penalty: number;
    warning_penalty: number;
  };
}

export interface ControlPlaneResponse {
  status: 'success' | 'error';
  code: string;
  message: string;
  profiling_run_id?: string;
  rules_version?: number;
  execution_summary?: {
    total_rules: number;
    passed: number;
    failed: number;
    critical_failures: number;
  };
  incident_count?: number;
  completed_steps?: string[];
  failed_steps?: string[];
  detail?: string;
  TRUST_REPORT?: TrustReport;
  // Governance fields from truth enforcer
  governance_status?: 'GOVERNANCE_CERTIFIED' | 'DQ_CONTRACT_VIOLATION';
  violations?: string[];
}

export interface UseDQControlPlaneReturn {
  pipelineStatus: PipelineStatus;
  currentStep: PipelineStep | null;
  stepStatuses: Record<PipelineStep, StepStatus>;
  elapsedTime: number;
  profilingResult: DQProfile | null;
  rulesResult: DQRule[];
  executionResult: DQExecution | null;
  dashboardAssets: DQDashboardAsset | null;
  incidents: DQIncident[];
  finalResponse: ControlPlaneResponse | null;
  runPipeline: (input: PipelineInput) => Promise<void>;
  reset: () => void;
  isRealtimeConnected: boolean;
  acknowledgeIncident: (incidentId: string) => Promise<void>;
  resolveIncident: (incidentId: string) => Promise<void>;
}

const STEP_NAMES: Record<PipelineStep, string> = {
  1: 'Data Profiling',
  2: 'Rule Development',
  3: 'Rule Execution',
  4: 'Dashboard Assets',
  5: 'Issue Management'
};

export function useDQControlPlane(datasetId?: string): UseDQControlPlaneReturn {
  const { toast } = useToast();
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<PipelineStep, StepStatus>>({
    1: 'pending',
    2: 'pending',
    3: 'pending',
    4: 'pending',
    5: 'pending'
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [profilingResult, setProfilingResult] = useState<DQProfile | null>(null);
  const [rulesResult, setRulesResult] = useState<DQRule[]>([]);
  const [executionResult, setExecutionResult] = useState<DQExecution | null>(null);
  const [dashboardAssets, setDashboardAssets] = useState<DQDashboardAsset | null>(null);
  const [incidents, setIncidents] = useState<DQIncident[]>([]);
  const [finalResponse, setFinalResponse] = useState<ControlPlaneResponse | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeDatasetRef = useRef<string | null>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (pipelineStatus === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 100);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pipelineStatus]);

  // Realtime subscriptions
  useEffect(() => {
    if (!datasetId) return;
    
    const channel = supabase
      .channel(`dq-control-plane-${datasetId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dq_profiles', filter: `dataset_id=eq.${datasetId}` },
        (payload) => {
          const profile = payload.new as DQProfile;
          setProfilingResult(profile);
          setStepStatuses(prev => ({ ...prev, 1: 'passed' }));
          setCurrentStep(2);
          setStepStatuses(prev => ({ ...prev, 2: 'running' }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dq_rules', filter: `dataset_id=eq.${datasetId}` },
        (payload) => {
          const rule = payload.new as DQRule;
          setRulesResult(prev => [...prev, rule]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dq_rule_executions', filter: `dataset_id=eq.${datasetId}` },
        (payload) => {
          const execution = payload.new as DQExecution;
          setExecutionResult(execution);
          setStepStatuses(prev => ({ ...prev, 2: 'passed', 3: 'passed' }));
          setCurrentStep(4);
          setStepStatuses(prev => ({ ...prev, 4: 'running' }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dq_dashboard_assets', filter: `dataset_id=eq.${datasetId}` },
        (payload) => {
          setDashboardAssets(payload.new as DQDashboardAsset);
          setStepStatuses(prev => ({ ...prev, 4: 'passed' }));
          setCurrentStep(5);
          setStepStatuses(prev => ({ ...prev, 5: 'running' }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dq_incidents', filter: `dataset_id=eq.${datasetId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [...prev, payload.new as DQIncident]);
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(i => i.id === (payload.new as DQIncident).id ? payload.new as DQIncident : i));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [datasetId]);

  // Fetch existing data when dataset changes
  useEffect(() => {
    if (!datasetId) return;
    
    const fetchExistingData = async () => {
      // Fetch latest profile
      const { data: profiles } = await supabase
        .from('dq_profiles')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('profile_ts', { ascending: false })
        .limit(1);
      
      if (profiles?.[0]) {
        setProfilingResult(profiles[0] as unknown as DQProfile);
      }

      // Fetch rules
      const { data: rules } = await supabase
        .from('dq_rules')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (rules) {
        setRulesResult(rules as unknown as DQRule[]);
      }

      // Fetch latest execution
      const { data: executions } = await supabase
        .from('dq_rule_executions')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('execution_ts', { ascending: false })
        .limit(1);
      
      if (executions?.[0]) {
        setExecutionResult(executions[0] as unknown as DQExecution);
      }

      // Fetch dashboard assets
      const { data: assets } = await supabase
        .from('dq_dashboard_assets')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('generated_at', { ascending: false })
        .limit(1);
      
      if (assets?.[0]) {
        setDashboardAssets(assets[0] as unknown as DQDashboardAsset);
      }

      // Fetch incidents
      const { data: incidentData } = await supabase
        .from('dq_incidents')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });
      
      if (incidentData) {
        setIncidents(incidentData as unknown as DQIncident[]);
      }
    };

    fetchExistingData();
  }, [datasetId]);

  const runPipeline = useCallback(async (input: PipelineInput) => {
    setPipelineStatus('running');
    setCurrentStep(1);
    setElapsedTime(0);
    setStepStatuses({
      1: 'running',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending'
    });
    setProfilingResult(null);
    setRulesResult([]);
    setExecutionResult(null);
    setDashboardAssets(null);
    setIncidents([]);
    setFinalResponse(null);
    activeDatasetRef.current = input.dataset_id;

    try {
      const { data, error } = await supabase.functions.invoke('dq-control-plane', {
        body: input
      });

      // Handle edge function errors gracefully - parse JSON response if available
      if (error) {
        // Try to extract structured error from the message
        let parsedError: ControlPlaneResponse | null = null;
        try {
          // Edge function errors often contain JSON in the message
          const jsonMatch = error.message?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedError = JSON.parse(jsonMatch[0]) as ControlPlaneResponse;
          }
        } catch {
          // Ignore parse errors
        }

        if (parsedError) {
          setFinalResponse(parsedError);
          setPipelineStatus('error');
          setStepStatuses({
            1: parsedError.code === 'NO_DATA' || parsedError.code === 'DATASET_NOT_FOUND' ? 'failed' : 'pending',
            2: 'pending',
            3: 'pending',
            4: 'pending',
            5: 'pending'
          });
          toast({
            title: 'Pipeline Error',
            description: parsedError.message,
            variant: 'destructive',
          });
          return;
        }

        // Fallback: generic error handling
        setFinalResponse({
          status: 'error',
          code: 'EDGE_FUNCTION_ERROR',
          message: error.message || 'Failed to invoke pipeline',
        });
        setPipelineStatus('error');
        toast({
          title: 'Pipeline Failed',
          description: error.message || 'Failed to invoke pipeline',
          variant: 'destructive',
        });
        return;
      }

      const response = data as ControlPlaneResponse;
      setFinalResponse(response);

      if (response.status === 'success') {
        setPipelineStatus('success');
        setStepStatuses({
          1: 'passed',
          2: 'passed',
          3: 'passed',
          4: 'passed',
          5: 'passed'
        });
        setCurrentStep(null);
        toast({
          title: 'Pipeline Complete',
          description: `${response.incident_count || 0} incidents raised.`,
        });
      } else {
        // Error response from pipeline
        setPipelineStatus('error');
        
        // Mark failed steps based on response
        const newStatuses: Record<PipelineStep, StepStatus> = {
          1: 'pending',
          2: 'pending',
          3: 'pending',
          4: 'pending',
          5: 'pending'
        };
        
        if (response.completed_steps?.includes('profiling')) newStatuses[1] = 'passed';
        if (response.completed_steps?.includes('rules')) newStatuses[2] = 'passed';
        if (response.completed_steps?.includes('execution')) newStatuses[3] = 'passed';
        if (response.completed_steps?.includes('dashboard')) newStatuses[4] = 'passed';
        if (response.completed_steps?.includes('incidents')) newStatuses[5] = 'passed';
        
        if (response.failed_steps?.includes('profiling')) newStatuses[1] = 'failed';
        if (response.failed_steps?.includes('rules')) newStatuses[2] = 'failed';
        if (response.failed_steps?.includes('execution')) newStatuses[3] = 'failed';
        if (response.failed_steps?.includes('dashboard')) newStatuses[4] = 'failed';
        if (response.failed_steps?.includes('incidents')) newStatuses[5] = 'failed';
        
        // Special case: NO_DATA means step 1 failed
        if (response.code === 'NO_DATA' || response.code === 'DATASET_NOT_FOUND') {
          newStatuses[1] = 'failed';
        }
        
        setStepStatuses(newStatuses);
        
        toast({
          title: 'Pipeline Error',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setPipelineStatus('error');
      setFinalResponse({
        status: 'error',
        code: 'PIPELINE_EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      toast({
        title: 'Pipeline Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const reset = useCallback(() => {
    setPipelineStatus('idle');
    setCurrentStep(null);
    setElapsedTime(0);
    setStepStatuses({
      1: 'pending',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending'
    });
    setFinalResponse(null);
  }, []);

  const acknowledgeIncident = useCallback(async (incidentId: string) => {
    const { error } = await supabase
      .from('dq_incidents')
      .update({ status: 'acknowledged' })
      .eq('id', incidentId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge incident',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const resolveIncident = useCallback(async (incidentId: string) => {
    const { error } = await supabase
      .from('dq_incidents')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', incidentId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to resolve incident',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    pipelineStatus,
    currentStep,
    stepStatuses,
    elapsedTime,
    profilingResult,
    rulesResult,
    executionResult,
    dashboardAssets,
    incidents,
    finalResponse,
    runPipeline,
    reset,
    isRealtimeConnected,
    acknowledgeIncident,
    resolveIncident,
  };
}
