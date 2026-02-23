import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSecurityTestRuns(modelId?: string) {
  return useQuery({
    queryKey: ['security-test-runs', modelId],
    queryFn: async () => {
      let query = supabase
        .from('security_test_runs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by model_id stored inside summary jsonb if provided
      // Since there's no model_id column, we fetch all and filter client-side
      const { data, error } = await query;
      if (error) throw error;
      const runs = (data as any[]) ?? [];

      if (modelId) {
        return runs.filter((r: any) => r.summary?.model_id === modelId);
      }
      return runs;
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

      // Extract scores from summary jsonb
      const getScore = (run: any): number | null => {
        return run.summary?.overall_score ?? null;
      };
      const getRiskLevel = (run: any): string | null => {
        return run.summary?.risk_level ?? null;
      };

      const pentestRuns = allRuns.filter((r: any) => r.test_type === 'pentest');
      const jailbreakRuns = allRuns.filter((r: any) => r.test_type === 'jailbreak');
      const threatRuns = allRuns.filter((r: any) => r.test_type === 'threat_model');

      const pentestScores = pentestRuns.map(getScore).filter((s): s is number => s != null);
      const jailbreakScores = jailbreakRuns.map(getScore).filter((s): s is number => s != null);
      const threatScores = threatRuns.map(getScore).filter((s): s is number => s != null);

      const avgVulnScore = pentestScores.length > 0
        ? pentestScores.reduce((a, b) => a + b, 0) / pentestScores.length
        : null;
      const avgResistance = jailbreakScores.length > 0
        ? (jailbreakScores.reduce((a, b) => a + b, 0) / jailbreakScores.length) * 100
        : null;
      const avgThreatScore = threatScores.length > 0
        ? threatScores.reduce((a, b) => a + b, 0) / threatScores.length
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