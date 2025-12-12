import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Search, 
  Pause, 
  Play, 
  Trash2, 
  Download,
  RefreshCw,
  Clock,
  Bug,
  Info,
  AlertTriangle,
  XCircle,
  Flame,
  TrendingUp,
  Terminal,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// ============ TYPES ============
type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface StructuredLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  source: string;
  sessionId: string;
  duration?: number;
  metadata: Record<string, any>;
  tags: string[];
}

interface LogFilters {
  search: string;
  levels: LogLevel[];
  categories: string[];
  timeRange: '5m' | '15m' | '1h' | '24h' | 'all';
}

// ============ SIMPLE LOGGER ============
const logs: StructuredLog[] = [];
const subscribers = new Set<(log: StructuredLog) => void>();
const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function addLog(level: LogLevel, category: string, message: string, source: string, metadata: Record<string, any> = {}, tags: string[] = []): StructuredLog {
  const log: StructuredLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    source,
    sessionId,
    metadata,
    tags: [...tags, level.toLowerCase()],
  };
  logs.unshift(log);
  if (logs.length > 2000) logs.pop();
  subscribers.forEach(sub => sub(log));
  return log;
}

function subscribeToLogs(callback: (log: StructuredLog) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function clearAllLogs() {
  logs.length = 0;
}

function getAllLogs(): StructuredLog[] {
  return [...logs];
}

// Intercept fetch calls
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [url, options] = args;
    const urlString = typeof url === 'string' ? url : url.toString();
    const method = options?.method || 'GET';
    const startTime = performance.now();
    const endpoint = urlString.split('?')[0].split('/').pop() || 'unknown';

    if (urlString.includes('realtime')) {
      return originalFetch.apply(this, args);
    }

    addLog('DEBUG', 'Network', `${method} ${endpoint}`, 'fetch', { url: urlString, method }, ['network', 'outbound']);

    try {
      const response = await originalFetch.apply(this, args);
      const duration = Math.round(performance.now() - startTime);
      addLog(response.ok ? 'INFO' : 'ERROR', 'Network', `${method} ${endpoint} → ${response.status}`, 'fetch', { statusCode: response.status, duration }, ['network', 'response']);
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      addLog('ERROR', 'Network', `${method} ${endpoint} → FAILED`, 'fetch', { error: error instanceof Error ? error.message : 'Unknown', duration }, ['network', 'error']);
      throw error;
    }
  };
}

