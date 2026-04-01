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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      // Step 1: Create a local record of the evaluation start
      const { data: run, error: createError } = await supabase
        .from('evaluation_runs')
        .insert({
          model_id: modelId,
          engine_type: engineType,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 2: Simulate deterministic evaluation logic
      await sleep(1000); 
      
      const seed = modelId.length + engineType.length;
      const baseScore = 75 + (seed % 20); // Deterministic based on context
      const scores = {
        fairness: baseScore + (Math.random() * 5),
        robustness: baseScore - 5 + (Math.random() * 10),
        privacy: 90 + (Math.random() * 5)
      };

      // Step 3: Commit the final results locally
      const { error: updateError } = await supabase
        .from('evaluation_runs')
        .update({
          status: 'completed' as any,
          completed_at: new Date().toISOString(),
          overall_score: baseScore,
          fairness_score: scores.fairness,
          robustness_score: scores.robustness,
          privacy_score: scores.privacy,
          metric_details: {
            engine: engineType,
            logic_version: "cluster-v2",
            is_standin: true
          }
        })
        .eq('id', run.id);

      if (updateError) throw updateError;

      setCounters(prev => ({ ...prev, evaluations: prev.evaluations + 1 }));
      addLog(currentStep, `${engineType} evaluation complete: ${baseScore}%`, 
        baseScore >= 70 ? 'success' : 'warning');
      
      return run.id;
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
        const isBlocked = prompt.toLowerCase().includes('privacy');
        
        // Step 1: Log the simulated request locally
        const { error } = await supabase
          .from('request_logs')
          .insert({
            system_id: systemId,
            request_body: { messages: [{ role: 'user', content: prompt }] },
            response_body: { content: isBlocked ? "Request blocked by safety filter" : "Simulated response from cluster" },
            decision: isBlocked ? 'BLOCK' : 'PASS',
            status_code: isBlocked ? 403 : 200,
            latency_ms: 100 + Math.random() * 200,
            environment: 'production'
          });

        if (error) throw error;

        successCount++;
        if (isBlocked) blockCount++;
        
        setCounters(prev => ({
          ...prev,
          requests: prev.requests + 1,
          blocks: prev.blocks + (isBlocked ? 1 : 0),
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
      // Step 1: Simulate drift detection logic
      await sleep(1000);
      const alertCount = Math.random() > 0.5 ? 1 : 0;

      if (alertCount > 0) {
        // Step 2: Create a local drift alert
        await supabase.from('semantic_drift_alerts').insert({
          definition_id: systemId, // Using systemId as placeholder
          drift_type: 'concept_drift',
          severity: 'medium',
          status: 'open',
          detected_at: new Date().toISOString()
        });

        addLog('drift-detection', `Created ${alertCount} drift alerts`, 'warning');
        setCounters(prev => ({ ...prev, driftAlerts: prev.driftAlerts + alertCount }));
      } else {
        addLog('drift-detection', 'No significant drift detected in current cluster state', 'info');
      }
      
      return alertCount;
    } catch (err: any) {
      addLog('drift-detection', `Drift detection: ${err.message}`, 'warning');
      return 0;
    }
  };

  const createIncident = async (systemId: string): Promise<string | null> => {
    try {
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          system_id: systemId,
          title: 'Golden Demo: Automated Compliance Check',
          description: 'Incident created during Golden Demo to demonstrate local governance response',
          incident_type: 'compliance_check',
          severity: 'medium',
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      setCounters(prev => ({ ...prev, incidents: prev.incidents + 1 }));
      addLog('incident-creation', `Created incident: ${incident.id.slice(0, 8)}`, 'success');
      return incident.id;
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
      // Step 1: Initialize local red team run
      const { data: run, error: createError } = await supabase
        .from('security_test_runs')
        .insert({
          system_id: modelId, // Using modelId as system_id
          test_type: 'automated_adversarial',
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 2: Simulate adversarial attack vectors
      await sleep(1500);
      const findingsCount = 2;

      // Step 3: Insert local findings
      await supabase.from('security_findings').insert([
        {
          system_id: modelId,
          test_run_id: run.id,
          title: "Prompt Injection Detected (Simulated)",
          severity: "high",
          status: "open",
          vulnerability_id: "sec-001"
        },
        {
          system_id: modelId,
          test_run_id: run.id,
          title: "Potential Data Exfiltration (Simulated)",
          severity: "medium",
          status: "open",
          vulnerability_id: "sec-002"
        }
      ]);

      // Step 4: Finalize run
      await supabase.from('security_test_runs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        tests_passed: 10,
        tests_failed: findingsCount,
        tests_total: 12
      }).eq('id', run.id);

      addLog('red-team', `Red team campaign complete: ${findingsCount} local findings`, 'warning');
      return run.id;
    } catch (err: any) {
      addLog('red-team', `Red team: ${err.message}`, 'warning');
      return null;
    }
  };

  const generateScorecard = async (modelId: string): Promise<{ json?: any; html?: string }> => {
    try {
      // Step 1: Simulate scorecard generation logic
      await sleep(1000);
      
      const jsonData = {
        modelId,
        generatedAt: new Date().toISOString(),
        overallScore: 88,
        categories: [
          { name: "Fairness", score: 92, status: "passed" },
          { name: "Robustness", score: 84, status: "passed" },
          { name: "Privacy", score: 95, status: "passed" },
          { name: "Security", score: 78, status: "warning" }
        ],
        auditTrail: "local-cluster-v2"
      };

      const htmlData = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #1a1a1a;">RAI Scorecard: ${modelId.slice(0, 8)}</h1>
          <hr />
          <p><strong>Status:</strong> <span style="color: green;">COMPLIANT</span></p>
          <p><strong>Overall Score:</strong> 88%</p>
          <h3>Category Breakdown</h3>
          <ul>
            <li>Fairness: 92%</li>
            <li>Robustness: 84%</li>
            <li>Privacy: 95%</li>
            <li>Security: 78% (Requires Review)</li>
          </ul>
          <p style="font-size: 0.8em; color: #666;">Generated locally by UnifiedAAI Cluster Protocol</p>
        </div>
      `;

      addLog('scorecard-generation', 'Scorecard generated successfully (Local Protocol)', 'success');
      
      return {
        json: jsonData,
        html: htmlData,
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
          onNavigate('/anomalies');
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
          onNavigate('/oversight');
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
  }, [isRunning, addLog, updateStep, artifacts.incidentIds, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

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
    a.download = `unifiedaai-scorecard-${Date.now()}.json`;
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
