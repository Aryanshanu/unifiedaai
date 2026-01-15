import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Rocket, 
  Settings, 
  Activity, 
  Shield, 
  Scale,
  FileText,
  Database,
  Users,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Lock,
  Brain,
  Target,
  GitBranch,
  BarChart3,
  FileCheck,
  Layers
} from "lucide-react";

const Documentation = () => {
  return (
    <MainLayout title="Documentation" subtitle="Complete guide to Fractal RAI-OS">
      <div className="min-h-screen bg-background">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Documentation</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Fractal RAI-OS
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The world's first end-to-end Responsible AI Operating System
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Badge variant="outline">v1.0.0</Badge>
                <Badge variant="secondary">Open Source</Badge>
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">MIT License</Badge>
              </div>
            </div>

            <Separator className="mb-12" />

            {/* Table of Contents */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Table of Contents
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <a href="#overview" className="block text-muted-foreground hover:text-foreground transition-colors">1. Overview</a>
                  <a href="#quick-start" className="block text-muted-foreground hover:text-foreground transition-colors">2. Quick Start</a>
                  <a href="#architecture" className="block text-muted-foreground hover:text-foreground transition-colors">3. Architecture</a>
                  <a href="#configure" className="block text-muted-foreground hover:text-foreground transition-colors">4. Configure</a>
                  <a href="#monitor" className="block text-muted-foreground hover:text-foreground transition-colors">5. Monitor</a>
                </div>
                <div className="space-y-2">
                  <a href="#govern" className="block text-muted-foreground hover:text-foreground transition-colors">6. Govern</a>
                  <a href="#evaluate" className="block text-muted-foreground hover:text-foreground transition-colors">7. Evaluate</a>
                  <a href="#respond" className="block text-muted-foreground hover:text-foreground transition-colors">8. Respond</a>
                  <a href="#impact" className="block text-muted-foreground hover:text-foreground transition-colors">9. Impact</a>
                  <a href="#faq" className="block text-muted-foreground hover:text-foreground transition-colors">10. FAQ</a>
                </div>
              </div>
            </section>

            {/* Overview */}
            <section id="overview" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                1. Overview
              </h2>
              
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p className="text-lg text-muted-foreground mb-6">
                  Fractal RAI-OS provides everything you need to build, deploy, and govern AI systems that are <strong>safe</strong>, <strong>fair</strong>, <strong>transparent</strong>, and <strong>compliant</strong>.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Safe
                    </h4>
                    <p className="text-sm text-muted-foreground">Protected against harmful outputs, adversarial attacks, and jailbreaks</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-500" />
                      Fair
                    </h4>
                    <p className="text-sm text-muted-foreground">Free from discriminatory bias across all demographic groups</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      Transparent
                    </h4>
                    <p className="text-sm text-muted-foreground">Every decision is explainable with full audit trails</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-orange-500" />
                      Compliant
                    </h4>
                    <p className="text-sm text-muted-foreground">Aligned with EU AI Act, NIST AI RMF, and other regulations</p>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-8 mb-4">Who is this for?</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Role</th>
                        <th className="text-left py-3 px-4 font-medium">Primary Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">AI/ML Engineer</td>
                        <td className="py-3 px-4 text-muted-foreground">Model registry, evaluation engines, observability</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Data Scientist</td>
                        <td className="py-3 px-4 text-muted-foreground">Fairness metrics, data quality, explainability</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Compliance Officer</td>
                        <td className="py-3 px-4 text-muted-foreground">Regulatory reports, attestations, control frameworks</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Product Manager</td>
                        <td className="py-3 px-4 text-muted-foreground">Impact dashboard, decision ledger, governance</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">CISO / Risk Manager</td>
                        <td className="py-3 px-4 text-muted-foreground">Risk assessments, approvals, incident management</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Quick Start */}
            <section id="quick-start" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                2. Quick Start
              </h2>
              
              <p className="text-muted-foreground mb-8">Get up and running in 5 minutes</p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
                  <div>
                    <h4 className="font-medium mb-1">Create a Project</h4>
                    <p className="text-sm text-muted-foreground">Navigate to <code className="px-1.5 py-0.5 bg-muted rounded text-xs">Configure → Projects</code> and click <strong>Create Project</strong></p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">2</div>
                  <div>
                    <h4 className="font-medium mb-1">Register a Model</h4>
                    <p className="text-sm text-muted-foreground">Go to <code className="px-1.5 py-0.5 bg-muted rounded text-xs">Configure → Models</code> and import from Hugging Face or register manually</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">3</div>
                  <div>
                    <h4 className="font-medium mb-1">Run an Evaluation</h4>
                    <p className="text-sm text-muted-foreground">Visit any <code className="px-1.5 py-0.5 bg-muted rounded text-xs">Evaluate</code> engine and click <strong>Run Evaluation</strong></p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">4</div>
                  <div>
                    <h4 className="font-medium mb-1">Review Results</h4>
                    <p className="text-sm text-muted-foreground">Check the <code className="px-1.5 py-0.5 bg-muted rounded text-xs">Decision Ledger</code> for your evaluation with full audit trail</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">5</div>
                  <div>
                    <h4 className="font-medium mb-1">Generate Reports</h4>
                    <p className="text-sm text-muted-foreground">Go to <code className="px-1.5 py-0.5 bg-muted rounded text-xs">Impact → Regulatory Reports</code> to generate compliance documentation</p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Architecture */}
            <section id="architecture" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Layers className="h-5 w-5" />
                3. Architecture
              </h2>

              <h3 className="text-lg font-medium mb-4">Hierarchy: Project → System → Model</h3>
              
              <div className="p-4 rounded-lg border bg-muted/30 font-mono text-sm mb-6">
                <div>Project <span className="text-muted-foreground">(e.g., "Loan Approval AI")</span></div>
                <div className="ml-4">├── System <span className="text-muted-foreground">(e.g., "Credit Scoring API")</span></div>
                <div className="ml-8">├── Model <span className="text-muted-foreground">(e.g., "XGBoost v2.1")</span></div>
                <div className="ml-8">├── Risk Assessment</div>
                <div className="ml-8">├── Impact Assessment</div>
                <div className="ml-8">└── Approval Workflow</div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Project</h4>
                  <p className="text-sm text-muted-foreground">Top-level container grouping related AI systems. Includes metadata, compliance frameworks, and data sensitivity classification.</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">System</h4>
                  <p className="text-sm text-muted-foreground">Deployed AI component with API endpoint, runtime governance, request logging, and policy enforcement.</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Model</h4>
                  <p className="text-sm text-muted-foreground">AI/ML model metadata including type, evaluation scores, and version history.</p>
                </div>
              </div>

              <h3 className="text-lg font-medium mt-8 mb-4">Risk Tiers</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Tier</th>
                      <th className="text-left py-3 px-4 font-medium">Approval Required</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4"><Badge variant="outline" className="bg-green-500/10 text-green-600">Low</Badge></td>
                      <td className="py-3 px-4">No</td>
                      <td className="py-3 px-4 text-muted-foreground">Minimal risk, non-critical systems</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4"><Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Medium</Badge></td>
                      <td className="py-3 px-4">No</td>
                      <td className="py-3 px-4 text-muted-foreground">Moderate risk, internal use</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4"><Badge variant="outline" className="bg-orange-500/10 text-orange-600">High</Badge></td>
                      <td className="py-3 px-4">Yes</td>
                      <td className="py-3 px-4 text-muted-foreground">Significant risk, customer-facing</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4"><Badge variant="outline" className="bg-red-500/10 text-red-600">Critical</Badge></td>
                      <td className="py-3 px-4">Yes (dual)</td>
                      <td className="py-3 px-4 text-muted-foreground">Highest risk, regulated decisions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Configure */}
            <section id="configure" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                4. Configure
              </h2>

              <div className="space-y-8">
                {/* Projects */}
                <div>
                  <h3 className="text-lg font-medium mb-4">4.1 Projects</h3>
                  <p className="text-muted-foreground mb-4">Create and manage AI initiatives with unified governance.</p>
                  
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Field</th>
                          <th className="text-left py-3 px-4 font-medium">Description</th>
                          <th className="text-left py-3 px-4 font-medium">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-mono text-xs">name</td>
                          <td className="py-3 px-4 text-muted-foreground">Project identifier</td>
                          <td className="py-3 px-4">"Loan Approval System"</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-mono text-xs">environment</td>
                          <td className="py-3 px-4 text-muted-foreground">Deployment stage</td>
                          <td className="py-3 px-4">Development, Staging, Production</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-mono text-xs">data_sensitivity</td>
                          <td className="py-3 px-4 text-muted-foreground">Privacy classification</td>
                          <td className="py-3 px-4">Low, Medium, High, Critical</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-mono text-xs">compliance_frameworks</td>
                          <td className="py-3 px-4 text-muted-foreground">Applicable regulations</td>
                          <td className="py-3 px-4">EU AI Act, NIST AI RMF</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Models */}
                <div>
                  <h3 className="text-lg font-medium mb-4">4.2 Models</h3>
                  <p className="text-muted-foreground mb-4">Register AI models for governance and evaluation.</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Import from Hugging Face</h4>
                      <p className="text-sm text-muted-foreground">Fastest method. Enter model ID and inference endpoint URL.</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Manual Registration</h4>
                      <p className="text-sm text-muted-foreground">Full control. Enter metadata, API endpoint, and governance fields.</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <strong>Model Types:</strong> LLM, Classification, Regression, NER, Embedding, Custom
                  </p>
                </div>

                {/* Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">4.3 Settings</h3>
                  <p className="text-muted-foreground mb-4">Configure organization, users, security, and notifications.</p>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>General:</strong> Organization name, timezone, data retention</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>Users & Teams:</strong> Add members, assign roles, manage permissions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span><strong>API Keys:</strong> Manage provider keys (OpenAI, Anthropic, etc.)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Monitor */}
            <section id="monitor" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                5. Monitor
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">5.1 Observability</h3>
                  <p className="text-muted-foreground mb-4">Real-time telemetry and drift detection for all AI systems.</p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Request Volume</h4>
                      <p className="text-sm text-muted-foreground">Track requests per minute across all models</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Latency</h4>
                      <p className="text-sm text-muted-foreground">P50, P95, P99 response times</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Drift Detection</h4>
                      <p className="text-sm text-muted-foreground">Statistical drift in inputs/outputs</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">5.2 Alerts</h3>
                  <p className="text-muted-foreground mb-4">Configure thresholds and notification channels.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Alert Type</th>
                          <th className="text-left py-3 px-4 font-medium">Trigger</th>
                          <th className="text-left py-3 px-4 font-medium">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">Drift Alert</td>
                          <td className="py-3 px-4 text-muted-foreground">Statistical drift exceeds threshold</td>
                          <td className="py-3 px-4"><Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Warning</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Latency Alert</td>
                          <td className="py-3 px-4 text-muted-foreground">P99 latency exceeds SLA</td>
                          <td className="py-3 px-4"><Badge variant="outline" className="bg-orange-500/10 text-orange-600">High</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">Toxicity Alert</td>
                          <td className="py-3 px-4 text-muted-foreground">Harmful content detected</td>
                          <td className="py-3 px-4"><Badge variant="outline" className="bg-red-500/10 text-red-600">Critical</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Govern */}
            <section id="govern" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                6. Govern
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">6.1 Approvals</h3>
                  <p className="text-muted-foreground mb-4">Deployment approval workflows for high-risk systems.</p>
                  <p className="text-sm text-muted-foreground">
                    Systems with <code className="px-1.5 py-0.5 bg-muted rounded text-xs">risk_tier = High/Critical</code> require explicit approval before deployment.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">6.2 Decision Ledger</h3>
                  <p className="text-muted-foreground mb-4">Immutable audit trail of all AI decisions with hash chains.</p>
                  
                  <div className="p-4 rounded-lg border bg-muted/30 font-mono text-sm mb-4">
                    <div><span className="text-muted-foreground">record_hash</span> = SHA256(current_record_data)</div>
                    <div><span className="text-muted-foreground">previous_hash</span> = hash of prior record</div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    If anyone modifies a record, the chain breaks — detected automatically.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">6.3 HITL Console</h3>
                  <p className="text-muted-foreground mb-4">Human-in-the-loop review queue for flagged decisions.</p>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Review low-confidence predictions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <span>Handle edge cases and appeals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Approve, reject, or escalate decisions</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">6.4 Incidents</h3>
                  <p className="text-muted-foreground mb-4">Track and resolve safety and compliance incidents.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">6.5 Knowledge Graph</h3>
                  <p className="text-muted-foreground mb-4">Entity lineage and relationship visualization across your AI ecosystem.</p>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Evaluate */}
            <section id="evaluate" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Target className="h-5 w-5" />
                7. Evaluate
              </h2>

              <p className="text-muted-foreground mb-8">
                Six specialized engines for comprehensive RAI assessment. Each engine provides transparency with InputOutputScope, ComputationBreakdown, RawDataLog, and EvidencePackage.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-500" />
                    Fairness Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Measures demographic parity, equalized odds, and disparate impact.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> Statistical Parity, Equal Opportunity, Predictive Equality
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Hallucination Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Detects factual errors, unsupported claims, and false information.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> Factuality, Groundedness, Consistency
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Toxicity Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Identifies harmful content, hate speech, and jailbreak attempts.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> Toxicity Score, Jailbreak Resistance, Safety
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    Privacy Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Detects PII exposure, data leakage, and memorization risks.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> PII Detection, Leakage Score, Memorization
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-orange-500" />
                    Explainability Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Evaluates reasoning quality and decision transparency.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> Reasoning Quality, Feature Attribution, Counterfactuals
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4 text-cyan-500" />
                    Data Quality Engine
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">Measures completeness, validity, freshness, and uniqueness.</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Metrics:</strong> Completeness, Validity, Freshness, Uniqueness
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-lg border bg-red-500/5 border-red-500/20">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Non-Compliant Warning
                </h4>
                <p className="text-sm text-muted-foreground">
                  When any score falls below 70%, a red NON-COMPLIANT warning is displayed with EU AI Act article references.
                </p>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Respond */}
            <section id="respond" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                8. Respond
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">8.1 Policy Studio</h3>
                  <p className="text-muted-foreground mb-4">Define runtime guardrails using Policy DSL.</p>
                  
                  <div className="p-4 rounded-lg border bg-muted/30 font-mono text-sm">
                    <div className="text-muted-foreground"># Example policy</div>
                    <div>BLOCK IF toxicity_score &gt; 0.8</div>
                    <div>WARN IF fairness_score &lt; 0.7</div>
                    <div>REQUIRE_APPROVAL IF risk_tier == "critical"</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">8.2 Data Contracts</h3>
                  <p className="text-muted-foreground mb-4">Define and enforce dataset quality expectations.</p>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Schema expectations (columns, types, constraints)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Quality thresholds (completeness, validity)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>PII guarantees (no SSN, no credit cards)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">8.3 Golden Demo</h3>
                  <p className="text-muted-foreground mb-4">End-to-end proof of platform capabilities with automated test flows.</p>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Impact */}
            <section id="impact" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                9. Impact
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">9.1 Impact Dashboard</h3>
                  <p className="text-muted-foreground mb-4">Track population-level fairness and harm across demographic groups.</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Decision Outcomes</h4>
                      <p className="text-sm text-muted-foreground">Track approval/denial rates by demographic group</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Appeal Analysis</h4>
                      <p className="text-sm text-muted-foreground">Monitor appeal rates and resolution outcomes</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">9.2 Regulatory Reports</h3>
                  <p className="text-muted-foreground mb-4">Generate compliance documentation for regulators.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Report Type</th>
                          <th className="text-left py-3 px-4 font-medium">Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">EU AI Act Conformity</td>
                          <td className="py-3 px-4 text-muted-foreground">Article 11 technical documentation</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Impact Assessment</td>
                          <td className="py-3 px-4 text-muted-foreground">FRIA (Fundamental Rights Impact Assessment)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">Bias Audit</td>
                          <td className="py-3 px-4 text-muted-foreground">NYC Local Law 144 compliance</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">Transparency Report</td>
                          <td className="py-3 px-4 text-muted-foreground">Public disclosure of AI usage</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* FAQ */}
            <section id="faq" className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                10. FAQ
              </h2>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">What is a "score" and how is it calculated?</h4>
                  <p className="text-sm text-muted-foreground">
                    Each evaluation engine computes a score (0-100) based on mathematical formulas from AIF360 and other open-source libraries. The raw inputs, computation steps, and evidence are always shown for full transparency.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">What does "NON-COMPLIANT" mean?</h4>
                  <p className="text-sm text-muted-foreground">
                    When a score falls below 70%, the system displays a red warning indicating the model does not meet minimum RAI standards. This is intentional — we never sugarcoat failures.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Do I need API keys?</h4>
                  <p className="text-sm text-muted-foreground">
                    For most features, no. Fractal RAI-OS uses local open-source libraries. If you want to use external LLMs (OpenAI, Anthropic), you'll need to configure API keys in Settings.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Is my data stored securely?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes. All evaluation data is encrypted at rest and in transit. Hash chains ensure tamper-proof audit trails. Data is auto-deleted after 90 days (GDPR compliance).
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Can I export reports?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes. Every evaluation generates an Evidence Package (JSON with SHA-256 hash) and reports can be exported as PDF from the Regulatory Reports page.
                  </p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <Separator className="mb-8" />
            <div className="text-center text-sm text-muted-foreground">
              <p>Fractal RAI-OS — Build with honesty, transparency, and passion.</p>
              <p className="mt-2">MIT License • 100% Open Source • Zero Cloud Dependencies</p>
            </div>

          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default Documentation;
