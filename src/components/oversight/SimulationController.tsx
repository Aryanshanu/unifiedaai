import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RefreshCw, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SimulationStats {
  total_generated: number;
  total_errors: number;
  event_type_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  correlation_groups_created: number;
}

export function SimulationController() {
  const [isRunning, setIsRunning] = useState(false);
  const [eventCount, setEventCount] = useState(1000);
  const [batchSize, setBatchSize] = useState(100);
  const [includeCorrelations, setIncludeCorrelations] = useState(true);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [progress, setProgress] = useState(0);

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(10);
    setStats(null);

    try {
      toast.info("Starting synthetic event generation...");
      setProgress(20);

      const { data, error } = await supabase.functions.invoke("generate-synthetic-events", {
        body: {
          total_events: eventCount,
          batch_size: batchSize,
          include_correlations: includeCorrelations,
        },
      });

      setProgress(80);

      if (error) throw error;

      setStats(data);
      setProgress(100);
      
      toast.success(`Generated ${data.total_generated} events successfully!`);

      // Trigger event processing
      toast.info("Processing events for alert generation...");
      await supabase.functions.invoke("process-events", {
        body: { batch_size: Math.min(data.total_generated, 500) },
      });

    } catch (error) {
      console.error("Simulation error:", error);
      toast.error("Simulation failed. Check console for details.");
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);
    toast.warning("Simulation stopped");
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Oversight Agent Simulation
          </CardTitle>
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? "Running" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventCount">Total Events</Label>
            <Input
              id="eventCount"
              type="number"
              min={100}
              max={10000}
              value={eventCount}
              onChange={(e) => setEventCount(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min={10}
              max={500}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="correlations"
              checked={includeCorrelations}
              onCheckedChange={setIncludeCorrelations}
              disabled={isRunning}
            />
            <Label htmlFor="correlations">Include correlation groups</Label>
          </div>
        </div>

        {/* Progress */}
        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={stopSimulation} className="flex-1">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button onClick={runSimulation} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Run Simulation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setStats(null)}
            disabled={isRunning || !stats}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Results */}
        {stats && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-success" />
              Simulation Complete
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.total_generated}</div>
                <div className="text-xs text-muted-foreground">Events Generated</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.correlation_groups_created}</div>
                <div className="text-xs text-muted-foreground">Correlation Groups</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className={cn(
                  "text-2xl font-bold",
                  stats.total_errors > 0 ? "text-risk-high" : "text-success"
                )}>
                  {stats.total_errors}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Event Type Distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Event Type Distribution</div>
              <div className="space-y-1">
                {Object.entries(stats.event_type_distribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{type.replace('_', ' ')}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Severity Distribution</div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(stats.severity_distribution).map(([severity, count]) => (
                  <Badge
                    key={severity}
                    variant={severity === 'critical' ? 'destructive' : 'secondary'}
                    className="font-mono"
                  >
                    {severity}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
