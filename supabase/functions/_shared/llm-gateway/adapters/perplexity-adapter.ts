// Perplexity AI Adapter
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class PerplexityAdapter extends BaseAdapter {
  name = 'perplexity' as const;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  getDefaultModel(): string {
    return 'sonar';
  }

  getSupportedModels(): string[] {
    return [
      'sonar',                    // Fast, lightweight search
      'sonar-pro',                // Multi-step reasoning with 2x citations
      'sonar-reasoning',          // Chain-of-thought with real-time search
      'sonar-reasoning-pro',      // Advanced reasoning (DeepSeek R1 based)
      'sonar-deep-research'       // Expert research with multi-query
    ];
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][Perplexity] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    try {
      const response = await this.fetchWithTimeout(
        config.baseUrl || this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: request.messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            max_tokens: request.max_tokens ?? 2048,
            temperature: request.temperature ?? 0.2, // Perplexity defaults to 0.2
            stream: false
          })
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][Perplexity] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'perplexity',
          response.status
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      // Perplexity includes citations in response
      const citations = data.citations || [];

      console.log(`[LLM-Gateway][Perplexity] Success ${requestId}: latency=${latency}ms, tokens=${usage.total_tokens}, citations=${citations.length}`);

      return {
        id: requestId,
        provider: 'perplexity',
        model,
        content,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0
        },
        latency_ms: latency,
        raw_response: { ...data, citations }
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[LLM-Gateway][Perplexity] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'perplexity');
    }
  }
}
