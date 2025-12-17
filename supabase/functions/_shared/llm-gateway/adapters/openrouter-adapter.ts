// OpenRouter Adapter - Access to multiple providers through one API
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class OpenRouterAdapter extends BaseAdapter {
  name = 'openrouter' as const;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  getDefaultModel(): string {
    return 'openai/gpt-4o-mini';
  }

  getSupportedModels(): string[] {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.2-3b-instruct',
      'mistralai/mistral-7b-instruct',
      'deepseek/deepseek-chat'
    ];
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][OpenRouter] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    try {
      const response = await this.fetchWithTimeout(
        config.baseUrl || this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://fractal-rai.lovable.app',
            'X-Title': 'Fractal RAI-OS'
          },
          body: JSON.stringify({
            model,
            messages: request.messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            max_tokens: request.max_tokens ?? 2048,
            temperature: request.temperature ?? 0.7,
            stream: false
          })
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][OpenRouter] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'openrouter',
          response.status
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log(`[LLM-Gateway][OpenRouter] Success ${requestId}: latency=${latency}ms, tokens=${usage.total_tokens}`);

      return {
        id: requestId,
        provider: 'openrouter',
        model,
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
      console.error(`[LLM-Gateway][OpenRouter] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'openrouter');
    }
  }
}
