import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, FileText, Shield, Clock, Hash, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function DecisionLedger() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["decision-ledger", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("decision_ledger")
        .select(`*, models:model_id (name)`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.or(`decision_ref.ilike.%${searchQuery}%,decision_value.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["decision-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("decision_ledger").select("*", { count: "exact", head: true });
      const { count: today } = await supabase
        .from("decision_ledger")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0]);
      return { total: total || 0, today: today || 0 };
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Decision Ledger</h1>
            <p className="text-muted-foreground">Immutable, hash-chained record of all AI decisions</p>
          </div>
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total Decisions</div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-2xl font-bold">{stats?.today || 0}</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </Card>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by decision ref or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading decisions...</CardContent></Card>
          ) : decisions?.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No decisions recorded yet</CardContent></Card>
          ) : (
            decisions?.map((decision) => (
              <Card key={decision.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-mono font-medium">{decision.decision_ref}</span>
                        <Badge variant="outline">{decision.decision_value}</Badge>
                        {decision.confidence && (
                          <Badge variant="secondary">{(decision.confidence * 100).toFixed(1)}% conf</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {(decision.models as any)?.name || "Unknown Model"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(decision.decision_timestamp), "PPp")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{decision.record_hash?.substring(0, 12)}...</span>
                      </div>
                      {decision.previous_hash !== "GENESIS" && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Chain Valid
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
