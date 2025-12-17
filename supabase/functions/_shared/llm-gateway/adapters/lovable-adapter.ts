// Lovable AI Gateway Adapter (Default)
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class LovableAdapter extends BaseAdapter {
  name = 'lovable' as const;
  private baseUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';

  getDefaultModel(): string {
    return 'google/gemini-2.5-flash';
  }

  getSupportedModels(): string[] {
    return [
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'google/gemini-3-pro-preview',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano'
    ];
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    console.log(`[LLM-Gateway][Lovable] Request ${requestId}: model=${request.model}, messages=${request.messages.length}`);

    try {
      const response = await this.fetchWithTimeout(
        this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: request.model || this.getDefaultModel(),
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 2048,
            stream: false
          })
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][Lovable] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        const error = this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'lovable',
          response.status
        );
        throw error;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log(`[LLM-Gateway][Lovable] Success ${requestId}: latency=${latency}ms, tokens=${usage.total_tokens}`);

      return {
        id: requestId,
        provider: 'lovable',
        model: request.model || this.getDefaultModel(),
        content,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0
        },
        latency_ms: latency,
        raw_response: data
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[LLM-Gateway][Lovable] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'lovable');
    }
  }
}
