import { MultiModelAIService } from '../../lib/ai/MultiModelService';
import { aiConfigLoader } from '../../lib/ai-config-loader';

// Mock dependencies
jest.mock('../../lib/ai-config-loader');
jest.mock('openai');

const mockAiConfigLoader = aiConfigLoader as jest.Mocked<typeof aiConfigLoader>;

describe('MultiModelAIService', () => {
  let service: MultiModelAIService;

  beforeEach(() => {
    service = new MultiModelAIService();
    jest.clearAllMocks();
  });

  describe('generateCompletion', () => {
    it('generates completion with primary model', async () => {
      // Mock OpenAI config
      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        enabled: true,
      });

      // Mock OpenAI client response
      const mockOpenAI = require('openai');
      mockOpenAI.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Test AI response',
                },
              },
            ],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 100,
              total_tokens: 150,
            },
          }),
        },
      };

      const response = await service.generateCompletion('Test prompt');

      expect(response).toMatchObject({
        content: 'Test AI response',
        model: 'gpt-4',
        provider: 'OpenAI',
        usage: {
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150,
        },
      });

      expect(response.cost).toBeGreaterThan(0);
      expect(response.latency).toBeGreaterThan(0);
    });

    it('falls back to secondary model when primary fails', async () => {
      // Configure with fallbacks
      await service.updateConfig({
        primary: 'gpt-4',
        fallbacks: ['gpt-4-turbo'],
        enableFallback: true,
      });

      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        enabled: true,
      });

      const mockOpenAI = require('openai');
      mockOpenAI.prototype.chat = {
        completions: {
          create: jest.fn()
            .mockRejectedValueOnce(new Error('Primary model failed'))
            .mockResolvedValueOnce({
              choices: [{ message: { content: 'Fallback response' } }],
              usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
            }),
        },
      };

      const response = await service.generateCompletion('Test prompt');

      expect(response.content).toBe('Fallback response');
      expect(response.model).toBe('gpt-4-turbo');
    });

    it('throws error when all providers fail', async () => {
      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'invalid-key',
        enabled: true,
      });

      const mockOpenAI = require('openai');
      mockOpenAI.prototype.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('All models failed')),
        },
      };

      await expect(service.generateCompletion('Test prompt')).rejects.toThrow(
        'All AI providers failed'
      );
    });

    it('respects cost threshold configuration', async () => {
      await service.updateConfig({
        costThreshold: 0.01, // Very low threshold
      });

      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'sk-test-key',
        enabled: true,
      });

      const mockOpenAI = require('openai');
      mockOpenAI.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Expensive response' } }],
            usage: { prompt_tokens: 10000, completion_tokens: 10000, total_tokens: 20000 },
          }),
        },
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const response = await service.generateCompletion('Test prompt');

      expect(response.content).toBe('Expensive response');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Response cost')
      );

      consoleSpy.mockRestore();
    });

    it('handles system prompts correctly', async () => {
      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'sk-test-key',
        enabled: true,
      });

      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'System prompt response' } }],
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
      });

      const mockOpenAI = require('openai');
      mockOpenAI.prototype.chat = {
        completions: { create: mockCreate },
      };

      await service.generateCompletion('User prompt', {
        systemPrompt: 'You are a helpful assistant',
        responseFormat: 'json',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'User prompt' },
          ],
          response_format: { type: 'json_object' },
        })
      );
    });
  });

  describe('getAvailableModels', () => {
    it('returns list of available models with status', async () => {
      mockAiConfigLoader.loadConfig.mockResolvedValue({
        apiKey: 'sk-test-key',
        enabled: true,
      });

      const mockOpenAI = require('openai');
      mockOpenAI.prototype.models = {
        list: jest.fn().mockResolvedValue({ data: [] }),
      };

      const models = await service.getAvailableModels();

      expect(models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            model: 'gpt-4',
            provider: 'OpenAI',
            available: true,
          }),
          expect.objectContaining({
            model: 'claude-3-sonnet',
            provider: 'Anthropic Claude',
            available: false, // No API key configured
          }),
        ])
      );
    });
  });

  describe('estimateRequestCost', () => {
    it('estimates cost based on prompt length and model', async () => {
      const prompt = 'Test prompt that is reasonably long to estimate tokens properly';
      const cost = await service.estimateRequestCost(prompt, 'gpt-4');

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('returns 0 for unsupported models', async () => {
      const cost = await service.estimateRequestCost('test', 'unsupported-model' as any);
      expect(cost).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('updates configuration correctly', async () => {
      const newConfig = {
        primary: 'claude-3-sonnet' as const,
        fallbacks: ['gpt-4', 'gpt-4-turbo'] as const,
        costThreshold: 0.50,
        latencyThreshold: 20000,
        enableFallback: false,
      };

      await service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config).toMatchObject(newConfig);
    });

    it('preserves existing config when partially updating', async () => {
      const originalConfig = service.getConfig();
      
      await service.updateConfig({
        costThreshold: 0.25,
      });

      const updatedConfig = service.getConfig();
      
      expect(updatedConfig.costThreshold).toBe(0.25);
      expect(updatedConfig.primary).toBe(originalConfig.primary);
      expect(updatedConfig.fallbacks).toEqual(originalConfig.fallbacks);
    });
  });
});
