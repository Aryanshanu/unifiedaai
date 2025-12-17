// Anthropic Claude Adapter
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class AnthropicAdapter extends BaseAdapter {
  name = 'anthropic' as const;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022';
  }

  getSupportedModels(): string[] {
    return [
      'claude-sonnet-4-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][Anthropic] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    try {
      // Extract system message and convert others to Anthropic format
      const { systemPrompt, messages } = this.convertMessages(request.messages);

      const body: Record<string, unknown> = {
        model,
        max_tokens: request.max_tokens ?? 2048,
        messages
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      // Note: Claude doesn't support temperature in the same way
      if (request.temperature !== undefined) {
        body.temperature = request.temperature;
      }

      const response = await this.fetchWithTimeout(
        config.baseUrl || this.baseUrl,
        {
          method: 'POST',
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body)
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][Anthropic] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'anthropic',
          response.status
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const usage = data.usage || { input_tokens: 0, output_tokens: 0 };

      console.log(`[LLM-Gateway][Anthropic] Success ${requestId}: latency=${latency}ms, tokens=${usage.input_tokens + usage.output_tokens}`);

      return {
        id: requestId,
        provider: 'anthropic',
        model,
        content,
        usage: {
          prompt_tokens: usage.input_tokens || 0,
          completion_tokens: usage.output_tokens || 0,
          total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        },
        latency_ms: latency,
        raw_response: data
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[LLM-Gateway][Anthropic] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'anthropic');
    }
  }

  private convertMessages(messages: { role: string; content: string }[]): { 
    systemPrompt: string; 
    messages: Array<{ role: string; content: string }> 
  } {
    let systemPrompt = '';
    const convertedMessages: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        convertedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return { systemPrompt, messages: convertedMessages };
  }
}
