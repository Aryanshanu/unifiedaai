import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Search, 
  Pause, 
  Play, 
  Trash2, 
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Database,
  MousePointer,
  Navigation,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { ActivityLog } from '@/lib/activity-logger';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeIcons: Record<string, React.ReactNode> = {
  action: <MousePointer className="h-4 w-4" />,
  response: <MessageSquare className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  navigation: <Navigation className="h-4 w-4" />,
  api_call: <Globe className="h-4 w-4" />,
  db_change: <Database className="h-4 w-4" />,
  user_input: <MousePointer className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  action: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  response: 'bg-green-500/20 text-green-400 border-green-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  navigation: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  api_call: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  db_change: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  user_input: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />,
  success: <CheckCircle className="h-3 w-3 text-green-400" />,
  error: <XCircle className="h-3 w-3 text-red-400" />,
};

function LogEntry({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="border-b border-border/50 py-2 px-3 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-mono w-20 shrink-0">
          {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
        </span>

        <div className="w-4 shrink-0">
          {statusIcons[log.status]}
        </div>

        <Badge variant="outline" className={`${typeColors[log.type]} text-xs px-2 py-0 shrink-0`}>
          <span className="mr-1">{typeIcons[log.type]}</span>
          {log.type.replace('_', ' ')}
        </Badge>

        <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
          {log.category}
        </span>

        <span className="text-sm flex-1 truncate">
          {log.action}
        </span>

        {log.duration !== undefined && (
          <span className="text-xs text-muted-foreground shrink-0">
            {log.duration}ms
          </span>
        )}
      </div>

      {expanded && Object.keys(log.details).length > 0 && (
        <div className="mt-2 ml-24 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function LiveLogs() {
  const { logs, isPaused, clearLogs, togglePause } = useActivityLogs();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          log.action.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (typeFilter !== 'all' && log.type !== typeFilter) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;

      return true;
    });
  }, [logs, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const last5Min = logs.filter(l => now - new Date(l.timestamp).getTime() < 5 * 60 * 1000);
    
    return {
      total: logs.length,
      errors: logs.filter(l => l.status === 'error').length,
      apiCalls: logs.filter(l => l.type === 'api_call').length,
      last5Min: last5Min.length,
    };
  }, [logs]);

  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Live Logs & Telemetry">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Events</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-muted-foreground">API Calls</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.apiCalls}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">Errors</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.errors}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Last 5 min</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.last5Min}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Stream
                {!isPaused && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={togglePause}
                  className={isPaused ? 'text-yellow-400' : ''}
                >
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button variant="outline" size="sm" onClick={exportLogs}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="api_call">API Call</SelectItem>
                  <SelectItem value="db_change">DB Change</SelectItem>
                  <SelectItem value="user_input">User Input</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg bg-background/50">
              <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30 text-xs text-muted-foreground font-medium">
                <span className="w-20">Time</span>
                <span className="w-4"></span>
                <span className="w-24">Type</span>
                <span className="w-20">Category</span>
                <span className="flex-1">Action</span>
                <span className="w-16 text-right">Duration</span>
              </div>

              <ScrollArea className="h-[500px]">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-20" />
                    <p>No activity logs yet</p>
                    <p className="text-sm">Interact with the platform to see logs here</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))
                )}
              </ScrollArea>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredLogs.length} of {logs.length} events
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
