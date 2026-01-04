import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Radio,
  Archive,
  Trash2,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidents, useIncidentStats, useUpdateIncident, useBulkArchiveIncidents, useBulkResolveIncidents, Incident } from "@/hooks/useIncidents";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const severityColors = {
  critical: "bg-danger/10 text-danger border-danger/30",
  high: "bg-warning/10 text-warning border-warning/30",
  medium: "bg-primary/10 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusColors = {
  open: "bg-danger/10 text-danger border-danger/30",
  investigating: "bg-warning/10 text-warning border-warning/30",
  mitigating: "bg-primary/10 text-primary border-primary/30",
  resolved: "bg-success/10 text-success border-success/30",
};

const statusIcons = {
  open: AlertCircle,
  investigating: Search,
  mitigating: Shield,
  resolved: CheckCircle,
};

export default function Incidents() {
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveOptions, setArchiveOptions] = useState({ olderThanDays: 30, status: 'open' as const });
  const queryClient = useQueryClient();
  
  const { data: incidents, isLoading } = useIncidents();
  const { data: stats } = useIncidentStats();
  const updateIncident = useUpdateIncident();
  const bulkArchive = useBulkArchiveIncidents();
  const bulkResolve = useBulkResolveIncidents();

  // Initialize search from URL params (for Golden Demo integration)
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && ['all', 'open', 'investigating', 'mitigating', 'resolved'].includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl);
    }
  }, [searchParams]);

  // Realtime subscription for incidents
  useEffect(() => {
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          setRealtimeCount(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ['incidents'] });
          queryClient.invalidateQueries({ queryKey: ['incident-stats'] });
          
          if (payload.eventType === 'INSERT') {
            const newIncident = payload.new as any;
            toast.warning(`New Incident: ${newIncident.title}`, {
              description: `Severity: ${newIncident.severity}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredIncidents = incidents?.filter(incident => {
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const handleStatusChange = (incidentId: string, newStatus: string) => {
    updateIncident.mutate({
      id: incidentId,
      status: newStatus as any,
      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
    });
  };

  const handleBulkArchive = () => {
    bulkArchive.mutate({
      olderThanDays: archiveOptions.olderThanDays,
      status: archiveOptions.status,
    });
    setShowArchiveDialog(false);
  };

  const handleQuickResolveAll = () => {
    const openCritical = filteredIncidents.filter(i => i.status === 'open' && i.severity === 'critical');
    if (openCritical.length > 0) {
      bulkResolve.mutate(openCritical.map(i => i.id));
    }
  };

  return (
    <MainLayout 
      title="Incidents" 
      subtitle="Track and manage security and safety incidents"
      headerActions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" />
            Realtime Active
          </Badge>
          {realtimeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {realtimeCount} updates
            </Badge>
          )}
        </div>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Open Incidents"
          value={(stats?.open || 0).toString()}
          subtitle="Require attention"
          icon={<AlertCircle className="w-4 h-4 text-danger" />}
          status={stats?.open ? "danger" : "success"}
        />
        <MetricCard
          title="Critical"
          value={(stats?.critical || 0).toString()}
          subtitle="Highest priority"
          icon={<AlertTriangle className="w-4 h-4 text-danger" />}
          status={stats?.critical ? "danger" : "success"}
        />
        <MetricCard
          title="High Severity"
          value={(stats?.high || 0).toString()}
          subtitle="Needs immediate action"
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          status={stats?.high ? "warning" : "success"}
        />
        <MetricCard
          title="Total Incidents"
          value={(stats?.total || 0).toString()}
          subtitle="All time (non-archived)"
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="mitigating">Mitigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Bulk Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowArchiveDialog(true)}
            className="gap-1.5"
          >
            <Archive className="w-4 h-4" />
            Bulk Archive
          </Button>
          {stats && stats.critical > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleQuickResolveAll}
              className="gap-1.5"
              disabled={bulkResolve.isPending}
            >
              <CheckCircle className="w-4 h-4" />
              Resolve Open Critical ({stats.critical})
            </Button>
          )}
        </div>
      </div>

      {/* Incidents List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
          <p className="text-foreground font-medium">No incidents found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || statusFilter !== 'all' 
              ? "Try adjusting your filters" 
              : "All systems operating normally"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const StatusIcon = statusIcons[incident.status as keyof typeof statusIcons] || AlertCircle;
            
            return (
              <div
                key={incident.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    incident.severity === "critical" ? "bg-danger/10" : 
                    incident.severity === "high" ? "bg-warning/10" : "bg-primary/10"
                  )}>
                    <AlertTriangle className={cn(
                      "w-5 h-5",
                      incident.severity === "critical" ? "text-danger" : 
                      incident.severity === "high" ? "text-warning" : "text-primary"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{incident.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={cn(
                        "text-[10px] h-5",
                        severityColors[incident.severity as keyof typeof severityColors]
                      )}>
                        {incident.severity}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "text-[10px] h-5 gap-1",
                        statusColors[incident.status as keyof typeof statusColors]
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {incident.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-primary capitalize">{incident.incident_type}</span>
                    </div>
                    <p className="font-medium text-foreground mb-1">{incident.title}</p>
                    {incident.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{incident.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Created {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                      {incident.resolved_at && (
                        <>
                          <span>•</span>
                          <span className="text-success">
                            Resolved {formatDistanceToNow(new Date(incident.resolved_at), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {incident.status !== 'resolved' && (
                      <Select 
                        value={incident.status} 
                        onValueChange={(status) => {
                          handleStatusChange(incident.id, status);
                        }}
                      >
                        <SelectTrigger 
                          className="w-32 h-8 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="mitigating">Mitigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncident(incident);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "w-5 h-5",
                selectedIncident?.severity === "critical" ? "text-danger" : 
                selectedIncident?.severity === "high" ? "text-warning" : "text-primary"
              )} />
              Incident Details
            </DialogTitle>
            <DialogDescription>
              {selectedIncident?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncident && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn(
                  severityColors[selectedIncident.severity as keyof typeof severityColors]
                )}>
                  {selectedIncident.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={cn(
                  statusColors[selectedIncident.status as keyof typeof statusColors]
                )}>
                  {selectedIncident.status}
                </Badge>
                <Badge variant="outline">{selectedIncident.incident_type}</Badge>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedIncident.title}</h3>
                {selectedIncident.description && (
                  <p className="text-muted-foreground">{selectedIncident.description}</p>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(selectedIncident.created_at), 'PPpp')}</span>
                </div>
                {selectedIncident.resolved_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Resolved:</span>
                    <span className="text-success">{format(new Date(selectedIncident.resolved_at), 'PPpp')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedIncident.status !== 'resolved' && (
                <div className="flex gap-2">
                  <Select 
                    value={selectedIncident.status} 
                    onValueChange={(status) => {
                      handleStatusChange(selectedIncident.id, status);
                      setSelectedIncident({ ...selectedIncident, status: status as any });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="mitigating">Mitigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="default"
                    onClick={() => {
                      handleStatusChange(selectedIncident.id, 'resolved');
                      setSelectedIncident(null);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Bulk Archive Incidents
            </DialogTitle>
            <DialogDescription>
              Archive old incidents to clean up your queue. Archived incidents are hidden but not deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Archive incidents older than</label>
              <Select 
                value={archiveOptions.olderThanDays.toString()} 
                onValueChange={(v) => setArchiveOptions(p => ({ ...p, olderThanDays: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">With status</label>
              <Select 
                value={archiveOptions.status} 
                onValueChange={(v) => setArchiveOptions(p => ({ ...p, status: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="mitigating">Mitigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkArchive}
              disabled={bulkArchive.isPending}
            >
              {bulkArchive.isPending ? 'Archiving...' : 'Archive Incidents'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}