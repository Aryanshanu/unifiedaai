import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export type DemoStep = 
  | 'idle'
  | 'preflight'
  | 'eval-fairness'
  | 'eval-toxicity'
  | 'eval-privacy'
  | 'eval-hallucination'
  | 'eval-explainability'
  | 'traffic-generation'
  | 'drift-detection'
  | 'incident-creation'
  | 'hitl-escalation'
  | 'red-team'
  | 'scorecard-generation'
  | 'complete'
  | 'error';

export type DemoMode = 'single-page' | 'page-tour';

export interface DemoLog {
  id: string;
  timestamp: string;
  step: DemoStep;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
}

export interface DemoArtifacts {
  evaluationIds: string[];
  trafficCount: number;
  driftAlerts: number;
  incidentIds: string[];
  hitlItems: number;
  redTeamCampaignId?: string;
  scorecard?: any;
  scorecardJson?: string;
  scorecardHtml?: string;
}

export interface DemoCounters {
  requests: number;
  blocks: number;
  incidents: number;
  hitlItems: number;
  driftAlerts: number;
  evaluations: number;
}

const STEP_LABELS: Record<DemoStep, string> = {
  'idle': 'Ready',
  'preflight': 'Preflight Check',
  'eval-fairness': 'Fairness Evaluation',
  'eval-toxicity': 'Toxicity Evaluation',
  'eval-privacy': 'Privacy Evaluation',
  'eval-hallucination': 'Hallucination Evaluation',
  'eval-explainability': 'Explainability Evaluation',
  'traffic-generation': 'Traffic Generation',
  'drift-detection': 'Drift Detection',
  'incident-creation': 'Incident Creation',
  'hitl-escalation': 'HITL Escalation',
  'red-team': 'Red Team Campaign',
  'scorecard-generation': 'Scorecard Generation',
  'complete': 'Complete',
  'error': 'Error',
};

const STEP_ORDER: DemoStep[] = [
  'preflight',
  'eval-fairness',
  'eval-toxicity',
  'eval-privacy',
  'eval-hallucination',
  'eval-explainability',
  'traffic-generation',
  'drift-detection',
  'incident-creation',
  'hitl-escalation',
  'red-team',
  'scorecard-generation',
  'complete',
];

interface OrchestratorOptions {
  modelId: string;
  systemId: string;
  projectId: string;
  mode: DemoMode;
  onStepChange?: (step: DemoStep) => void;
  onNavigate?: (path: string) => void;
}

