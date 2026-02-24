import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { definition_id } = await req.json();
    if (!definition_id) throw new Error("definition_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the definition
    const { data: def, error: fetchErr } = await supabase
      .from("semantic_definitions")
      .select("id, name, display_name, description, synonyms, ai_context")
      .eq("id", definition_id)
      .single();

    if (fetchErr || !def) {
      return new Response(JSON.stringify({ error: "Definition not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build text for embedding
    const textForEmbedding = [
      def.name,
      def.display_name,
      def.description,
      ...(def.synonyms || []),
      def.ai_context,
    ].filter(Boolean).join(" | ");

    if (!lovableApiKey) {
      console.warn("LOVABLE_API_KEY not set, skipping vector embedding");
      return new Response(JSON.stringify({ status: "skipped", reason: "no api key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate embedding via Lovable AI Gateway
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a semantic embedding generator. Return ONLY a JSON array of 768 floating point numbers between -1 and 1 that represent the semantic embedding of the input text. No explanation, no markdown, just the JSON array.",
          },
          {
            role: "user",
            content: `Generate a 768-dimensional semantic embedding for this metric definition:\n\n${textForEmbedding}`,
          },
        ],
      }),
    });

    if (!embeddingResponse.ok) {
      const errText = await embeddingResponse.text();
      console.error("AI gateway error:", embeddingResponse.status, errText);
      return new Response(JSON.stringify({ status: "error", error: "AI gateway failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await embeddingResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse embedding array from response
    let embedding: number[] | null = null;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      embedding = JSON.parse(cleaned);
      if (!Array.isArray(embedding) || embedding.length !== 768) {
        console.warn("Invalid embedding dimensions:", embedding?.length);
        embedding = null;
      }
    } catch {
      console.warn("Failed to parse embedding from AI response");
    }

    if (embedding) {
      // Store embedding
      const embeddingStr = `[${embedding.join(",")}]`;
      const { error: updateErr } = await supabase
        .from("semantic_definitions")
        .update({ embedding: embeddingStr })
        .eq("id", definition_id);

      if (updateErr) {
        console.error("Failed to store embedding:", updateErr);
        return new Response(JSON.stringify({ status: "error", error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      status: "success",
      definition_id,
      embedding_stored: !!embedding,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-compiler error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
