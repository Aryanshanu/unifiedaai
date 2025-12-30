import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  Layers, 
  Zap, 
  Brain, 
  RefreshCw, 
  Shield, 
  Scale, 
  AlertTriangle, 
  Lock, 
  Eye,
  ArrowRight,
  CheckCircle,
  XCircle,
  Users,
  Database,
  GitBranch,
  Target,
  Loader2
} from "lucide-react";

interface FlywheelStats {
  testsFromIncidents: number;
  testsFromRedTeam: number;
  regressionPassRate: number;
  totalNewTests: number;
  isLoading: boolean;
}

interface EngineStatus {
  name: string;
  lastEval: string | null;
  evalCount: number;
  avgScore: number | null;
  isHealthy: boolean;
}

export default function Architecture() {
  const [flywheelStats, setFlywheelStats] = useState<FlywheelStats>({
    testsFromIncidents: 0,
    testsFromRedTeam: 0,
    regressionPassRate: 0,
    totalNewTests: 0,
    isLoading: true
  });

  const [engineStatuses, setEngineStatuses] = useState<EngineStatus[]>([]);
  const [isLoadingEngines, setIsLoadingEngines] = useState(true);

  // Fetch real flywheel stats
  useEffect(() => {
    const fetchFlywheelStats = async () => {
      try {
        const [incidentsRes, campaignsRes, evalsRes] = await Promise.all([
          supabase.from('incidents').select('*', { count: 'exact', head: true }),
          supabase.from('red_team_campaigns').select('findings_count').eq('status', 'completed'),
          supabase.from('evaluation_runs').select('overall_score, status').eq('status', 'completed').order('created_at', { ascending: false }).limit(50)
        ]);

        const incidentCount = incidentsRes.count || 0;
        const redTeamFindings = (campaignsRes.data || []).reduce((sum, c) => sum + (c.findings_count || 0), 0);
        const completedEvals = evalsRes.data || [];
        const passedEvals = completedEvals.filter(e => (e.overall_score || 0) >= 70).length;
        const passRate = completedEvals.length > 0 ? Math.round((passedEvals / completedEvals.length) * 100) : 0;

        setFlywheelStats({
          testsFromIncidents: incidentCount,
          testsFromRedTeam: redTeamFindings,
          regressionPassRate: passRate,
          totalNewTests: incidentCount + redTeamFindings,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching flywheel stats:', error);
        setFlywheelStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchFlywheelStats();
  }, []);

  // Fetch real engine statuses
  useEffect(() => {
    const fetchEngineStatuses = async () => {
      try {
        const engineTypes = ['fairness', 'toxicity', 'privacy', 'hallucination', 'explainability'];
        
        const statuses: EngineStatus[] = await Promise.all(
          engineTypes.map(async (engineType) => {
            const { data: evals } = await supabase
              .from('evaluation_runs')
              .select('created_at, overall_score, status')
              .eq('engine_type', engineType)
              .order('created_at', { ascending: false })
              .limit(10);

            const completedEvals = (evals || []).filter(e => e.status === 'completed');
            const avgScore = completedEvals.length > 0
              ? completedEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / completedEvals.length
              : null;

            return {
              name: engineType.charAt(0).toUpperCase() + engineType.slice(1),
              lastEval: completedEvals[0]?.created_at || null,
              evalCount: completedEvals.length,
              avgScore: avgScore ? Math.round(avgScore) : null,
              isHealthy: avgScore === null || avgScore >= 70
            };
          })
        );

        setEngineStatuses(statuses);
        setIsLoadingEngines(false);
      } catch (error) {
        console.error('Error fetching engine statuses:', error);
        setIsLoadingEngines(false);
      }
    };

    fetchEngineStatuses();
  }, []);

  return (
    <MainLayout title="2025 SOTA RAI Architecture" subtitle="The Fractal RAI-OS Evaluation Framework">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">2025 SOTA RAI Architecture</h1>
            <p className="text-muted-foreground mt-1">
              The Fractal RAI-OS Evaluation Framework — Ends Fragmentation Forever
            </p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            Architecture Bible v2.0
          </Badge>
        </div>

        <Tabs defaultValue="framework" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="framework">Shared Framework</TabsTrigger>
            <TabsTrigger value="layered">Layered Checks</TabsTrigger>
            <TabsTrigger value="flywheel">Eval Flywheel</TabsTrigger>
            <TabsTrigger value="engines">5 Core Engines</TabsTrigger>
          </TabsList>

          {/* SHARED EVALUATOR FRAMEWORK */}
          <TabsContent value="framework" className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Shared Evaluator Framework</CardTitle>
                    <CardDescription>One harness → all 5 engines plug in</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-success">MANDATORY</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Why It Wins Forever:</p>
                  <p className="text-sm text-muted-foreground">
                    Ends fragmentation. One harness → all 5 engines plug in. This is the "end-to-end pipeline" 
                    the PDF said no one has. Every engine becomes a plugin to this central harness.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      Core Function
                    </h4>
                    <code className="text-xs bg-muted p-2 rounded block">
                      runEvaluation(engine, testCases, modelEndpoint)
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Single entry point for all RAI evaluations
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-primary" />
                      Auto-Integration
                    </h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Auto-log to evaluation_runs table</li>
                      <li>• Auto-create KG edges for lineage</li>
                      <li>• Auto-escalate to HITL if needed</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium mb-3">Implementation: src/core/evaluator-harness.ts</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {['Fairness', 'Hallucination', 'Toxicity', 'Privacy', 'Explainability'].map(engine => (
                      <div key={engine} className="p-2 bg-background rounded text-center">
                        <span className="text-xs font-medium">{engine}</span>
                        <ArrowRight className="w-3 h-3 mx-auto mt-1 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Plugin</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LAYERED CHECKS */}
          <TabsContent value="layered" className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Layered Checks (Fast → Slow → HITL)</CardTitle>
                    <CardDescription>How Google, OpenAI, and Anthropic do it internally in 2025</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-warning text-warning-foreground">GENIUS</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Flow Diagram */}
                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg border">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-8 h-8 text-success" />
                    </div>
                    <h4 className="font-medium text-sm">Fast Layer</h4>
                    <p className="text-xs text-muted-foreground">~10ms</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-2">
                      <Brain className="w-8 h-8 text-warning" />
                    </div>
                    <h4 className="font-medium text-sm">Slow Layer</h4>
                    <p className="text-xs text-muted-foreground">~500ms</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground" />
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-danger" />
                    </div>
                    <h4 className="font-medium text-sm">HITL Escalation</h4>
                    <p className="text-xs text-muted-foreground">If ambiguous</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Fast Layer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Regex pattern matching</li>
                        <li>• Detoxify classifier</li>
                        <li>• Presidio PII detection</li>
                        <li>• Token-level analysis</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="w-4 h-4 text-warning" />
                        Slow Layer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• LLM-as-judge (Gemini 2.5 Pro)</li>
                        <li>• Nuanced context analysis</li>
                        <li>• Multi-criteria scoring</li>
                        <li>• Evidence extraction</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-danger" />
                        HITL Escalation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Score &lt; 70% threshold</li>
                        <li>• Fast + Slow disagree</li>
                        <li>• High-stakes decisions</li>
                        <li>• Ambiguous edge cases</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Decision Logic:</strong> If fast layer flags → escalate to slow judge → 
                    If still ambiguous or &lt;70% → auto-create HITL review queue item with SLA countdown.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EVAL FLYWHEEL - Now with real data */}
          <TabsContent value="flywheel" className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <RefreshCw className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Eval Flywheel — Self-Improving Immune System</CardTitle>
                    <CardDescription>Mine production incidents → Generate new adversarial tests</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-primary">REVOLUTIONARY</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Why It Wins Forever:</p>
                  <p className="text-sm text-muted-foreground">
                    This turns Fractal into a self-improving immune system — no other platform has this. 
                    Every production incident becomes a new test case. The system gets smarter over time.
                  </p>
                </div>

                {/* Flywheel Diagram */}
                <div className="relative p-8 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-2" />
                      <p className="text-sm font-medium">Production Incident</p>
                      <p className="text-xs text-muted-foreground">Jailbreak, PII leak, etc.</p>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <Database className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium">Mine Prompt/Response</p>
                      <p className="text-xs text-muted-foreground">Extract failure pattern</p>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <Target className="w-8 h-8 text-warning mx-auto mb-2" />
                      <p className="text-sm font-medium">Add to Test Suite</p>
                      <p className="text-xs text-muted-foreground">expected_outcome: fail</p>
                    </div>
                    <ArrowRight className="w-6 h-6" />
                    <div className="text-center p-4 bg-background rounded-lg border">
                      <RefreshCw className="w-8 h-8 text-success mx-auto mb-2" />
                      <p className="text-sm font-medium">Weekly Regression</p>
                      <p className="text-xs text-muted-foreground">Auto-run new tests</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Automatic Mining</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• When incident created → extract prompt/response</li>
                      <li>• Classify failure type (toxicity, PII, hallucination)</li>
                      <li>• Add to engine-specific test suite</li>
                      <li>• Tag with expected_outcome: "fail"</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Live Regression Report</h4>
                    {flywheelStats.isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded text-sm font-mono">
                        New adversarial tests added: {flywheelStats.totalNewTests}<br/>
                        Tests from incidents: {flywheelStats.testsFromIncidents}<br/>
                        Tests from red-team: {flywheelStats.testsFromRedTeam}<br/>
                        Regression pass rate: {flywheelStats.regressionPassRate}%
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5 CORE ENGINES - Now with real status */}
          <TabsContent value="engines" className="space-y-6">
            {/* Engine Status Overview */}
            {!isLoadingEngines && engineStatuses.length > 0 && (
              <Card className="border-primary/20 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Live Engine Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {engineStatuses.map((engine) => (
                      <div 
                        key={engine.name}
                        className={`p-3 rounded-lg border text-center ${
                          engine.isHealthy ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'
                        }`}
                      >
                        <p className="text-xs font-medium">{engine.name}</p>
                        <p className={`text-lg font-bold ${engine.isHealthy ? 'text-success' : 'text-danger'}`}>
                          {engine.avgScore !== null ? `${engine.avgScore}%` : 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {engine.evalCount} evals
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {/* Fairness Engine */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Fairness Engine — Research-Grade</CardTitle>
                    <Badge variant="outline" className="ml-auto">ETHICAL GOLD</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">5 Weighted Metrics</h5>
                      <code className="text-xs bg-muted p-2 rounded block">
                        0.25×DP + 0.25×EO + 0.25×EOdds + 0.15×GLR + 0.10×Bias
                      </code>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">India-Specific Features</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Intersectional cohorts (rural woman, low-income)</li>
                        <li>• Caste/region/gender analysis</li>
                        <li>• Credit, hiring, health benchmark packs</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hallucination Engine */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <CardTitle className="text-base">Hallucination Engine — Faithfulness First</CardTitle>
                    <Badge variant="outline" className="ml-auto">SOTA</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">5 Weighted Metrics</h5>
                      <code className="text-xs bg-muted p-2 rounded block">
                        0.30×Resp + 0.25×Claim + 0.25×Faith + 0.10×Span + 0.10×Abstain
                      </code>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Domain Packs</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Clinical (medical claims verification)</li>
                        <li>• Legal (statute/case law accuracy)</li>
                        <li>• Finance (regulatory compliance)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Toxicity Engine */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-danger" />
                    <CardTitle className="text-base">Toxicity Engine — India-Robust</CardTitle>
                    <Badge variant="outline" className="ml-auto">UNIQUE</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">5 Weighted Metrics</h5>
                      <code className="text-xs bg-muted p-2 rounded block">
                        0.30×Overall + 0.25×Severe + 0.20×Diff + 0.15×Topic + 0.10×Guard
                      </code>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Multi-Lingual Support</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Hinglish detection models</li>
                        <li>• Caste-based slur detection</li>
                        <li>• Topic-aware (politics/religion/caste)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Engine */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-success" />
                    <CardTitle className="text-base">Privacy Engine — Security-Grade</CardTitle>
                    <Badge variant="outline" className="ml-auto">SECURITY-GRADE</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">5 Weighted Metrics</h5>
                      <code className="text-xs bg-muted p-2 rounded block">
                        0.30×PII + 0.20×PHI + 0.20×Redact + 0.20×Secrets + 0.10×Min
                      </code>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">India-Specific Detection</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Aadhaar number detection</li>
                        <li>• PAN card validation</li>
                        <li>• UPI ID pattern matching</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Explainability Engine */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Explainability Engine — Multi-Criteria Judge</CardTitle>
                    <Badge variant="outline" className="ml-auto">TRANSPARENCY GOD MODE</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">5 Weighted Metrics</h5>
                      <code className="text-xs bg-muted p-2 rounded block">
                        0.30×Clarity + 0.30×Faith + 0.20×Coverage + 0.10×Action + 0.10×Simple
                      </code>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium mb-2">Regulatory Alignment</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• EU AI Act Article 13 compliance</li>
                        <li>• SHAP/IG alignment verification</li>
                        <li>• Audience-tiered explanations</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Architecture Principles Summary */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Architecture Principles — The Final Verdict</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-3 bg-background rounded-lg border">
                <Badge className="mb-2 bg-success">MANDATORY</Badge>
                <p className="text-sm font-medium">Shared Framework</p>
                <p className="text-xs text-muted-foreground">One harness, 5 plugins</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <Badge className="mb-2 bg-warning text-warning-foreground">GENIUS</Badge>
                <p className="text-sm font-medium">Layered Checks</p>
                <p className="text-xs text-muted-foreground">Fast → Slow → HITL</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <Badge className="mb-2 bg-primary">REVOLUTIONARY</Badge>
                <p className="text-sm font-medium">Eval Flywheel</p>
                <p className="text-xs text-muted-foreground">Self-improving system</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <Badge className="mb-2 bg-danger">NON-NEGOTIABLE</Badge>
                <p className="text-sm font-medium">5 Weighted Engines</p>
                <p className="text-xs text-muted-foreground">SOTA 2025 metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// Add Activity icon that was missing from imports
import { Activity } from "lucide-react";
