import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSecurityTestRuns(modelId?: string) {
  return useQuery({
    queryKey: ['security-test-runs', modelId],
    queryFn: async () => {
      if (modelId) {
        const { data, error } = await supabase
          .from('security_test_runs' as any)
          .select('*')
          .eq('model_id', modelId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data as any[]) ?? [];
      }
      const { data, error } = await supabase
        .from('security_test_runs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });
}

export function useSecurityFindings(testRunId?: string) {
  return useQuery({
    queryKey: ['security-findings', testRunId],
    queryFn: async () => {
      if (testRunId) {
        const { data, error } = await supabase
          .from('security_findings' as any)
          .select('*')
          .eq('test_run_id', testRunId)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return (data as any[]) ?? [];
      }
      const { data, error } = await supabase
        .from('security_findings' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });
}

export function useSecurityStats() {
  return useQuery({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const { data: runs } = await supabase
        .from('security_test_runs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      const { data: openFindings } = await supabase
        .from('security_findings' as any)
        .select('*')
        .eq('status', 'open');

      const allRuns = (runs as any[]) ?? [];
      const findings = (openFindings as any[]) ?? [];
      const totalScans = allRuns.length;

      const pentestRuns = allRuns.filter((r: any) => r.test_type === 'pentest');
      const jailbreakRuns = allRuns.filter((r: any) => r.test_type === 'jailbreak');
      const threatRuns = allRuns.filter((r: any) => r.test_type === 'threat_model');

      const avgVulnScore = pentestRuns.length > 0
        ? pentestRuns.reduce((acc: number, r: any) => acc + (r.overall_score ?? 0), 0) / pentestRuns.length
        : null;
      const avgResistance = jailbreakRuns.length > 0
        ? jailbreakRuns.reduce((acc: number, r: any) => acc + ((r.overall_score ?? 0) * 100), 0) / jailbreakRuns.length
        : null;
      const avgThreatScore = threatRuns.length > 0
        ? threatRuns.reduce((acc: number, r: any) => acc + (r.overall_score ?? 0), 0) / threatRuns.length
        : null;

      let securityHealth: number | null = null;
      if (avgVulnScore !== null || avgResistance !== null || avgThreatScore !== null) {
        const w = { pentest: 0.4, jailbreak: 0.3, threat: 0.3 };
        let tw = 0, ts = 0;
        if (avgVulnScore !== null) { ts += avgVulnScore * w.pentest; tw += w.pentest; }
        if (avgResistance !== null) { ts += (avgResistance / 100) * w.jailbreak; tw += w.jailbreak; }
        if (avgThreatScore !== null) { ts += avgThreatScore * w.threat; tw += w.threat; }
        securityHealth = tw > 0 ? Math.round((ts / tw) * 100) : null;
      }

      return {
        totalScans,
        openFindings: findings.length,
        avgVulnScore,
        avgResistance,
        avgThreatScore,
        securityHealth,
        recentRuns: allRuns.slice(0, 10),
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
      const attacks = data ?? [];
      const grouped: Record<string, typeof attacks> = {};
      for (const attack of attacks) {
        if (!grouped[attack.category]) grouped[attack.category] = [];
        grouped[attack.category].push(attack);
      }
      return { attacks, grouped };
    },
    staleTime: 60_000,
  });
}
