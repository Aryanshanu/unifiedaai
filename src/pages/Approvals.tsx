import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingApprovals, useProcessApproval, useSystemApprovals } from "@/hooks/useSystemApprovals";
import { useUnsafeDeployments } from "@/hooks/usePlatformMetrics";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { DeploymentStatusBadge } from "@/components/governance/DeploymentStatusBadge";
import { 
  Shield, CheckCircle, XCircle, Clock, AlertTriangle, 
  ArrowRight, AlertOctagon, History
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Approvals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pendingApprovals, isLoading: pendingLoading } = usePendingApprovals();
  const { data: unsafeDeployments, isLoading: unsafeLoading } = useUnsafeDeployments();
  const processApproval = useProcessApproval();

  // Get approved and rejected systems
  const { data: approvedSystems, isLoading: approvedLoading } = useQuery({
    queryKey: ["system-approvals", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_approvals")
        .select(`
          *,
          systems (
            id,
            name,
            provider,
            system_type,
            project_id,
            projects (name)
          )
        `)
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rejectedSystems, isLoading: rejectedLoading } = useQuery({
    queryKey: ["system-approvals", "rejected"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_approvals")
        .select(`
          *,
          systems (
            id,
            name,
            provider,
            system_type,
            project_id,
            projects (name)
          )
        `)
        .eq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const handleApprove = async (approvalId: string, systemId: string) => {
    await processApproval.mutateAsync({
      approvalId,
      systemId,
      status: "approved",
      reason: "Approved via governance review",
    });
    queryClient.invalidateQueries({ queryKey: ["system-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["unsafe-deployments"] });
  };

  const handleReject = async (approvalId: string, systemId: string) => {
    await processApproval.mutateAsync({
      approvalId,
      systemId,
      status: "rejected",
      reason: "Rejected - requires remediation",
    });
    queryClient.invalidateQueries({ queryKey: ["system-approvals"] });
  };

  return (
    <MainLayout title="Governance & Approvals" subtitle="Manage system deployment approvals and compliance">
      <div className="space-y-6">
        {/* Unsafe Deployment Warning */}
        {!unsafeLoading && (unsafeDeployments?.length || 0) > 0 && (
          <div className="p-4 rounded-xl border-2 border-destructive bg-destructive/5 flex items-start gap-4">
            <AlertOctagon className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Unsafe Deployment Detected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {unsafeDeployments?.length} system(s) have live traffic without proper approval. 
                Immediate action required.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {unsafeDeployments?.map((system) => (
                  <Badge 
                    key={system.id}
                    variant="outline" 
                    className="bg-destructive/10 text-destructive border-destructive/30 cursor-pointer"
                    onClick={() => navigate(`/systems/${system.id}`)}
                  >
                    {system.name} ({system.recentRequests} requests)
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              Systems awaiting governance review and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (pendingApprovals?.length || 0) === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending approvals</p>
                <p className="text-sm text-muted-foreground mt-1">All systems are properly reviewed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase">System</th>
                      <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase">Project</th>
                      <th className="text-center pb-3 text-xs font-semibold text-muted-foreground uppercase">Risk</th>
                      <th className="text-center pb-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-left pb-3 text-xs font-semibold text-muted-foreground uppercase">Requested</th>
                      <th className="text-right pb-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals?.map((approval: any) => (
                      <tr key={approval.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="py-4">
                          <button 
                            onClick={() => navigate(`/systems/${approval.systems?.id}`)}
                            className="font-medium text-foreground hover:text-primary transition-colors text-left"
                          >
                            {approval.systems?.name || "Unknown"}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {approval.systems?.provider} • {approval.systems?.system_type}
                          </p>
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {approval.systems?.projects?.name || "-"}
                        </td>
                        <td className="py-4 text-center">
                          <RiskBadge tier="high" size="sm" />
                        </td>
                        <td className="py-4 text-center">
                          <DeploymentStatusBadge status="pending_approval" size="sm" />
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {format(new Date(approval.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(approval.id, approval.systems?.id)}
                              disabled={processApproval.isPending}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(approval.id, approval.systems?.id)}
                              disabled={processApproval.isPending}
                              className="gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approved Systems */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Recently Approved
              </CardTitle>
              <CardDescription>
                Systems cleared for deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (approvedSystems?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No approved systems yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {approvedSystems?.map((approval: any) => (
                    <div 
                      key={approval.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/systems/${approval.systems?.id}`)}
                    >
                      <div>
                        <p className="font-medium">{approval.systems?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          Approved {approval.approved_at ? format(new Date(approval.approved_at), "MMM d, yyyy") : "-"}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Approved
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejected Systems */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Rejected
              </CardTitle>
              <CardDescription>
                Systems requiring remediation before approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (rejectedSystems?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No rejected systems</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {rejectedSystems?.map((approval: any) => (
                    <div 
                      key={approval.id} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/systems/${approval.systems?.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{approval.systems?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {approval.reason || "No reason provided"}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 shrink-0">
                        Rejected
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
