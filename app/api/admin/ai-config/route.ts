/**
 * Organization AI Configuration Management API
 * BUSINESS CRITICAL - Story 19.3: Client-Specific AI Configuration
 * 
 * Enables organization admins to configure their AI settings:
 * - Choose between client-managed, FlowVision-managed, or hybrid AI
 * - Set quotas, cost limits, and model preferences
 * - Monitor usage and billing in real-time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSecureAPIHandler, requireAdmin, TenantContext } from '@/lib/api-middleware';
import { multiTenantAI } from '@/lib/multi-tenant-ai-service';
import { z } from 'zod';

const aiConfigSchema = z.object({
  provider: z.enum(['CLIENT_MANAGED', 'FLOWVISION_MANAGED', 'HYBRID']),
  clientApiKey: z.string().optional(),
  model: z.string().default('gpt-3.5-turbo'),
  maxTokens: z.number().min(1).max(4000).default(500),
  temperature: z.number().min(0).max(2).default(0.7),
  monthlyQuota: z.number().min(1000).max(1000000).default(100000),
  dailyQuota: z.number().min(100).max(50000).default(5000),
  maxMonthlyCost: z.number().min(1).max(10000).default(50)
});

const usageAnalyticsSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

// GET /api/admin/ai-config - Get current AI configuration
export const GET = requireAdmin(async (request: NextRequest, context: TenantContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      // Get quota status
      const quotaStatus = await multiTenantAI.checkQuotaStatus(context.organizationId);
      return quotaStatus;
    }

    if (action === 'analytics') {
      // Get usage analytics
      const { startDate, endDate } = usageAnalyticsSchema.parse({
        startDate: searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: searchParams.get('endDate') || new Date().toISOString()
      });

      const analytics = await multiTenantAI.getUsageAnalytics(
        context.organizationId,
        startDate,
        endDate
      );

      return analytics;
    }

    // Get AI configuration
    const config = await multiTenantAI.getAIConfiguration(context.organizationId);
    
    if (!config) {
      return {
        configured: false,
        provider: null,
        message: 'AI configuration not set up yet'
      };
    }

    // Don't return the encrypted API key to the client
    const safeConfig = {
      ...config,
      clientApiKey: config.clientApiKey ? '***ENCRYPTED***' : undefined,
      hasClientApiKey: !!config.clientApiKey
    };

    return {
      configured: true,
      config: safeConfig
    };

  } catch (error: any) {
    console.error('Failed to get AI configuration:', error);
    throw new Error(error.message || 'Failed to get AI configuration');
  }
});

// POST /api/admin/ai-config - Create or update AI configuration
export const POST = requireAdmin(async (request: NextRequest, context: TenantContext) => {
  try {
    const body = await request.json();
    const validatedConfig = aiConfigSchema.parse(body);

    // Validate client API key if provider is CLIENT_MANAGED
    if (validatedConfig.provider === 'CLIENT_MANAGED') {
      if (!validatedConfig.clientApiKey) {
        throw new Error('Client API key is required for CLIENT_MANAGED provider');
      }
      
      if (!validatedConfig.clientApiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }
    }

    // Validate model availability
    const supportedModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'];
    if (!supportedModels.includes(validatedConfig.model)) {
      throw new Error(`Unsupported model: ${validatedConfig.model}. Supported models: ${supportedModels.join(', ')}`);
    }

    // Create or update configuration
    const config = await multiTenantAI.upsertAIConfiguration({
      organizationId: context.organizationId,
      ...validatedConfig
    });

    // Test the configuration if it's client-managed
    if (validatedConfig.provider === 'CLIENT_MANAGED') {
      try {
        const testResult = await multiTenantAI.generateCompletion(
          context.organizationId,
          context.userId,
          'CONFIG_TEST',
          'Say "Hello, this is a test of your AI configuration."',
          { maxTokens: 50 }
        );

        return {
          success: true,
          config: {
            ...config,
            clientApiKey: config.clientApiKey ? '***ENCRYPTED***' : undefined
          },
          testResult: {
            success: true,
            message: testResult.content,
            tokensUsed: testResult.tokensUsed
          },
          message: 'AI configuration saved and tested successfully'
        };
      } catch (testError: any) {
        // Configuration was saved but test failed
        return {
          success: true,
          config: {
            ...config,
            clientApiKey: config.clientApiKey ? '***ENCRYPTED***' : undefined
          },
          testResult: {
            success: false,
            error: testError.message
          },
          message: 'AI configuration saved but test failed. Please verify your API key.'
        };
      }
    }

    return {
      success: true,
      config: {
        ...config,
        clientApiKey: config.clientApiKey ? '***ENCRYPTED***' : undefined
      },
      message: 'AI configuration saved successfully'
    };

  } catch (error: any) {
    console.error('Failed to save AI configuration:', error);
    throw new Error(error.message || 'Failed to save AI configuration');
  }
});

// PUT /api/admin/ai-config - Update specific configuration settings
export const PUT = requireAdmin(async (request: NextRequest, context: TenantContext) => {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'reset-usage') {
      // Reset usage counters (emergency action)
      await multiTenantAI.upsertAIConfiguration({
        organizationId: context.organizationId,
        provider: 'FLOWVISION_MANAGED', // Will be overridden by existing config
        ...data,
        monthlyQuota: data.monthlyQuota || 100000,
        dailyQuota: data.dailyQuota || 5000
      });

      // Reset the usage counters specifically
      const config = await multiTenantAI.getAIConfiguration(context.organizationId);
      if (config) {
        await multiTenantAI.recordUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          operation: 'ADMIN_USAGE_RESET',
          model: config.model,
          tokensUsed: -config.currentMonthlyUsage, // Reset to zero
          requestId: `reset-${Date.now()}`,
          success: true
        });
      }

      return {
        success: true,
        message: 'Usage counters reset successfully'
      };
    }

    if (action === 'test-connection') {
      // Test the current configuration
      const testResult = await multiTenantAI.generateCompletion(
        context.organizationId,
        context.userId,
        'CONNECTION_TEST',
        'Respond with: "AI configuration test successful"',
        { maxTokens: 20 }
      );

      return {
        success: true,
        testResult: {
          content: testResult.content,
          tokensUsed: testResult.tokensUsed,
          cost: testResult.cost
        },
        quotaStatus: testResult.quotaStatus
      };
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: any) {
    console.error('Failed to update AI configuration:', error);
    throw new Error(error.message || 'Failed to update AI configuration');
  }
});

// DELETE /api/admin/ai-config - Disable AI configuration
export const DELETE = requireAdmin(async (request: NextRequest, context: TenantContext) => {
  try {
    const config = await multiTenantAI.getAIConfiguration(context.organizationId);
    
    if (!config) {
      return {
        success: true,
        message: 'AI configuration already disabled'
      };
    }

    // Disable the configuration
    await multiTenantAI.upsertAIConfiguration({
      organizationId: context.organizationId,
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      monthlyQuota: 0, // Disable by setting quota to 0
      dailyQuota: 0,
      maxMonthlyCost: 0
    });

    return {
      success: true,
      message: 'AI configuration disabled successfully'
    };

  } catch (error: any) {
    console.error('Failed to disable AI configuration:', error);
    throw new Error(error.message || 'Failed to disable AI configuration');
  }
});
