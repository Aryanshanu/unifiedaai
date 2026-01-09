import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  GitBranch, 
  AlertTriangle, 
  Shield, 
  RefreshCw, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileCode,
  Download
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AttestationViewer } from "@/components/governance/AttestationViewer";

interface MLOpsEvent {
  id: string;
  system_id: string;
  model_id: string | null;
  event_type: string;
  event_details: Record<string, unknown>;
  governance_decision: string;
  violations: string[] | null;
  recorded_at: string;
  actor_id: string | null;
}

export default function MLOpsAudit() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [selectedAttestation, setSelectedAttestation] = useState<string | null>(null);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['mlops-events', eventTypeFilter, decisionFilter],
    queryFn: async () => {
      let query = supabase
        .from("mlops_governance_events")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(200);

      if (eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter);
      }

      if (decisionFilter !== "all") {
        query = query.eq("governance_decision", decisionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MLOpsEvent[];
    }
  });

  const { data: attestations } = useQuery({
    queryKey: ['deployment-attestations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deployment_attestations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const filteredEvents = events?.filter(event =>
    event.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.system_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.event_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />ALLOW</Badge>;
      case 'BLOCK':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />BLOCK</Badge>;
      case 'WARN':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><AlertCircle className="h-3 w-3 mr-1" />WARN</Badge>;
      case 'ESCALATE':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20"><AlertTriangle className="h-3 w-3 mr-1" />ESCALATE</Badge>;
      default:
        return <Badge variant="outline">{decision}</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'deployment':
        return <GitBranch className="h-4 w-4 text-primary" />;
      case 'model_update':
        return <FileCode className="h-4 w-4 text-blue-500" />;
      case 'bypass':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Stats
  const blockCount = events?.filter(e => e.governance_decision === 'BLOCK').length || 0;
  const bypassCount = events?.filter(e => e.event_type === 'bypass' || e.violations?.some(v => v.includes('BYPASS'))).length || 0;
  const verifiedAttestations = attestations?.filter(a => a.verification_status === 'verified').length || 0;

  return (
    <MainLayout title="MLOps Audit" subtitle="Pipeline governance events and deployment attestations">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{blockCount}</p>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{bypassCount}</p>
                  <p className="text-sm text-muted-foreground">Bypass Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{verifiedAttestations}</p>
                  <p className="text-sm text-muted-foreground">Verified Attestations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deployment">Deployment</SelectItem>
                  <SelectItem value="model_update">Model Update</SelectItem>
                  <SelectItem value="pipeline_run">Pipeline Run</SelectItem>
                  <SelectItem value="config_change">Config Change</SelectItem>
                  <SelectItem value="bypass">Bypass</SelectItem>
                </SelectContent>
              </Select>

              <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Decisions</SelectItem>
                  <SelectItem value="ALLOW">Allow</SelectItem>
                  <SelectItem value="BLOCK">Block</SelectItem>
                  <SelectItem value="WARN">Warn</SelectItem>
                  <SelectItem value="ESCALATE">Escalate</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              MLOps Events Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEvents?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No MLOps events found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents?.map((event) => (
                    <TableRow key={event.id} className={event.governance_decision === 'BLOCK' ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.event_type)}
                          <span className="font-medium capitalize">{event.event_type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {event.system_id.substring(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>{getDecisionBadge(event.governance_decision)}</TableCell>
                      <TableCell>
                        {event.violations?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {event.violations.slice(0, 2).map((v, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {v.split(':')[0]}
                              </Badge>
                            ))}
                            {event.violations.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{event.violations.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(event.recorded_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedAttestation(event.system_id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Attestation Viewer */}
        {selectedAttestation && attestations && (
          <AttestationViewer 
            attestations={attestations.filter(a => a.system_id === selectedAttestation) as any} 
            onClose={() => setSelectedAttestation(null)}
          />
        )}
      </div>
    </MainLayout>
  );
}
