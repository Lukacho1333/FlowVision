import OpenAI from 'openai';
import { aiConfigLoader } from '../ai-config-loader';
import { executeAIOperation, AIServiceError } from '../ai-error-handler';

export type AIModel = 'gpt-4' | 'gpt-4-turbo' | 'claude-3-sonnet' | 'claude-3-haiku' | 'gemini-pro' | 'llama-2' | 'custom';

export interface AIProvider {
  name: string;
  models: AIModel[];
  isAvailable(): Promise<boolean>;
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<AIResponse>;
  estimateCost(tokens: number, model: AIModel): number;
}

export interface AICompletionOptions {
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  content: string;
  model: AIModel;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latency: number;
  confidence?: number;
}

export interface AIModelConfig {
  primary: AIModel;
  fallbacks: AIModel[];
  costThreshold: number; // Max cost per request
  latencyThreshold: number; // Max acceptable latency in ms
  retryAttempts: number;
  enableFallback: boolean;
}

class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  models: AIModel[] = ['gpt-4', 'gpt-4-turbo'];
  private client: OpenAI | null = null;

  async isAvailable(): Promise<boolean> {
    try {
      const config = await aiConfigLoader.loadConfig();
      if (!config?.apiKey) return false;
      
      if (!this.client) {
        this.client = new OpenAI({ apiKey: config.apiKey });
      }
      
      // Test connection with a minimal request
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async generateCompletion(prompt: string, options: AICompletionOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    if (!this.client) {
      const config = await aiConfigLoader.loadConfig();
      this.client = new OpenAI({ apiKey: config.apiKey });
    }

    const model = options.model || 'gpt-4';
    const messages = [];
    
    if (options.systemPrompt) {
      messages.push({ role: 'system' as const, content: options.systemPrompt });
    }
    messages.push({ role: 'user' as const, content: prompt });

    const response = await this.client.chat.completions.create({
      model: model === 'gpt-4-turbo' ? 'gpt-4-1106-preview' : 'gpt-4',
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    });

    const latency = Date.now() - startTime;
    const usage = response.usage!;
    const cost = this.estimateCost(usage.total_tokens, model);

    return {
      content: response.choices[0]?.message?.content || '',
      model,
      provider: this.name,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost,
      latency,
    };
  }

  estimateCost(tokens: number, model: AIModel): number {
    const costs = {
      'gpt-4': 0.06 / 1000, // $0.06 per 1K tokens
      'gpt-4-turbo': 0.03 / 1000, // $0.03 per 1K tokens
    };
    return tokens * (costs[model] || costs['gpt-4']);
  }
}

class ClaudeProvider implements AIProvider {
  name = 'Anthropic Claude';
  models: AIModel[] = ['claude-3-sonnet', 'claude-3-haiku'];

  async isAvailable(): Promise<boolean> {
    // Check if Claude API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return !!apiKey;
  }

  async generateCompletion(prompt: string, options: AICompletionOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Simulated Claude implementation - replace with actual Anthropic client
    const latency = Date.now() - startTime;
    
    return {
      content: 'Claude response would go here',
      model: options.model || 'claude-3-sonnet',
      provider: this.name,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      cost: this.estimateCost(300, options.model || 'claude-3-sonnet'),
      latency,
    };
  }

  estimateCost(tokens: number, model: AIModel): number {
    const costs = {
      'claude-3-sonnet': 0.015 / 1000,
      'claude-3-haiku': 0.0025 / 1000,
    };
    return tokens * (costs[model] || costs['claude-3-sonnet']);
  }
}

export class MultiModelAIService {
  private providers: AIProvider[] = [];
  private config: AIModelConfig;

  constructor() {
    this.providers = [
      new OpenAIProvider(),
      new ClaudeProvider(),
    ];

    this.config = {
      primary: 'gpt-4',
      fallbacks: ['gpt-4-turbo', 'claude-3-sonnet'],
      costThreshold: 0.10, // $0.10 max per request
      latencyThreshold: 30000, // 30 seconds max
      retryAttempts: 3,
      enableFallback: true,
    };
  }

  async updateConfig(newConfig: Partial<AIModelConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async generateCompletion(prompt: string, options: AICompletionOptions = {}): Promise<AIResponse> {
    const targetModel = options.model || this.config.primary;
    const modelsToTry = [targetModel, ...(this.config.enableFallback ? this.config.fallbacks : [])];

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      const provider = this.getProviderForModel(model);
      if (!provider) continue;

      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const response = await provider.generateCompletion(prompt, { ...options, model });

        // Check if response meets quality thresholds
        if (response.cost > this.config.costThreshold) {
          console.warn(`Response cost ${response.cost} exceeds threshold ${this.config.costThreshold}`);
        }

        if (response.latency > this.config.latencyThreshold) {
          console.warn(`Response latency ${response.latency}ms exceeds threshold ${this.config.latencyThreshold}ms`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to generate completion with ${provider.name} (${model}):`, error);
        continue;
      }
    }

    throw new AIServiceError(
      `All AI providers failed. Last error: ${lastError?.message}`,
      'PROVIDER_UNAVAILABLE',
      { providers: this.providers.map(p => p.name) }
    );
  }

  private getProviderForModel(model: AIModel): AIProvider | null {
    return this.providers.find(provider => provider.models.includes(model)) || null;
  }

  async getAvailableModels(): Promise<{ model: AIModel; provider: string; available: boolean }[]> {
    const results = [];
    
    for (const provider of this.providers) {
      const isAvailable = await provider.isAvailable();
      for (const model of provider.models) {
        results.push({
          model,
          provider: provider.name,
          available: isAvailable,
        });
      }
    }

    return results;
  }

  async estimateRequestCost(prompt: string, model: AIModel): Promise<number> {
    const provider = this.getProviderForModel(model);
    if (!provider) return 0;

    // Rough token estimation (4 chars = 1 token)
    const estimatedTokens = Math.ceil(prompt.length / 4) * 2; // 2x for completion
    return provider.estimateCost(estimatedTokens, model);
  }

  getConfig(): AIModelConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const multiModelAI = new MultiModelAIService();
