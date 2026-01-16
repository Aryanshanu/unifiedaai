import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  context: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json() as ChatRequest;
    
    const HF_API_KEY = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    
    if (!HF_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "HuggingFace API key not configured",
          response: "Please configure your HuggingFace API key in Settings > Models to use the DQ Assistant."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with context
    const systemPrompt = `You are an expert Data Quality Assistant for the Fractal RAI-OS platform. You help users understand and fix data quality issues.

CURRENT DATA QUALITY CONTEXT:
${context}

INSTRUCTIONS:
- Answer questions about data quality issues, profiling results, rules, and incidents
- Provide specific, actionable recommendations based on the context
- Reference specific columns, rules, and metrics when relevant
- Be concise but thorough
- If asked about fixes, provide step-by-step guidance
- Highlight critical issues that need immediate attention
- Explain technical concepts in accessible language

Respond in a helpful, professional manner. Focus on the specific data and issues in the context provided.`;

    // Format messages for HuggingFace
    const formattedPrompt = formatForLlama(systemPrompt, messages);

    console.log("[DQ-Chatbot] Calling HuggingFace API...");

    // Call HuggingFace Inference API with Llama model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.7,
            return_full_text: false,
            do_sample: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DQ-Chatbot] HuggingFace error:", response.status, errorText);
      
      // Check for model loading
      if (response.status === 503 && errorText.includes("loading")) {
        return new Response(
          JSON.stringify({ 
            response: "The AI model is warming up. Please try again in a few seconds." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract response text
    let responseText = "";
    if (Array.isArray(data)) {
      responseText = data[0]?.generated_text || "";
    } else if (typeof data === "object") {
      responseText = data.generated_text || data[0]?.generated_text || "";
    }

    // Clean up response
    responseText = responseText.trim();
    
    // Remove any input prompt that might be included
    if (responseText.includes("<|assistant|>")) {
      responseText = responseText.split("<|assistant|>").pop()?.trim() || responseText;
    }

    console.log("[DQ-Chatbot] Response generated successfully");

    return new Response(
      JSON.stringify({ response: responseText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DQ-Chatbot] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        response: "I encountered an error processing your request. Please try again."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatForLlama(systemPrompt: string, messages: Message[]): string {
  let formatted = `<|system|>\n${systemPrompt}</s>\n`;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      formatted += `<|user|>\n${msg.content}</s>\n`;
    } else if (msg.role === 'assistant') {
      formatted += `<|assistant|>\n${msg.content}</s>\n`;
    }
  }
  
  formatted += '<|assistant|>\n';
  return formatted;
}
