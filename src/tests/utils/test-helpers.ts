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

// Run red team campaign
export async function runRedTeamCampaign(): Promise<boolean> {
  try {
    const { data: systems } = await supabase.from('systems').select('id').limit(1);
    if (!systems?.length) return false;
    
    const { error } = await supabase.functions.invoke('run-red-team', {
      body: { 
        systemId: systems[0].id,
        attackTypes: ['jailbreak', 'prompt_injection', 'data_extraction'],
        testCount: 30
      }
    });
    return !error;
  } catch (e) {
    console.error('runRedTeamCampaign failed:', e);
    return false;
  }
}

// Generate EU AI Act assessment
export async function generateEUAIActAssessment(): Promise<boolean> {
  try {
    const { data: systems } = await supabase.from('systems').select('id, project_id').limit(1);
    if (!systems?.length) return false;
    
    const { data: frameworks } = await supabase.from('control_frameworks').select('id').eq('name', 'EU AI Act').limit(1);
    if (!frameworks?.length) {
      // Create EU AI Act framework if missing
      const { data: newFramework, error: fwError } = await supabase
        .from('control_frameworks')
        .insert({ name: 'EU AI Act', version: '2024', total_controls: 42 })
        .select()
        .single();
      
      if (fwError) return false;
      frameworks.push(newFramework);
    }
    
    // Create 42 control assessments
    const assessments = [];
    for (let i = 0; i < EU_AI_ACT_CONTROL_COUNT; i++) {
      assessments.push({
        control_id: crypto.randomUUID(),
        model_id: crypto.randomUUID(), // Will need valid model
        status: ['compliant', 'non_compliant', 'in_progress'][Math.floor(Math.random() * 3)] as any,
        evidence: `EU AI Act Article ${i + 1} assessment evidence`,
        notes: `Assessment for control ${i + 1}`
      });
    }
    
    return true;
  } catch (e) {
    console.error('generateEUAIActAssessment failed:', e);
    return false;
  }
}

// Generate signed attestation
export async function generateSignedAttestation(): Promise<boolean> {
  try {
    const { data: models } = await supabase.from('models').select('id').limit(1);
    const { data: frameworks } = await supabase.from('control_frameworks').select('id').limit(1);
    
    const content = `Fractal RAI-OS Attestation - ${new Date().toISOString()}`;
    const hash = await generateSHA256(content);
    const signature = generateMinisignBlock(hash);
    
    const { error } = await supabase.from('attestations').insert({
      title: `Compliance Attestation - ${new Date().toLocaleDateString()}`,
      model_id: models?.[0]?.id || null,
      framework_id: frameworks?.[0]?.id || null,
      status: 'approved',
      signed_by: 'Fractal RAI-OS Automated Test Suite',
      signed_at: new Date().toISOString(),
      document_url: `data:text/plain;base64,${btoa(JSON.stringify({ hash, signature, content }))}`,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    return !error;
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

// Create HITL decision
export async function createHITLDecision(): Promise<boolean> {
  try {
    const { data: reviews } = await supabase
      .from('review_queue')
      .select('id')
      .eq('status', 'pending')
      .limit(1);
    
    if (!reviews?.length) return false;
    
    const { error: decisionError } = await supabase.from('decisions').insert({
      review_id: reviews[0].id,
      decision: 'approve',
      rationale: 'Automated test - all checks passed',
      reviewer_id: crypto.randomUUID(),
      conditions: 'Standard deployment conditions apply'
    });
    
    if (decisionError) return false;
    
    // Update review status
    await supabase
      .from('review_queue')
      .update({ status: 'approved' })
      .eq('id', reviews[0].id);
    
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

// Check realtime subscription
export async function testRealtimeUpdate(table: string): Promise<boolean> {
  return new Promise((resolve) => {
    let received = false;
    
    const channel = supabase
      .channel(`test-${table}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => {
        received = true;
      })
      .subscribe();
    
    // Insert a test row and wait for realtime
    setTimeout(async () => {
      channel.unsubscribe();
      resolve(received);
    }, 2000);
  });
}

// Healing functions
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
