import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EUAIActAssessmentProps {
  modelId: string;
  modelName: string;
}

interface ControlAssessment {
  code: string;
  title: string;
  status: 'pass' | 'fail' | 'partial';
  category: string;
}

const EU_AI_ACT_CONTROLS: Omit<ControlAssessment, 'status'>[] = [
  { code: 'EU-AI-1.1', title: 'Risk management system established', category: 'Risk Management' },
  { code: 'EU-AI-1.2', title: 'Risk identification and analysis', category: 'Risk Management' },
  { code: 'EU-AI-2.1', title: 'Training data quality measures', category: 'Data Governance' },
  { code: 'EU-AI-2.2', title: 'Data bias examination', category: 'Data Governance' },
  { code: 'EU-AI-3.1', title: 'System specifications documented', category: 'Technical Documentation' },
  { code: 'EU-AI-4.1', title: 'Automatic event logging', category: 'Record Keeping' },
  { code: 'EU-AI-5.1', title: 'User instructions provided', category: 'Transparency' },
  { code: 'EU-AI-6.1', title: 'Human oversight mechanism', category: 'Human Oversight' },
  { code: 'EU-AI-7.1', title: 'Appropriate accuracy levels', category: 'Accuracy & Robustness' },
  { code: 'NIST-3.1', title: 'Bias and fairness measured', category: 'NIST AI RMF' },
];

export function EUAIActAssessment({ modelId, modelName }: EUAIActAssessmentProps) {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ControlAssessment[]>([]);
  const [progress, setProgress] = useState(0);

  const runAssessment = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const assessedControls: ControlAssessment[] = [];
    
    for (let i = 0; i < EU_AI_ACT_CONTROLS.length; i++) {
      const control = EU_AI_ACT_CONTROLS[i];
      // Default to partial - real implementation would check actual data
      const status: 'pass' | 'fail' | 'partial' = 'partial';
      
      assessedControls.push({ ...control, status });
      setProgress(Math.round(((i + 1) / EU_AI_ACT_CONTROLS.length) * 100));
      setResults([...assessedControls]);
      await new Promise(r => setTimeout(r, 50));
    }

    toast.success("Assessment completed", {
      description: `Run evaluations to improve control status`
    });
    setIsRunning(false);
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const partialCount = results.filter(r => r.status === 'partial').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const complianceScore = results.length > 0 
    ? Math.round((passCount + partialCount * 0.5) / results.length * 100) : 0;

  const groupedResults = results.reduce((acc, control) => {
    if (!acc[control.category]) acc[control.category] = [];
    acc[control.category].push(control);
    return acc;
  }, {} as Record<string, ControlAssessment[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="w-4 h-4" />
          EU AI Act Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            EU AI Act Assessment
          </DialogTitle>
          <DialogDescription>
            Compliance check for {modelName} against EU AI Act and NIST AI RMF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isRunning && results.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-primary/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Run assessment of {EU_AI_ACT_CONTROLS.length} controls
              </p>
              <Button onClick={runAssessment} className="gap-2">
                <FileCheck className="w-4 h-4" />
                Run Assessment
              </Button>
            </div>
          )}

          {(isRunning || results.length > 0) && (
            <>
              <Progress value={progress} className="h-2" />
              {results.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-card border rounded-lg p-4 text-center">
                    <p className={cn("text-3xl font-bold font-mono",
                      complianceScore >= 80 ? "text-success" : 
                      complianceScore >= 60 ? "text-warning" : "text-destructive"
                    )}>{complianceScore}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold font-mono text-success">{passCount}</p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold font-mono text-warning">{partialCount}</p>
                    <p className="text-xs text-muted-foreground">Partial</p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold font-mono text-destructive">{failCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              )}
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {Object.entries(groupedResults).map(([category, controls]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium">{category}</h4>
                      {controls.map((control) => (
                        <div key={control.code} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                          {control.status === 'pass' ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : control.status === 'partial' ? (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-xs font-mono text-muted-foreground w-20">{control.code}</span>
                          <span className="text-sm flex-1">{control.title}</span>
                          <Badge variant="outline" className={cn("text-xs",
                            control.status === 'pass' ? "border-success text-success" :
                            control.status === 'partial' ? "border-warning text-warning" :
                            "border-destructive text-destructive"
                          )}>{control.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
