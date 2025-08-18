/**
 * Multi-Tenant AI Configuration Service
 * BUSINESS CRITICAL - Story 19.3: Client-Specific AI Configuration (8 points)
 * 
 * Implements three AI service models following expert team consensus:
 * 1. Client-Managed: Client provides their own OpenAI API key
 * 2. FlowVision-Managed: FlowVision provides AI with usage-based billing
 * 3. Hybrid: FlowVision manages but bills separately
 * 
 * Features:
 * - Per-organization AI configuration
 * - Real-time usage tracking and quota enforcement
 * - Cost controls and automatic throttling
 * - Encrypted API key storage
 * - Billing integration ready
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const prisma = new PrismaClient();

export interface OrganizationAIConfig {
  id: string;
  organizationId: string;
  provider: 'CLIENT_MANAGED' | 'FLOWVISION_MANAGED' | 'HYBRID';
  
  // Client-Managed Configuration
  clientApiKey?: string; // Encrypted
  
  // FlowVision-Managed Configuration
  model: string;
  maxTokens: number;
  temperature: number;
  
  // Quotas and Limits
  monthlyQuota: number;
  dailyQuota: number;
  currentMonthlyUsage: number;
  currentDailyUsage: number;
  
  // Cost Controls
  maxMonthlyCost: number;
  currentMonthlyCost: number;
  costPerToken: number;
  
  // Status and Tracking
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIUsageRecord {
  id: string;
  organizationId: string;
  userId: string;
  operation: string;
  model: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  requestId: string;
  success: boolean;
  errorMessage?: string;
}

export interface AIQuotaStatus {
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  costUsed: number;
  costLimit: number;
  costRemaining: number;
  isThrottled: boolean;
  throttleReason?: string;
}

export class MultiTenantAIService {
  private static instance: MultiTenantAIService;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly ENCRYPTION_KEY = process.env.AI_CONFIG_ENCRYPTION_KEY;
  
  // OpenAI pricing per 1K tokens (as of 2024)
  private readonly MODEL_PRICING = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 }
  };

  private constructor() {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('AI_CONFIG_ENCRYPTION_KEY environment variable is required');
    }
  }

  static getInstance(): MultiTenantAIService {
    if (!MultiTenantAIService.instance) {
      MultiTenantAIService.instance = new MultiTenantAIService();
    }
    return MultiTenantAIService.instance;
  }

  /**
   * Encrypt sensitive data like API keys
   */
  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, Buffer.from(this.ENCRYPTION_KEY!, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, Buffer.from(this.ENCRYPTION_KEY!, 'hex'), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create or update organization AI configuration
   */
  async upsertAIConfiguration(config: {
    organizationId: string;
    provider: 'CLIENT_MANAGED' | 'FLOWVISION_MANAGED' | 'HYBRID';
    clientApiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    monthlyQuota?: number;
    dailyQuota?: number;
    maxMonthlyCost?: number;
  }): Promise<OrganizationAIConfig> {
    const {
      organizationId,
      provider,
      clientApiKey,
      model = 'gpt-3.5-turbo',
      maxTokens = 500,
      temperature = 0.7,
      monthlyQuota = 100000,
      dailyQuota = 5000,
      maxMonthlyCost = 50.00
    } = config;

    // Encrypt client API key if provided
    const encryptedApiKey = clientApiKey ? this.encrypt(clientApiKey) : undefined;

    // Calculate cost per token for the model
    const costPerToken = this.MODEL_PRICING[model as keyof typeof this.MODEL_PRICING]?.input || 0.0015;

    const aiConfig = await prisma.aIConfiguration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider,
        clientApiKey: encryptedApiKey,
        model,
        maxTokens,
        temperature,
        monthlyQuota,
        dailyQuota,
        currentMonthlyUsage: 0,
        currentDailyUsage: 0,
        maxMonthlyCost,
        currentMonthlyCost: 0,
        costPerToken,
        isActive: true,
        lastUsed: null
      },
      update: {
        provider,
        clientApiKey: encryptedApiKey || undefined,
        model,
        maxTokens,
        temperature,
        monthlyQuota,
        dailyQuota,
        maxMonthlyCost,
        costPerToken,
        updatedAt: new Date()
      }
    });

    return this.mapPrismaToConfig(aiConfig as any);
  }

  /**
   * Get AI configuration for an organization
   */
  async getAIConfiguration(organizationId: string): Promise<OrganizationAIConfig | null> {
    const config = await prisma.aIConfiguration.findUnique({
      where: { organizationId }
    });

    if (!config) {
      return null;
    }

    return this.mapPrismaToConfig(config as any);
  }

  /**
   * Get OpenAI client for organization
   */
  async getOpenAIClient(organizationId: string): Promise<OpenAI | null> {
    const config = await this.getAIConfiguration(organizationId);
    
    if (!config || !config.isActive) {
      return null;
    }

    let apiKey: string;

    switch (config.provider) {
      case 'CLIENT_MANAGED':
        if (!config.clientApiKey) {
          throw new Error('Client API key not configured');
        }
        apiKey = this.decrypt(config.clientApiKey);
        break;
        
      case 'FLOWVISION_MANAGED':
      case 'HYBRID':
        apiKey = process.env.FLOWVISION_OPENAI_API_KEY!;
        if (!apiKey) {
          throw new Error('FlowVision OpenAI API key not configured');
        }
        break;
        
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }

    return new OpenAI({ apiKey });
  }

  /**
   * Check quota status before making AI request
   */
  async checkQuotaStatus(organizationId: string): Promise<AIQuotaStatus> {
    const config = await this.getAIConfiguration(organizationId);
    
    if (!config) {
      throw new Error('AI configuration not found');
    }

    const monthlyRemaining = Math.max(0, config.monthlyQuota - config.currentMonthlyUsage);
    const dailyRemaining = Math.max(0, config.dailyQuota - config.currentDailyUsage);
    const costRemaining = Math.max(0, config.maxMonthlyCost - config.currentMonthlyCost);

    let isThrottled = false;
    let throttleReason: string | undefined;

    if (monthlyRemaining <= 0) {
      isThrottled = true;
      throttleReason = 'Monthly token quota exceeded';
    } else if (dailyRemaining <= 0) {
      isThrottled = true;
      throttleReason = 'Daily token quota exceeded';
    } else if (costRemaining <= 0) {
      isThrottled = true;
      throttleReason = 'Monthly cost limit exceeded';
    }

    return {
      monthlyUsed: config.currentMonthlyUsage,
      monthlyLimit: config.monthlyQuota,
      monthlyRemaining,
      dailyUsed: config.currentDailyUsage,
      dailyLimit: config.dailyQuota,
      dailyRemaining,
      costUsed: config.currentMonthlyCost,
      costLimit: config.maxMonthlyCost,
      costRemaining,
      isThrottled,
      throttleReason
    };
  }

  /**
   * Record AI usage for billing and quota tracking
   */
  async recordUsage(data: {
    organizationId: string;
    userId: string;
    operation: string;
    model: string;
    tokensUsed: number;
    requestId: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    const config = await this.getAIConfiguration(data.organizationId);
    
    if (!config) {
      throw new Error('AI configuration not found');
    }

    // Calculate cost
    const modelPricing = this.MODEL_PRICING[data.model as keyof typeof this.MODEL_PRICING];
    const cost = modelPricing ? (data.tokensUsed / 1000) * modelPricing.input : 0;

    // Record usage in audit log
    await prisma.aIUsageLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        operation: data.operation,
        model: data.model,
        tokensUsed: data.tokensUsed,
        cost,
        requestId: data.requestId,
        success: data.success,
        errorMessage: data.errorMessage,
        timestamp: new Date()
      }
    });

    // Update configuration usage counters
    if (data.success) {
      await prisma.aIConfiguration.update({
        where: { organizationId: data.organizationId },
        data: {
          currentMonthlyUsage: { increment: data.tokensUsed },
          currentDailyUsage: { increment: data.tokensUsed },
          currentMonthlyCost: { increment: cost },
          lastUsed: new Date()
        }
      });
    }
  }

  /**
   * Generate AI completion with quota enforcement
   */
  async generateCompletion(
    organizationId: string,
    userId: string,
    operation: string,
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    content: string;
    tokensUsed: number;
    cost: number;
    quotaStatus: AIQuotaStatus;
  }> {
    // Check quota before making request
    const quotaStatus = await this.checkQuotaStatus(organizationId);
    
    if (quotaStatus.isThrottled) {
      throw new Error(`AI request throttled: ${quotaStatus.throttleReason}`);
    }

    const config = await this.getAIConfiguration(organizationId);
    if (!config) {
      throw new Error('AI configuration not found');
    }

    const openai = await this.getOpenAIClient(organizationId);
    if (!openai) {
      throw new Error('OpenAI client not available');
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const completion = await openai.chat.completions.create({
        model: options.model || config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || config.maxTokens,
        temperature: options.temperature || config.temperature
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      
      // Record successful usage
      await this.recordUsage({
        organizationId,
        userId,
        operation,
        model: options.model || config.model,
        tokensUsed,
        requestId,
        success: true
      });

      // Calculate cost
      const modelPricing = this.MODEL_PRICING[config.model as keyof typeof this.MODEL_PRICING];
      const cost = modelPricing ? (tokensUsed / 1000) * modelPricing.input : 0;

      // Get updated quota status
      const updatedQuotaStatus = await this.checkQuotaStatus(organizationId);

      return {
        content,
        tokensUsed,
        cost,
        quotaStatus: updatedQuotaStatus
      };

    } catch (error: any) {
      // Record failed usage
      await this.recordUsage({
        organizationId,
        userId,
        operation,
        model: options.model || config.model,
        tokensUsed: 0,
        requestId,
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Reset daily usage counters (called by daily cron job)
   */
  async resetDailyUsage(): Promise<void> {
    await prisma.aIConfiguration.updateMany({
      data: {
        currentDailyUsage: 0
      }
    });
  }

  /**
   * Reset monthly usage counters (called by monthly cron job)
   */
  async resetMonthlyUsage(): Promise<void> {
    await prisma.aIConfiguration.updateMany({
      data: {
        currentMonthlyUsage: 0,
        currentMonthlyCost: 0
      }
    });
  }

  /**
   * Get usage analytics for organization
   */
  async getUsageAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    successRate: number;
    topOperations: Array<{ operation: string; count: number; tokens: number }>;
    dailyUsage: Array<{ date: string; tokens: number; cost: number }>;
  }> {
    const usageLogs = await prisma.aIUsageLog.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokensUsed, 0);
    const totalCost = usageLogs.reduce((sum, log) => sum + log.cost, 0);
    const requestCount = usageLogs.length;
    const successCount = usageLogs.filter(log => log.success).length;
    const successRate = requestCount > 0 ? (successCount / requestCount) * 100 : 0;

    // Top operations
    const operationStats = usageLogs.reduce((acc, log) => {
      if (!acc[log.operation]) {
        acc[log.operation] = { operation: log.operation, count: 0, tokens: 0 };
      }
      acc[log.operation].count++;
      acc[log.operation].tokens += log.tokensUsed;
      return acc;
    }, {} as Record<string, { operation: string; count: number; tokens: number }>);

    const topOperations = Object.values(operationStats)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);

    // Daily usage
    const dailyStats = usageLogs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, tokens: 0, cost: 0 };
      }
      acc[date].tokens += log.tokensUsed;
      acc[date].cost += log.cost;
      return acc;
    }, {} as Record<string, { date: string; tokens: number; cost: number }>);

    const dailyUsage = Object.values(dailyStats);

    return {
      totalTokens,
      totalCost,
      requestCount,
      successRate,
      topOperations,
      dailyUsage
    };
  }

  /**
   * Helper to map Prisma model to our interface
   */
  private mapPrismaToConfig(config: any): OrganizationAIConfig {
    return {
      id: config.id,
      organizationId: config.organizationId,
      provider: config.provider,
      clientApiKey: config.clientApiKey,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      monthlyQuota: config.monthlyQuota,
      dailyQuota: config.dailyQuota,
      currentMonthlyUsage: config.currentMonthlyUsage,
      currentDailyUsage: config.currentDailyUsage,
      maxMonthlyCost: config.maxMonthlyCost,
      currentMonthlyCost: config.currentMonthlyCost,
      costPerToken: config.costPerToken,
      isActive: config.isActive,
      lastUsed: config.lastUsed,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }
}

// Export singleton instance
export const multiTenantAI = MultiTenantAIService.getInstance();
