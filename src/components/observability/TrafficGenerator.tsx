import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Zap, Loader2, CheckCircle2, Activity } from "lucide-react";
import { useSystems } from "@/hooks/useSystems";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface GenerationResult {
  request_logs: number;
  drift_alerts: number;
  review_items: number;
  incidents: number;
}

export function TrafficGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [count, setCount] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const { data: systems } = useSystems();
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-test-traffic', {
        body: { 
          systemId: selectedSystem === 'all' ? undefined : selectedSystem || undefined,
          count,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setResult(data.generated);
        toast.success('Test traffic generated successfully');
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['request-logs'] });
        queryClient.invalidateQueries({ queryKey: ['activity-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['system-health-summary'] });
        queryClient.invalidateQueries({ queryKey: ['drift-alerts'] });
        queryClient.invalidateQueries({ queryKey: ['review-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    } catch (error: any) {
      toast.error('Generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="w-4 h-4 mr-2" />
          Generate Traffic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Generate Test Traffic
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Generate realistic test traffic to populate observability dashboards with request logs, 
            drift alerts, and HITL review items.
          </p>
          
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Target System (optional)</Label>
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger>
                  <SelectValue placeholder="All systems" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All systems</SelectItem>
                  {systems?.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Number of Requests</Label>
              <Input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 50)}
                min={10}
                max={500}
              />
              <p className="text-xs text-muted-foreground">
                Requests will be distributed across the last 24 hours
              </p>
            </div>
          </div>
          
          {result && (
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="font-medium text-success">Generation Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Request Logs:</span>
                  <span className="ml-2 font-medium">{result.request_logs}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Drift Alerts:</span>
                  <span className="ml-2 font-medium">{result.drift_alerts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Review Items:</span>
                  <span className="ml-2 font-medium">{result.review_items}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Incidents:</span>
                  <span className="ml-2 font-medium">{result.incidents}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button variant="gradient" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
