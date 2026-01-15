import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PipelineStep = 1 | 2 | 3 | 4 | 5;
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'halted';
export type PipelineStatus = 'idle' | 'running' | 'success' | 'error' | 'halted';

export interface PipelineInput {
  dataset_id: string;
  dataset_version?: string | null;
  execution_mode: 'FULL' | 'INCREMENTAL';
  last_execution_ts?: string | null;
  force_continue?: boolean;
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

export interface DQProfile {
  id: string;
  dataset_id: string;
  dataset_version: string | null;
  row_count: number;
  column_profiles: ColumnProfile[] | Record<string, ColumnProfile>;
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
    critical_failure: boolean;
    execution_mode: string;
  };
  circuit_breaker_tripped: boolean;
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

export interface ControlPlaneResponse {
  status: 'success' | 'error' | 'halted';
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
  detail?: string;
}

export interface CircuitBreakerState {
  isTripped: boolean;
  pendingInput: PipelineInput | null;
  executionSummary: ControlPlaneResponse['execution_summary'] | null;
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
  // Circuit breaker controls
  circuitBreakerState: CircuitBreakerState;
  continuePipeline: () => Promise<void>;
  stopPipeline: () => void;
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
  const [circuitBreakerState, setCircuitBreakerState] = useState<CircuitBreakerState>({
    isTripped: false,
    pendingInput: null,
    executionSummary: null
  });
  
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
          if (execution.circuit_breaker_tripped) {
            setStepStatuses(prev => ({ ...prev, 3: 'halted' }));
            setPipelineStatus('halted');
          } else {
            setStepStatuses(prev => ({ ...prev, 3: 'passed' }));
            setCurrentStep(4);
            setStepStatuses(prev => ({ ...prev, 4: 'running' }));
          }
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
    setCircuitBreakerState({
      isTripped: false,
      pendingInput: null,
      executionSummary: null
    });
    activeDatasetRef.current = input.dataset_id;

    try {
      const { data, error } = await supabase.functions.invoke('dq-control-plane', {
        body: input
      });

      if (error) {
        throw new Error(error.message);
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
          description: `DQ pipeline completed successfully. ${response.incident_count || 0} incidents raised.`,
        });
      } else if (response.status === 'halted') {
        // Circuit breaker tripped - await user decision
        setCircuitBreakerState({
          isTripped: true,
          pendingInput: input,
          executionSummary: response.execution_summary || null
        });
        setPipelineStatus('halted');
        setStepStatuses(prev => ({ ...prev, 3: 'halted', 4: 'pending', 5: 'pending' }));
        toast({
          title: 'Circuit Breaker Tripped',
          description: 'Critical failure detected. Choose to continue or stop the pipeline.',
          variant: 'destructive',
        });
      } else {
        setPipelineStatus('error');
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
    setCircuitBreakerState({
      isTripped: false,
      pendingInput: null,
      executionSummary: null
    });
  }, []);

  // Continue pipeline after circuit breaker approval
  const continuePipeline = useCallback(async () => {
    if (!circuitBreakerState.pendingInput) return;
    
    const input = { ...circuitBreakerState.pendingInput, force_continue: true };
    setCircuitBreakerState({
      isTripped: false,
      pendingInput: null,
      executionSummary: null
    });
    
    toast({
      title: 'Pipeline Continuing',
      description: 'Circuit breaker override approved. Completing remaining tasks...',
    });
    
    // Re-run with force_continue flag
    await runPipeline(input);
  }, [circuitBreakerState.pendingInput, runPipeline, toast]);

  // Stop pipeline after circuit breaker
  const stopPipeline = useCallback(() => {
    setCircuitBreakerState({
      isTripped: false,
      pendingInput: null,
      executionSummary: null
    });
    setPipelineStatus('error');
    setStepStatuses(prev => ({ ...prev, 3: 'failed', 4: 'failed', 5: 'failed' }));
    toast({
      title: 'Pipeline Stopped',
      description: 'Pipeline halted by user decision. Data corruption prevented.',
    });
  }, [toast]);

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
    circuitBreakerState,
    continuePipeline,
    stopPipeline
  };
}

export { STEP_NAMES };
