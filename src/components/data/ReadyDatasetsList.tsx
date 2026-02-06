import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  CheckCircle, Clock, XCircle, Database, 
  ArrowRight, ShieldCheck, AlertTriangle, FileCheck,
  GitBranch, History, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { DatasetQualityGate } from "./DatasetQualityGate";
import { FreshnessIndicator } from "@/components/engines/FreshnessIndicator";

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  source: string;
  row_count: number | null;
  sensitivity_level: string | null;
  business_impact: string | null;
  ai_approval_status: string;
  ai_approved_at: string | null;
  ai_approved_by: string | null;
  version: string | null;
  created_at: string;
  last_data_update: string | null;
  freshness_threshold_days: number | null;
}

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Draft" },
  pending: { color: "bg-warning/10 text-warning border-warning/20", icon: Clock, label: "Pending Review" },
  approved: { color: "bg-success/10 text-success border-success/20", icon: CheckCircle, label: "AI Approved" },
  rejected: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle, label: "Rejected" },
};

export function ReadyDatasetsList() {
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);
  const [expandedGate, setExpandedGate] = useState<string | null>(null);
  const [gatesPassed, setGatesPassed] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets-for-ai", showApprovedOnly],
    queryFn: async () => {
      let query = supabase
        .from("datasets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (showApprovedOnly) {
        query = query.eq("ai_approval_status", "approved");
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Dataset[];
    },
  });

  // Handle quality gate readiness callback
  const handleApprovalReady = (datasetId: string, ready: boolean) => {
    setGatesPassed(prev => ({ ...prev, [datasetId]: ready }));
  };

  const requestApproval = useMutation({
    mutationFn: async (datasetId: string) => {
      const { error } = await supabase
        .from("datasets")
        .update({ ai_approval_status: "pending" })
        .eq("id", datasetId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets-for-ai"] });
      toast.success("Approval request submitted");
    },
  });

  const approveDataset = useMutation({
    mutationFn: async (datasetId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the current dataset for version increment
      const { data: dataset } = await supabase
        .from("datasets")
        .select("version")
        .eq("id", datasetId)
        .single();
      
      const currentVersion = dataset?.version || "1.0";
      const [major] = currentVersion.split(".");
      const newVersion = `${parseInt(major) + 1}.0`;
      
      // Update dataset status and version
      const { error: updateError } = await supabase
        .from("datasets")
        .update({ 
          ai_approval_status: "approved",
          ai_approved_at: new Date().toISOString(),
          ai_approved_by: user?.id,
          version: newVersion
        })
        .eq("id", datasetId);
      
      if (updateError) throw updateError;
      
      // Create snapshot for versioning
      const { data: fullDataset } = await supabase
        .from("datasets")
        .select("*")
        .eq("id", datasetId)
        .single();
      
      if (fullDataset) {
        await supabase.from("dataset_snapshots").insert({
          dataset_id: datasetId,
          version: newVersion,
          snapshot_data: fullDataset,
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets-for-ai"] });
      toast.success("Dataset approved for AI use and snapshot created");
    },
  });

  const rejectDataset = useMutation({
    mutationFn: async (datasetId: string) => {
      const { error } = await supabase
        .from("datasets")
        .update({ ai_approval_status: "rejected" })
        .eq("id", datasetId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets-for-ai"] });
      toast.info("Dataset rejected");
    },
  });

  const approvedCount = datasets?.filter(d => d.ai_approval_status === "approved").length || 0;
  const pendingCount = datasets?.filter(d => d.ai_approval_status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <ShieldCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">AI Ready</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{datasets?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Datasets</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dataset AI Readiness</h3>
          <p className="text-sm text-muted-foreground">
            Approve datasets for AI/ML training and inference
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show approved only</span>
          <Switch
            checked={showApprovedOnly}
            onCheckedChange={setShowApprovedOnly}
          />
        </div>
      </div>

      {/* Datasets Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !datasets?.length ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No datasets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Dataset</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Rows</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Freshness</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Impact</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase">Version</th>
                    <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((dataset) => {
                    const status = statusConfig[dataset.ai_approval_status] || statusConfig.draft;
                    const StatusIcon = status.icon;
                    
                    return (
                      <React.Fragment key={dataset.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-secondary">
                                <Database className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{dataset.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {dataset.source} • {dataset.sensitivity_level || "Unknown"} sensitivity
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center text-sm">
                            {(dataset.row_count || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <FreshnessIndicator 
                              lastDataUpdate={dataset.last_data_update}
                              stalenessStatus={null}
                              freshnessThresholdDays={dataset.freshness_threshold_days || 7}
                              size="sm"
                            />
                          </td>
                          <td className="p-4 text-center">
                            {dataset.business_impact ? (
                              <Badge variant={
                                dataset.business_impact === "high" ? "destructive" :
                                dataset.business_impact === "medium" ? "default" : "secondary"
                              }>
                                {dataset.business_impact}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4 text-center text-sm text-muted-foreground">
                            v{dataset.version || "1.0"}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {dataset.ai_approval_status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => requestApproval.mutate(dataset.id)}
                                  disabled={requestApproval.isPending}
                                >
                                  <FileCheck className="h-3.5 w-3.5 mr-1" />
                                  Request Approval
                                </Button>
                              )}
                              {dataset.ai_approval_status === "pending" && (
                                <div className="space-y-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedGate(expandedGate === dataset.id ? null : dataset.id)}
                                  >
                                    {expandedGate === dataset.id ? (
                                      <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Quality Gate
                                  </Button>
                                  {gatesPassed[dataset.id] && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => approveDataset.mutate(dataset.id)}
                                        disabled={approveDataset.isPending}
                                      >
                                        {approveDataset.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                        ) : (
                                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => rejectDataset.mutate(dataset.id)}
                                        disabled={rejectDataset.isPending}
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {dataset.ai_approval_status === "approved" && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Ready for AI
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/lineage?dataset=${dataset.id}`)}
                                    title="View Lineage"
                                  >
                                    <GitBranch className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                              {dataset.ai_approval_status === "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => requestApproval.mutate(dataset.id)}
                                >
                                  Re-submit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Quality Gate Expansion Row */}
                        {dataset.ai_approval_status === "pending" && expandedGate === dataset.id && (
                          <tr className="bg-muted/10">
                            <td colSpan={7} className="p-4">
                              <DatasetQualityGate 
                                datasetId={dataset.id}
                                onApprovalReady={(ready) => handleApprovalReady(dataset.id, ready)}
                                showActions={false}
                              />
                              {!gatesPassed[dataset.id] && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  Quality gates must pass before approval
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
