/**
 * Multi-Tenant AI Service Test Suite
 * BUSINESS CRITICAL - Story 19.3: Client-Specific AI Configuration
 * 
 * Tests ensure proper AI configuration management, quota enforcement,
 * billing tracking, and security isolation between organizations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MultiTenantAIService } from '../../lib/multi-tenant-ai-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test organizations
const TEST_ORG_1 = 'test-ai-org-1';
const TEST_ORG_2 = 'test-ai-org-2';

// Mock OpenAI response
const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: 'This is a test AI response.'
      }
    }
  ],
  usage: {
    total_tokens: 50,
    prompt_tokens: 25,
    completion_tokens: 25
  }
};

// Mock OpenAI client
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResponse)
      }
    }
  }));
});

describe('Multi-Tenant AI Service Tests', () => {
  let aiService: MultiTenantAIService;

  beforeAll(async () => {
    // Set required environment variables
    process.env.AI_CONFIG_ENCRYPTION_KEY = '32charsstringfor256bitencryptionkey';
    process.env.FLOWVISION_OPENAI_API_KEY = 'sk-test-flowvision-key';
    
    aiService = MultiTenantAIService.getInstance();

    // Create test organizations
    await prisma.organizations.upsert({
      where: { id: TEST_ORG_1 },
      create: {
        id: TEST_ORG_1,
        name: 'Test AI Organization 1',
        slug: 'test-ai-org-1',
        planTier: 'PROFESSIONAL'
      },
      update: {}
    });

    await prisma.organizations.upsert({
      where: { id: TEST_ORG_2 },
      create: {
        id: TEST_ORG_2,
        name: 'Test AI Organization 2',
        slug: 'test-ai-org-2',
        planTier: 'ENTERPRISE'
      },
      update: {}
    });
  });

  beforeEach(async () => {
    // Clean up AI configurations
    await prisma.aIConfiguration.deleteMany({
      where: {
        organizationId: { in: [TEST_ORG_1, TEST_ORG_2] }
      }
    });

    await prisma.aIUsageLog.deleteMany({
      where: {
        organizationId: { in: [TEST_ORG_1, TEST_ORG_2] }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.aIConfiguration.deleteMany({
      where: {
        organizationId: { in: [TEST_ORG_1, TEST_ORG_2] }
      }
    });

    await prisma.aIUsageLog.deleteMany({
      where: {
        organizationId: { in: [TEST_ORG_1, TEST_ORG_2] }
      }
    });

    await prisma.$disconnect();
  });

  describe('AI Configuration Management', () => {
    test('should create FlowVision-managed AI configuration', async () => {
      const config = await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
        monthlyQuota: 100000,
        dailyQuota: 5000,
        maxMonthlyCost: 50.00
      });

      expect(config).toBeDefined();
      expect(config.organizationId).toBe(TEST_ORG_1);
      expect(config.provider).toBe('FLOWVISION_MANAGED');
      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.monthlyQuota).toBe(100000);
      expect(config.isActive).toBe(true);
    });

    test('should create client-managed AI configuration with encrypted API key', async () => {
      const clientApiKey = 'sk-test-client-api-key-12345';
      
      const config = await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'CLIENT_MANAGED',
        clientApiKey,
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.5,
        monthlyQuota: 50000,
        dailyQuota: 2500,
        maxMonthlyCost: 100.00
      });

      expect(config).toBeDefined();
      expect(config.provider).toBe('CLIENT_MANAGED');
      expect(config.clientApiKey).toBeDefined();
      expect(config.clientApiKey).not.toBe(clientApiKey); // Should be encrypted
      expect(config.model).toBe('gpt-4');
    });

    test('should update existing AI configuration', async () => {
      // Create initial config
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 50000
      });

      // Update config
      const updatedConfig = await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'HYBRID',
        monthlyQuota: 100000,
        maxMonthlyCost: 75.00
      });

      expect(updatedConfig.provider).toBe('HYBRID');
      expect(updatedConfig.monthlyQuota).toBe(100000);
      expect(updatedConfig.maxMonthlyCost).toBe(75.00);
    });

    test('should isolate configurations between organizations', async () => {
      // Create config for ORG 1
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'CLIENT_MANAGED',
        monthlyQuota: 50000
      });

      // Create config for ORG 2
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_2,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 100000
      });

      const config1 = await aiService.getAIConfiguration(TEST_ORG_1);
      const config2 = await aiService.getAIConfiguration(TEST_ORG_2);

      expect(config1?.provider).toBe('CLIENT_MANAGED');
      expect(config1?.monthlyQuota).toBe(50000);
      
      expect(config2?.provider).toBe('FLOWVISION_MANAGED');
      expect(config2?.monthlyQuota).toBe(100000);
    });
  });

  describe('Quota Management', () => {
    beforeEach(async () => {
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 10000,
        dailyQuota: 1000,
        maxMonthlyCost: 10.00
      });
    });

    test('should check quota status correctly', async () => {
      const quotaStatus = await aiService.checkQuotaStatus(TEST_ORG_1);

      expect(quotaStatus).toBeDefined();
      expect(quotaStatus.monthlyLimit).toBe(10000);
      expect(quotaStatus.dailyLimit).toBe(1000);
      expect(quotaStatus.costLimit).toBe(10.00);
      expect(quotaStatus.monthlyUsed).toBe(0);
      expect(quotaStatus.isThrottled).toBe(false);
    });

    test('should throttle when monthly quota exceeded', async () => {
      // Simulate usage that exceeds monthly quota
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'TEST_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 11000, // Exceeds 10000 quota
        requestId: 'test-request-1',
        success: true
      });

      const quotaStatus = await aiService.checkQuotaStatus(TEST_ORG_1);

      expect(quotaStatus.isThrottled).toBe(true);
      expect(quotaStatus.throttleReason).toBe('Monthly token quota exceeded');
      expect(quotaStatus.monthlyRemaining).toBe(0);
    });

    test('should throttle when daily quota exceeded', async () => {
      // Simulate usage that exceeds daily quota
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'TEST_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 1500, // Exceeds 1000 daily quota
        requestId: 'test-request-1',
        success: true
      });

      const quotaStatus = await aiService.checkQuotaStatus(TEST_ORG_1);

      expect(quotaStatus.isThrottled).toBe(true);
      expect(quotaStatus.throttleReason).toBe('Daily token quota exceeded');
      expect(quotaStatus.dailyRemaining).toBe(0);
    });

    test('should throttle when cost limit exceeded', async () => {
      // Simulate high usage that exceeds cost limit
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'TEST_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 8000, // Should cost more than $10
        requestId: 'test-request-1',
        success: true
      });

      const quotaStatus = await aiService.checkQuotaStatus(TEST_ORG_1);

      expect(quotaStatus.isThrottled).toBe(true);
      expect(quotaStatus.throttleReason).toBe('Monthly cost limit exceeded');
    });
  });

  describe('Usage Recording and Analytics', () => {
    beforeEach(async () => {
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 100000,
        dailyQuota: 10000,
        maxMonthlyCost: 100.00
      });
    });

    test('should record successful AI usage', async () => {
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'ISSUE_ANALYSIS',
        model: 'gpt-3.5-turbo',
        tokensUsed: 250,
        requestId: 'test-request-1',
        success: true
      });

      const config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentMonthlyUsage).toBe(250);
      expect(config?.currentDailyUsage).toBe(250);

      // Check usage log was created
      const usageLogs = await prisma.aIUsageLog.findMany({
        where: { organizationId: TEST_ORG_1 }
      });

      expect(usageLogs).toHaveLength(1);
      expect(usageLogs[0].operation).toBe('ISSUE_ANALYSIS');
      expect(usageLogs[0].tokensUsed).toBe(250);
      expect(usageLogs[0].success).toBe(true);
    });

    test('should record failed AI usage without updating quotas', async () => {
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'FAILED_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 0,
        requestId: 'test-request-1',
        success: false,
        errorMessage: 'API rate limit exceeded'
      });

      const config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentMonthlyUsage).toBe(0); // Should not be updated for failed requests

      const usageLogs = await prisma.aIUsageLog.findMany({
        where: { organizationId: TEST_ORG_1 }
      });

      expect(usageLogs).toHaveLength(1);
      expect(usageLogs[0].success).toBe(false);
      expect(usageLogs[0].errorMessage).toBe('API rate limit exceeded');
    });

    test('should generate usage analytics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Create test usage data
      const usageData = [
        { operation: 'ISSUE_ANALYSIS', tokens: 500, success: true },
        { operation: 'INITIATIVE_GENERATION', tokens: 750, success: true },
        { operation: 'ISSUE_ANALYSIS', tokens: 300, success: true },
        { operation: 'FAILED_OPERATION', tokens: 0, success: false }
      ];

      for (const [index, usage] of usageData.entries()) {
        await aiService.recordUsage({
          organizationId: TEST_ORG_1,
          userId: 'test-user',
          operation: usage.operation,
          model: 'gpt-3.5-turbo',
          tokensUsed: usage.tokens,
          requestId: `test-request-${index}`,
          success: usage.success,
          errorMessage: usage.success ? undefined : 'Test error'
        });
      }

      const analytics = await aiService.getUsageAnalytics(
        TEST_ORG_1,
        startDate,
        endDate
      );

      expect(analytics.totalTokens).toBe(1550); // Only successful requests
      expect(analytics.requestCount).toBe(4);
      expect(analytics.successRate).toBe(75); // 3 out of 4 successful
      expect(analytics.topOperations).toHaveLength(3);
      
      // Check top operation
      const topOperation = analytics.topOperations[0];
      expect(topOperation.operation).toBe('ISSUE_ANALYSIS');
      expect(topOperation.tokens).toBe(800); // 500 + 300
      expect(topOperation.count).toBe(2);
    });
  });

  describe('AI Generation with Quota Enforcement', () => {
    beforeEach(async () => {
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        model: 'gpt-3.5-turbo',
        monthlyQuota: 1000,
        dailyQuota: 100,
        maxMonthlyCost: 5.00
      });
    });

    test('should generate AI completion within quota', async () => {
      const result = await aiService.generateCompletion(
        TEST_ORG_1,
        'test-user',
        'TEST_OPERATION',
        'Test prompt',
        { maxTokens: 50 }
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('This is a test AI response.');
      expect(result.tokensUsed).toBe(50);
      expect(result.quotaStatus.isThrottled).toBe(false);

      // Verify usage was recorded
      const config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentMonthlyUsage).toBe(50);
    });

    test('should reject generation when quota exceeded', async () => {
      // Set up configuration that's already at quota
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'PREVIOUS_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 1000, // Uses up entire quota
        requestId: 'setup-request',
        success: true
      });

      await expect(
        aiService.generateCompletion(
          TEST_ORG_1,
          'test-user',
          'TEST_OPERATION',
          'Test prompt',
          { maxTokens: 50 }
        )
      ).rejects.toThrow('AI request throttled: Monthly token quota exceeded');
    });
  });

  describe('Security and Isolation', () => {
    test('should isolate usage between organizations', async () => {
      // Set up configurations for both orgs
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 10000
      });

      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_2,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 20000
      });

      // Record usage for ORG 1
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'user-1',
        operation: 'ORG1_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 500,
        requestId: 'org1-request',
        success: true
      });

      // Record usage for ORG 2
      await aiService.recordUsage({
        organizationId: TEST_ORG_2,
        userId: 'user-2',
        operation: 'ORG2_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 750,
        requestId: 'org2-request',
        success: true
      });

      // Check isolation
      const config1 = await aiService.getAIConfiguration(TEST_ORG_1);
      const config2 = await aiService.getAIConfiguration(TEST_ORG_2);

      expect(config1?.currentMonthlyUsage).toBe(500);
      expect(config2?.currentMonthlyUsage).toBe(750);

      // Check quota status isolation
      const quota1 = await aiService.checkQuotaStatus(TEST_ORG_1);
      const quota2 = await aiService.checkQuotaStatus(TEST_ORG_2);

      expect(quota1.monthlyUsed).toBe(500);
      expect(quota2.monthlyUsed).toBe(750);
    });

    test('should encrypt and decrypt client API keys', async () => {
      const originalApiKey = 'sk-test-client-api-key-secret';

      const config = await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'CLIENT_MANAGED',
        clientApiKey: originalApiKey
      });

      // API key should be encrypted in storage
      expect(config.clientApiKey).toBeDefined();
      expect(config.clientApiKey).not.toBe(originalApiKey);
      expect(config.clientApiKey).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // Encrypted format

      // Should be able to get OpenAI client (which requires decryption)
      const openaiClient = await aiService.getOpenAIClient(TEST_ORG_1);
      expect(openaiClient).toBeDefined();
    });
  });

  describe('Usage Reset Functions', () => {
    beforeEach(async () => {
      await aiService.upsertAIConfiguration({
        organizationId: TEST_ORG_1,
        provider: 'FLOWVISION_MANAGED',
        monthlyQuota: 10000,
        dailyQuota: 1000
      });

      // Add some usage
      await aiService.recordUsage({
        organizationId: TEST_ORG_1,
        userId: 'test-user',
        operation: 'TEST_OPERATION',
        model: 'gpt-3.5-turbo',
        tokensUsed: 500,
        requestId: 'test-request',
        success: true
      });
    });

    test('should reset daily usage', async () => {
      let config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentDailyUsage).toBe(500);

      await aiService.resetDailyUsage();

      config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentDailyUsage).toBe(0);
      expect(config?.currentMonthlyUsage).toBe(500); // Should not be affected
    });

    test('should reset monthly usage', async () => {
      let config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentMonthlyUsage).toBe(500);
      expect(config?.currentMonthlyCost).toBeGreaterThan(0);

      await aiService.resetMonthlyUsage();

      config = await aiService.getAIConfiguration(TEST_ORG_1);
      expect(config?.currentMonthlyUsage).toBe(0);
      expect(config?.currentMonthlyCost).toBe(0);
    });
  });
});