// ============ LEVEL CONFIG ============
const levelConfig: Record<LogLevel, { icon: React.ReactNode; className: string; color: string }> = {
  DEBUG: { icon: <Bug className="h-3 w-3" />, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30', color: 'text-slate-400' },
  INFO: { icon: <Info className="h-3 w-3" />, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', color: 'text-blue-400' },
  WARNING: { icon: <AlertTriangle className="h-3 w-3" />, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', color: 'text-amber-400' },
  ERROR: { icon: <XCircle className="h-3 w-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30', color: 'text-red-400' },
  CRITICAL: { icon: <Flame className="h-3 w-3" />, className: 'bg-rose-600/30 text-rose-400 border-rose-500/50', color: 'text-rose-400' },
};

const ALL_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

// ============ LOG ENTRY COMPONENT ============
function LogEntry({ log }: { log: StructuredLog }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const config = levelConfig[log.level];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-500/5' : ''}`}>
      <div className="flex items-center gap-2 py-2 px-3 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        <button className="w-4 h-4 shrink-0 text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
        <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">{format(new Date(log.timestamp), 'HH:mm:ss.SSS')}</span>
        <Badge variant="outline" className={`${config.className} font-mono text-xs px-2 py-0.5`}><span className="mr-1">{config.icon}</span>{log.level}</Badge>
        <Badge variant="secondary" className="text-xs px-2 py-0 shrink-0 bg-muted/50">{log.category}</Badge>
        <span className="text-xs text-muted-foreground shrink-0 font-mono">[{log.source}]</span>
        <span className="text-sm flex-1 truncate">{log.message}</span>
        {log.metadata.duration !== undefined && <span className="text-xs text-muted-foreground shrink-0 font-mono">{log.metadata.duration}ms</span>}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      {expanded && (
        <div className="ml-8 mr-3 mb-3 p-3 bg-background/80 rounded-lg border border-border/50">
          <div className="grid grid-cols-2 gap-4 text-xs mb-3">
            <div><span className="text-muted-foreground">Timestamp:</span><span className="ml-2 font-mono">{log.timestamp}</span></div>
            <div><span className="text-muted-foreground">Session:</span><span className="ml-2 font-mono">{log.sessionId.slice(0, 12)}...</span></div>
          </div>
          {log.tags.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">{log.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>)}</div>
            </div>
          )}
          {Object.keys(log.metadata).length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Metadata:</span>
              <pre className="mt-1 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(log.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function LiveLogs() {
  const [allLogs, setAllLogs] = useState<StructuredLog[]>(() => getAllLogs());
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    levels: [],
    categories: [],
    timeRange: 'all',
  });

  useEffect(() => {
    if (isPaused) return;
    const unsubscribe = subscribeToLogs((newLog) => {
      setAllLogs(prev => [newLog, ...prev].slice(0, 2000));
    });
    return unsubscribe;
  }, [isPaused]);

  const clearLogs = useCallback(() => {
    clearAllLogs();
    setAllLogs([]);
  }, []);

  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);
  const refreshLogs = useCallback(() => setAllLogs(getAllLogs()), []);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const timeRanges: Record<string, number> = { '5m': 5 * 60 * 1000, '15m': 15 * 60 * 1000, '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, 'all': Infinity };
    return allLogs.filter(log => {
      if (filters.timeRange !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        if (now - logTime > timeRanges[filters.timeRange]) return false;
      }
      if (filters.levels.length > 0 && !filters.levels.includes(log.level)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(log.category)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!log.message.toLowerCase().includes(searchLower) && !log.category.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [allLogs, filters]);

  const stats = useMemo(() => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const byLevel: Record<LogLevel, number> = { DEBUG: 0, INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
    const byCategory: Record<string, number> = {};
    let last5Min = 0, errorsLast1h = 0;
    for (const log of allLogs) {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      const logTime = new Date(log.timestamp).getTime();
      if (logTime > fiveMinAgo) last5Min++;
      if (logTime > oneHourAgo && (log.level === 'ERROR' || log.level === 'CRITICAL')) errorsLast1h++;
    }
    return { total: allLogs.length, byLevel, byCategory, last5Min, errorsLast1h };
  }, [allLogs]);

  const categories = useMemo(() => Array.from(new Set(allLogs.map(l => l.category))).sort(), [allLogs]);

  const toggleLevel = (level: LogLevel) => {
    const newLevels = filters.levels.includes(level) ? filters.levels.filter(l => l !== level) : [...filters.levels, level];
    setFilters({ ...filters, levels: newLevels });
  };

  const clearFilters = () => setFilters({ search: '', levels: [], categories: [], timeRange: 'all' });
  const hasActiveFilters = filters.search || filters.levels.length > 0 || filters.categories.length > 0 || filters.timeRange !== 'all';

  const exportLogs = (format: 'json' | 'ndjson') => {
    const data = format === 'json' ? JSON.stringify(filteredLogs, null, 2) : filteredLogs.map(l => JSON.stringify(l)).join('\n');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} logs`);
  };

  const generateTestLog = () => {
    addLog('INFO', 'Test', 'This is a test log entry', 'user-action', { action: 'test', timestamp: Date.now() }, ['test', 'manual']);
  };

  const statsCards = [
    { label: 'Total Events', value: stats.total, icon: <Activity className="h-4 w-4" />, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Last 5 min', value: stats.last5Min, icon: <Clock className="h-4 w-4" />, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Debug', value: stats.byLevel.DEBUG, icon: <Bug className="h-4 w-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { label: 'Info', value: stats.byLevel.INFO, icon: <Info className="h-4 w-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Warnings', value: stats.byLevel.WARNING, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Errors', value: stats.byLevel.ERROR, icon: <XCircle className="h-4 w-4" />, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Critical', value: stats.byLevel.CRITICAL, icon: <Flame className="h-4 w-4" />, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Errors (1h)', value: stats.errorsLast1h, icon: <TrendingUp className="h-4 w-4" />, color: stats.errorsLast1h > 10 ? 'text-red-400' : 'text-muted-foreground', bg: stats.errorsLast1h > 10 ? 'bg-red-500/10' : 'bg-muted/30' },
  ];

  return (
    <MainLayout title="Live Logs & Telemetry">
      <div className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {statsCards.map((card) => (
            <Card key={card.label} className={`${card.bg} border-none`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={card.color}>{card.icon}</div>
                  <span className="text-xs text-muted-foreground truncate">{card.label}</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Log Stream
                {!isPaused && <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={togglePause} className={isPaused ? 'text-amber-400 border-amber-400/50' : ''}>
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" size="sm" onClick={refreshLogs}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
                <Button variant="outline" size="sm" onClick={clearLogs}><Trash2 className="h-4 w-4 mr-1" />Clear</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportLogs('json')}>Export as JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportLogs('ndjson')}>Export as NDJSON</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs defaultValue="stream" className="w-full">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="stream" className="flex items-center gap-2"><Terminal className="h-4 w-4" />Stream</TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="stream" className="space-y-4 mt-4">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search logs..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-9 bg-background/50" />
                  </div>
                  <Select value={filters.timeRange} onValueChange={(v) => setFilters({ ...filters, timeRange: v as LogFilters['timeRange'] })}>
                    <SelectTrigger className="w-32 bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5m">Last 5 min</SelectItem>
                      <SelectItem value="15m">Last 15 min</SelectItem>
                      <SelectItem value="1h">Last 1 hour</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="bg-background/50">Level {filters.levels.length > 0 && `(${filters.levels.length})`}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Log Levels</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {ALL_LEVELS.map(level => (
                        <DropdownMenuCheckboxItem key={level} checked={filters.levels.includes(level)} onCheckedChange={() => toggleLevel(level)}>
                          <span className="flex items-center gap-2">{levelConfig[level].icon} {level}</span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="bg-background/50">Category {filters.categories.length > 0 && `(${filters.categories.length})`}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                      <DropdownMenuLabel>Categories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {categories.map(cat => (
                        <DropdownMenuCheckboxItem key={cat} checked={filters.categories.includes(cat)} onCheckedChange={() => {
                          const newCats = filters.categories.includes(cat) ? filters.categories.filter(c => c !== cat) : [...filters.categories, cat];
                          setFilters({ ...filters, categories: newCats });
                        }}>{cat}</DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>}
                </div>

                {/* Log Stream */}
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-lg bg-background/30">
                    <Activity className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No logs captured yet</p>
                    <p className="text-sm mb-4">Interact with the platform to see logs appear in real-time</p>
                    <Button variant="outline" size="sm" onClick={generateTestLog}>Generate Test Log</Button>
                  </div>
                ) : (
                  <div className="border rounded-lg bg-background/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 text-xs text-muted-foreground font-medium sticky top-0">
                      <span className="w-4"></span>
                      <span className="w-24">Time</span>
                      <span className="w-20">Level</span>
                      <span className="w-20">Category</span>
                      <span className="w-24">Source</span>
                      <span className="flex-1">Message</span>
                      <span className="w-16 text-right">Duration</span>
                      <span className="w-6"></span>
                    </div>
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-border/20">{filteredLogs.map((log) => <LogEntry key={log.id} log={log} />)}</div>
                    </ScrollArea>
                    {!isPaused && (
                      <div className="px-3 py-1.5 border-t bg-muted/10 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-muted-foreground">Live streaming enabled</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Showing {filteredLogs.length.toLocaleString()} of {allLogs.length.toLocaleString()} events</span>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-background/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Events by Category</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cat, count]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <span className="text-sm">{cat}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-primary/50 rounded-full" style={{ width: `${Math.min((count / stats.total) * 200, 100)}px` }} />
                              <span className="text-sm font-mono text-muted-foreground w-12 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-background/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Events by Level</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.byLevel).filter(([, count]) => count > 0).map(([level, count]) => (
                          <div key={level} className="flex items-center justify-between">
                            <span className="text-sm">{level}</span>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 rounded-full ${levelConfig[level as LogLevel].className.split(' ')[0]}`} style={{ width: `${Math.min((count / stats.total) * 200, 100)}px` }} />
                              <span className="text-sm font-mono text-muted-foreground w-12 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
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