import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertTriangle, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIncidents } from "@/hooks/useIncidents";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface BulkResolutionPanelProps {
  onComplete?: () => void;
}

export function BulkResolutionPanel({ onComplete }: BulkResolutionPanelProps) {
  const { data: incidents, refetch } = useIncidents();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");
  const [resolutionReason, setResolutionReason] = useState("");

  const openIncidents = incidents?.filter((i) => i.status === "open" || i.status === "investigating") || [];

  const filteredIncidents = openIncidents.filter((incident) => {
    if (filterSeverity !== "all" && incident.severity !== filterSeverity) return false;
    
    if (filterAge !== "all") {
      const ageDays = (Date.now() - new Date(incident.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (filterAge === "7+" && ageDays < 7) return false;
      if (filterAge === "3-7" && (ageDays < 3 || ageDays >= 7)) return false;
      if (filterAge === "1-3" && (ageDays < 1 || ageDays >= 3)) return false;
    }
    
    return true;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map((i) => i.id)));
    }
  };

  const selectBySeverity = (severity: string) => {
    const ids = openIncidents
      .filter((i) => i.severity === severity)
      .map((i) => i.id);
    setSelectedIds(new Set(ids));
  };

  const resolveBulk = async () => {
    if (selectedIds.size === 0) {
      toast.warning("No incidents selected");
      return;
    }

    if (!resolutionReason.trim()) {
      toast.warning("Please provide a resolution reason");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("incident-lifecycle", {
        body: {
          action: "bulk_resolve",
          incident_ids: Array.from(selectedIds),
          resolution_reason: resolutionReason,
        },
      });

      if (error) throw error;

      toast.success(`${selectedIds.size} incidents resolved`);
      setSelectedIds(new Set());
      setResolutionReason("");
      refetch();
      onComplete?.();
    } catch (error) {
      console.error("Bulk resolution error:", error);
      toast.error("Failed to resolve incidents");
    } finally {
      setIsLoading(false);
    }
  };

  const runLifecycleCheck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("incident-lifecycle", {
        body: { action: "check_sla" },
      });

      if (error) throw error;

      toast.success(
        `Lifecycle check complete: ${data.result?.escalated?.length || 0} escalated`
      );
      refetch();
    } catch (error) {
      console.error("Lifecycle check error:", error);
      toast.error("Failed to run lifecycle check");
    } finally {
      setIsLoading(false);
    }
  };

  const autoCloseStale = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("incident-lifecycle", {
        body: { action: "auto_close", max_age_days: 7 },
      });

      if (error) throw error;

      toast.success(
        `Auto-close complete: ${data.result?.auto_closed?.length || 0} closed`
      );
      refetch();
    } catch (error) {
      console.error("Auto-close error:", error);
      toast.error("Failed to auto-close incidents");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-risk-critical";
      case "high":
        return "text-risk-high";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-risk-high" />
            Incident Bulk Resolution
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runLifecycleCheck} disabled={isLoading}>
              Check SLA
            </Button>
            <Button variant="outline" size="sm" onClick={autoCloseStale} disabled={isLoading}>
              Auto-Close Stale
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === filteredIncidents.length && filteredIncidents.length > 0}
              onCheckedChange={() => selectAll()}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} of {filteredIncidents.length} selected
            </span>
          </div>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="7+">7+ days</SelectItem>
              <SelectItem value="3-7">3-7 days</SelectItem>
              <SelectItem value="1-3">1-3 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Selection */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectBySeverity("low")}
          >
            Select Low ({openIncidents.filter((i) => i.severity === "low").length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectBySeverity("medium")}
          >
            Select Medium ({openIncidents.filter((i) => i.severity === "medium").length})
          </Button>
        </div>

        {/* Incidents List */}
        <ScrollArea className="h-[250px]">
          <div className="space-y-2">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border border-border transition-colors",
                  selectedIds.has(incident.id) && "bg-primary/5 border-primary/30"
                )}
              >
                <Checkbox
                  checked={selectedIds.has(incident.id)}
                  onCheckedChange={() => toggleSelect(incident.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-sm font-medium", getSeverityColor(incident.severity))}>
                      {incident.severity?.toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {incident.incident_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground line-clamp-1">
                    {incident.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Resolution */}
        {selectedIds.size > 0 && (
          <div className="space-y-3 pt-3 border-t border-border">
            <Textarea
              placeholder="Resolution reason (required)"
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
              className="h-20"
            />
            <Button
              onClick={resolveBulk}
              disabled={isLoading || !resolutionReason.trim()}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Resolve {selectedIds.size} Incidents
            </Button>
          </div>
        )}

        {filteredIncidents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success opacity-50" />
            <p>No open incidents matching filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