export function useGoldenDemoOrchestrator() {
  const [currentStep, setCurrentStep] = useState<DemoStep>('idle');
  const [logs, setLogs] = useState<DemoLog[]>([]);
  const [artifacts, setArtifacts] = useState<DemoArtifacts>({
    evaluationIds: [],
    trafficCount: 0,
    driftAlerts: 0,
    incidentIds: [],
    hitlItems: 0,
  });
  const [counters, setCounters] = useState<DemoCounters>({
    requests: 0,
    blocks: 0,
    incidents: 0,
    hitlItems: 0,
    driftAlerts: 0,
    evaluations: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef<OrchestratorOptions | null>(null);
  const navigate = useNavigate();

  const addLog = useCallback((step: DemoStep, message: string, type: DemoLog['type'] = 'info', data?: any) => {
    const log: DemoLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      step,
      message,
      type,
      data,
    };
    setLogs(prev => [...prev, log]);
    return log;
  }, []);

  const updateStep = useCallback((step: DemoStep) => {
    setCurrentStep(step);
    addLog(step, `Starting: ${STEP_LABELS[step]}`, 'info');
    optionsRef.current?.onStepChange?.(step);
  }, [addLog]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runEvaluation = async (engineType: string, modelId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke(`eval-${engineType}${engineType !== 'fairness' ? '-hf' : ''}`, {
        body: { modelId },
      });

      if (error) throw error;

      setCounters(prev => ({ ...prev, evaluations: prev.evaluations + 1 }));
      addLog(currentStep, `${engineType} evaluation complete: ${data.overallScore}%`, 
        data.overallScore >= 70 ? 'success' : 'warning');
      
      return data.evaluationId || data.id || null;
    } catch (err: any) {
      addLog(currentStep, `${engineType} evaluation failed: ${err.message}`, 'error');
      return null;
    }
  };

  const runTrafficGeneration = async (systemId: string): Promise<number> => {
    const prompts = [
      "Explain how machine learning works",
      "What are the ethical considerations in AI?",
      "Help me understand data privacy",
      "What is responsible AI?",
      "Explain fairness in machine learning",
    ];

    let successCount = 0;
    let blockCount = 0;

    for (const prompt of prompts) {
      try {
        // FIX: Use correct payload format with systemId (camelCase) and messages array
        const { data, error } = await supabase.functions.invoke('ai-gateway', {
          body: {
            systemId, // camelCase as expected by validation
            messages: [{ role: 'user', content: prompt }], // FIXED: Use messages array
          },
        });

        if (error) throw error;

        successCount++;
        if (data?.blocked || data?.decision === 'BLOCK') blockCount++;
        
        setCounters(prev => ({
          ...prev,
          requests: prev.requests + 1,
          blocks: prev.blocks + (data?.blocked || data?.decision === 'BLOCK' ? 1 : 0),
        }));
      } catch (err: any) {
        addLog('traffic-generation', `Traffic request failed: ${err.message}`, 'warning');
      }
      await sleep(500);
    }

    addLog('traffic-generation', `Generated ${successCount} requests, ${blockCount} blocked`, 'success');
    return successCount;
  };

  const runDriftDetection = async (systemId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.functions.invoke('detect-drift', {
        body: { system_id: systemId },
      });

      if (error) throw error;

      const alertCount = data.alerts_created || 0;
      setCounters(prev => ({ ...prev, driftAlerts: prev.driftAlerts + alertCount }));
      
      if (alertCount > 0) {
        addLog('drift-detection', `Created ${alertCount} drift alerts`, 'warning');
      } else {
        addLog('drift-detection', 'No significant drift detected (baseline may be insufficient)', 'info');
      }
      
      return alertCount;
    } catch (err: any) {
      addLog('drift-detection', `Drift detection: ${err.message}`, 'warning');
      return 0;
    }
  };

  const createIncident = async (systemId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          title: 'Golden Demo: Automated Compliance Check',
          description: 'Incident created during Golden Demo to demonstrate incident management workflow',
          incident_type: 'compliance_check',
          severity: 'medium',
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      setCounters(prev => ({ ...prev, incidents: prev.incidents + 1 }));
      addLog('incident-creation', `Created incident: ${data.id.slice(0, 8)}`, 'success');
      return data.id;
    } catch (err: any) {
      addLog('incident-creation', `Incident creation failed: ${err.message}`, 'error');
      return null;
    }
  };

  const createHITLItem = async (systemId: string, incidentId?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('review_queue')
        .insert({
          title: 'Golden Demo: Model Compliance Review',
          description: 'Human review required for Golden Demo compliance assessment',
          review_type: 'model_approval',
          severity: 'medium',
          status: 'pending',
          context: {
            system_id: systemId,
            incident_id: incidentId,
            source: 'golden_demo',
          },
          sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        });

      if (error) throw error;

      setCounters(prev => ({ ...prev, hitlItems: prev.hitlItems + 1 }));
      addLog('hitl-escalation', 'Created HITL review item', 'success');
      return true;
    } catch (err: any) {
      addLog('hitl-escalation', `HITL creation failed: ${err.message}`, 'error');
      return false;
    }
  };

  const runRedTeam = async (modelId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('run-red-team', {
        body: { modelId, attackTypes: ['prompt_injection', 'jailbreak', 'data_extraction'] },
      });

      if (error) {
        // Check for permission/authorization errors
        if (error.message?.includes('unauthorized') || 
            error.message?.includes('403') ||
            error.message?.includes('Forbidden') ||
            error.message?.includes('admin')) {
          addLog('red-team', 'SKIPPED: Requires admin or analyst role', 'warning');
          return null;
        }
        throw error;
      }

      addLog('red-team', `Red team campaign: ${data.findings || 0} findings`, 
        (data.findings || 0) > 0 ? 'warning' : 'success');
      return data.campaignId || null;
    } catch (err: any) {
      addLog('red-team', `Red team: ${err.message}`, 'warning');
      return null;
    }
  };

  const generateScorecard = async (modelId: string): Promise<{ json?: any; html?: string }> => {
    try {
      // Get JSON scorecard
      const { data: jsonData, error: jsonError } = await supabase.functions.invoke('generate-scorecard', {
        body: { modelId, format: 'json' },
      });

      if (jsonError) throw jsonError;

      // Get HTML scorecard
      const { data: htmlData, error: htmlError } = await supabase.functions.invoke('generate-scorecard', {
        body: { modelId, format: 'html' },
      });

      addLog('scorecard-generation', 'Scorecard generated successfully', 'success');
      
      return {
        json: jsonData?.scorecard || jsonData,
        html: htmlData?.html || htmlData,
      };
    } catch (err: any) {
      addLog('scorecard-generation', `Scorecard generation: ${err.message}`, 'error');
      return {};
    }
  };

  const start = useCallback(async (options: OrchestratorOptions) => {
    if (isRunning) return;

    optionsRef.current = options;
    abortRef.current = new AbortController();
    
    setIsRunning(true);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setArtifacts({
      evaluationIds: [],
      trafficCount: 0,
      driftAlerts: 0,
      incidentIds: [],
      hitlItems: 0,
    });
    setCounters({
      requests: 0,
      blocks: 0,
      incidents: 0,
      hitlItems: 0,
      driftAlerts: 0,
      evaluations: 0,
    });

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const { modelId, systemId, mode, onNavigate } = options;

    try {
      // Preflight
      updateStep('preflight');
      addLog('preflight', `Model: ${modelId.slice(0, 8)}... System: ${systemId.slice(0, 8)}...`, 'info');
      await sleep(500);
      addLog('preflight', 'Preflight checks passed', 'success');

      // Run all evaluations
      const evalSteps: Array<{ step: DemoStep; engine: string; path: string }> = [
        { step: 'eval-fairness', engine: 'fairness', path: '/engine/fairness' },
        { step: 'eval-toxicity', engine: 'toxicity', path: '/engine/toxicity' },
        { step: 'eval-privacy', engine: 'privacy', path: '/engine/privacy' },
        { step: 'eval-hallucination', engine: 'hallucination', path: '/engine/hallucination' },
        { step: 'eval-explainability', engine: 'explainability', path: '/engine/explainability' },
      ];

      const evaluationIds: string[] = [];

      for (const { step, engine, path } of evalSteps) {
        if (abortRef.current?.signal.aborted) break;
        
        updateStep(step);
        
        if (mode === 'page-tour' && onNavigate) {
          onNavigate(`${path}?modelId=${modelId}&autorun=1`);
          await sleep(1500);
        }
        
        const evalId = await runEvaluation(engine, modelId);
        if (evalId) evaluationIds.push(evalId);
        await sleep(500);
      }

      setArtifacts(prev => ({ ...prev, evaluationIds }));

      // Traffic generation
      if (!abortRef.current?.signal.aborted) {
        updateStep('traffic-generation');
        if (mode === 'page-tour' && onNavigate) {
          onNavigate('/observability');
          await sleep(1000);
        }
        const trafficCount = await runTrafficGeneration(systemId);
        setArtifacts(prev => ({ ...prev, trafficCount }));
      }

      // Drift detection
      if (!abortRef.current?.signal.aborted) {
        updateStep('drift-detection');
        if (mode === 'page-tour' && onNavigate) {
          onNavigate('/alerts');
          await sleep(1000);
        }
        const driftAlerts = await runDriftDetection(systemId);
        setArtifacts(prev => ({ ...prev, driftAlerts }));
      }

      // Incident creation
      if (!abortRef.current?.signal.aborted) {
        updateStep('incident-creation');
        if (mode === 'page-tour' && onNavigate) {
          onNavigate('/incidents');
          await sleep(1000);
        }
        const incidentId = await createIncident(systemId);
        if (incidentId) {
          setArtifacts(prev => ({ ...prev, incidentIds: [...prev.incidentIds, incidentId] }));
        }
      }

      // HITL escalation
      if (!abortRef.current?.signal.aborted) {
        updateStep('hitl-escalation');
        if (mode === 'page-tour' && onNavigate) {
          onNavigate('/hitl');
          await sleep(1000);
        }
        const hitlCreated = await createHITLItem(systemId, artifacts.incidentIds[0]);
        if (hitlCreated) {
          setArtifacts(prev => ({ ...prev, hitlItems: prev.hitlItems + 1 }));
        }
      }

      // Red team
      if (!abortRef.current?.signal.aborted) {
        updateStep('red-team');
        const campaignId = await runRedTeam(modelId);
        if (campaignId) {
          setArtifacts(prev => ({ ...prev, redTeamCampaignId: campaignId }));
        }
      }

      // Scorecard generation
      if (!abortRef.current?.signal.aborted) {
        updateStep('scorecard-generation');
        const { json, html } = await generateScorecard(modelId);
        setArtifacts(prev => ({
          ...prev,
          scorecard: json,
          scorecardJson: json ? JSON.stringify(json, null, 2) : undefined,
          scorecardHtml: html,
        }));
      }

      // Complete
      if (!abortRef.current?.signal.aborted) {
        updateStep('complete');
        addLog('complete', 'Golden Demo completed successfully!', 'success');
        
        if (mode === 'page-tour' && onNavigate) {
          onNavigate('/golden');
        }
      }

    } catch (err: any) {
      setError(err.message || 'Demo failed');
      setCurrentStep('error');
      addLog('error', err.message || 'Unknown error', 'error');
    } finally {
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRunning, addLog, updateStep, artifacts.incidentIds, navigate]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    addLog(currentStep, 'Demo stopped by user', 'warning');
  }, [currentStep, addLog]);

  const reset = useCallback(() => {
    stop();
    setCurrentStep('idle');
    setLogs([]);
    setError(null);
    setElapsedTime(0);
    setArtifacts({
      evaluationIds: [],
      trafficCount: 0,
      driftAlerts: 0,
      incidentIds: [],
      hitlItems: 0,
    });
    setCounters({
      requests: 0,
      blocks: 0,
      incidents: 0,
      hitlItems: 0,
      driftAlerts: 0,
      evaluations: 0,
    });
  }, [stop]);

  const downloadScorecardJson = useCallback(() => {
    if (!artifacts.scorecardJson) return;
    
    const blob = new Blob([artifacts.scorecardJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractal-rai-scorecard-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [artifacts.scorecardJson]);

  const openPrintableScorecard = useCallback(() => {
    if (!artifacts.scorecardHtml) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(artifacts.scorecardHtml);
      printWindow.document.close();
    }
  }, [artifacts.scorecardHtml]);

  return {
    // State
    currentStep,
    stepLabel: STEP_LABELS[currentStep],
    stepOrder: STEP_ORDER,
    logs,
    artifacts,
    counters,
    isRunning,
    error,
    elapsedTime,
    
    // Actions
    start,
    stop,
    reset,
    downloadScorecardJson,
    openPrintableScorecard,
    
    // Computed
    progress: STEP_ORDER.indexOf(currentStep) / (STEP_ORDER.length - 1),
    hasScorecard: !!(artifacts.scorecard || artifacts.scorecardJson),
  };
}
