import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Code, Play, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const defaultPolicy = `{
  "version": "1.0",
  "name": "My Policy Pack",
  "description": "Custom policy rules for AI safety",
  "rules": [
    {
      "id": "toxicity-block",
      "name": "Block Toxic Content",
      "description": "Block requests with high toxicity scores",
      "condition": {
        "engine": "toxicity",
        "operator": "gt",
        "threshold": 70
      },
      "action": "block",
      "priority": 100,
      "enabled": true
    },
    {
      "id": "pii-warn",
      "name": "Warn on PII Detection",
      "description": "Warn when PII is detected in requests",
      "condition": {
        "engine": "privacy",
        "operator": "gt",
        "threshold": 50
      },
      "action": "warn",
      "priority": 90,
      "enabled": true
    }
  ],
  "exemptions": {
    "environments": ["development"]
  }
}`;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface CompiledResult {
  success: boolean;
  compiled?: any;
  error?: string;
  errors?: string[];
}

export function PolicyDSLEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [dsl, setDsl] = useState(defaultPolicy);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [compiled, setCompiled] = useState<CompiledResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidation(null);
    setCompiled(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('compile-policy', {
        body: { action: 'validate', policyDSL: dsl },
      });
      
      if (error) throw error;
      setValidation(data as ValidationResult);
    } catch (error: any) {
      toast.error('Validation failed: ' + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompiled(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('compile-policy', {
        body: { action: 'compile', policyDSL: dsl },
      });
      
      if (error) throw error;
      setCompiled(data as CompiledResult);
      
      if (data?.success) {
        toast.success('Policy compiled successfully');
      }
    } catch (error: any) {
      toast.error('Compilation failed: ' + error.message);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('compile-policy', {
        body: { action: 'save', policyDSL: dsl },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Policy saved successfully');
        setIsOpen(false);
        // Trigger refetch of policies
        window.location.reload();
      } else {
        toast.error('Failed to save policy: ' + (data?.error || 'Unknown error'));
      }
    } catch (error: any) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <Code className="w-4 h-4 mr-2" />
          New Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Policy DSL Editor
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Editor Panel */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Policy Definition</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
                  {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span className="ml-1">Validate</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleCompile} disabled={isCompiling}>
                  {isCompiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span className="ml-1">Compile</span>
                </Button>
              </div>
            </div>
            <Textarea
              value={dsl}
              onChange={(e) => setDsl(e.target.value)}
              className="flex-1 font-mono text-sm resize-none min-h-[400px]"
              placeholder="Enter policy DSL..."
            />
          </div>
          
          {/* Results Panel */}
          <div className="flex flex-col min-h-0 overflow-auto">
            <span className="text-sm font-medium text-muted-foreground mb-2">Results</span>
            
            {/* Validation Results */}
            {validation && (
              <div className={cn(
                "p-4 rounded-lg mb-4 border",
                validation.valid 
                  ? "bg-success/10 border-success/30" 
                  : "bg-danger/10 border-danger/30"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {validation.valid ? (
                    <>
                      <Check className="w-5 h-5 text-success" />
                      <span className="font-medium text-success">Validation Passed</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-danger" />
                      <span className="font-medium text-danger">Validation Failed</span>
                    </>
                  )}
                </div>
                {validation.errors?.length > 0 && (
                  <ul className="text-sm text-danger space-y-1">
                    {validation.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            {/* Compiled Output */}
            {compiled?.success && compiled.compiled && (
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-medium text-success">Compiled Successfully</span>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{compiled.compiled.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="ml-2 font-mono">{compiled.compiled.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rules:</span>
                    <span className="ml-2">{compiled.compiled.rules?.length || 0} active</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hash:</span>
                    <span className="ml-2 font-mono text-xs bg-secondary px-2 py-1 rounded">
                      {compiled.compiled.hash}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t border-border">
                    <span className="text-muted-foreground block mb-2">Rule Summary:</span>
                    <div className="space-y-2">
                      {compiled.compiled.rules?.map((rule: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant={
                            rule.action === 'block' ? 'destructive' :
                            rule.action === 'warn' ? 'secondary' : 'outline'
                          }>
                            {rule.action}
                          </Badge>
                          <span>{rule.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({rule.condition.engine} {rule.condition.operator} {rule.condition.threshold})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {compiled?.error && (
              <div className="p-4 rounded-lg bg-danger/10 border border-danger/30">
                <div className="flex items-center gap-2 mb-2">
                  <X className="w-5 h-5 text-danger" />
                  <span className="font-medium text-danger">Compilation Failed</span>
                </div>
                <p className="text-sm text-danger">{compiled.error}</p>
                {compiled.errors?.map((err, i) => (
                  <p key={i} className="text-sm text-danger">{err}</p>
                ))}
              </div>
            )}
            
            {!validation && !compiled && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click Validate or Compile to check your policy</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="gradient" 
            onClick={handleSave} 
            disabled={isSaving || !compiled?.success}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Policy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
