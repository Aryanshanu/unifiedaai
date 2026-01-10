import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';
import GovernanceWorkflowDiagram from '@/components/governance/GovernanceWorkflowDiagram';
import { GovernanceCoverageBadge } from '@/components/dashboard/GovernanceHealthCards';
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  Shield, 
  Scale,
  FileText,
  AlertTriangle,
  Workflow
} from 'lucide-react';

interface RebrandGate {
  id: string;
  name: string;
  requirement: string;
  current: string;
  met: boolean;
}

export default function TargetState() {
  const { data: metrics } = useGovernanceMetrics();

  const rebrandGates: RebrandGate[] = [
    {
      id: 'phase2-live',
      name: 'Phase 2 Live',
      requirement: 'decision_ledger has real records',
      current: `${metrics?.totalDecisions || 0} records`,
      met: (metrics?.totalDecisions || 0) > 0,
    },
    {
      id: 'explanation-coverage',
      name: 'Explanation Coverage',
      requirement: '≥ 95% decisions have explanations',
      current: `${metrics?.explanationRate || 0}%`,
      met: (metrics?.explanationRate || 0) >= 95,
    },
    {
      id: 'appeals-functional',
      name: 'Appeals Functional',
      requirement: 'Appeals can be submitted and resolved',
      current: `${metrics?.totalAppeals || 0} appeals processed`,
      met: (metrics?.resolvedAppeals || 0) > 0,
    },
    {
      id: 'phase3-live',
      name: 'Phase 3 Live',
      requirement: 'deployment_attestations populated',
      current: `${metrics?.totalDeployments || 0} attestations`,
      met: (metrics?.totalDeployments || 0) > 0,
    },
    {
      id: 'hash-enforcement',
      name: 'Hash Enforcement',
      requirement: 'Hash mismatches BLOCK deployments',
      current: metrics?.blockedDeployments ? `${metrics.blockedDeployments} blocked` : 'Not verified',
      met: false, // Requires manual verification
    },
    {
      id: 'bypass-tracking',
      name: 'Bypass Tracking',
      requirement: 'Bypass count tracked (even if zero)',
      current: `${metrics?.governanceBypasses || 0} bypasses tracked`,
      met: true, // Always tracking once table exists
    },
    {
      id: 'phase4-live',
      name: 'Phase 4 Live',
      requirement: 'At least one outcome tracked',
      current: `${metrics?.outcomesTracked || 0} outcomes`,
      met: (metrics?.outcomesTracked || 0) > 0,
    },
    {
      id: 'harm-taxonomy',
      name: 'Harm Taxonomy Used',
      requirement: 'Harm classification applied',
      current: `${metrics?.harmfulOutcomes || 0} classified`,
      met: (metrics?.harmfulOutcomes || 0) > 0 || (metrics?.outcomesTracked || 0) > 0,
    },
  ];

  const gatesMet = rebrandGates.filter(g => g.met).length;
  const allGatesMet = gatesMet === rebrandGates.length;

  return (
    <MainLayout
      title="Target State Specification"
      subtitle="Fractal Unified Governance OS — v1"
      headerActions={
        <GovernanceCoverageBadge rate={metrics?.governanceCoverageRate || 0} />
      }
    >
      <div className="space-y-8">
        {/* Vision Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Vision Statement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <blockquote className="border-l-4 border-primary pl-4 italic text-lg">
              {allGatesMet ? (
                "An open, unified AI governance operating system enforcing accountability across the AI lifecycle: data → model → system → decision → outcome → audit."
              ) : (
                "An open, unified AI governance operating system designed to enforce accountability across the AI lifecycle: data → model → system → decision → outcome → audit."
              )}
            </blockquote>
            {!allGatesMet && (
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> The word "designed to enforce" will change to "enforcing" once all Rebrand Gate criteria are met.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Architecture Principles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Architecture Principles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: '100% Open Source', desc: 'MIT/Apache licenses only. No proprietary dependencies.' },
                { title: 'Zero Cost', desc: 'No paid APIs, no cloud lock-in. Self-hostable.' },
                { title: 'Full Transparency', desc: 'Every score shows raw inputs, computation steps, and evidence.' },
                { title: 'No Sugarcoating', desc: 'Failures highlighted with clear NON-COMPLIANT warnings.' },
                { title: 'Hash-Chain Immutability', desc: 'Audit trail cannot be tampered. Cryptographic proof.' },
                { title: 'Fail-Closed', desc: 'Unknown governance state → block. No silent failures.' },
              ].map((principle) => (
                <div key={principle.title} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{principle.title}</h4>
                  <p className="text-sm text-muted-foreground">{principle.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Governance Coverage Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Governance Coverage Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GovernanceWorkflowDiagram />
          </CardContent>
        </Card>

        {/* Rebrand Gate Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Rebrand Gate Criteria
              <Badge variant={allGatesMet ? 'default' : 'secondary'}>
                {gatesMet}/{rebrandGates.length} met
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fractal may officially use "enforcing accountability" (not "designed to enforce") only when ALL criteria are met:
            </p>
            <div className="space-y-3">
              {rebrandGates.map((gate) => (
                <div 
                  key={gate.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    gate.met ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-muted'
                  }`}
                >
                  {gate.met ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{gate.name}</span>
                      <Badge variant={gate.met ? 'default' : 'outline'} className="text-xs">
                        {gate.current}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{gate.requirement}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Regulatory Alignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Regulatory Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">EU AI Act</h4>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Article 9: Risk Management System → Impact Assessments</li>
                  <li>• Article 10: Data Quality → Data Contracts & Quality Scoring</li>
                  <li>• Article 13: Transparency → Decision Explanations</li>
                  <li>• Article 14: Human Oversight → HITL Console & Appeals</li>
                  <li>• Article 15: Accuracy & Robustness → RAI Evaluation Engines</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">GDPR</h4>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Article 22: Automated Decision-Making → Decision Ledger</li>
                  <li>• Article 17: Right to Erasure → 90-day auto-deletion</li>
                  <li>• Article 35: DPIA → Impact Assessment Wizard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current State Warning */}
        {!allGatesMet && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Current State Advisory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                This platform is in active development. Governance flows exist in code but have limited live data. 
                The platform uses "designed to enforce" language until all Rebrand Gate criteria are met with real operational data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
