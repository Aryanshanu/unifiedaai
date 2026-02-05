import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SecurityStats {
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  openFindings: number;
  mitigatedFindings: number;
  totalTestRuns: number;
  completedTestRuns: number;
  averageCoverage: number;
  totalAttacks: number;
  totalThreatModels: number;
  securityScore: number;
  owaspCoverage: Record<string, number>;
}

export function useSecurityStats() {
  const queryClient = useQueryClient();

  // Add realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('security-stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_findings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['security-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_test_runs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['security-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['security-stats'],
    queryFn: async (): Promise<SecurityStats> => {
      // Fetch findings stats
      const { data: findings, error: findingsError } = await supabase
        .from('security_findings')
        .select('severity, status');
      
      if (findingsError) throw findingsError;

      // Fetch test runs
      const { data: testRuns, error: testRunsError } = await supabase
        .from('security_test_runs')
        .select('status, coverage_percentage');
      
      if (testRunsError) throw testRunsError;

      // Fetch attack library count
      const { count: attackCount, error: attackError } = await supabase
        .from('attack_library')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (attackError) throw attackError;

      // Fetch threat models count
      const { count: threatModelCount, error: threatError } = await supabase
        .from('threat_models')
        .select('id', { count: 'exact', head: true });
      
      if (threatError) throw threatError;

      // Fetch systems count for score calculation
      const { count: systemsCount, error: systemsError } = await supabase
        .from('systems')
        .select('id', { count: 'exact', head: true });
      
      if (systemsError) throw systemsError;

      // Calculate stats
      const criticalFindings = findings?.filter(f => f.severity === 'critical').length || 0;
      const highFindings = findings?.filter(f => f.severity === 'high').length || 0;
      const mediumFindings = findings?.filter(f => f.severity === 'medium').length || 0;
      const lowFindings = findings?.filter(f => f.severity === 'low').length || 0;
      const openFindings = findings?.filter(f => f.status === 'open').length || 0;
      const mitigatedFindings = findings?.filter(f => f.status === 'mitigated').length || 0;

      const completedTestRuns = testRuns?.filter(r => r.status === 'completed').length || 0;
      const coverages = testRuns?.filter(r => r.coverage_percentage != null).map(r => r.coverage_percentage) || [];
      const averageCoverage = coverages.length > 0 
        ? coverages.reduce((a, b) => (a || 0) + (b || 0), 0) / coverages.length 
        : 0;

      // Calculate OWASP coverage based on actual test execution rate per category
      // Coverage = (tests executed in category / total tests available) * 100
      // We use a more realistic formula: coverage is based on test runs with findings
      const owaspCategories = ['LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10'];
      const owaspCoverage: Record<string, number> = {};
      const testsPerCategory = 5; // Expected tests per OWASP category
      
      owaspCategories.forEach(cat => {
        const catFindings = findings?.filter(f => (f as any).owasp_category === cat) || [];
        // Coverage = min(100, (findings / expected tests) * 100)
        // This ensures we don't exceed 100% and provides realistic coverage
        const rawCoverage = (catFindings.length / testsPerCategory) * 100;
        owaspCoverage[cat] = Math.min(100, Math.round(rawCoverage));
      });

      // Calculate security posture score (documented formula based on CVSS-inspired approach)
      // Formula: Base(40) + Coverage Bonus(0-30) - Risk Penalty(0-40) + System Maturity(0-20)
      // 
      // Components:
      // - Base score: 40 (represents minimal security baseline)
      // - Coverage bonus: (averageCoverage / 100) * 30 (max 30 points for 100% coverage)
      // - Risk penalty: critical * 10 + high * 5 + medium * 2 (capped at 40)
      // - System maturity: min(systemsCount * 4, 20) (more systems = more mature security program)
      const baseScore = 40;
      const coverageBonus = Math.min((averageCoverage / 100) * 30, 30);
      const riskPenalty = Math.min(criticalFindings * 10 + highFindings * 5 + mediumFindings * 2, 40);
      const maturityBonus = Math.min((systemsCount || 0) * 4, 20);
      
      // Final score: base + bonuses - penalties, clamped to 0-100
      const securityScore = Math.max(0, Math.min(100, 
        baseScore + coverageBonus - riskPenalty + maturityBonus
      ));

      return {
        totalFindings: findings?.length || 0,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        openFindings,
        mitigatedFindings,
        totalTestRuns: testRuns?.length || 0,
        completedTestRuns,
        averageCoverage,
        totalAttacks: attackCount || 0,
        totalThreatModels: threatModelCount || 0,
        securityScore,
        owaspCoverage,
      };
    },
    refetchInterval: 30000,
  });
}
