import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleRun {
  id: string;
  schedule_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  results: Record<string, unknown> | null;
  error_message: string | null;
  engines_run: string[];
  created_at: string;
}

export function useScheduleRuns(scheduleId?: string) {
  return useQuery({
    queryKey: ["schedule-runs", scheduleId],
    queryFn: async () => {
      let query = supabase
        .from("evaluation_schedule_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (scheduleId) {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduleRun[];
    },
  });
}
