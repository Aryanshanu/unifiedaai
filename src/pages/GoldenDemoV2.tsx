import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Play, Square, RotateCcw, Download, Printer, 
  CheckCircle2, AlertTriangle, XCircle, Info, Loader2,
  Zap, Eye, Route, Settings2, Clock, FileJson, FileText,
  Shield, Activity, Users, AlertCircle, BarChart3, Cpu
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProjectModels } from "@/hooks/useModels";
import { useGoldenDemoOrchestrator, DemoMode, DemoLog } from "@/hooks/useGoldenDemoOrchestrator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MODE_OPTIONS = [
  {
    id: 'single-page' as DemoMode,
    title: 'Single-Page Live Run',
    description: 'Watch the entire pipeline execute from this page with live logs',
    icon: Eye,
  },
  {
    id: 'page-tour' as DemoMode,
    title: 'Autonomous Page Tour',
    description: 'Navigate through each engine and monitoring page automatically',
    icon: Route,
  },
];

function LogEntry({ log }: { log: DemoLog }) {
  const Icon = log.type === 'success' ? CheckCircle2 
    : log.type === 'warning' ? AlertTriangle 
    : log.type === 'error' ? XCircle 
    : Info;
  
  const colorClass = log.type === 'success' ? 'text-success' 
    : log.type === 'warning' ? 'text-warning' 
    : log.type === 'error' ? 'text-destructive' 
    : 'text-muted-foreground';

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 text-sm hover:bg-muted/30 rounded">
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", colorClass)} />
      <span className="text-muted-foreground text-xs font-mono flex-shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={cn("flex-1", log.type === 'error' && 'text-destructive')}>
        {log.message}
      </span>
    </div>
  );
}

function CounterCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-center">
      <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function GoldenDemoV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<DemoMode>('single-page');
  const [generateScorecard, setGenerateScorecard] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  
  // Data
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: models, isLoading: modelsLoading } = useProjectModels(selectedProjectId);

  // Demo scenarios query
  const { data: demoScenarios } = useQuery({
    queryKey: ['demo-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_scenarios')
        .select('*')
        .eq('enabled', true)
        .order('category');
      if (error) return [];
      return data || [];
    },
  });
  
  // Orchestrator
  const orchestrator = useGoldenDemoOrchestrator();

  // Pre-select from URL params
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    const modelId = searchParams.get('modelId');
    if (projectId) setSelectedProjectId(projectId);
    if (modelId) setSelectedModelId(modelId);
  }, [searchParams]);

  // Get selected model details
  const selectedModel = models?.find(m => m.id === selectedModelId);
  const systemId = selectedModel?.system_id;
  const hasEndpoint = selectedModel?.huggingface_endpoint || selectedModel?.endpoint || selectedModel?.system?.endpoint;

  const canStart = selectedProjectId && selectedModelId && systemId && !orchestrator.isRunning;

  const handleStart = () => {
    if (!canStart || !systemId) return;
    
    orchestrator.start({
      modelId: selectedModelId,
      systemId,
      projectId: selectedProjectId,
      mode: selectedMode,
      onNavigate: selectedMode === 'page-tour' ? (path) => navigate(path) : undefined,
    });
  };

  const handleBack = () => {
    if (orchestrator.isRunning) {
      orchestrator.stop();
    }
    navigate(-1);
  };

  // Setup/Selection View
  const renderSetupView = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Demo Configuration
          </CardTitle>
          <CardDescription>
            Select a project and model to run the end-to-end RAI pipeline demonstration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select 
              value={selectedProjectId} 
              onValueChange={(v) => {
                setSelectedProjectId(v);
                setSelectedModelId("");
              }}
              disabled={projectsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model / LLM</Label>
            <Select 
              value={selectedModelId} 
              onValueChange={setSelectedModelId}
              disabled={!selectedProjectId || modelsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedProjectId 
                    ? "Select a project first" 
                    : modelsLoading 
                      ? "Loading models..." 
                      : "Select a model"
                } />
              </SelectTrigger>
              <SelectContent>
                {models?.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      <Badge variant="outline" className="text-xs">{m.model_type}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedModelId && !hasEndpoint && (
              <div className="flex items-center gap-2 text-warning text-sm bg-warning/10 p-2 rounded">
                <AlertTriangle className="w-4 h-4" />
                <span>No endpoint configured. Some features may be limited.</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label>Run Mode</Label>
            <div className="grid grid-cols-2 gap-4">
              {MODE_OPTIONS.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    selectedMode === mode.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <mode.icon className={cn(
                    "w-6 h-6 mb-2",
                    selectedMode === mode.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="font-medium">{mode.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Demo Scenario Selection */}
          {demoScenarios && demoScenarios.length > 0 && (
            <div className="space-y-2">
              <Label>Demo Scenario (Optional)</Label>
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                <SelectTrigger>
                  <SelectValue placeholder="Use default demo flow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default Flow</SelectItem>
                  {demoScenarios.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.scenario_name}</span>
                        <Badge variant="outline" className="text-xs">{s.category}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pre-configured scenarios for specific demonstration use cases
              </p>
            </div>
          )}

          <Separator />

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scorecard-toggle">Generate Scorecard at End</Label>
              <div className="text-xs text-muted-foreground">
                Create a downloadable compliance scorecard
              </div>
            </div>
            <Switch 
              id="scorecard-toggle"
              checked={generateScorecard}
              onCheckedChange={setGenerateScorecard}
            />
          </div>

          {/* Start Button */}
          <Button 
            onClick={handleStart}
            disabled={!canStart}
            size="lg"
            className="w-full gap-2"
          >
            <Play className="w-5 h-5" />
            Start Golden Demo
          </Button>
        </CardContent>
      </Card>

      {/* What will happen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Will Happen</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Run all 5 evaluation engines (Fairness, Toxicity, Privacy, Hallucination, Explainability)</li>
            <li>Generate real traffic through the AI Gateway</li>
            <li>Detect drift in model behavior</li>
            <li>Create incidents and escalate to HITL review</li>
            <li>Run Red Team adversarial campaign</li>
            <li className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Run Oversight Agent simulation (new)
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Execute Predictive Governance analysis (new)
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Check for Governance Bypass attempts (new)
            </li>
            <li>Generate regulatory-grade compliance scorecard</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );

  // Running/Complete View
  const renderRunningView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Progress Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {orchestrator.isRunning ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : orchestrator.currentStep === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : orchestrator.currentStep === 'error' ? (
                    <XCircle className="w-5 h-5 text-destructive" />
                  ) : null}
                  {orchestrator.stepLabel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedModel?.name} • {selectedMode === 'page-tour' ? 'Page Tour' : 'Single Page'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{formatTime(orchestrator.elapsedTime)}</span>
                </div>
                <div className="flex gap-2">
                  {orchestrator.isRunning ? (
                    <Button variant="destructive" size="sm" onClick={orchestrator.stop}>
                      <Square className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={orchestrator.reset}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <Progress value={orchestrator.progress * 100} className="h-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Step {Math.max(1, orchestrator.stepOrder.indexOf(orchestrator.currentStep) + 1)} of {orchestrator.stepOrder.length}</span>
              <span>{Math.round(orchestrator.progress * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Counters */}
        <div className="grid grid-cols-5 gap-3">
          <CounterCard label="Requests" value={orchestrator.counters.requests} icon={Activity} />
          <CounterCard label="Blocks" value={orchestrator.counters.blocks} icon={Shield} />
          <CounterCard label="Evaluations" value={orchestrator.counters.evaluations} icon={BarChart3} />
          <CounterCard label="Incidents" value={orchestrator.counters.incidents} icon={AlertCircle} />
          <CounterCard label="HITL Items" value={orchestrator.counters.hitlItems} icon={Users} />
        </div>

        {/* Live Logs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Live Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] border border-border rounded-md bg-muted/20">
              <div className="p-2 space-y-0.5">
                {orchestrator.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Logs will appear here when the demo starts
                  </div>
                ) : (
                  orchestrator.logs.map(log => (
                    <LogEntry key={log.id} log={log} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Scorecard Panel */}
        {orchestrator.currentStep === 'complete' && orchestrator.hasScorecard && (
          <Card className="border-success/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="w-4 h-4 text-success" />
                Scorecard Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={orchestrator.downloadScorecardJson}
                className="w-full gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Download JSON
              </Button>
              <Button 
                onClick={orchestrator.openPrintableScorecard}
                className="w-full gap-2"
                variant="outline"
              >
                <Printer className="w-4 h-4" />
                Open Printable Version
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completion Actions */}
        {orchestrator.currentStep === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/gaps-closed')}
              >
                View Gap Analysis
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/hitl')}
              >
                Review HITL Queue
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/incidents')}
              >
                View Incidents
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/observability')}
              >
                View Observability
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {orchestrator.error && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{orchestrator.error}</p>
              <Button 
                onClick={handleStart}
                className="w-full mt-4"
                variant="outline"
              >
                Retry Demo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orchestrator.stepOrder.slice(0, -1).map((step, idx) => {
                const currentIdx = orchestrator.stepOrder.indexOf(orchestrator.currentStep);
                const isComplete = idx < currentIdx;
                const isCurrent = step === orchestrator.currentStep;
                
                return (
                  <div 
                    key={step}
                    className={cn(
                      "flex items-center gap-2 py-1.5 px-2 rounded text-sm",
                      isComplete && "text-success",
                      isCurrent && "bg-primary/10 text-primary font-medium",
                      !isComplete && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-current" />
                    )}
                    <span className="capitalize">{step.replace(/-/g, ' ').replace('eval ', '')}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const isRunningOrComplete = orchestrator.currentStep !== 'idle';

  return (
    <MainLayout 
      title="Golden Demo" 
      subtitle="End-to-End RAI Pipeline Demonstration"
      headerActions={
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      }
    >
      {isRunningOrComplete ? renderRunningView() : renderSetupView()}
    </MainLayout>
  );
}
