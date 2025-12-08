import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  ChevronRight,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIncidents, useIncidentStats, useUpdateIncident } from "@/hooks/useIncidents";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: incidents, isLoading } = useIncidents();
  const { data: stats } = useIncidentStats();
  const updateIncident = useUpdateIncident();

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

  return (
    <MainLayout title="Incidents" subtitle="Track and manage security and safety incidents">
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
          subtitle="All time"
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
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
                        onValueChange={(status) => handleStatusChange(incident.id, status)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
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
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}