import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RealityMetrics {
  processedRequests: number;
  governanceBlocks: number;
  hitlReviews: number;
  lastDriftCheck: string | null;
  legacyDataCount: number; // Always 0 after Dec 11, 2025
}

export function useRealityMetrics() {
  return useQuery({
    queryKey: ["reality-metrics"],
    queryFn: async (): Promise<RealityMetrics> => {
      // Query real counts from database
      const [
        requestLogsResult,
        blockedRequestsResult,
        reviewQueueResult,
        driftAlertsResult,
      ] = await Promise.all([
        supabase.from("request_logs").select("id", { count: "exact", head: true }),
        // Count actual BLOCK decisions from request_logs
        supabase.from("request_logs").select("id", { count: "exact", head: true }).eq("decision", "BLOCK"),
        supabase.from("review_queue").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("drift_alerts").select("detected_at").order("detected_at", { ascending: false }).limit(1),
      ]);

      return {
        processedRequests: requestLogsResult.count || 0,
        governanceBlocks: blockedRequestsResult.count || 0,
        hitlReviews: reviewQueueResult.count || 0,
        lastDriftCheck: driftAlertsResult.data?.[0]?.detected_at || null,
        legacyDataCount: 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}