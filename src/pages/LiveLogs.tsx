import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Pause, 
  Play, 
  Trash2, 
  Download,
  RefreshCw,
  Terminal,
  BarChart3,
  Settings2
} from 'lucide-react';
import { useStructuredLogs } from '@/hooks/useStructuredLogs';
import { LogStatsCards } from '@/components/logs/LogStatsCards';
import { LogFilters } from '@/components/logs/LogFilters';
import { LogStream } from '@/components/logs/LogStream';
import { logger } from '@/lib/structured-logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function LiveLogs() {
  const { 
    logs, 
    allLogs,
    isPaused, 
    filters,
    setFilters,
    clearLogs, 
    togglePause,
    refreshLogs,
    stats,
    categories,
    exportLogs,
  } = useStructuredLogs();

  const handleExport = (format: 'json' | 'ndjson') => {
    exportLogs(format);
    toast.success(`Exported ${logs.length} logs as ${format.toUpperCase()}`);
  };

  const handleConfigure = () => {
    logger.setConfig({ minLevel: 'DEBUG' });
    toast.success('Logging configuration updated');
  };

  return (
    <MainLayout title="Live Logs & Telemetry">
      <div className="space-y-4">
        {/* Stats Overview */}
        <LogStatsCards stats={stats} />

        {/* Main Content */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Log Stream
                {!isPaused && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={togglePause}
                  className={isPaused ? 'text-amber-400 border-amber-400/50' : ''}
                >
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>

                <Button variant="outline" size="sm" onClick={refreshLogs}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>

                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('ndjson')}>
                      Export as NDJSON (for log aggregators)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="sm" onClick={handleConfigure}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs defaultValue="stream" className="w-full">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="stream" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Stream
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stream" className="space-y-4 mt-4">
                {/* Filters */}
                <LogFilters 
                  filters={filters} 
                  setFilters={setFilters} 
                  categories={categories}
                />

                {/* Log Stream */}
                <LogStream logs={logs} isLive={!isPaused} />

                {/* Footer info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {logs.length.toLocaleString()} of {allLogs.length.toLocaleString()} events
                  </span>
                  <span>
                    Session: {logs[0]?.sessionId?.slice(0, 12)}...
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category breakdown */}
                  <Card className="bg-background/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Events by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.byCategory)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between">
                              <span className="text-sm">{cat}</span>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-2 bg-primary/50 rounded-full"
                                  style={{ width: `${Math.min((count / stats.total) * 200, 100)}px` }}
                                />
                                <span className="text-sm font-mono text-muted-foreground w-12 text-right">
                                  {count}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Level breakdown */}
                  <Card className="bg-background/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Events by Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.byLevel)
                          .filter(([, count]) => count > 0)
                          .map(([level, count]) => {
                            const colors: Record<string, string> = {
                              DEBUG: 'bg-slate-500',
                              INFO: 'bg-blue-500',
                              WARNING: 'bg-amber-500',
                              ERROR: 'bg-red-500',
                              CRITICAL: 'bg-rose-600',
                            };
                            return (
                              <div key={level} className="flex items-center justify-between">
                                <span className="text-sm">{level}</span>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className={`h-2 ${colors[level]} rounded-full`}
                                    style={{ width: `${Math.min((count / stats.total) * 200, 100)}px` }}
                                  />
                                  <span className="text-sm font-mono text-muted-foreground w-12 text-right">
                                    {count}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Retention info */}
                  <Card className="bg-background/50 md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Logging Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Min Level:</span>
                          <span className="ml-2 font-mono">DEBUG</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max Logs:</span>
                          <span className="ml-2 font-mono">2,000</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Retention:</span>
                          <span className="ml-2 font-mono">7 days</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Format:</span>
                          <span className="ml-2 font-mono">JSON</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
