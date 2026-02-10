import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSecurityTestRuns(modelId?: string) {
  return useQuery({
    queryKey: ['security-test-runs', modelId],
    queryFn: async () => {
      const q = supabase
        .from('security_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      const { data, error } = modelId ? await q.eq('model_id', modelId) : await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useSecurityFindings(testRunId?: string) {
  return useQuery({
    queryKey: ['security-findings', testRunId],
    queryFn: async () => {
      const q = supabase
        .from('security_findings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      const { data, error } = testRunId ? await q.eq('test_run_id', testRunId) : await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useSecurityStats() {
  return useQuery({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const [runsRes, findingsRes] = await Promise.all([
        supabase.from('security_test_runs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('security_findings').select('*', { count: 'exact', head: false }).eq('status', 'open'),
      ]);
      
      const runs = runsRes.data || [];
      const openFindings = findingsRes.data || [];
      const totalScans = runs.length;
      
      const pentestRuns = runs.filter((r: any) => r.test_type === 'pentest');
      const jailbreakRuns = runs.filter((r: any) => r.test_type === 'jailbreak');
      const threatRuns = runs.filter((r: any) => r.test_type === 'threat_model');
      
      const avgVulnScore = pentestRuns.length > 0
        ? pentestRuns.reduce((acc: number, r: any) => acc + (r.overall_score || 0), 0) / pentestRuns.length
        : null;
      const avgResistance = jailbreakRuns.length > 0
        ? jailbreakRuns.reduce((acc: number, r: any) => acc + ((r.overall_score || 0) * 100), 0) / jailbreakRuns.length
        : null;
      const avgThreatScore = threatRuns.length > 0
        ? threatRuns.reduce((acc: number, r: any) => acc + (r.overall_score || 0), 0) / threatRuns.length
        : null;
      
      // Security Health = weighted: 40% pentest, 30% jailbreak, 30% threat
      let securityHealth: number | null = null;
      if (avgVulnScore !== null || avgResistance !== null || avgThreatScore !== null) {
        const weights = { pentest: 0.4, jailbreak: 0.3, threat: 0.3 };
        let totalWeight = 0;
        let totalScore = 0;
        if (avgVulnScore !== null) { totalScore += avgVulnScore * weights.pentest; totalWeight += weights.pentest; }
        if (avgResistance !== null) { totalScore += (avgResistance / 100) * weights.jailbreak; totalWeight += weights.jailbreak; }
        if (avgThreatScore !== null) { totalScore += avgThreatScore * weights.threat; totalWeight += weights.threat; }
        securityHealth = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : null;
      }
      
      return {
        totalScans,
        openFindings: openFindings.length,
        avgVulnScore,
        avgResistance,
        avgThreatScore,
        securityHealth,
        recentRuns: runs.slice(0, 10),
      };
    },
    staleTime: 30_000,
  });
}

export function useAttackLibrary() {
  return useQuery({
    queryKey: ['attack-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attack_library')
        .select('*')
        .eq('is_active', true)
        .order('category');
      if (error) throw error;
      
      // Group by category
      const grouped: Record<string, any[]> = {};
      for (const attack of (data || [])) {
        if (!grouped[attack.category]) grouped[attack.category] = [];
        grouped[attack.category].push(attack);
      }
      return { attacks: data || [], grouped };
    },
    staleTime: 60_000,
  });
}
