import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DemoSeedResult {
  projectId: string;
  systemId: string;
  modelId: string;
  datasetId: string;
  contractId: string;
  decisionIds: string[];
  appealId: string;
  outcomeId: string;
}

export interface SeedProgress {
  step: string;
  completed: number;
  total: number;
  currentAction: string;
}

type Environment = 'development' | 'staging' | 'production' | 'sandbox';

const DEMO_PROJECT_NAME = "Fractal Demo Sandbox";

export function useDemoSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<SeedProgress>({
    step: '',
    completed: 0,
    total: 13,
    currentAction: ''
  });
  const [seedResult, setSeedResult] = useState<DemoSeedResult | null>(null);

  const updateProgress = (step: string, completed: number, currentAction: string) => {
    setProgress({ step, completed, total: 13, currentAction });
  };

  // Generate a simple hash for demo purposes
  const generateHash = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`;
  };

  const seedDemoProject = async (userId: string): Promise<string> => {
    updateProgress('Creating Demo Project', 1, 'Fractal Demo Sandbox');
    
    // Check if demo project already exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('name', DEMO_PROJECT_NAME)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: DEMO_PROJECT_NAME,
        environment: 'sandbox' as Environment,
        criticality: 1,
        description: 'Synthetic demo environment for governance testing. Contains realistic test data including PASS and FAIL cases.',
        data_sensitivity: 'high',
        business_sensitivity: 'low',
        compliance_frameworks: ['eu-ai-act', 'gdpr'],
        owner_id: userId
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create demo project: ${error.message}`);
    return data.id;
  };

  const seedDemoDataset = async (): Promise<string> => {
    updateProgress('Creating Demo Dataset', 2, 'Loan_Applications_Demo');
    
    const { data: existing } = await supabase
      .from('datasets')
      .select('id')
      .eq('name', 'Loan_Applications_Demo')
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from('datasets')
      .insert({
        name: 'Loan_Applications_Demo',
        source: 'synthetic',
        description: 'Synthetic loan application data for governance testing. Contains intentional data quality issues for demo.',
        sensitivity_level: 'high',
        data_types: ['pii', 'financial'],
        row_count: 10000,
        jurisdiction: ['EU', 'US'],
        consent_status: 'obtained',
        environment: 'sandbox'
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create demo dataset: ${error.message}`);
    return data.id;
  };

  const seedDemoDataContract = async (datasetId: string): Promise<string> => {
    updateProgress('Creating Data Contract', 3, 'Loan Data Quality Contract v1');
    
    const { data: existing } = await supabase
      .from('data_contracts')
      .select('id')
      .eq('dataset_id', datasetId)
      .eq('name', 'Loan Data Quality Contract v1')
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from('data_contracts')
      .insert({
        dataset_id: datasetId,
        name: 'Loan Data Quality Contract v1',
        schema_expectations: {
          columns: ['age', 'income', 'credit_score', 'gender'],
          types: {
            age: 'integer',
            income: 'number',
            credit_score: 'integer'
          }
        },
        quality_thresholds: {
          completeness: 0.95,
          validity: 0.98
        },
        pii_guarantees: {
          allowed_pii: ['age', 'gender'],
          redaction_required: true
        },
        enforcement_mode: 'block',
        status: 'active'
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create data contract: ${error.message}`);
    return data.id;
  };

  const seedDemoSystem = async (projectId: string): Promise<string> => {
    updateProgress('Creating Demo System', 4, 'Loan Approval AI');
    
    const { data: existing } = await supabase
      .from('systems')
      .select('id')
      .eq('name', 'Loan Approval AI')
      .eq('project_id', projectId)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from('systems')
      .insert({
        name: 'Loan Approval AI',
        project_id: projectId,
        provider: 'demo-provider',
        system_type: 'model',
        use_case: 'Automated loan approval decisions',
        deployment_status: 'draft'
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create demo system: ${error.message}`);
    return data.id;
  };

  const seedDemoModel = async (projectId: string, systemId: string): Promise<string> => {
    updateProgress('Creating Demo Model', 5, 'LoanApprovalModel_v1');
    
    const { data: existing } = await supabase
      .from('models')
      .select('id')
      .eq('name', 'LoanApprovalModel_v1')
      .eq('project_id', projectId)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from('models')
      .insert({
        name: 'LoanApprovalModel_v1',
        model_type: 'classification',
        version: '1.0.0',
        status: 'active',
        provider: 'demo-provider',
        project_id: projectId,
        system_id: systemId,
        description: 'Binary classification model for loan approval decisions',
        use_case: 'loan_approval',
        fairness_score: 68,
        toxicity_score: 92,
        privacy_score: 85,
        robustness_score: 78,
        overall_score: 76
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create demo model: ${error.message}`);
    return data.id;
  };

  const seedDataQualityRuns = async (datasetId: string): Promise<void> => {
    updateProgress('Creating Quality Runs', 6, 'PASS and FAIL cases');
    
    // Check if runs already exist
    const { data: existing } = await supabase
      .from('dataset_quality_runs')
      .select('id')
      .eq('dataset_id', datasetId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    // PASS case
    await supabase.from('dataset_quality_runs').insert({
      dataset_id: datasetId,
      completeness_score: 0.98,
      validity_score: 0.99,
      uniqueness_score: 0.97,
      freshness_score: 0.95,
      overall_score: 0.9725,
      verdict: 'PASS',
      run_type: 'scheduled',
      record_hash: generateHash('pass-run-' + Date.now()),
      metric_details: {
        null_counts: { age: 2, income: 1, credit_score: 0 },
        duplicate_rate: 0.03
      }
    });

    // FAIL case with imbalanced data
    await supabase.from('dataset_quality_runs').insert({
      dataset_id: datasetId,
      completeness_score: 0.82,
      validity_score: 0.91,
      uniqueness_score: 0.89,
      freshness_score: 0.78,
      overall_score: 0.85,
      verdict: 'FAIL',
      run_type: 'contract_check',
      record_hash: generateHash('fail-run-' + Date.now()),
      sensitive_attribute_balance: {
        gender: { male: 92, female: 8 }
      },
      distribution_skew: {
        income: { skewness: 2.3, kurtosis: 8.1 }
      },
      metric_details: {
        null_counts: { age: 180, income: 95, credit_score: 45 },
        duplicate_rate: 0.11,
        warnings: ['Severe gender imbalance detected', 'High income skewness']
      }
    });
  };

  const seedContractViolations = async (contractId: string, datasetId: string): Promise<void> => {
    updateProgress('Creating Contract Violations', 7, 'Balance threshold exceeded');
    
    const { data: existing } = await supabase
      .from('data_contract_violations')
      .select('id')
      .eq('contract_id', contractId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    await supabase.from('data_contract_violations').insert({
      contract_id: contractId,
      dataset_id: datasetId,
      violation_type: 'balance_threshold_exceeded',
      severity: 'high',
      status: 'open',
      violation_details: {
        attribute: 'gender',
        expected_min_ratio: 0.3,
        actual_ratio: 0.08,
        message: 'Severe gender imbalance detected (92% male, 8% female). This may lead to biased model predictions.'
      }
    });

    await supabase.from('data_contract_violations').insert({
      contract_id: contractId,
      dataset_id: datasetId,
      violation_type: 'completeness_below_threshold',
      severity: 'medium',
      status: 'open',
      violation_details: {
        threshold: 0.95,
        actual: 0.82,
        message: 'Data completeness (82%) below required threshold (95%)'
      }
    });
  };

  const seedDecisions = async (modelId: string): Promise<string[]> => {
    updateProgress('Creating Decision Ledger', 8, 'Decision entries with hash chain');
    
    const { data: existing } = await supabase
      .from('decision_ledger')
      .select('id')
      .eq('model_id', modelId)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing.map(d => d.id);
    }

    const decisionIds: string[] = [];
    let previousHash: string | null = null;

    // Decision 1: REJECT with low confidence
    const decision1 = {
      model_id: modelId,
      model_version: '1.0.0',
      input_hash: generateHash('applicant_123_input'),
      output_hash: generateHash('decision_reject_123'),
      decision_value: 'REJECT',
      decision_ref: 'DEC-2026-001',
      confidence: 0.67,
      context: {
        use_case: 'loan_approval',
        channel: 'web',
        applicant_segment: 'first_time_buyer',
        loan_amount: 250000
      },
      decision_timestamp: new Date().toISOString(),
      record_hash: generateHash('record-1-' + Date.now()),
      previous_hash: previousHash
    };

    const { data: d1, error: e1 } = await supabase
      .from('decision_ledger')
      .insert(decision1)
      .select('id, record_hash')
      .single();

    if (e1) throw new Error(`Failed to create decision 1: ${e1.message}`);
    decisionIds.push(d1.id);
    previousHash = d1.record_hash;

    // Decision 2: APPROVE with high confidence
    const decision2 = {
      model_id: modelId,
      model_version: '1.0.0',
      input_hash: generateHash('applicant_456_input'),
      output_hash: generateHash('decision_approve_456'),
      decision_value: 'APPROVE',
      decision_ref: 'DEC-2026-002',
      confidence: 0.94,
      context: {
        use_case: 'loan_approval',
        channel: 'mobile',
        applicant_segment: 'existing_customer',
        loan_amount: 150000
      },
      decision_timestamp: new Date(Date.now() - 3600000).toISOString(),
      record_hash: generateHash('record-2-' + Date.now()),
      previous_hash: previousHash
    };

    const { data: d2, error: e2 } = await supabase
      .from('decision_ledger')
      .insert(decision2)
      .select('id, record_hash')
      .single();

    if (e2) throw new Error(`Failed to create decision 2: ${e2.message}`);
    decisionIds.push(d2.id);

    // Decision 3: REJECT - borderline case
    const decision3 = {
      model_id: modelId,
      model_version: '1.0.0',
      input_hash: generateHash('applicant_789_input'),
      output_hash: generateHash('decision_reject_789'),
      decision_value: 'REJECT',
      decision_ref: 'DEC-2026-003',
      confidence: 0.52,
      context: {
        use_case: 'loan_approval',
        channel: 'branch',
        applicant_segment: 'self_employed',
        loan_amount: 500000
      },
      decision_timestamp: new Date(Date.now() - 7200000).toISOString(),
      record_hash: generateHash('record-3-' + Date.now()),
      previous_hash: d2.record_hash
    };

    const { data: d3, error: e3 } = await supabase
      .from('decision_ledger')
      .insert(decision3)
      .select('id')
      .single();

    if (e3) throw new Error(`Failed to create decision 3: ${e3.message}`);
    decisionIds.push(d3.id);

    return decisionIds;
  };

  const seedDecisionExplanations = async (decisionIds: string[]): Promise<void> => {
    updateProgress('Creating Explanations', 9, 'SHAP feature importance');
    
    if (decisionIds.length === 0) return;

    const { data: existing } = await supabase
      .from('decision_explanations')
      .select('id')
      .eq('decision_id', decisionIds[0])
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    // Only explain first decision (low explanation rate for realism)
    await supabase.from('decision_explanations').insert({
      decision_id: decisionIds[0],
      explanation_type: 'shap',
      feature_influences: {
        credit_score: -0.45,
        income: -0.22,
        employment_length: -0.18,
        age: 0.05,
        existing_loans: -0.10,
        debt_to_income: -0.08
      },
      natural_language: 'The loan was rejected primarily due to a below-average credit score (contributing -45% to the decision) combined with income level (-22%) and short employment history (-18%). Age had a minor positive influence (+5%).',
      counterfactual: {
        credit_score: { current: 580, required: 650, impact: 'Would change decision to APPROVE' },
        income: { current: 35000, required: 45000, impact: 'Would improve confidence by 15%' }
      },
      generation_method: 'shap_local'
    });
  };

  const seedAppeals = async (decisionIds: string[]): Promise<string> => {
    updateProgress('Creating Appeals', 10, 'Pending appeal with SLA');
    
    if (decisionIds.length === 0) throw new Error('No decisions to appeal');

    const { data: existing } = await supabase
      .from('decision_appeals')
      .select('id')
      .eq('decision_id', decisionIds[0])
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const slaDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const { data, error } = await supabase
      .from('decision_appeals')
      .insert({
        decision_id: decisionIds[0],
        appeal_reason: 'Income assessment incorrect - applicant has additional freelance income of $15,000/year not captured in the initial application. Supporting documentation attached.',
        appeal_category: 'accuracy',
        appellant_reference: 'APP-2026-001',
        status: 'pending',
        sla_deadline: slaDeadline.toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create appeal: ${error.message}`);
    return data.id;
  };

  const seedOutcomes = async (decisionIds: string[]): Promise<string> => {
    updateProgress('Creating Outcomes', 11, 'Harmful outcome tracking');
    
    if (decisionIds.length === 0) throw new Error('No decisions for outcomes');

    const { data: existing } = await supabase
      .from('decision_outcomes')
      .select('id')
      .eq('decision_id', decisionIds[0])
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const { data, error } = await supabase
      .from('decision_outcomes')
      .insert({
        decision_id: decisionIds[0],
        outcome_type: 'harmful',
        harm_category: 'financial',
        harm_severity: 'high',
        outcome_details: {
          impact: 'Applicant wrongly denied loan, lost home purchase opportunity',
          affected_parties: 1,
          remediation_required: true,
          financial_impact_estimate: 25000
        },
        detected_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create outcome: ${error.message}`);
    return data.id;
  };

  const seedDeploymentAttestations = async (systemId: string, modelId: string): Promise<void> => {
    updateProgress('Creating MLOps Attestations', 12, 'PASS and BLOCK cases');
    
    const { data: existing } = await supabase
      .from('deployment_attestations')
      .select('id')
      .eq('system_id', systemId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    const validHash = 'sha256:abc123def456789';

    // PASS case - matching hashes
    await supabase.from('deployment_attestations').insert({
      system_id: systemId,
      model_id: modelId,
      deployment_id: 'deploy-2026-001',
      commit_sha: 'a1b2c3d4e5f6',
      artifact_hash: validHash,
      approved_artifact_hash: validHash,
      hash_match: true,
      slsa_level: 2,
      verification_status: 'verified',
      verified_at: new Date().toISOString()
    });

    // BLOCK case - mismatched hashes
    await supabase.from('deployment_attestations').insert({
      system_id: systemId,
      model_id: modelId,
      deployment_id: 'deploy-2026-002',
      commit_sha: 'x9y8z7w6v5u4',
      artifact_hash: 'sha256:tampered789xyz',
      approved_artifact_hash: validHash,
      hash_match: false,
      slsa_level: 2,
      verification_status: 'blocked',
      bypass_reason: 'Artifact hash mismatch detected - deployment blocked for security review'
    });
  };

  const seedSystemApprovals = async (systemId: string): Promise<void> => {
    updateProgress('Creating System Approvals', 13, 'Pending approval workflow');
    
    const { data: existing } = await supabase
      .from('system_approvals')
      .select('id')
      .eq('system_id', systemId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    await supabase.from('system_approvals').insert({
      system_id: systemId,
      status: 'pending',
      requested_by: 'demo-user',
      reason: 'Initial deployment approval request for Loan Approval AI system'
    });
  };

  const seedAllDemoData = useCallback(async (): Promise<DemoSeedResult> => {
    setIsSeeding(true);
    setSeedResult(null);

    try {
      // Pre-check: Must be authenticated for RLS
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to seed demo data');
      }

      // 1. Create project (requires user ID for RLS)
      const projectId = await seedDemoProject(user.id);

      // 2. Create dataset
      const datasetId = await seedDemoDataset();

      // 3. Create data contract
      const contractId = await seedDemoDataContract(datasetId);

      // 4. Create system
      const systemId = await seedDemoSystem(projectId);

      // 5. Create model
      const modelId = await seedDemoModel(projectId, systemId);

      // 6. Create quality runs
      await seedDataQualityRuns(datasetId);

      // 7. Create contract violations
      await seedContractViolations(contractId, datasetId);

      // 8. Create decisions
      const decisionIds = await seedDecisions(modelId);

      // 9. Create explanations
      await seedDecisionExplanations(decisionIds);

      // 10. Create appeals
      const appealId = await seedAppeals(decisionIds);

      // 11. Create outcomes
      const outcomeId = await seedOutcomes(decisionIds);

      // 12. Create deployment attestations
      await seedDeploymentAttestations(systemId, modelId);

      // 13. Create system approvals
      await seedSystemApprovals(systemId);

      const result: DemoSeedResult = {
        projectId,
        systemId,
        modelId,
        datasetId,
        contractId,
        decisionIds,
        appealId,
        outcomeId
      };

      setSeedResult(result);
      toast.success('Demo data seeded successfully!', {
        description: 'All 9 governance domains now have test data.'
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to seed demo data', { description: message });
      throw error;
    } finally {
      setIsSeeding(false);
    }
  }, []);

  const clearDemoData = useCallback(async (): Promise<void> => {
    setIsClearing(true);

    try {
      // Get demo project
      const { data: demoProject } = await supabase
        .from('projects')
        .select('id')
        .eq('name', DEMO_PROJECT_NAME)
        .single();

      if (!demoProject) {
        toast.info('No demo data to clear');
        return;
      }

      // Get all related IDs
      const { data: systems } = await supabase
        .from('systems')
        .select('id')
        .eq('project_id', demoProject.id);

      const systemIds = systems?.map(s => s.id) || [];

      const { data: models } = await supabase
        .from('models')
        .select('id')
        .eq('project_id', demoProject.id);

      const modelIds = models?.map(m => m.id) || [];

      // Delete in reverse order of dependencies
      if (modelIds.length > 0) {
        // Get decision IDs
        const { data: decisions } = await supabase
          .from('decision_ledger')
          .select('id')
          .in('model_id', modelIds);

        const decisionIds = decisions?.map(d => d.id) || [];

        if (decisionIds.length > 0) {
          await supabase.from('decision_outcomes').delete().in('decision_id', decisionIds);
          await supabase.from('decision_appeals').delete().in('decision_id', decisionIds);
          await supabase.from('decision_explanations').delete().in('decision_id', decisionIds);
          await supabase.from('decision_ledger').delete().in('id', decisionIds);
        }

        await supabase.from('deployment_attestations').delete().in('model_id', modelIds);
        await supabase.from('models').delete().in('id', modelIds);
      }

      if (systemIds.length > 0) {
        await supabase.from('system_approvals').delete().in('system_id', systemIds);
        await supabase.from('systems').delete().in('id', systemIds);
      }

      // Delete datasets with sandbox environment
      const { data: datasets } = await supabase
        .from('datasets')
        .select('id')
        .eq('environment', 'sandbox');

      const datasetIds = datasets?.map(d => d.id) || [];

      if (datasetIds.length > 0) {
        // Get contracts
        const { data: contracts } = await supabase
          .from('data_contracts')
          .select('id')
          .in('dataset_id', datasetIds);

        const contractIds = contracts?.map(c => c.id) || [];

        if (contractIds.length > 0) {
          await supabase.from('data_contract_violations').delete().in('contract_id', contractIds);
          await supabase.from('data_contracts').delete().in('id', contractIds);
        }

        await supabase.from('dataset_quality_runs').delete().in('dataset_id', datasetIds);
        await supabase.from('datasets').delete().in('id', datasetIds);
      }

      // Finally delete project
      await supabase.from('projects').delete().eq('id', demoProject.id);

      setSeedResult(null);
      toast.success('Demo data cleared successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to clear demo data', { description: message });
      throw error;
    } finally {
      setIsClearing(false);
    }
  }, []);

  const checkDemoDataExists = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('name', DEMO_PROJECT_NAME)
      .single();

    return !!data;
  }, []);

  return {
    isSeeding,
    isClearing,
    progress,
    seedResult,
    seedAllDemoData,
    clearDemoData,
    checkDemoDataExists,
    DEMO_PROJECT_NAME
  };
}
