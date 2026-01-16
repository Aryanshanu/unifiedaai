// HuggingFace Inference Adapter
import { BaseAdapter } from './base-adapter.ts';
import { UnifiedRequest, UnifiedResponse, ProviderConfig, UnifiedError } from '../types.ts';

export class HuggingFaceAdapter extends BaseAdapter {
  name = 'huggingface' as const;

  getDefaultModel(): string {
    return 'meta-llama/Llama-3.2-3B-Instruct';
  }

  getSupportedModels(): string[] {
    return [
      'meta-llama/Llama-3.2-3B-Instruct',
      'meta-llama/Llama-3.2-1B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'microsoft/Phi-3-mini-4k-instruct',
      'google/gemma-2-2b-it',
      'HuggingFaceH4/zephyr-7b-beta'
    ];
  }

  private getBaseUrl(model: string, customEndpoint?: string): string {
    if (customEndpoint) {
      return customEndpoint;
    }
    // Use the new router endpoint instead of deprecated api-inference
    return `https://router.huggingface.co/hf-inference/models/${model}`;
  }

  async generate(request: UnifiedRequest, config: ProviderConfig): Promise<UnifiedResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const model = request.model || this.getDefaultModel();

    console.log(`[LLM-Gateway][HuggingFace] Request ${requestId}: model=${model}, messages=${request.messages.length}`);

    try {
      // Format messages for HuggingFace chat format
      const formattedPrompt = this.formatMessages(request.messages);
      const url = this.getBaseUrl(model, config.baseUrl);
      
      // Detect endpoint type
      const isInferenceAPI = url.includes('api-inference.huggingface.co');
      
      let body: Record<string, unknown>;
      
      if (isInferenceAPI) {
        // Standard HuggingFace Inference API format
        body = {
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: request.max_tokens ?? 512,
            temperature: request.temperature ?? 0.7,
            return_full_text: false,
            do_sample: true
          }
        };
      } else {
        // Custom endpoint or TGI format
        body = {
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: request.max_tokens ?? 512,
            temperature: request.temperature ?? 0.7,
            do_sample: true
          }
        };
      }

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        },
        config.timeout ?? 120000 // HF can be slow
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LLM-Gateway][HuggingFace] Error ${requestId}: status=${response.status}, body=${errorText}`);
        
        // Check for model loading
        if (response.status === 503 && errorText.includes('loading')) {
          throw this.normalizeError(
            new Error('Model is loading, please retry in a few seconds'),
            'huggingface',
            503
          );
        }
        
        throw this.normalizeError(
          new Error(errorText || `HTTP ${response.status}`),
          'huggingface',
          response.status
        );
      }

      const data = await response.json();
      
      // HuggingFace returns different formats based on model/endpoint
      let content = '';
      if (Array.isArray(data)) {
        content = data[0]?.generated_text || data[0]?.text || '';
      } else if (typeof data === 'object') {
        content = data.generated_text || data.text || data[0]?.generated_text || '';
      }

      // Remove the input prompt if it's included in output
      if (content.startsWith(formattedPrompt)) {
        content = content.slice(formattedPrompt.length).trim();
      }

      console.log(`[LLM-Gateway][HuggingFace] Success ${requestId}: latency=${latency}ms, content_length=${content.length}`);

      return {
        id: requestId,
        provider: 'huggingface',
        model,
        content,
        usage: {
          prompt_tokens: Math.ceil(formattedPrompt.length / 4), // Estimate
          completion_tokens: Math.ceil(content.length / 4),
          total_tokens: Math.ceil((formattedPrompt.length + content.length) / 4)
        },
        latency_ms: latency,
        raw_response: data
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[LLM-Gateway][HuggingFace] Failed ${requestId}: latency=${latency}ms, error=${error}`);
      
      if ((error as UnifiedError).code) {
        throw error;
      }
      throw this.normalizeError(error, 'huggingface');
    }
  }

  private formatMessages(messages: { role: string; content: string }[]): string {
    // Format as Llama-style chat template
    let formatted = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        formatted += `<|system|>\n${msg.content}</s>\n`;
      } else if (msg.role === 'user') {
        formatted += `<|user|>\n${msg.content}</s>\n`;
      } else if (msg.role === 'assistant') {
        formatted += `<|assistant|>\n${msg.content}</s>\n`;
      }
    }
    
    formatted += '<|assistant|>\n';
    return formatted;
  }
}
