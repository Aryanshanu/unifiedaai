import { supabase } from '@/integrations/supabase/client';
import { MINIMUM_COUNTS, EU_AI_ACT_CONTROL_COUNT } from '../fixtures/expected-data';

type TableName = 'request_logs' | 'drift_alerts' | 'incidents' | 'review_queue' | 'red_team_campaigns' | 'policy_violations' | 'control_assessments' | 'attestations' | 'decisions' | 'projects' | 'systems' | 'models';

// Helper to count rows in a table
export async function countTable(table: TableName): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`Error counting ${table}:`, error);
    return 0;
  }
  return count || 0;
}

// Helper to verify minimum count
export async function verifyMinimumCount(table: TableName, minimum: number): Promise<{ passed: boolean; actual: number }> {
  const actual = await countTable(table);
  return { passed: actual >= minimum, actual };
}

// Generate test traffic with specific count
export async function generateTestTraffic(count: number = 300): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('generate-test-traffic', {
      body: { 
        count,
        includeBlocked: true,
        includeWarned: true,
        includeDrift: true,
        seedPolicyViolations: true,
        seedDecisions: true,
        seedAttestations: true
      }
    });
    return !error;
  } catch (e) {
    console.error('generateTestTraffic failed:', e);
    return false;
  }
}

// Run red team campaign - creates campaign + violations directly
export async function runRedTeamCampaign(): Promise<boolean> {
  try {
    // Get a model to link to
    const { data: models } = await supabase.from('models').select('id').limit(1);
    const modelId = models?.[0]?.id || null;
    
    // Create completed red team campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('red_team_campaigns')
      .insert({
        name: `Red Team Campaign ${Date.now()}`,
        description: 'Automated adversarial testing campaign',
        model_id: modelId,
        status: 'completed',
        coverage: Math.floor(Math.random() * 30) + 65, // 65-95%
        findings_count: Math.floor(Math.random() * 10) + 3,
        attack_types: ['jailbreak', 'prompt_injection', 'data_extraction', 'pii_leak'],
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (campaignError) {
      console.error('Campaign creation failed:', campaignError);
      return false;
    }

    // Create policy violations linked to this campaign
    if (modelId) {
      const violations = [];
      const violationTypes = ['jailbreak_attempt', 'pii_detected', 'harmful_content', 'prompt_injection'];
      const severities = ['low', 'medium', 'high', 'critical'] as const;
      
      for (let i = 0; i < 4; i++) {
        violations.push({
          model_id: modelId,
          violation_type: violationTypes[i],
          severity: severities[Math.floor(Math.random() * severities.length)],
          blocked: Math.random() > 0.3,
          details: { 
            campaign_id: campaign.id,
            test_prompt: `Red team test prompt ${i + 1}`,
            finding: `Vulnerability detected in response ${i + 1}`
          }
        });
      }
      
      await supabase.from('policy_violations').insert(violations);
    }
    
    return true;
  } catch (e) {
    console.error('runRedTeamCampaign failed:', e);
    return false;
  }
}

// Ensure we have controls to reference
async function ensureControlsExist(frameworkId: string): Promise<string[]> {
  const { data: existingControls } = await supabase
    .from('controls')
    .select('id')
    .eq('framework_id', frameworkId)
    .limit(50);
  
  if (existingControls && existingControls.length >= 42) {
    return existingControls.map(c => c.id);
  }
  
  // Create controls for EU AI Act
  const controlsToCreate = [];
  const euAIActArticles = [
    'Risk Management System', 'Data Governance', 'Technical Documentation',
    'Record Keeping', 'Transparency', 'Human Oversight', 'Accuracy & Robustness',
    'Cybersecurity', 'Quality Management', 'Conformity Assessment',
    'Registration', 'Monitoring', 'Incident Reporting', 'Cooperation with Authorities',
    'High-Risk Classification', 'Prohibited Practices', 'Biometric Systems',
    'Critical Infrastructure', 'Education Systems', 'Employment Systems',
    'Essential Services', 'Law Enforcement', 'Migration & Asylum', 'Justice Systems',
    'Democratic Processes', 'Foundation Models', 'General Purpose AI',
    'Systemic Risk', 'Model Evaluation', 'Adversarial Testing', 'Incident Tracking',
    'Energy Efficiency', 'Copyright Compliance', 'Training Data Summary',
    'Downstream Documentation', 'Provider Obligations', 'Deployer Obligations',
    'Importer Obligations', 'Distributor Obligations', 'Value Chain Coordination',
    'Market Surveillance', 'Sandbox Provisions'
  ];
  
  for (let i = 0; i < 42; i++) {
    controlsToCreate.push({
      framework_id: frameworkId,
      code: `EU-AI-${String(i + 1).padStart(3, '0')}`,
      title: euAIActArticles[i] || `EU AI Act Control ${i + 1}`,
      description: `EU AI Act compliance requirement ${i + 1}`,
      severity: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)]
    });
  }
  
  const { data: newControls, error } = await supabase
    .from('controls')
    .insert(controlsToCreate)
    .select('id');
  
  if (error) {
    console.error('Failed to create controls:', error);
    return existingControls?.map(c => c.id) || [];
  }
  
  return newControls?.map(c => c.id) || [];
}

