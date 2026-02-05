import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ScanSearch, 
  FlaskConical, 
  Target, 
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSecurityStats } from '@/hooks/useSecurityStats';
import { useSecurityFindings } from '@/hooks/useSecurityFindings';
import { SecurityPostureGauge } from '@/components/security/SecurityPostureGauge';
import { OWASPCoverageChart } from '@/components/security/OWASPCoverageChart';
import { FindingCard } from '@/components/security/FindingCard';

export default function SecurityDashboard() {
  const { data: stats, isLoading: statsLoading } = useSecurityStats();
  const { findings, isLoading: findingsLoading, updateFinding } = useSecurityFindings();

  const recentFindings = findings.slice(0, 5);

  const quickActions = [
    { label: 'AI Pentesting', path: '/security/pentesting', icon: ScanSearch, color: 'bg-blue-500' },
    { label: 'Jailbreak Lab', path: '/security/jailbreak-lab', icon: FlaskConical, color: 'bg-purple-500' },
    { label: 'Threat Model', path: '/security/threat-modeling', icon: Target, color: 'bg-orange-500' },
  ];

  const handleStatusChange = (id: string, status: string) => {
    updateFinding.mutate({ id, updates: { status: status as any } });
  };

  return (
    <MainLayout title="AI Security Studio" subtitle="Enterprise-grade AI security testing and threat modeling">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              AI Security Studio
            </h1>
            <p className="text-muted-foreground">
              Enterprise-grade AI security testing and threat modeling
            </p>
          </div>
          <div className="flex gap-2">
            {quickActions.map((action) => (
              <Button key={action.path} asChild variant="outline">
                <Link to={action.path}>
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Security Posture */}
          <SecurityPostureGauge score={stats?.securityScore || 0} />

          {/* Findings Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Findings Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Critical</span>
                  <Badge variant="destructive">{stats?.criticalFindings || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">High</span>
                  <Badge className="bg-orange-500">{stats?.highFindings || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Medium</span>
                  <Badge className="bg-yellow-500">{stats?.mediumFindings || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Low</span>
                  <Badge className="bg-blue-500">{stats?.lowFindings || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Test Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {(stats?.averageCoverage || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Test Runs</span>
                  <span className="font-medium">{stats?.totalTestRuns || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="font-medium text-green-600">{stats?.completedTestRuns || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Security Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Open Findings</span>
                  <span className="font-bold text-red-500">{stats?.openFindings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mitigated</span>
                  <span className="font-bold text-green-500">{stats?.mitigatedFindings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Attack Patterns</span>
                  <span className="font-bold">{stats?.totalAttacks || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Threat Models</span>
                  <span className="font-bold">{stats?.totalThreatModels || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OWASP Coverage & Recent Findings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OWASPCoverageChart coverage={stats?.owaspCoverage || {}} />

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Findings</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/security/pentesting">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {findingsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentFindings.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldCheck className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">No security findings</p>
                  <p className="text-sm text-muted-foreground">Run a security scan to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${action.color} text-white`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium">{action.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.path === '/security/pentesting' && 'OWASP LLM Top 10 scanning'}
                        {action.path === '/security/jailbreak-lab' && 'Adversarial attack testing'}
                        {action.path === '/security/threat-modeling' && 'Multi-framework analysis'}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
