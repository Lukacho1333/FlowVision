import { MultiModelAIService } from '../../lib/ai/MultiModelService';

// Mock the dependencies to prevent actual API calls
jest.mock('openai');
jest.mock('../../lib/ai-config-loader');

describe('MultiModelAIService', () => {
  let service: MultiModelAIService;

  beforeEach(() => {
    service = new MultiModelAIService();
  });

  describe('initialization', () => {
    it('creates service instance', () => {
      expect(service).toBeInstanceOf(MultiModelAIService);
    });
  });

  describe('error handling', () => {
    it('handles empty prompt', async () => {
      await expect(service.generateCompletion('')).rejects.toThrow();
    });

    it('handles null prompt', async () => {
      await expect(service.generateCompletion(null as any)).rejects.toThrow();
    });
  });
});