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
  Layers,
  ArrowRight,
  Clock,
  Hash,
  Play,
  Upload,
  Download,
  ChevronRight,
  Terminal,
  Workflow,
  CircleDot,
  Info,
  Lightbulb,
  Search,
  Filter,
  Bell,
  Mail,
  Key,
  Globe,
  Building,
  UserPlus,
  ShieldCheck,
  FileWarning,
  TriangleAlert,
  CircleCheck,
  CircleX,
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  ListChecks,
  FileJson,
  Code,
  MousePointer,
  MonitorCheck
} from "lucide-react";

const Documentation = () => {
  return (
    <MainLayout title="Documentation" subtitle="Complete Cookbook Guide to Fractal Unified Autonomous Governance Platform">
      <div className="min-h-screen bg-background">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="max-w-5xl mx-auto px-6 py-12">
            
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Complete Cookbook</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Fractal Unified Autonomous Governance Platform
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
                The World's First End-to-End Responsible AI Operating System
              </p>
              <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
                This documentation covers <strong>every feature, every step, every input, and every output</strong> in extreme detail.
                Whether you have zero knowledge or are an expert, this guide will help you understand the entire platform.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Badge variant="outline">v1.0.0</Badge>
                <Badge variant="secondary">100% Open Source</Badge>
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">MIT License</Badge>
                <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Zero Cost</Badge>
              </div>
            </div>

            <Separator className="mb-12" />

            {/* Table of Contents */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Table of Contents
              </h2>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <a href="#what-is-this" className="block p-2 rounded hover:bg-muted transition-colors">1. What is Fractal?</a>
                  <a href="#getting-started" className="block p-2 rounded hover:bg-muted transition-colors">2. Getting Started (Step-by-Step)</a>
                  <a href="#architecture" className="block p-2 rounded hover:bg-muted transition-colors">3. Understanding the Architecture</a>
                  <a href="#projects" className="block p-2 rounded hover:bg-muted transition-colors">4. Projects (Complete Guide)</a>
                </div>
                <div className="space-y-2">
                  <a href="#models" className="block p-2 rounded hover:bg-muted transition-colors">5. Models (Complete Guide)</a>
                  <a href="#observability" className="block p-2 rounded hover:bg-muted transition-colors">6. Observability (Deep Dive)</a>
                  <a href="#alerts" className="block p-2 rounded hover:bg-muted transition-colors">7. Alerts (Complete Guide)</a>
                  <a href="#governance" className="block p-2 rounded hover:bg-muted transition-colors">8. Governance (All Features)</a>
                </div>
                <div className="space-y-2">
                  <a href="#engines" className="block p-2 rounded hover:bg-muted transition-colors">9. Evaluation Engines (All 6)</a>
                  <a href="#policy" className="block p-2 rounded hover:bg-muted transition-colors">10. Policy & Data Contracts</a>
                  <a href="#impact" className="block p-2 rounded hover:bg-muted transition-colors">11. Impact & Reports</a>
                  <a href="#settings" className="block p-2 rounded hover:bg-muted transition-colors">12. Settings (All Options)</a>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 1: What is This */}
            <section id="what-is-this" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">1</span>
                </div>
                What is Fractal?
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">The Problem We Solve</h3>
                  <p className="text-muted-foreground mb-4">
                    AI systems are being deployed everywhere, but they often:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CircleX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Discriminate</strong> — Make unfair decisions based on race, gender, age, or other protected attributes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Hallucinate</strong> — Generate false information that looks convincing but is completely made up</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Leak Data</strong> — Expose personal information like SSNs, credit cards, or medical records</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Generate Harm</strong> — Produce toxic, hateful, or dangerous content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Can't Be Explained</strong> — Make decisions that no one understands or can justify</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Our Solution</h3>
                  <p className="text-muted-foreground mb-4">
                    Fractal provides a complete platform to:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CircleCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Evaluate</strong> — Test your AI for fairness, safety, privacy, and accuracy before deployment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Monitor</strong> — Track every decision your AI makes in real-time with full audit trails</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Govern</strong> — Enforce policies and require approvals for high-risk systems</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CircleCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Report</strong> — Generate compliance documentation for regulators</span>
                    </li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                    <Shield className="h-6 w-6 text-green-500 mb-2" />
                    <h4 className="font-semibold mb-1">Safe</h4>
                    <p className="text-xs text-muted-foreground">Protected against harmful outputs and attacks</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                    <Scale className="h-6 w-6 text-blue-500 mb-2" />
                    <h4 className="font-semibold mb-1">Fair</h4>
                    <p className="text-xs text-muted-foreground">Free from bias across demographic groups</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-500/20">
                    <Eye className="h-6 w-6 text-purple-500 mb-2" />
                    <h4 className="font-semibold mb-1">Transparent</h4>
                    <p className="text-xs text-muted-foreground">Every decision is explainable</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/20">
                    <FileCheck className="h-6 w-6 text-orange-500 mb-2" />
                    <h4 className="font-semibold mb-1">Compliant</h4>
                    <p className="text-xs text-muted-foreground">Aligned with EU AI Act & NIST</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-1">Who Should Use This?</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>AI/ML Engineers</strong> (model testing), <strong>Data Scientists</strong> (fairness metrics), 
                        <strong>Compliance Officers</strong> (regulatory reports), <strong>Product Managers</strong> (decision tracking), 
                        <strong>CISOs</strong> (risk management)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 2: Getting Started */}
            <section id="getting-started" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">2</span>
                </div>
                Getting Started (Step-by-Step)
              </h2>

              <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 mb-8">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">Time Required</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete setup: <strong>10-15 minutes</strong>. First evaluation: <strong>2-3 minutes</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1 */}
              <div className="space-y-8">
                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">1</div>
                    <div>
                      <h3 className="text-xl font-semibold">Create Your First Project</h3>
                      <p className="text-sm text-muted-foreground">A project is a container for all related AI systems</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        How to Navigate
                      </h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Look at the left sidebar</li>
                        <li>2. Click on <code className="px-1.5 py-0.5 bg-background rounded text-xs">Configure</code> to expand it</li>
                        <li>3. Click on <code className="px-1.5 py-0.5 bg-background rounded text-xs">Projects</code></li>
                        <li>4. Click the <strong>Create Project</strong> button (top right)</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Fields You Need to Fill
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Field</th>
                              <th className="text-left py-2 px-3 font-medium">What It Means</th>
                              <th className="text-left py-2 px-3 font-medium">Example Value</th>
                              <th className="text-left py-2 px-3 font-medium">Required?</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">name</td>
                              <td className="py-2 px-3">A human-readable name for your project</td>
                              <td className="py-2 px-3">"Loan Approval AI"</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">description</td>
                              <td className="py-2 px-3">Explain what this project does</td>
                              <td className="py-2 px-3">"AI system for evaluating loan applications"</td>
                              <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">No</Badge></td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">environment</td>
                              <td className="py-2 px-3">Which stage is this project in?</td>
                              <td className="py-2 px-3">"Development" / "Staging" / "Production"</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">data_sensitivity</td>
                              <td className="py-2 px-3">How sensitive is the data being processed?</td>
                              <td className="py-2 px-3">"Low" / "Medium" / "High" / "Critical"</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-xs">compliance_frameworks</td>
                              <td className="py-2 px-3">Which regulations apply?</td>
                              <td className="py-2 px-3">"EU AI Act", "NIST AI RMF", "SOC 2"</td>
                              <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">No</Badge></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CircleCheck className="h-4 w-4" />
                        Expected Output
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• A new project card appears in the Projects list</li>
                        <li>• The project has a unique ID (UUID format)</li>
                        <li>• You can click on it to see details</li>
                        <li>• A success toast message appears: "Project created successfully"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">2</div>
                    <div>
                      <h3 className="text-xl font-semibold">Register a Model</h3>
                      <p className="text-sm text-muted-foreground">Add an AI model to evaluate and monitor</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        How to Navigate
                      </h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. In the left sidebar, click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Configure</code></li>
                        <li>2. Click on <code className="px-1.5 py-0.5 bg-background rounded text-xs">Models</code></li>
                        <li>3. Click <strong>Register Model</strong> or <strong>Import from Hugging Face</strong></li>
                      </ol>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Download className="h-4 w-4 text-blue-500" />
                          Option A: Import from Hugging Face
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">Fastest method if your model is hosted on Hugging Face</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model ID</span>
                            <code className="text-xs">meta-llama/Llama-2-7b</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Endpoint URL</span>
                            <code className="text-xs">https://api-inference.huggingface.co/...</code>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">API Token</span>
                            <code className="text-xs">hf_xxx...</code>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-500" />
                          Option B: Manual Registration
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">Full control for custom or private models</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model Name</span>
                            <span className="text-xs">Credit Risk Predictor</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model Type</span>
                            <span className="text-xs">LLM / Classification / Regression</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">API Endpoint</span>
                            <code className="text-xs">https://your-api.com/predict</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        All Model Fields Explained
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Field</th>
                              <th className="text-left py-2 px-3 font-medium">Description</th>
                              <th className="text-left py-2 px-3 font-medium">Example</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">name</td>
                              <td className="py-2 px-3">Display name for the model</td>
                              <td className="py-2 px-3">"GPT-4 Customer Support"</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">model_type</td>
                              <td className="py-2 px-3">Type of AI model</td>
                              <td className="py-2 px-3">LLM, Classification, Regression, NER, Embedding</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">version</td>
                              <td className="py-2 px-3">Version number</td>
                              <td className="py-2 px-3">"1.0.0", "2.3.1"</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">endpoint</td>
                              <td className="py-2 px-3">API URL to call the model</td>
                              <td className="py-2 px-3">"https://api.openai.com/v1/chat"</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">project_id</td>
                              <td className="py-2 px-3">Which project this belongs to</td>
                              <td className="py-2 px-3">Selected from dropdown</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">system_id</td>
                              <td className="py-2 px-3">Which system this belongs to</td>
                              <td className="py-2 px-3">Selected from dropdown</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-xs">use_case</td>
                              <td className="py-2 px-3">What the model is used for</td>
                              <td className="py-2 px-3">"Customer support automation"</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CircleCheck className="h-4 w-4" />
                        Expected Output
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Model appears in the Models list with a card showing its name and type</li>
                        <li>• Initial scores show as "—" (not yet evaluated)</li>
                        <li>• Status shows as "Active"</li>
                        <li>• Toast: "Model registered successfully"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">3</div>
                    <div>
                      <h3 className="text-xl font-semibold">Run Your First Evaluation</h3>
                      <p className="text-sm text-muted-foreground">Test your model for fairness, safety, or other metrics</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        How to Navigate
                      </h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. In the left sidebar, click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Evaluate</code> to expand it</li>
                        <li>2. Choose an engine (e.g., <code className="px-1.5 py-0.5 bg-background rounded text-xs">Fairness Engine</code>)</li>
                        <li>3. Select your model from the dropdown</li>
                        <li>4. Click <strong>Run Evaluation</strong></li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Workflow className="h-4 w-4" />
                        What Happens During Evaluation (The Process)
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-sm font-medium">1</div>
                          <div>
                            <span className="font-medium">Sending</span>
                            <p className="text-xs text-muted-foreground">Request sent to evaluation backend</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-sm font-medium">2</div>
                          <div>
                            <span className="font-medium">Analyzing</span>
                            <p className="text-xs text-muted-foreground">Running 55+ test cases against your model</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-sm font-medium">3</div>
                          <div>
                            <span className="font-medium">Computing</span>
                            <p className="text-xs text-muted-foreground">Calculating metrics using AIF360 formulas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-sm font-medium">4</div>
                          <div>
                            <span className="font-medium">Complete</span>
                            <p className="text-xs text-muted-foreground">Results displayed with full transparency</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CircleCheck className="h-4 w-4" />
                        Expected Output
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Overall Score</strong>: 0-100% (higher is better)</li>
                        <li>• <strong>InputOutputScope Banner</strong>: Shows what was tested (inputs/outputs)</li>
                        <li>• <strong>ComputationBreakdown</strong>: Shows the exact formulas used</li>
                        <li>• <strong>RawDataLog</strong>: Timestamps, latency, raw test data</li>
                        <li>• <strong>EvidencePackage</strong>: Downloadable JSON with SHA-256 hash</li>
                        <li>• <strong>If score &lt; 70%</strong>: Red "NON-COMPLIANT" warning with EU AI Act reference</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">4</div>
                    <div>
                      <h3 className="text-xl font-semibold">Review the Decision Ledger</h3>
                      <p className="text-sm text-muted-foreground">See the immutable audit trail of all evaluations</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        How to Navigate
                      </h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Govern</code> in the sidebar</li>
                        <li>2. Click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Decision Ledger</code></li>
                        <li>3. See all recorded decisions with their hashes</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CircleCheck className="h-4 w-4" />
                        What You'll See
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Decision Reference</strong>: Unique ID like "EVAL-2025-001"</li>
                        <li>• <strong>Decision Value</strong>: "PASS" or "FAIL"</li>
                        <li>• <strong>Confidence</strong>: 0-100%</li>
                        <li>• <strong>Model Name</strong>: Which model was evaluated</li>
                        <li>• <strong>Timestamp</strong>: Exact date and time</li>
                        <li>• <strong>Record Hash</strong>: SHA-256 hash (tamper-proof)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-6 rounded-xl border bg-card">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">5</div>
                    <div>
                      <h3 className="text-xl font-semibold">Generate a Compliance Report</h3>
                      <p className="text-sm text-muted-foreground">Create documentation for regulators or auditors</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        How to Navigate
                      </h4>
                      <ol className="text-sm space-y-1 text-muted-foreground">
                        <li>1. Click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Impact</code> in the sidebar</li>
                        <li>2. Click <code className="px-1.5 py-0.5 bg-background rounded text-xs">Regulatory Reports</code></li>
                        <li>3. Select report type and click <strong>Generate Report</strong></li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CircleCheck className="h-4 w-4" />
                        Available Report Types
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>EU AI Act Compliance</strong>: Full conformity assessment</li>
                        <li>• <strong>Bias Audit</strong>: Fairness analysis across demographics</li>
                        <li>• <strong>Risk Assessment</strong>: Comprehensive risk evaluation</li>
                        <li>• <strong>Technical Documentation</strong>: Model specifications</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 3: Architecture */}
            <section id="architecture" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">3</span>
                </div>
                Understanding the Architecture
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">The Hierarchy: Project → System → Model</h3>
                  <p className="text-muted-foreground mb-4">
                    Everything in the platform is organized in a 3-level hierarchy:
                  </p>

                  <div className="p-4 rounded-lg bg-muted/30 font-mono text-sm mb-6">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-500 font-medium">Project</span>
                      <span className="text-muted-foreground">(e.g., "Loan Approval AI")</span>
                    </div>
                    <div className="ml-6 mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground">├──</span>
                      <Layers className="h-4 w-4 text-purple-500" />
                      <span className="text-purple-500 font-medium">System</span>
                      <span className="text-muted-foreground">(e.g., "Credit Scoring API")</span>
                    </div>
                    <div className="ml-12 mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground">├──</span>
                      <Brain className="h-4 w-4 text-green-500" />
                      <span className="text-green-500 font-medium">Model</span>
                      <span className="text-muted-foreground">(e.g., "XGBoost v2.1")</span>
                    </div>
                    <div className="ml-12 mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground">├──</span>
                      <Brain className="h-4 w-4 text-green-500" />
                      <span className="text-green-500 font-medium">Model</span>
                      <span className="text-muted-foreground">(e.g., "LLM Explainer v1.0")</span>
                    </div>
                    <div className="ml-6 mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground">├──</span>
                      <Layers className="h-4 w-4 text-purple-500" />
                      <span className="text-purple-500 font-medium">System</span>
                      <span className="text-muted-foreground">(e.g., "Document Processor")</span>
                    </div>
                    <div className="ml-12 mt-2 flex items-center gap-2">
                      <span className="text-muted-foreground">└──</span>
                      <Brain className="h-4 w-4 text-green-500" />
                      <span className="text-green-500 font-medium">Model</span>
                      <span className="text-muted-foreground">(e.g., "OCR Model v3.0")</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border">
                      <Building className="h-5 w-5 text-blue-500 mb-2" />
                      <h4 className="font-medium mb-1">Project</h4>
                      <p className="text-xs text-muted-foreground">
                        Top-level container. Groups related AI systems. Contains compliance frameworks, data sensitivity, and environment settings.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <Layers className="h-5 w-5 text-purple-500 mb-2" />
                      <h4 className="font-medium mb-1">System</h4>
                      <p className="text-xs text-muted-foreground">
                        Deployed AI component. Has API endpoint, runtime governance, request logging. Requires approval if high-risk.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <Brain className="h-5 w-5 text-green-500 mb-2" />
                      <h4 className="font-medium mb-1">Model</h4>
                      <p className="text-xs text-muted-foreground">
                        The actual AI/ML model. Has type (LLM, Classification), version, evaluation scores, and version history.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Risk Tiers Explained</h3>
                  <p className="text-muted-foreground mb-4">
                    Each system is assigned a risk tier that determines governance requirements:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Tier</th>
                          <th className="text-left py-3 px-4 font-medium">What It Means</th>
                          <th className="text-left py-3 px-4 font-medium">Approval Required?</th>
                          <th className="text-left py-3 px-4 font-medium">Examples</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-3 px-4">
                            <Badge className="bg-green-500/10 text-green-600">Low</Badge>
                          </td>
                          <td className="py-3 px-4">Minimal risk, non-critical</td>
                          <td className="py-3 px-4">
                            <CircleX className="h-4 w-4 text-muted-foreground" />
                          </td>
                          <td className="py-3 px-4">Internal chatbots, recommendation systems</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">
                            <Badge className="bg-yellow-500/10 text-yellow-600">Medium</Badge>
                          </td>
                          <td className="py-3 px-4">Moderate risk, some impact</td>
                          <td className="py-3 px-4">
                            <CircleX className="h-4 w-4 text-muted-foreground" />
                          </td>
                          <td className="py-3 px-4">Customer support AI, content moderation</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">
                            <Badge className="bg-orange-500/10 text-orange-600">High</Badge>
                          </td>
                          <td className="py-3 px-4">Significant risk, customer-facing</td>
                          <td className="py-3 px-4">
                            <CircleCheck className="h-4 w-4 text-green-500" />
                            <span className="ml-1 text-xs">1 approver</span>
                          </td>
                          <td className="py-3 px-4">Loan decisions, insurance underwriting</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">
                            <Badge className="bg-red-500/10 text-red-600">Critical</Badge>
                          </td>
                          <td className="py-3 px-4">Highest risk, regulated decisions</td>
                          <td className="py-3 px-4">
                            <CircleCheck className="h-4 w-4 text-green-500" />
                            <span className="ml-1 text-xs">2 approvers</span>
                          </td>
                          <td className="py-3 px-4">Medical diagnosis, criminal justice</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 4: Projects */}
            <section id="projects" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">4</span>
                </div>
                Projects (Complete Guide)
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">What is a Project?</h3>
                  <p className="text-muted-foreground mb-4">
                    A Project is the top-level organizational unit. Think of it as a folder that contains all the AI systems 
                    and models for a specific business initiative.
                  </p>
                  
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-1">Example</h4>
                        <p className="text-sm text-muted-foreground">
                          If you're building a loan approval system, you might have a project called "Loan Approval AI" 
                          that contains systems like "Credit Scoring", "Fraud Detection", and "Document Processing".
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Creating a Project (Detailed Steps)</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-medium mb-1">Navigate to Projects Page</h4>
                        <p className="text-sm text-muted-foreground">
                          Click <strong>Configure</strong> in the sidebar → Click <strong>Projects</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-medium mb-1">Click "Create Project" Button</h4>
                        <p className="text-sm text-muted-foreground">
                          Located in the top-right corner. A form dialog will open.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-medium mb-2">Fill in the Form Fields</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium">Field</th>
                                <th className="text-left py-2 px-3 font-medium">Type</th>
                                <th className="text-left py-2 px-3 font-medium">Options / Format</th>
                              </tr>
                            </thead>
                            <tbody className="text-muted-foreground">
                              <tr className="border-b">
                                <td className="py-2 px-3">Name*</td>
                                <td className="py-2 px-3">Text input</td>
                                <td className="py-2 px-3">3-100 characters</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3">Description</td>
                                <td className="py-2 px-3">Textarea</td>
                                <td className="py-2 px-3">Optional, max 500 chars</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3">Environment*</td>
                                <td className="py-2 px-3">Dropdown</td>
                                <td className="py-2 px-3">Development | Staging | Production</td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-2 px-3">Data Sensitivity*</td>
                                <td className="py-2 px-3">Dropdown</td>
                                <td className="py-2 px-3">Low | Medium | High | Critical</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-3">Compliance Frameworks</td>
                                <td className="py-2 px-3">Multi-select</td>
                                <td className="py-2 px-3">EU AI Act, NIST AI RMF, SOC 2, ISO 27001</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-medium mb-1">Click "Create" Button</h4>
                        <p className="text-sm text-muted-foreground">
                          The form will validate and submit. You'll see a loading spinner.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-medium flex-shrink-0">
                        <CircleCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 text-green-700 dark:text-green-400">Success Output</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Toast message: "Project created successfully"</li>
                          <li>• Dialog closes automatically</li>
                          <li>• New project card appears in the list</li>
                          <li>• Project ID (UUID) is generated automatically</li>
                          <li>• Created timestamp is set to current time</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Viewing Project Details</h3>
                  <p className="text-muted-foreground mb-4">
                    Click on any project card to see its detail page. The detail page has multiple tabs:
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Overview Tab</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Project metadata</li>
                        <li>• Compliance score gauge</li>
                        <li>• Number of systems/models</li>
                        <li>• Recent activity</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Models Tab</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• List of all models in project</li>
                        <li>• Model scores (fairness, toxicity, etc.)</li>
                        <li>• Model status (active, inactive)</li>
                        <li>• Quick actions (evaluate, view)</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Risk Tab</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Risk assessment wizard</li>
                        <li>• Risk score breakdown</li>
                        <li>• Mitigation recommendations</li>
                        <li>• Historical risk trends</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">Documentation Tab</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Auto-generated technical docs</li>
                        <li>• Compliance artifacts</li>
                        <li>• Attestation history</li>
                        <li>• Export options</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 5: Models */}
            <section id="models" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">5</span>
                </div>
                Models (Complete Guide)
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">What is a Model in Fractal?</h3>
                  <p className="text-muted-foreground mb-4">
                    A Model represents any AI/ML model that you want to evaluate, monitor, and govern. 
                    This can be an LLM (like GPT-4), a classification model (like XGBoost), 
                    or any other type of ML model.
                  </p>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Model Types Explained</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">What It Is</th>
                          <th className="text-left py-3 px-4 font-medium">Examples</th>
                          <th className="text-left py-3 px-4 font-medium">Key Evaluations</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">LLM</td>
                          <td className="py-3 px-4">Large Language Model for text generation</td>
                          <td className="py-3 px-4">GPT-4, Claude, Llama, Gemini</td>
                          <td className="py-3 px-4">Hallucination, Toxicity, Privacy</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Classification</td>
                          <td className="py-3 px-4">Predicts categories/labels</td>
                          <td className="py-3 px-4">Spam detector, Fraud classifier</td>
                          <td className="py-3 px-4">Fairness, Explainability</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Regression</td>
                          <td className="py-3 px-4">Predicts numerical values</td>
                          <td className="py-3 px-4">Price predictor, Risk scorer</td>
                          <td className="py-3 px-4">Fairness, Explainability</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">NER</td>
                          <td className="py-3 px-4">Named Entity Recognition</td>
                          <td className="py-3 px-4">PII detector, Entity extractor</td>
                          <td className="py-3 px-4">Privacy, Data Quality</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Embedding</td>
                          <td className="py-3 px-4">Converts text to vectors</td>
                          <td className="py-3 px-4">Sentence transformers</td>
                          <td className="py-3 px-4">Fairness (bias in embeddings)</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Custom</td>
                          <td className="py-3 px-4">Any other model type</td>
                          <td className="py-3 px-4">Image classifiers, Audio models</td>
                          <td className="py-3 px-4">Depends on use case</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Registering a Model (Two Methods)</h3>

                  <div className="space-y-6">
                    {/* Method 1: Hugging Face */}
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Download className="h-5 w-5 text-yellow-500" />
                        Method 1: Import from Hugging Face
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Best for models hosted on Hugging Face Hub or Inference Endpoints.
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-medium flex-shrink-0">1</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Click "Import from Hugging Face"</h5>
                            <p className="text-xs text-muted-foreground">Opens the HuggingFace import form</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-medium flex-shrink-0">2</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Enter Model ID</h5>
                            <p className="text-xs text-muted-foreground">
                              Format: <code className="px-1 py-0.5 bg-muted rounded text-xs">organization/model-name</code>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Example: <code className="px-1 py-0.5 bg-muted rounded text-xs">meta-llama/Llama-2-7b-chat-hf</code>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-medium flex-shrink-0">3</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Enter Inference Endpoint URL</h5>
                            <p className="text-xs text-muted-foreground">
                              Format: <code className="px-1 py-0.5 bg-muted rounded text-xs">https://api-inference.huggingface.co/models/...</code>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Or your dedicated endpoint: <code className="px-1 py-0.5 bg-muted rounded text-xs">https://xxx.endpoints.huggingface.cloud</code>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-medium flex-shrink-0">4</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Enter API Token</h5>
                            <p className="text-xs text-muted-foreground">
                              Your HuggingFace API token starting with <code className="px-1 py-0.5 bg-muted rounded text-xs">hf_</code>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Get it from: huggingface.co → Settings → Access Tokens
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-medium flex-shrink-0">5</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Select Project & System</h5>
                            <p className="text-xs text-muted-foreground">Choose where this model belongs</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded bg-background">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-medium flex-shrink-0">✓</div>
                          <div>
                            <h5 className="font-medium text-sm mb-1">Click "Import"</h5>
                            <p className="text-xs text-muted-foreground">Model will be created with metadata fetched from HuggingFace</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Method 2: Manual */}
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-500/5 to-blue-500/5">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-500" />
                        Method 2: Manual Registration
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Best for custom models, private APIs, or non-HuggingFace models.
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Field</th>
                              <th className="text-left py-2 px-3 font-medium">Required</th>
                              <th className="text-left py-2 px-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">name</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                              <td className="py-2 px-3">Display name (e.g., "Credit Scorer v2")</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">model_type</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                              <td className="py-2 px-3">LLM, Classification, Regression, etc.</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">version</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                              <td className="py-2 px-3">Semantic version (e.g., "1.0.0")</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">project_id</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                              <td className="py-2 px-3">Select from dropdown</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">system_id</td>
                              <td className="py-2 px-3"><Badge variant="destructive" className="text-xs">Yes</Badge></td>
                              <td className="py-2 px-3">Select from dropdown</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">endpoint</td>
                              <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">No*</Badge></td>
                              <td className="py-2 px-3">API URL for calling the model</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs">description</td>
                              <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">No</Badge></td>
                              <td className="py-2 px-3">What this model does</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-xs">use_case</td>
                              <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">No</Badge></td>
                              <td className="py-2 px-3">Business purpose</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 p-3 rounded bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-500 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            <strong>* Note on Endpoint:</strong> If you don't provide an endpoint, evaluations will use 
                            pre-defined test cases only. To run live evaluations against your model, you need an endpoint.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Model Scores Explained</h3>
                  <p className="text-muted-foreground mb-4">
                    After running evaluations, each model shows scores on multiple dimensions:
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-blue-500" />
                        <h4 className="font-medium">Fairness Score</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Measures bias across demographic groups (race, gender, age, etc.)
                      </p>
                      <div className="text-xs">
                        <span className="text-green-500">≥70%</span> = Compliant | 
                        <span className="text-red-500 ml-1">&lt;70%</span> = Non-compliant
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h4 className="font-medium">Toxicity Score</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Measures resistance to harmful content generation
                      </p>
                      <div className="text-xs">
                        Higher = Better (100% means no toxic outputs detected)
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="h-4 w-4 text-green-500" />
                        <h4 className="font-medium">Privacy Score</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Measures protection of personal information
                      </p>
                      <div className="text-xs">
                        Higher = Better (100% means no PII leakage detected)
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <h4 className="font-medium">Robustness Score</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Measures resistance to adversarial attacks
                      </p>
                      <div className="text-xs">
                        Higher = Better (100% means model is robust)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 6: Observability */}
            <section id="observability" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">6</span>
                </div>
                Observability (Deep Dive)
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">What is Observability?</h3>
                  <p className="text-muted-foreground mb-4">
                    Observability is your real-time window into what your AI systems are doing. 
                    It answers questions like: "How many requests is my model handling?", 
                    "Is performance degrading?", "Is there drift in the data?".
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      How to Access
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Click <strong>Monitor</strong> in the sidebar → Click <strong>Observability</strong>
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">What You'll See on the Observability Page</h3>

                  <div className="space-y-6">
                    {/* Metric Cards */}
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Metric Cards (Top Row)
                      </h4>
                      <div className="grid md:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 rounded bg-muted/50">
                          <div className="text-muted-foreground text-xs mb-1">Total Requests</div>
                          <div className="font-bold text-lg">12,847</div>
                          <div className="text-xs text-muted-foreground">All-time API calls</div>
                        </div>
                        <div className="p-3 rounded bg-muted/50">
                          <div className="text-muted-foreground text-xs mb-1">Requests Today</div>
                          <div className="font-bold text-lg">1,234</div>
                          <div className="text-xs text-muted-foreground">Since midnight UTC</div>
                        </div>
                        <div className="p-3 rounded bg-muted/50">
                          <div className="text-muted-foreground text-xs mb-1">Avg Latency</div>
                          <div className="font-bold text-lg">247ms</div>
                          <div className="text-xs text-muted-foreground">P50 response time</div>
                        </div>
                        <div className="p-3 rounded bg-muted/50">
                          <div className="text-muted-foreground text-xs mb-1">Error Rate</div>
                          <div className="font-bold text-lg">0.3%</div>
                          <div className="text-xs text-muted-foreground">Failed requests</div>
                        </div>
                      </div>
                    </div>

                    {/* Drift Alerts */}
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        Drift Alerts Section
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Shows when your model's input/output distributions change significantly from the baseline.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Column</th>
                              <th className="text-left py-2 px-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3">Feature</td>
                              <td className="py-2 px-3">Which feature drifted (e.g., "income", "age")</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Drift Type</td>
                              <td className="py-2 px-3">Statistical test used (KS, Chi-Square, PSI)</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Drift Value</td>
                              <td className="py-2 px-3">Magnitude of drift (0-1, higher = more drift)</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Severity</td>
                              <td className="py-2 px-3">Low, Medium, High, Critical</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3">Detected At</td>
                              <td className="py-2 px-3">Timestamp when drift was detected</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Model Health */}
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        Model Health Cards
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Each registered model shows a health indicator:
                      </p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm">Healthy (scores ≥80%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-sm">Warning (scores 60-80%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm">Critical (scores &lt;60%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Realtime Chat */}
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        Realtime Chat Demo
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Test your models live by sending messages and seeing responses in real-time.
                        The chat interface logs every request/response for observability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 7: Alerts */}
            <section id="alerts" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">7</span>
                </div>
                Alerts (Complete Guide)
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">What are Alerts?</h3>
                  <p className="text-muted-foreground mb-4">
                    Alerts notify you when something important happens in your AI systems. 
                    They can be triggered by drift, latency spikes, errors, or policy violations.
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      How to Access
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Click <strong>Monitor</strong> in the sidebar → Click <strong>Alerts</strong>
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Alert Types Explained</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Alert Type</th>
                          <th className="text-left py-3 px-4 font-medium">What Triggers It</th>
                          <th className="text-left py-3 px-4 font-medium">Default Threshold</th>
                          <th className="text-left py-3 px-4 font-medium">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Drift Alert</td>
                          <td className="py-3 px-4">Statistical drift in input/output distributions</td>
                          <td className="py-3 px-4">PSI &gt; 0.2</td>
                          <td className="py-3 px-4"><Badge className="bg-yellow-500/10 text-yellow-600">Warning</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Latency Alert</td>
                          <td className="py-3 px-4">Response time exceeds SLA</td>
                          <td className="py-3 px-4">P99 &gt; 5000ms</td>
                          <td className="py-3 px-4"><Badge className="bg-orange-500/10 text-orange-600">High</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Error Rate Alert</td>
                          <td className="py-3 px-4">Too many failed requests</td>
                          <td className="py-3 px-4">&gt; 5%</td>
                          <td className="py-3 px-4"><Badge className="bg-red-500/10 text-red-600">Critical</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Toxicity Alert</td>
                          <td className="py-3 px-4">Harmful content detected in output</td>
                          <td className="py-3 px-4">Score &gt; 0.8</td>
                          <td className="py-3 px-4"><Badge className="bg-red-500/10 text-red-600">Critical</Badge></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 font-medium">Privacy Alert</td>
                          <td className="py-3 px-4">PII detected in output</td>
                          <td className="py-3 px-4">Any PII found</td>
                          <td className="py-3 px-4"><Badge className="bg-red-500/10 text-red-600">Critical</Badge></td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-medium">Fairness Alert</td>
                          <td className="py-3 px-4">Disparate impact detected</td>
                          <td className="py-3 px-4">Score &lt; 0.7</td>
                          <td className="py-3 px-4"><Badge className="bg-orange-500/10 text-orange-600">High</Badge></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Alert Lifecycle</h3>

                  <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    <div className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-2">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">Open</div>
                      <div className="text-xs text-muted-foreground">Just triggered</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto mb-2">
                        <Eye className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">Acknowledged</div>
                      <div className="text-xs text-muted-foreground">Someone is looking</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center mx-auto mb-2">
                        <Workflow className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">Investigating</div>
                      <div className="text-xs text-muted-foreground">Root cause analysis</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-2">
                        <CircleCheck className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">Resolved</div>
                      <div className="text-xs text-muted-foreground">Issue fixed</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 8: Governance */}
            <section id="governance" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">8</span>
                </div>
                Governance (All Features)
              </h2>

              <div className="space-y-6">
                {/* Approvals */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    8.1 Approvals
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    High-risk and critical-risk systems require human approval before deployment.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">When is Approval Required?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• System risk tier is <strong>High</strong>: 1 approver required</li>
                        <li>• System risk tier is <strong>Critical</strong>: 2 approvers required</li>
                        <li>• Low and Medium risk: No approval needed</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Approval Workflow</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Developer requests deployment</li>
                        <li>2. System checks risk tier automatically</li>
                        <li>3. If High/Critical, approval request is created</li>
                        <li>4. Approvers receive notification</li>
                        <li>5. Approvers review and approve/reject</li>
                        <li>6. If approved, deployment proceeds</li>
                        <li>7. If rejected, deployment is blocked</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Decision Ledger */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-500" />
                    8.2 Decision Ledger
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    An immutable audit trail of every AI decision. Uses blockchain-style hash chains 
                    to ensure records cannot be tampered with.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 font-mono text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-muted-foreground">record_hash</span>
                        <span>=</span>
                        <span className="text-blue-500">SHA256(decision_data + previous_hash)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Each record's hash includes the previous record's hash, creating an unbreakable chain.
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What's Recorded in Each Entry</h4>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">decision_ref</span>
                          <p className="text-xs text-muted-foreground mt-1">Unique reference (e.g., "EVAL-2025-0042")</p>
                        </div>
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">decision_value</span>
                          <p className="text-xs text-muted-foreground mt-1">The actual decision ("APPROVED", "DENIED")</p>
                        </div>
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">confidence</span>
                          <p className="text-xs text-muted-foreground mt-1">Model confidence (0-100%)</p>
                        </div>
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">model_id</span>
                          <p className="text-xs text-muted-foreground mt-1">Which model made the decision</p>
                        </div>
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">input_hash</span>
                          <p className="text-xs text-muted-foreground mt-1">Hash of input data (privacy-safe)</p>
                        </div>
                        <div>
                          <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">output_hash</span>
                          <p className="text-xs text-muted-foreground mt-1">Hash of output data</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <h4 className="font-medium mb-2 text-red-700 dark:text-red-400 flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4" />
                        Tamper Detection
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        If anyone modifies a record, the hash chain breaks. The system detects this automatically 
                        and flags the inconsistency. This is required for EU AI Act Article 12 compliance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* HITL Console */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    8.3 HITL Console (Human-in-the-Loop)
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    A queue of AI decisions that need human review. Used for low-confidence predictions, 
                    edge cases, and appeals.
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">When Decisions Enter the Queue</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Model confidence below threshold (default: 70%)</li>
                      <li>• User appeals a decision</li>
                      <li>• Policy rule flags for human review</li>
                      <li>• Random sampling for quality assurance</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 mt-4">
                    <h4 className="font-medium mb-2">Reviewer Actions</h4>
                    <div className="flex gap-3 flex-wrap">
                      <Badge className="bg-green-500/10 text-green-600">Approve</Badge>
                      <Badge className="bg-red-500/10 text-red-600">Reject</Badge>
                      <Badge className="bg-yellow-500/10 text-yellow-600">Escalate</Badge>
                      <Badge className="bg-blue-500/10 text-blue-600">Request More Info</Badge>
                    </div>
                  </div>
                </div>

                {/* Incidents */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-red-500" />
                    8.4 Incidents
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Track safety and compliance incidents. Required for EU AI Act Article 62 incident reporting.
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Incident Types</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3 text-red-500" />
                        <span>Safety Incident (harmful output)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3 text-orange-500" />
                        <span>Bias Incident (discriminatory decision)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3 text-purple-500" />
                        <span>Privacy Incident (data leakage)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-3 w-3 text-blue-500" />
                        <span>Performance Incident (outage, degradation)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Knowledge Graph */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-cyan-500" />
                    8.5 Knowledge Graph / Lineage
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Visualize relationships between all entities: Projects, Systems, Models, Datasets, Decisions.
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">What You Can See</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Which datasets trained which models</li>
                      <li>• Which models belong to which systems</li>
                      <li>• Which decisions were made by which models</li>
                      <li>• Data flow and transformation lineage</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 9: Evaluation Engines */}
            <section id="engines" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">9</span>
                </div>
                Evaluation Engines (All 6)
              </h2>

              <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 mb-8">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">Transparency Components</h4>
                    <p className="text-sm text-muted-foreground">
                      Every engine shows: <strong>InputOutputScope</strong> (what was tested), 
                      <strong>ComputationBreakdown</strong> (formulas used), <strong>RawDataLog</strong> (timestamps, latency), 
                      and <strong>EvidencePackage</strong> (downloadable JSON with SHA-256 hash).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Fairness Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-blue-500" />
                    9.1 Fairness Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Measures whether your model treats different demographic groups fairly.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Metrics Calculated</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Metric</th>
                              <th className="text-left py-2 px-3 font-medium">Formula</th>
                              <th className="text-left py-2 px-3 font-medium">What It Measures</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3">Statistical Parity</td>
                              <td className="py-2 px-3 font-mono text-xs">|P(Y=1|A=0) - P(Y=1|A=1)|</td>
                              <td className="py-2 px-3">Equal positive outcomes across groups</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Equal Opportunity</td>
                              <td className="py-2 px-3 font-mono text-xs">|TPR_A=0 - TPR_A=1|</td>
                              <td className="py-2 px-3">Equal true positive rates</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Disparate Impact</td>
                              <td className="py-2 px-3 font-mono text-xs">P(Y=1|A=0) / P(Y=1|A=1)</td>
                              <td className="py-2 px-3">Ratio of positive outcomes (4/5 rule)</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3">Predictive Equality</td>
                              <td className="py-2 px-3 font-mono text-xs">|FPR_A=0 - FPR_A=1|</td>
                              <td className="py-2 px-3">Equal false positive rates</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">How to Use</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Navigate to <strong>Evaluate → Fairness Engine</strong></li>
                        <li>2. Select your model from the dropdown</li>
                        <li>3. Click <strong>Run Evaluation</strong></li>
                        <li>4. Wait for 55 test cases to complete (~30 seconds)</li>
                        <li>5. Review the overall score and metric breakdown</li>
                      </ol>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">Pass (≥70%)</h4>
                        <p className="text-xs text-muted-foreground">
                          Model shows acceptable fairness across demographic groups. 
                          Green checkmark and "COMPLIANT" status displayed.
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                        <h4 className="font-medium mb-2 text-red-700 dark:text-red-400">Fail (&lt;70%)</h4>
                        <p className="text-xs text-muted-foreground">
                          Model shows significant bias. Red warning and "NON-COMPLIANT" status 
                          with EU AI Act Article 10 reference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hallucination Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    9.2 Hallucination Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Detects when your LLM generates false, unsupported, or made-up information.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What It Tests</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Factuality</strong>: Are stated facts actually true?</li>
                        <li>• <strong>Groundedness</strong>: Is the response based on provided context?</li>
                        <li>• <strong>Consistency</strong>: Does the model contradict itself?</li>
                        <li>• <strong>Attribution</strong>: Does it cite sources correctly?</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Test Cases Include</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Questions about real-world facts</li>
                        <li>• Questions about fictional entities (should say "I don't know")</li>
                        <li>• Context-dependent Q&A (RAG scenarios)</li>
                        <li>• Trick questions designed to elicit hallucinations</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Toxicity Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    9.3 Toxicity Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Tests your model's resistance to generating harmful, hateful, or dangerous content.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What It Tests</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Direct Toxicity</strong>: Hate speech, slurs, threats</li>
                        <li>• <strong>Indirect Toxicity</strong>: Subtle bias, microaggressions</li>
                        <li>• <strong>Jailbreak Resistance</strong>: Attempts to bypass safety filters</li>
                        <li>• <strong>Prompt Injection</strong>: Malicious prompt attacks</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <h4 className="font-medium mb-2 text-red-700 dark:text-red-400 flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4" />
                        Critical Alert
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        If any test case produces toxic output, a Critical alert is generated and 
                        the model is flagged for immediate review. This maps to EU AI Act Article 5 (prohibited practices).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-green-500" />
                    9.4 Privacy Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Detects when your model leaks personal information or memorizes training data.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">PII Types Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">SSN</Badge>
                        <Badge variant="outline">Credit Card</Badge>
                        <Badge variant="outline">Phone Number</Badge>
                        <Badge variant="outline">Email</Badge>
                        <Badge variant="outline">Address</Badge>
                        <Badge variant="outline">Medical Record</Badge>
                        <Badge variant="outline">Bank Account</Badge>
                        <Badge variant="outline">IP Address</Badge>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What It Tests</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Direct Extraction</strong>: "What is John Doe's SSN?"</li>
                        <li>• <strong>Indirect Extraction</strong>: Reconstructing PII from context</li>
                        <li>• <strong>Memorization</strong>: Does model recall training data verbatim?</li>
                        <li>• <strong>Differential Privacy</strong>: Information leakage via repeated queries</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Explainability Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-orange-500" />
                    9.5 Explainability Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Evaluates how well your model can explain its reasoning and decisions.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What It Measures</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>SHAP Values</strong>: Feature importance scores</li>
                        <li>• <strong>Reasoning Quality</strong>: Step-by-step explanations</li>
                        <li>• <strong>Counterfactuals</strong>: "What would change the outcome?"</li>
                        <li>• <strong>Consistency</strong>: Same input = same explanation</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Regulatory Requirement
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        EU AI Act Article 13 requires that users can understand how high-risk AI systems 
                        make decisions. This engine helps demonstrate compliance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Quality Engine */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-cyan-500" />
                    9.6 Data Quality Engine
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Evaluates the quality of data used to train or test your models.
                  </p>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Quality Dimensions</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded bg-background">
                        <div className="font-medium mb-1">Completeness</div>
                        <p className="text-xs text-muted-foreground">% of fields with non-null values</p>
                      </div>
                      <div className="p-3 rounded bg-background">
                        <div className="font-medium mb-1">Validity</div>
                        <p className="text-xs text-muted-foreground">% of values matching expected format</p>
                      </div>
                      <div className="p-3 rounded bg-background">
                        <div className="font-medium mb-1">Uniqueness</div>
                        <p className="text-xs text-muted-foreground">% of unique records (no duplicates)</p>
                      </div>
                      <div className="p-3 rounded bg-background">
                        <div className="font-medium mb-1">Freshness</div>
                        <p className="text-xs text-muted-foreground">How recent is the data?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 10: Policy & Data Contracts */}
            <section id="policy" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">10</span>
                </div>
                Policy & Data Contracts
              </h2>

              <div className="space-y-6">
                {/* Policy Studio */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Code className="h-5 w-5 text-purple-500" />
                    10.1 Policy Studio
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Define runtime guardrails using a simple Policy DSL (Domain-Specific Language).
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 font-mono text-sm">
                      <div className="text-muted-foreground mb-2"># Example Policy Rules</div>
                      <div className="space-y-1">
                        <div><span className="text-red-500">BLOCK</span> IF toxicity_score &gt; 0.8</div>
                        <div><span className="text-yellow-500">WARN</span> IF fairness_score &lt; 0.7</div>
                        <div><span className="text-blue-500">REQUIRE_APPROVAL</span> IF risk_tier == "critical"</div>
                        <div><span className="text-purple-500">LOG</span> IF confidence &lt; 0.5</div>
                        <div><span className="text-green-500">ALLOW</span> IF all_checks_pass</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Available Actions</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Action</th>
                              <th className="text-left py-2 px-3 font-medium">Effect</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs text-red-500">BLOCK</td>
                              <td className="py-2 px-3">Stop the request immediately, return error</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs text-yellow-500">WARN</td>
                              <td className="py-2 px-3">Allow but log a warning, create alert</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs text-blue-500">REQUIRE_APPROVAL</td>
                              <td className="py-2 px-3">Queue for human review before proceeding</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3 font-mono text-xs text-purple-500">LOG</td>
                              <td className="py-2 px-3">Record for audit trail, allow to proceed</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 font-mono text-xs text-green-500">ALLOW</td>
                              <td className="py-2 px-3">Explicitly permit (for whitelisting)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Contracts */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-500" />
                    10.2 Data Contracts
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Define and enforce quality expectations for your datasets. If data doesn't meet 
                    the contract, the pipeline is blocked.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Contract Components</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <CircleDot className="h-3 w-3 mt-1.5 text-blue-500" />
                          <div>
                            <strong>Schema Expectations</strong>: Column names, data types, constraints
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <CircleDot className="h-3 w-3 mt-1.5 text-purple-500" />
                          <div>
                            <strong>Quality Thresholds</strong>: Min completeness, max null rate
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <CircleDot className="h-3 w-3 mt-1.5 text-green-500" />
                          <div>
                            <strong>PII Guarantees</strong>: "No SSN", "No credit cards"
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <CircleDot className="h-3 w-3 mt-1.5 text-orange-500" />
                          <div>
                            <strong>Freshness SLA</strong>: Max age of data (e.g., 24 hours)
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Enforcement Modes</h4>
                      <div className="flex gap-3 flex-wrap">
                        <Badge className="bg-red-500/10 text-red-600">Strict (Block on violation)</Badge>
                        <Badge className="bg-yellow-500/10 text-yellow-600">Warn (Log but continue)</Badge>
                        <Badge className="bg-gray-500/10 text-gray-600">Audit (Log only)</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 11: Impact & Reports */}
            <section id="impact" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">11</span>
                </div>
                Impact & Reports
              </h2>

              <div className="space-y-6">
                {/* Impact Dashboard */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    11.1 Impact Dashboard
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Track the real-world impact of your AI decisions across populations.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">What You'll See</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Decision Outcomes</strong>: Approval/denial rates by demographic group</li>
                        <li>• <strong>Appeal Analysis</strong>: How often are decisions appealed? What's the overturn rate?</li>
                        <li>• <strong>Harm Detection</strong>: Tracked incidents of AI-caused harm</li>
                        <li>• <strong>Longitudinal Trends</strong>: How are metrics changing over time?</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Regulatory Reports */}
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    11.2 Regulatory Reports
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate compliance documentation for regulators, auditors, and stakeholders.
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">Available Report Types</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Report</th>
                              <th className="text-left py-2 px-3 font-medium">Purpose</th>
                              <th className="text-left py-2 px-3 font-medium">Regulation</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 px-3">EU AI Act Conformity</td>
                              <td className="py-2 px-3">Full compliance assessment</td>
                              <td className="py-2 px-3">EU AI Act</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Bias Audit Report</td>
                              <td className="py-2 px-3">Fairness analysis across demographics</td>
                              <td className="py-2 px-3">NYC Local Law 144</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Technical Documentation</td>
                              <td className="py-2 px-3">Model specifications and design</td>
                              <td className="py-2 px-3">EU AI Act Annex IV</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 px-3">Risk Assessment</td>
                              <td className="py-2 px-3">Comprehensive risk evaluation</td>
                              <td className="py-2 px-3">NIST AI RMF</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3">Incident Report</td>
                              <td className="py-2 px-3">Safety incident documentation</td>
                              <td className="py-2 px-3">EU AI Act Art. 62</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">How to Generate</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Navigate to <strong>Impact → Regulatory Reports</strong></li>
                        <li>2. Select report type from the dropdown</li>
                        <li>3. Choose date range and models to include</li>
                        <li>4. Click <strong>Generate Report</strong></li>
                        <li>5. Download as PDF or JSON</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="mb-12" />

            {/* Section 12: Settings */}
            <section id="settings" className="mb-20">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">12</span>
                </div>
                Settings (All Options)
              </h2>

              <div className="space-y-6">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    12.1 General Settings
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Setting</th>
                          <th className="text-left py-2 px-3 font-medium">Description</th>
                          <th className="text-left py-2 px-3 font-medium">Default</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-2 px-3">Organization Name</td>
                          <td className="py-2 px-3">Your company name (appears in reports)</td>
                          <td className="py-2 px-3">—</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3">Timezone</td>
                          <td className="py-2 px-3">For timestamps and scheduling</td>
                          <td className="py-2 px-3">UTC</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-3">Data Retention</td>
                          <td className="py-2 px-3">How long to keep evaluation data</td>
                          <td className="py-2 px-3">90 days</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Default Workspace</td>
                          <td className="py-2 px-3">Starting workspace on login</td>
                          <td className="py-2 px-3">First workspace</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                    12.2 Users & Teams
                  </h3>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Available Roles</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">Role</th>
                            <th className="text-left py-2 px-3 font-medium">Can Do</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b">
                            <td className="py-2 px-3 font-medium">Admin</td>
                            <td className="py-2 px-3">Everything (manage users, settings, all projects)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-medium">Evaluator</td>
                            <td className="py-2 px-3">Run evaluations, view results, create reports</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-medium">Reviewer</td>
                            <td className="py-2 px-3">HITL review, approve/reject decisions</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium">Viewer</td>
                            <td className="py-2 px-3">Read-only access to dashboards and reports</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Key className="h-5 w-5 text-green-500" />
                    12.3 API Keys / Provider Keys
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Store API keys for external providers (used when calling your models for evaluation).
                  </p>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Supported Providers</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">OpenAI</Badge>
                      <Badge variant="outline">Anthropic</Badge>
                      <Badge variant="outline">HuggingFace</Badge>
                      <Badge variant="outline">Google AI</Badge>
                      <Badge variant="outline">Azure OpenAI</Badge>
                      <Badge variant="outline">AWS Bedrock</Badge>
                      <Badge variant="outline">Cohere</Badge>
                      <Badge variant="outline">Custom</Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 mt-4">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-amber-500 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Security Note:</strong> API keys are encrypted at rest and never logged. 
                        They are only used server-side for evaluation calls.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Final Notes */}
            <div className="p-6 rounded-xl border bg-gradient-to-r from-primary/5 to-purple-500/5 mb-12">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                You're Ready!
              </h3>
              <p className="text-muted-foreground mb-4">
                You now have a complete understanding of the platform. Here's a quick summary of the most important paths:
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded bg-background">
                  <strong>First-time setup:</strong>
                  <p className="text-muted-foreground text-xs mt-1">Projects → Models → Run Evaluation → View Ledger</p>
                </div>
                <div className="p-3 rounded bg-background">
                  <strong>Daily monitoring:</strong>
                  <p className="text-muted-foreground text-xs mt-1">Observability → Alerts → HITL Console (if needed)</p>
                </div>
                <div className="p-3 rounded bg-background">
                  <strong>Compliance reporting:</strong>
                  <p className="text-muted-foreground text-xs mt-1">Impact Dashboard → Regulatory Reports → Download</p>
                </div>
                <div className="p-3 rounded bg-background">
                  <strong>Incident response:</strong>
                  <p className="text-muted-foreground text-xs mt-1">Alerts → Incidents → Decision Ledger (for audit)</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Fractal Unified Autonomous Governance Platform Documentation • Version 1.0.0 • MIT License</p>
              <p className="mt-2">
                Built with transparency, honesty, and passion. 🚀
              </p>
            </div>

          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default Documentation;
