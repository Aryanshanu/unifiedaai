import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Loader2,
  Activity,
  AlertTriangle,
  Shield,
  FileCheck,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  icon: React.ReactNode;
  action: () => Promise<void>;
}

export default function GoldenDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const demoSteps: DemoStep[] = [
    {
      id: 'traffic',
      title: 'Generate AI Traffic',
      description: 'Simulating 100 requests through the AI Gateway...',
      duration: 10,
      icon: <Activity className="w-5 h-5" />,
      action: async () => {
        await supabase.functions.invoke('generate-test-traffic', {
          body: { count: 50, generateDrift: true }
        });
        toast.success("Traffic generated", { description: "50 requests logged" });
      }
    },
    {
      id: 'drift',
      title: 'Drift Alert Detected',
      description: 'Statistical drift detected in model outputs...',
      duration: 8,
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      action: async () => {
        // Drift alerts should be created by generate-test-traffic
        toast.warning("Drift Alert", { description: "Output distribution shift detected" });
      }
    },
    {
      id: 'incident',
      title: 'Incident Created',
      description: 'Automatic incident creation from drift alert...',
      duration: 8,
      icon: <AlertTriangle className="w-5 h-5 text-danger" />,
      action: async () => {
        toast.info("Incident #INC-AUTO created", { description: "Escalating to review queue" });
      }
    },
    {
      id: 'hitl',
      title: 'HITL Review Queued',
      description: 'Escalated to human reviewer for approval...',
      duration: 12,
      icon: <Shield className="w-5 h-5 text-primary" />,
      action: async () => {
        toast.info("Review queued", { description: "Awaiting human decision" });
      }
    },
    {
      id: 'approve',
      title: 'Reviewer Approves',
      description: 'Senior reviewer approves with conditions...',
      duration: 10,
      icon: <CheckCircle className="w-5 h-5 text-success" />,
      action: async () => {
        // Simulate approval
        toast.success("Approved", { description: "Model cleared for production" });
        toast("✓ Notification sent to Slack", { icon: "🔔" });
      }
    },
    {
      id: 'attestation',
      title: 'Attestation Generated',
      description: 'Cryptographic attestation signed...',
      duration: 12,
      icon: <FileCheck className="w-5 h-5 text-primary" />,
      action: async () => {
        toast.success("Attestation signed", { description: "Hash chain verified" });
      }
    },
    {
      id: 'scorecard',
      title: 'Scorecard Exported',
      description: 'PDF compliance scorecard generated...',
      duration: 10,
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      action: async () => {
        toast.success("Scorecard ready", { description: "PDF export complete" });
      }
    },
  ];

  const totalDuration = demoSteps.reduce((acc, step) => acc + step.duration, 0);
  const elapsedTime = demoSteps.slice(0, currentStep).reduce((acc, step) => acc + step.duration, 0) + 
    (stepProgress / 100) * (demoSteps[currentStep]?.duration || 0);
  const overallProgress = (elapsedTime / totalDuration) * 100;

  const runStep = useCallback(async (stepIndex: number) => {
    if (stepIndex >= demoSteps.length) {
      setIsPlaying(false);
      toast.success("🎉 Golden Demo Complete!", { 
        description: "Full RAI workflow demonstrated in 90 seconds" 
      });
      return;
    }

    const step = demoSteps[stepIndex];
    setCurrentStep(stepIndex);
    setStepProgress(0);

    // Run the step action
    try {
      await step.action();
    } catch (error) {
      console.error('Step action error:', error);
    }

    // Animate progress
    const intervalDuration = 100;
    const increments = (step.duration * 1000) / intervalDuration;
    const progressIncrement = 100 / increments;
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += progressIncrement;
      setStepProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        clearInterval(interval);
        setCompletedSteps(prev => new Set([...prev, stepIndex]));
        
        // Move to next step if still playing
        if (isPlaying) {
          runStep(stepIndex + 1);
        }
      }
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [demoSteps, isPlaying]);

  useEffect(() => {
    if (isPlaying && currentStep < demoSteps.length) {
      runStep(currentStep);
    }
  }, [isPlaying]);

  const handlePlay = () => {
    if (completedSteps.size === demoSteps.length) {
      // Reset if completed
      setCompletedSteps(new Set());
      setCurrentStep(0);
      setStepProgress(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setStepProgress(0);
    setCompletedSteps(new Set());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/80 to-primary text-primary-foreground py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Golden Demo
            </h1>
            <p className="text-sm opacity-80">Fractal RAI-OS Full Workflow in 90 Seconds</p>
          </div>
          <div className="flex items-center gap-3">
            {!isPlaying ? (
              <Button onClick={handlePlay} className="gap-2 bg-white text-primary hover:bg-white/90">
                <Play className="w-4 h-4" />
                {completedSteps.size > 0 ? 'Replay' : 'Start Demo'}
              </Button>
            ) : (
              <Button onClick={handlePause} variant="secondary" className="gap-2">
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
            <Button onClick={handleReset} variant="ghost" size="icon" className="hover:bg-white/20">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-card border-b border-border py-3 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-mono">{Math.round(overallProgress)}% • {Math.round(elapsedTime)}s / {totalDuration}s</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {demoSteps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = completedSteps.has(index);
            const isPending = index > currentStep;

            return (
              <Card 
                key={step.id}
                className={cn(
                  "transition-all duration-300",
                  isActive && "ring-2 ring-primary shadow-lg",
                  isCompleted && "opacity-70"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Step Number/Status */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      isCompleted ? "bg-success/20 text-success" :
                      isActive ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : isActive && isPlaying ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium",
                          isPending && "text-muted-foreground"
                        )}>
                          {step.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {step.duration}s
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      
                      {/* Step Progress */}
                      {isActive && (
                        <Progress value={stepProgress} className="h-1 mt-3" />
                      )}
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      variant={isCompleted ? "default" : isPending ? "outline" : "secondary"}
                      className={cn(
                        isCompleted && "bg-success"
                      )}
                    >
                      {isCompleted ? 'Done' : isActive ? 'Running' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted py-4 px-6 text-center text-sm text-muted-foreground">
        <p>Press <kbd className="px-1.5 py-0.5 bg-background rounded border">Space</kbd> to play/pause • This demo is for investor presentations</p>
      </div>
    </div>
  );
}