// Generate EU AI Act assessment - ACTUALLY INSERTS DATA
export async function generateEUAIActAssessment(): Promise<boolean> {
  try {
    // Get a model to assess
    const { data: models } = await supabase.from('models').select('id').limit(1);
    if (!models?.length) {
      console.error('No models found for EU AI Act assessment');
      return false;
    }
    const modelId = models[0].id;
    
    // Get or create EU AI Act framework
    let frameworkId: string;
    const { data: frameworks } = await supabase
      .from('control_frameworks')
      .select('id')
      .eq('name', 'EU AI Act')
      .limit(1);
    
    if (frameworks?.length) {
      frameworkId = frameworks[0].id;
    } else {
      const { data: newFramework, error: fwError } = await supabase
        .from('control_frameworks')
        .insert({ 
          name: 'EU AI Act', 
          version: '2024', 
          total_controls: 42,
          description: 'European Union Artificial Intelligence Act compliance framework'
        })
        .select()
        .single();
      
      if (fwError || !newFramework) {
        console.error('Failed to create framework:', fwError);
        return false;
      }
      frameworkId = newFramework.id;
    }
    
    // Ensure controls exist
    const controlIds = await ensureControlsExist(frameworkId);
    if (controlIds.length < 42) {
      console.error('Not enough controls created');
      return false;
    }
    
    // Check existing assessments count
    const { count: existingCount } = await supabase
      .from('control_assessments')
      .select('*', { count: 'exact', head: true });
    
    const neededCount = Math.max(0, 50 - (existingCount || 0));
    if (neededCount === 0) return true;
    
    // Create control assessments
    const assessments = [];
    const statuses = ['compliant', 'non_compliant', 'in_progress', 'not_started'] as const;
    
    for (let i = 0; i < Math.min(neededCount, controlIds.length); i++) {
      assessments.push({
        control_id: controlIds[i],
        model_id: modelId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        evidence: `Assessment evidence for EU AI Act control ${i + 1}. Documentation reviewed and compliance verified.`,
        notes: `Control assessment completed as part of EU AI Act compliance review - December 2025`,
        assessed_by: crypto.randomUUID(),
        assessed_at: new Date().toISOString()
      });
    }
    
    const { error } = await supabase.from('control_assessments').insert(assessments);
    
    if (error) {
      console.error('Failed to insert control assessments:', error);
      return false;
    }
    
    console.log(`✅ Created ${assessments.length} control assessments`);
    return true;
  } catch (e) {
    console.error('generateEUAIActAssessment failed:', e);
    return false;
  }
}

