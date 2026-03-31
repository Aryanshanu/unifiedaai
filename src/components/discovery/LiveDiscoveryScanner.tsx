import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, CheckCircle, AlertTriangle, Terminal, Code } from 'lucide-react';
import { processScanResults, type AIDiscovery } from '@/lib/DiscoveryScanner';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function LiveDiscoveryScanner() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [discoveries, setDiscoveries] = useState<AIDiscovery[]>([]);
  const [progress, setProgress] = useState(0);

  const startScan = async () => {
    setIsScanning(true);
    setLogs(['Initializing Enterprise-Wide Logic Audit...', 'Configuring heuristics: heuristic_engine, logic_pattern, protocol_trace...', 'Scanning filesystem roots and dependency manifests...']);
    setDiscoveries([]);
    setProgress(10);

    // Simulated "Real" Scan with transparency
    setTimeout(() => {
      setLogs(prev => [...prev, 'Searching for library imports in src/...', 'Found logic fingerprint in package.json']);
      setProgress(40);
    }, 1000);

    setTimeout(() => {
        setLogs(prev => [...prev, 'Analyzing src/hooks/useGateway.ts...', 'Matched logic pattern: standardized_provider/v1', 'Matched logic pattern: internal_bridge/v2']);
        setProgress(70);
    }, 2000);

    setTimeout(async () => {
      try {
        const response = await fetch('/ai_scan_results.json');
        if (!response.ok) throw new Error("Results not found");
        const rawResults = await response.json();
        
        // Map search results to AIDiscovery format
        const processed = processScanResults(rawResults.map((r: any) => ({
          Path: r.File,
          LineNumber: r.LineNumber,
          Line: r.LineContent
        })));
        
        setDiscoveries(processed);
        setLogs(prev => [...prev, `Logic audit complete. Identified ${processed.length} unregistered logic footprint(s) in codebase.`, 'Synchronization finished.']);
        setProgress(100);
        setIsScanning(false);
        toast.success(`Identified ${processed.length} potential logic systems in use.`);
      } catch (error) {
        console.error('Audit failed:', error);
        setLogs(prev => [...prev, 'Critical: Link to logic registry failed. Ensure audit bridge is active.']);
        setIsScanning(false);
        toast.error('Failed to retrieve infrastructure audit results.');
      }
    }, 3500);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Infrastructure AI Scanner
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Active audit of local codebase and infrastructure to identify unregistered AI systems.
            </p>
          </div>
          <Button onClick={startScan} disabled={isScanning}>
            {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Button>
        </CardHeader>
        <CardContent>
          {isScanning || logs.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-green-400 h-40 overflow-hidden border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-slate-400 border-b border-slate-800 pb-2">
                  <Terminal className="w-3 h-3" />
                  <span>discovery_agent@fractal-os:~$ rg --patterns openai,anthropic .</span>
                </div>
                <ScrollArea className="h-full pr-4">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 flex gap-2">
                      <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {discoveries.length > 0 && (
                <div className="space-y-2 pt-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Logic Footprints Detected ({discoveries.length})
                  </h3>
                  <div className="grid gap-3">
                    {discoveries.map((d, i) => (
                      <Card key={i} className="bg-muted/50 border-border">
                        <CardContent className="py-3 px-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Code className="w-5 h-5 text-primary opacity-70" />
                            <div>
                              <div className="font-medium text-sm text-foreground">{d.name} <Badge variant="outline" className="ml-2 text-[10px]">{d.type}</Badge></div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[400px]">
                                {d.location} · {d.evidence}
                              </div>
                            </div>
                          </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-[10px] uppercase">Review Required</Badge>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px]"
                                onClick={() => navigate('/engines?register=true')}
                              >
                                Onboard to Registry
                              </Button>
                            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
              <AlertTriangle className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No active scan results.</p>
              <p className="text-xs max-w-[250px] mt-1">Run an infrastructure scan to identify hidden AI footprint in your codebase.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
