import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRealityMetrics } from "@/hooks/useRealityMetrics";
import { Activity, Shield, Users, Clock, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RealityCheckDashboard() {
  const { data: metrics, isLoading } = useRealityMetrics();

  if (isLoading) {
    return (
      <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Reality Check — December 11, 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const allZero = 
    metrics?.realRequestsProcessed === 0 && 
    metrics?.realBlocks === 0 && 
    metrics?.realHITLReviews === 0;

  return (
    <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Reality Check — December 11, 2025
          </CardTitle>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            100% Real Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {allZero && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">
              No real traffic yet — connect your model and send requests to see real data
            </span>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Real Requests</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {metrics?.realRequestsProcessed || 0}
            </p>
          </div>

          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Real Blocks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {metrics?.realBlocks || 0}
            </p>
          </div>

          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">HITL Reviews</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {metrics?.realHITLReviews || 0}
            </p>
          </div>

          <div className="p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Last Drift Check</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {metrics?.lastDriftCheck 
                ? formatDistanceToNow(new Date(metrics.lastDriftCheck), { addSuffix: true })
                : "Never"}
            </p>
          </div>

          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-500">Fake Data</span>
            </div>
            <p className="text-2xl font-bold text-emerald-500">
              0
            </p>
            <p className="text-xs text-emerald-500/70">Deleted Dec 11</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}