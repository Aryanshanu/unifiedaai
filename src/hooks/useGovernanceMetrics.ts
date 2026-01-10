import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GovernanceActivationState {
  id: string;
  capability: string;
  status: 'inactive' | 'piloting' | 'enforced';
  activated_at: string | null;
  activated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GovernanceMetrics {
  // Decision Governance
  totalDecisions: number;
  decisionsWithExplanations: number;
  explanationRate: number;
  appealableDecisions: number;
  
  // Appeal Performance
  totalAppeals: number;
  pendingAppeals: number;
  resolvedAppeals: number;
  overturnedAppeals: number;
  overturnRate: number;
  avgResolutionTimeHours: number;
  slaBreach: number;
  slaComplianceRate: number;
  
  // Outcome Governance
  outcomesTracked: number;
  harmfulOutcomes: number;
  harmRate: number;
  
  // MLOps Governance
  totalDeployments: number;
  attestedDeployments: number;
  attestationCoverage: number;
  governanceBypasses: number;
  blockedDeployments: number;
  
  // META-METRIC
  governanceCoverageRate: number;
  activatedCapabilities: string[];
  enforcedCapabilities: string[];
  inactiveCapabilities: string[];
  
  // Activation State
  activationState: GovernanceActivationState[];
}

export function useGovernanceActivationState() {
  return useQuery({
    queryKey: ['governance-activation-state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_activation_state')
        .select('*')
        .order('capability');
      
      if (error) throw error;
      return data as GovernanceActivationState[];
    },
  });
}

export function useGovernanceMetrics() {
  return useQuery({
    queryKey: ['governance-metrics'],
    queryFn: async () => {
      // Fetch all data in parallel
      const [
        activationRes,
        decisionsRes,
        explanationsRes,
        appealsRes,
        outcomesRes,
        attestationsRes,
        mlopsEventsRes,
      ] = await Promise.all([
        supabase.from('governance_activation_state').select('*'),
        supabase.from('decision_ledger').select('id', { count: 'exact', head: true }),
        supabase.from('decision_explanations').select('id', { count: 'exact', head: true }),
        supabase.from('decision_appeals').select('*'),
        supabase.from('decision_outcomes').select('*'),
        supabase.from('deployment_attestations').select('*'),
        supabase.from('mlops_governance_events').select('*'),
      ]);

      const activationState = (activationRes.data || []) as GovernanceActivationState[];
      const totalDecisions = decisionsRes.count || 0;
      const decisionsWithExplanations = explanationsRes.count || 0;
      const appeals = appealsRes.data || [];
      const outcomes = outcomesRes.data || [];
      const attestations = attestationsRes.data || [];
      const mlopsEvents = mlopsEventsRes.data || [];

      // Calculate metrics
      const explanationRate = totalDecisions > 0 
        ? Math.round((decisionsWithExplanations / totalDecisions) * 100) 
        : 0;

      const pendingAppeals = appeals.filter(a => a.status === 'pending').length;
      const resolvedAppeals = appeals.filter(a => a.status === 'resolved').length;
      const overturnedAppeals = appeals.filter(a => a.final_decision === 'overturned').length;
      const overturnRate = appeals.length > 0 
        ? Math.round((overturnedAppeals / appeals.length) * 100) 
        : 0;

      // Calculate SLA compliance
      const slaBreach = appeals.filter(a => {
        if (!a.sla_deadline) return false;
        const deadline = new Date(a.sla_deadline);
        const resolvedAt = a.resolved_at ? new Date(a.resolved_at) : new Date();
        return resolvedAt > deadline;
      }).length;
      
      const slaComplianceRate = appeals.length > 0 
        ? Math.round(((appeals.length - slaBreach) / appeals.length) * 100) 
        : 0;

      // Calculate avg resolution time
      const resolvedWithTime = appeals.filter(a => a.resolved_at && a.created_at);
      const avgResolutionTimeHours = resolvedWithTime.length > 0
        ? Math.round(resolvedWithTime.reduce((acc, a) => {
            const created = new Date(a.created_at);
            const resolved = new Date(a.resolved_at!);
            return acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / resolvedWithTime.length)
        : 0;

      // Outcome metrics
      const harmfulOutcomes = outcomes.filter(o => o.harm_severity && o.harm_severity !== 'none').length;
      const harmRate = outcomes.length > 0 
        ? Math.round((harmfulOutcomes / outcomes.length) * 100) 
        : 0;

      // Attestation metrics
      const attestedDeployments = attestations.filter(a => a.verification_status === 'verified').length;
      const attestationCoverage = attestations.length > 0 
        ? Math.round((attestedDeployments / attestations.length) * 100) 
        : 0;

      // Governance bypasses
      const governanceBypasses = mlopsEvents.filter(e => 
        e.governance_decision === 'bypass' || e.governance_decision === 'override'
      ).length;
      
      const blockedDeployments = mlopsEvents.filter(e => 
        e.governance_decision === 'blocked'
      ).length;

      // Calculate governance coverage rate
      const enforcedCapabilities = activationState
        .filter(s => s.status === 'enforced')
        .map(s => s.capability);
      const activatedCapabilities = activationState
        .filter(s => s.status !== 'inactive')
        .map(s => s.capability);
      const inactiveCapabilities = activationState
        .filter(s => s.status === 'inactive')
        .map(s => s.capability);

      const governanceCoverageRate = activationState.length > 0
        ? Math.round((enforcedCapabilities.length / activationState.length) * 100)
        : 0;

      return {
        // Decision Governance
        totalDecisions,
        decisionsWithExplanations,
        explanationRate,
        appealableDecisions: totalDecisions,
        
        // Appeal Performance
        totalAppeals: appeals.length,
        pendingAppeals,
        resolvedAppeals,
        overturnedAppeals,
        overturnRate,
        avgResolutionTimeHours,
        slaBreach,
        slaComplianceRate,
        
        // Outcome Governance
        outcomesTracked: outcomes.length,
        harmfulOutcomes,
        harmRate,
        
        // MLOps Governance
        totalDeployments: attestations.length,
        attestedDeployments,
        attestationCoverage,
        governanceBypasses,
        blockedDeployments,
        
        // META-METRIC
        governanceCoverageRate,
        activatedCapabilities,
        enforcedCapabilities,
        inactiveCapabilities,
        
        // Activation State
        activationState,
      } as GovernanceMetrics;
    },
  });
}
