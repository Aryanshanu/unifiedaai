import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// TYPES - Strict contracts
// ============================================

interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: string;
}

interface ChatResponse {
  status: 'success' | 'error';
  answer?: string;
  error_code?: 'NO_CONTEXT' | 'MODEL_UNAVAILABLE' | 'INVALID_REQUEST' | 'RATE_LIMITED';
  error_message?: string;
}

// ============================================
// SYSTEM PROMPT - Clean, honest, bounded
// ============================================

const SYSTEM_PROMPT = `You are a Data Quality Assistant for Fractal RAI-OS.

You answer questions ONLY using the provided Data Quality context.
You must NEVER guess, infer, or fabricate information.

If the context does not contain enough data to answer, say:
"I don't have enough information to answer that. The [specific data] is not available in the current context."

You do NOT:
- Modify data or rules
- Suggest executing pipelines
- Hide uncertainty
- Make up statistics

Your job is to EXPLAIN the current data quality state, not CONTROL it.

Be concise but thorough. Reference specific columns, rules, and metrics when relevant.
Highlight critical issues that need immediate attention.`;

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as ChatRequest;
    const { message, history, context } = body;

    // Validation: message required
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log("[dq-chat] Invalid request: empty message");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'INVALID_REQUEST',
        error_message: 'Please enter a valid question.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validation: context required
    if (!context || context === 'No data quality context available.') {
      console.log("[dq-chat] No context provided");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'NO_CONTEXT',
        error_message: 'No data quality data is available. Please run the DQ pipeline first.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get Lovable API key (auto-provisioned)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[dq-chat] LOVABLE_API_KEY not configured");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'AI service is not configured. Please contact support.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build messages array for API
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nCURRENT CONTEXT:\n${context}` },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log(`[dq-chat] Calling Lovable AI Gateway with ${messages.length} messages`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    // Handle rate limiting
    if (aiResponse.status === 429) {
      console.log("[dq-chat] Rate limited by Lovable AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'RATE_LIMITED',
        error_message: 'Too many requests. Please wait a moment and try again.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle payment required
    if (aiResponse.status === 402) {
      console.log("[dq-chat] Payment required for Lovable AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'AI credits exhausted. Please add credits to continue.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle other errors
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[dq-chat] AI gateway error:", aiResponse.status, errorText);
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'The AI model is temporarily unavailable. Please try again in a moment.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse successful response
    const data = await aiResponse.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("[dq-chat] Empty response from AI");
      const response: ChatResponse = {
        status: 'error',
        error_code: 'MODEL_UNAVAILABLE',
        error_message: 'The AI returned an empty response. Please try again.'
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[dq-chat] Response generated successfully");
    
    const response: ChatResponse = {
      status: 'success',
      answer
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[dq-chat] Error:", error);
    const response: ChatResponse = {
      status: 'error',
      error_code: 'MODEL_UNAVAILABLE',
      error_message: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
