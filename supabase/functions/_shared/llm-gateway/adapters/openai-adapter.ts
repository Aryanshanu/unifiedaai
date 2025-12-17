// OpenAI ChatGPT Adapter
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class OpenAIAdapter extends BaseAdapter {
  name = 'openai' as const;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  getDefaultModel(): string {
    return 'gpt-4o-mini';
  }

  getSupportedModels(): string[] {
    return [
      'gpt-5-2025-08-07',
      'gpt-5-mini-2025-08-07',
      'gpt-5-nano-2025-08-07',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ];
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][OpenAI] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    // GPT-5 and newer models don't support temperature and use max_completion_tokens
    const isNewerModel = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4');

    try {
      const body: Record<string, unknown> = {
        model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      };

      if (isNewerModel) {
        body.max_completion_tokens = request.max_tokens ?? 2048;
        // Note: temperature not supported for GPT-5+
      } else {
        body.max_tokens = request.max_tokens ?? 2048;
        body.temperature = request.temperature ?? 0.7;
      }

      const response = await this.fetchWithTimeout(
        config.baseUrl || this.baseUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][OpenAI] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'openai',
          response.status
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      console.log(`[LLM-Gateway][OpenAI] Success ${requestId}: latency=${latency}ms, tokens=${usage.total_tokens}`);

      return {
        id: requestId,
        provider: 'openai',
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
      console.error(`[LLM-Gateway][OpenAI] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'openai');
    }
  }
}
