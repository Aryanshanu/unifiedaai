import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertCircle, User, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function DecisionAppeals() {
  const queryClient = useQueryClient();

  const { data: appeals, isLoading } = useQuery({
    queryKey: ["decision-appeals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_appeals")
        .select(`*, decision_ledger:decision_id (decision_ref, decision_value)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ appealId, userId }: { appealId: string; userId: string }) => {
      const { error } = await supabase
        .from("decision_appeals")
        .update({ assigned_to: userId, status: "under_review" })
        .eq("id", appealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-appeals"] });
      toast.success("Appeal assigned");
    },
  });

  const pendingAppeals = appeals?.filter((a) => a.status === "pending") || [];
  const underReview = appeals?.filter((a) => a.status === "under_review") || [];
  const resolved = appeals?.filter((a) => ["upheld", "overturned", "escalated"].includes(a.status)) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "under_review": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "upheld": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "overturned": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "escalated": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSLAStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const remaining = new Date(deadline).getTime() - Date.now();
    const hours = remaining / (1000 * 60 * 60);
    if (hours < 0) return { label: "OVERDUE", color: "text-red-600" };
    if (hours < 12) return { label: `${Math.round(hours)}h left`, color: "text-orange-600" };
    return { label: formatDistanceToNow(new Date(deadline)), color: "text-muted-foreground" };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Decision Appeals</h1>
          <p className="text-muted-foreground">GDPR Article 22 compliant appeal processing</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{pendingAppeals.length}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{underReview.length}</div>
              <div className="text-sm text-muted-foreground">Under Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{resolved.length}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center">Loading appeals...</CardContent></Card>
          ) : appeals?.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No appeals submitted</CardContent></Card>
          ) : (
            appeals?.map((appeal) => {
              const sla = getSLAStatus(appeal.sla_deadline);
              return (
                <Card key={appeal.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(appeal.status)}>{appeal.status}</Badge>
                          <Badge variant="outline">{appeal.appeal_category}</Badge>
                          <span className="font-mono text-sm">
                            {(appeal.decision_ledger as any)?.decision_ref}
                          </span>
                        </div>
                        <p className="text-sm">{appeal.appeal_reason}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appeal.appellant_reference}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(appeal.created_at), "PP")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        {sla && (
                          <div className={`text-sm font-medium ${sla.color}`}>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {sla.label}
                          </div>
                        )}
                        {appeal.status === "pending" && (
                          <Button size="sm" variant="outline">Assign</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
