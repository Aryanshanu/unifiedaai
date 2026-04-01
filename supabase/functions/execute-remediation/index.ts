import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, getServiceClient } from "../_shared/auth-helper.ts";

/**
 * execute-remediation: Executes a pending DQ remediation action
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action_id } = await req.json();
    if (!action_id) throw new Error("action_id is required");

    const serviceClient = getServiceClient();

    // Fetch the action
    const { data: action, error: fetchErr } = await serviceClient
      .from("remediation_actions")
      .select("*")
      .eq("id", action_id)
      .single();

    if (fetchErr || !action) throw new Error(`Action not found: ${fetchErr?.message}`);
    if (action.status !== "pending") throw new Error(`Action is not pending (status: ${action.status})`);

    // Mark as executing
    await serviceClient
      .from("remediation_actions")
      .update({ status: "executing", updated_at: new Date().toISOString() })
      .eq("id", action_id);

    // Simulate execution (real implementation would run the SQL/Python)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mark as completed
    const { error: updateErr } = await serviceClient
      .from("remediation_actions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", action_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, action_id, status: "completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
