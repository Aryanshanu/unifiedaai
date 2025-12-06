import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemId, question } = await req.json();

    if (!systemId || !question) {
      return new Response(
        JSON.stringify({ error: "systemId and question are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context data
    const [systemRes, riskRes, impactRes, logsRes, metricsRes] = await Promise.all([
      supabase.from("systems").select("*, projects(*)").eq("id", systemId).single(),
      supabase.from("risk_assessments").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(1),
      supabase.from("impact_assessments").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(1),
      supabase.from("request_logs").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(20),
      supabase.from("risk_metrics").select("*").eq("system_id", systemId).order("recorded_at", { ascending: false }).limit(50),
    ]);

    const system = systemRes.data;
    const riskAssessment = riskRes.data?.[0];
    const impactAssessment = impactRes.data?.[0];
    const recentLogs = logsRes.data || [];
    const metrics = metricsRes.data || [];

    if (!system) {
      return new Response(
        JSON.stringify({ error: "System not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate runtime stats
    const blockedLogs = recentLogs.filter((l: any) => l.decision === "BLOCK");
    const warnedLogs = recentLogs.filter((l: any) => l.decision === "WARN");
    const avgLatency = recentLogs.length > 0
      ? Math.round(recentLogs.reduce((sum: number, l: any) => sum + (l.latency_ms || 0), 0) / recentLogs.length)
      : 0;

    // Build context prompt
    const contextParts = [
      `## System Information`,
      `- Name: ${system.name}`,
      `- Type: ${system.system_type}`,
      `- Provider: ${system.provider}`,
      `- Status: ${system.status}`,
      `- Deployment Status: ${system.deployment_status}`,
      `- Requires Approval: ${system.requires_approval ? "Yes" : "No"}`,
      `- Use Case: ${system.use_case || "Not specified"}`,
      ``,
    ];

    if (riskAssessment) {
      contextParts.push(
        `## Risk Assessment (v${riskAssessment.version})`,
        `- Risk Tier: ${riskAssessment.risk_tier?.toUpperCase()}`,
        `- Static Risk Score: ${Math.round(riskAssessment.static_risk_score)}`,
        `- URI Score: ${Math.round(riskAssessment.uri_score)}`,
        `- Dimensions: ${JSON.stringify(riskAssessment.dimension_scores)}`,
        `- Summary: ${riskAssessment.summary || "No summary"}`,
        ``
      );
    } else {
      contextParts.push(`## Risk Assessment: Not yet conducted\n`);
    }

    if (impactAssessment) {
      contextParts.push(
        `## Impact Assessment (v${impactAssessment.version})`,
        `- Overall Score: ${Math.round(impactAssessment.overall_score)}`,
        `- Quadrant: ${impactAssessment.quadrant}`,
        `- Dimensions: ${JSON.stringify(impactAssessment.dimensions)}`,
        `- Summary: ${impactAssessment.summary || "No summary"}`,
        ``
      );
    } else {
      contextParts.push(`## Impact Assessment: Not yet conducted\n`);
    }

    contextParts.push(
      `## Runtime Activity (Recent)`,
      `- Total Requests (last 20): ${recentLogs.length}`,
      `- Blocked: ${blockedLogs.length}`,
      `- Warned: ${warnedLogs.length}`,
      `- Average Latency: ${avgLatency}ms`,
      ``
    );

    if (blockedLogs.length > 0) {
      contextParts.push(
        `## Recent Blocks`,
        ...blockedLogs.slice(0, 5).map((l: any) => `- ${l.error_message || "Unknown reason"}`),
        ``
      );
    }

    const systemPrompt = `You are the UnifiedAI Governance Copilot, an expert AI assistant for enterprise AI governance platforms.

Your role is to help users understand:
1. Why systems are classified at certain risk/impact levels
2. What actions they should take to improve governance posture
3. How to interpret runtime metrics and incidents
4. Best practices for AI safety, privacy, and compliance

Be concise, actionable, and specific. Reference the actual data when explaining.

When providing recommendations:
- Prioritize the most impactful changes
- Be specific about what to change
- Explain the expected outcome

Context about the system:
${contextParts.join("\n")}`;

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ answer, context: { riskAssessment, impactAssessment, logsCount: recentLogs.length } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