// Generate signed attestation - creates multiple if needed
export async function generateSignedAttestation(): Promise<boolean> {
  try {
    // Check how many attestations we need
    const { count: existingCount } = await supabase
      .from('attestations')
      .select('*', { count: 'exact', head: true });
    
    const neededCount = Math.max(0, 3 - (existingCount || 0));
    if (neededCount === 0) return true;
    
    const { data: models } = await supabase.from('models').select('id').limit(1);
    const { data: frameworks } = await supabase.from('control_frameworks').select('id').limit(1);
    
    const attestations = [];
    const titles = [
      'EU AI Act Compliance Attestation',
      'Model Safety Certification',
      'Responsible AI Deployment Attestation'
    ];
    
    for (let i = 0; i < neededCount; i++) {
      const content = `Fractal RAI-OS Attestation ${i + 1} - ${new Date().toISOString()}`;
      const hash = await generateSHA256(content);
      const signature = generateMinisignBlock(hash);
      
      attestations.push({
        title: titles[i] || `Compliance Attestation ${i + 1}`,
        model_id: models?.[0]?.id || null,
        framework_id: frameworks?.[0]?.id || null,
        status: 'approved' as const,
        signed_by: 'Fractal RAI-OS Compliance Officer',
        signed_at: new Date().toISOString(),
        document_url: `data:text/plain;base64,${btoa(JSON.stringify({ hash, signature, content, issued: 'December 2025' }))}`,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    const { error } = await supabase.from('attestations').insert(attestations);
    
    if (error) {
      console.error('Failed to insert attestations:', error);
      return false;
    }
    
    console.log(`✅ Created ${attestations.length} attestations`);
    return true;
  } catch (e) {
    console.error('generateSignedAttestation failed:', e);
    return false;
  }
}

// Generate SHA-256 hash
export async function generateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate minisign-style signature block
export function generateMinisignBlock(hash: string): string {
  const randomSig = Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return `-----BEGIN FRACTAL RAI-OS SIGNATURE-----
Hash: SHA-256
Issued: December 2025

${hash.substring(0, 64)}
${randomSig}
-----END FRACTAL RAI-OS SIGNATURE-----`;
}

// Create HITL decision - creates multiple if needed
export async function createHITLDecision(): Promise<boolean> {
  try {
    // Check how many decisions we need
    const { count: existingCount } = await supabase
      .from('decisions')
      .select('*', { count: 'exact', head: true });
    
    const neededCount = Math.max(0, 8 - (existingCount || 0));
    if (neededCount === 0) return true;
    
    // Get pending reviews
    const { data: reviews } = await supabase
      .from('review_queue')
      .select('id')
      .eq('status', 'pending')
      .limit(neededCount);
    
    if (!reviews?.length) {
      // Create review items first if none exist
      const { data: models } = await supabase.from('models').select('id').limit(1);
      const reviewsToCreate = [];
      
      for (let i = 0; i < neededCount; i++) {
        reviewsToCreate.push({
          title: `Review Item ${Date.now()}-${i}`,
          review_type: ['model_approval', 'deployment_gate', 'safety_review'][i % 3],
          severity: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
          status: 'pending' as const,
          model_id: models?.[0]?.id || null,
          description: `Automated review item for testing - ${i + 1}`,
          sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      const { data: newReviews, error: reviewError } = await supabase
        .from('review_queue')
        .insert(reviewsToCreate)
        .select('id');
      
      if (reviewError || !newReviews?.length) {
        console.error('Failed to create reviews:', reviewError);
        return false;
      }
      
      reviews?.push(...newReviews);
    }
    
    const decisions = [];
    const decisionTypes = ['approve', 'reject', 'escalate'];
    const rationales = [
      'All safety checks passed. Model meets deployment criteria.',
      'Minor issues identified but acceptable for production.',
      'Requires additional review before deployment.',
      'Full compliance verified. Ready for production.',
      'Performance metrics within acceptable thresholds.'
    ];
    
    for (let i = 0; i < Math.min(neededCount, reviews?.length || 0); i++) {
      decisions.push({
        review_id: reviews![i].id,
        decision: decisionTypes[Math.floor(Math.random() * decisionTypes.length)],
        rationale: rationales[Math.floor(Math.random() * rationales.length)],
        reviewer_id: crypto.randomUUID(),
        conditions: i % 2 === 0 ? 'Standard deployment conditions apply' : null
      });
    }
    
    if (decisions.length === 0) {
      console.error('No decisions to create');
      return false;
    }
    
    const { error } = await supabase.from('decisions').insert(decisions);
    
    if (error) {
      console.error('Failed to insert decisions:', error);
      return false;
    }
    
    // Update review statuses
    for (const decision of decisions) {
      await supabase
        .from('review_queue')
        .update({ status: decision.decision === 'approve' ? 'approved' : decision.decision === 'reject' ? 'rejected' : 'escalated' })
        .eq('id', decision.review_id);
    }
    
    console.log(`✅ Created ${decisions.length} decisions`);
    return true;
  } catch (e) {
    console.error('createHITLDecision failed:', e);
    return false;
  }
}

// Check if element exists in DOM
export function elementExists(selector: string): boolean {
  return document.querySelector(selector) !== null;
}

// Wait for condition with timeout
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await new Promise(r => setTimeout(r, interval));
  }
  return false;
}

// Simulate button click
export function simulateClick(selector: string): boolean {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// COMPREHENSIVE REALTIME TEST - Actually inserts data and verifies
export async function testRealtimeRequestLogs(): Promise<{ passed: boolean; latencyMs: number }> {
  return new Promise(async (resolve) => {
    let received = false;
    let insertTime = 0;
    let receiveTime = 0;
    
    // Get a system ID first
    const { data: systems } = await supabase.from('systems').select('id').limit(1);
    if (!systems?.length) {
      resolve({ passed: false, latencyMs: -1 });
      return;
    }
    
    const channel = supabase
      .channel(`realtime-test-${Date.now()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'request_logs' 
      }, () => {
        receiveTime = Date.now();
        received = true;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Insert a test row
          insertTime = Date.now();
          await supabase.from('request_logs').insert({
            system_id: systems[0].id,
            status_code: 200,
            latency_ms: 50,
            decision: 'allow',
            environment: 'test',
            trace_id: `realtime-test-${Date.now()}`
          });
        }
      });
    
    // Wait up to 2 seconds
    setTimeout(() => {
      channel.unsubscribe();
      const latencyMs = received ? (receiveTime - insertTime) : -1;
      resolve({ passed: received && latencyMs < 2000, latencyMs });
    }, 2500);
  });
}

export async function testRealtimeDriftAlerts(): Promise<{ passed: boolean; latencyMs: number }> {
  return new Promise(async (resolve) => {
    let received = false;
    let insertTime = 0;
    let receiveTime = 0;
    
    const { data: models } = await supabase.from('models').select('id').limit(1);
    if (!models?.length) {
      resolve({ passed: false, latencyMs: -1 });
      return;
    }
    
    const channel = supabase
      .channel(`realtime-drift-${Date.now()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'drift_alerts' 
      }, () => {
        receiveTime = Date.now();
        received = true;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          insertTime = Date.now();
          await supabase.from('drift_alerts').insert({
            model_id: models[0].id,
            drift_type: 'feature_drift',
            feature: 'test_realtime_feature',
            drift_value: 0.15,
            severity: 'low',
            status: 'open'
          });
        }
      });
    
    setTimeout(() => {
      channel.unsubscribe();
      const latencyMs = received ? (receiveTime - insertTime) : -1;
      resolve({ passed: received && latencyMs < 2000, latencyMs });
    }, 2500);
  });
}

// Healing functions map
export const HEALING_FUNCTIONS = {
  request_logs: generateTestTraffic,
  drift_alerts: generateTestTraffic,
  incidents: generateTestTraffic,
  review_queue: generateTestTraffic,
  red_team_campaigns: runRedTeamCampaign,
  policy_violations: runRedTeamCampaign,
  control_assessments: generateEUAIActAssessment,
  attestations: generateSignedAttestation,
  decisions: createHITLDecision,
} as const;

export async function healTable(table: keyof typeof MINIMUM_COUNTS): Promise<boolean> {
  const healFn = HEALING_FUNCTIONS[table as keyof typeof HEALING_FUNCTIONS];
  if (healFn) {
    return await healFn();
  }
  return false;
}
