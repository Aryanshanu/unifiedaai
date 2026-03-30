import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateSession, requireAuth, hasAnyRole, getServiceClient, corsHeaders, errorResponse, successResponse } from "../_shared/auth-helper.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =====================================================
    // AUTHENTICATION: Validate user JWT via auth-helper
    // =====================================================
    const authResult = await validateSession(req);
    const authError = requireAuth(authResult);
    
    if (authError) {
      console.log("[copilot] Authentication failed");
      return authError;
    }
    
    const { user } = authResult;
    // User client respects RLS for data reads
    const supabase = authResult.supabase!;
    // Service client for system operations
    const serviceClient = getServiceClient();
    
    console.log(`[copilot] Authenticated user: ${user?.id}`);

    const { systemId, question } = await req.json();

    if (!systemId || !question) {
      return errorResponse("systemId and question are required", 400);
    }

    // Fetch system using user client (respects RLS)
    const { data: system, error: systemError } = await supabase
      .from("systems")
      .select("*, projects(*)")
      .eq("id", systemId)
      .single();

    if (systemError || !system) {
      return errorResponse("System not found or access denied", 404);
    }

    // Authorization check: user must be owner or have admin/analyst role
    const isOwner = system.owner_id === user?.id;
    const hasPrivilegedRole = hasAnyRole(user!, ['admin', 'analyst']);

    if (!isOwner && !hasPrivilegedRole) {
      console.log(`[copilot] Unauthorized access attempt: user ${user?.id} tried to access system ${systemId}`);
      return errorResponse("You don't have permission to access this system", 403);
    }

    // Fetch context data (user is now authorized, using user client for RLS)
    const [riskRes, impactRes, logsRes, metricsRes, semanticRes] = await Promise.all([
      supabase.from("risk_assessments").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(1),
      supabase.from("impact_assessments").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(1),
      supabase.from("request_logs").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(20),
      supabase.from("risk_metrics").select("*").eq("system_id", systemId).order("recorded_at", { ascending: false }).limit(50),
      serviceClient.from("semantic_definitions").select("name, display_name, description, sql_logic, ai_context, grain, status").eq("status", "active").limit(50),
    ]);

    const riskAssessment = riskRes.data?.[0];
    const impactAssessment = impactRes.data?.[0];
    const recentLogs = logsRes.data || [];
    const metrics = metricsRes.data || [];

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

    // Add semantic definitions context
    const semanticDefs = semanticRes.data || [];
    if (semanticDefs.length > 0) {
      contextParts.push(
        `## Semantic Layer (${semanticDefs.length} active definitions)`,
        `These are the governed metric definitions. Always use these when answering metric questions:`,
        ...semanticDefs.map((d: any) => 
          `- **${d.display_name || d.name}** (${d.name}): ${d.description || 'No description'}${d.sql_logic ? ` | SQL: \`${d.sql_logic}\`` : ''}${d.ai_context ? ` | Context: ${d.ai_context}` : ''}${d.grain ? ` | Grain: ${d.grain}` : ''}`
        ),
        ``
      );
    }

    const systemPrompt = `You are the UnifiedAI Governance Copilot, an expert AI assistant for enterprise AI governance platforms.

Your role is to help users understand:
1. Why systems are classified at certain risk/impact levels
2. What actions they should take to improve governance posture
3. How to interpret runtime metrics and incidents
4. Best practices for AI safety, privacy, and compliance
5. How business metrics are defined and calculated (using the Semantic Layer definitions)

Be concise, actionable, and specific. Reference the actual data when explaining.
When a user asks about a metric (e.g., "How is MRR calculated?"), ALWAYS reference the Semantic Layer definition if one exists.

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
        return errorResponse("Rate limit exceeded. Please try again later.", 429);
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return successResponse({ 
      answer, 
      context: { riskAssessment, impactAssessment, logsCount: recentLogs.length } 
    });

  } catch (error) {
    console.error("Copilot error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unknown error", 500);
  }
});
