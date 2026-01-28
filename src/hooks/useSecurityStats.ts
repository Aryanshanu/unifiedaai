import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      // Calculate OWASP coverage
      const owaspCategories = ['LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10'];
      const owaspCoverage: Record<string, number> = {};
      owaspCategories.forEach(cat => {
        const catFindings = findings?.filter(f => f.severity && (f as any).owasp_category === cat) || [];
        owaspCoverage[cat] = catFindings.length > 0 ? Math.min(100, catFindings.length * 20) : 0;
      });

      // Calculate security posture score
      const systemsScore = Math.min((systemsCount || 0) * 5, 40);
      const coverageScore = Math.min(averageCoverage / 2, 30);
      const riskPenalty = Math.min(criticalFindings * 10 + highFindings * 5, 40);
      const securityScore = Math.max(0, Math.min(100, systemsScore + coverageScore - riskPenalty + 30));

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
