// Google Gemini Adapter
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class GeminiAdapter extends BaseAdapter {
  name = 'gemini' as const;

  getDefaultModel(): string {
    return 'gemini-2.0-flash';
  }

  getSupportedModels(): string[] {
    return [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ];
  }

  private getBaseUrl(model: string, apiKey: string): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][Gemini] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    try {
      // Convert unified messages to Gemini format
      const contents = this.convertMessages(request.messages);
      
      const response = await this.fetchWithTimeout(
        this.getBaseUrl(model, config.apiKey),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.max_tokens ?? 2048,
              topP: 0.95,
              topK: 40
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
          })
        },
        config.timeout ?? 60000
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][Gemini] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'gemini',
          response.status
        );
      }

      const data = await response.json();
      
      // Check for safety blocks
      if (data.promptFeedback?.blockReason) {
        throw this.normalizeError(
          new Error(`Content blocked: ${data.promptFeedback.blockReason}`),
          'gemini'
        );
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usageMetadata = data.usageMetadata || {};

      console.log(`[LLM-Gateway][Gemini] Success ${requestId}: latency=${latency}ms, tokens=${usageMetadata.totalTokenCount || 0}`);

      return {
        id: requestId,
        provider: 'gemini',
        model,
        content,
        usage: {
          prompt_tokens: usageMetadata.promptTokenCount || 0,
          completion_tokens: usageMetadata.candidatesTokenCount || 0,
          total_tokens: usageMetadata.totalTokenCount || 0
        },
        latency_ms: latency,
        raw_response: data
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[LLM-Gateway][Gemini] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'gemini');
    }
  }

  private convertMessages(messages: { role: string; content: string }[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini handles system prompts by prepending to first user message
        systemPrompt += msg.content + '\n\n';
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        const content = msg.role === 'user' && systemPrompt 
          ? systemPrompt + msg.content 
          : msg.content;
        
        if (msg.role === 'user') {
          systemPrompt = ''; // Clear after using
        }
        
        contents.push({
          role,
          parts: [{ text: content }]
        });
      }
    }

    return contents;
  }
}
