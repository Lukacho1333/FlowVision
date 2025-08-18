/**
 * Super Admin Client AI Configuration Management
 * SECURITY CRITICAL: Super admin control over client AI settings
 * 
 * Enables FlowVision super admins to:
 * - View and manage all client AI configurations
 * - Set global AI quotas and cost limits
 * - Monitor AI usage across all clients
 * - Emergency AI service management
 */

import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuth } from '@/lib/super-admin-auth';
import { multiTenantAI } from '@/lib/multi-tenant-ai-service';
import { z } from 'zod';

const superAdminAIConfigSchema = z.object({
  sessionToken: z.string(),
  config: z.object({
    provider: z.enum(['CLIENT_MANAGED', 'FLOWVISION_MANAGED', 'HYBRID']),
    model: z.string().default('gpt-3.5-turbo'),
    maxTokens: z.number().min(1).max(4000).default(500),
    temperature: z.number().min(0).max(2).default(0.7),
    monthlyQuota: z.number().min(0).max(1000000).default(100000),
    dailyQuota: z.number().min(0).max(50000).default(5000),
    maxMonthlyCost: z.number().min(0).max(10000).default(50),
    isActive: z.boolean().default(true)
  })
});

// GET /super-admin/api/clients/[id]/ai-config - Get client AI configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      );
    }

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const action = searchParams.get('action');

    if (action === 'usage-analytics') {
      // Get comprehensive usage analytics
      const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());

      const analytics = await multiTenantAI.getUsageAnalytics(
        organizationId,
        startDate,
        endDate
      );

      const quotaStatus = await multiTenantAI.checkQuotaStatus(organizationId);

      return NextResponse.json({
        success: true,
        analytics: {
          ...analytics,
          quotaStatus,
          billingPeriod: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      });
    }

    // Get current configuration
    const config = await multiTenantAI.getAIConfiguration(organizationId);
    const quotaStatus = config ? await multiTenantAI.checkQuotaStatus(organizationId) : null;

    // Log super admin access
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'CLIENT_AI_CONFIG_VIEW',
      {
        targetOrganizationId: organizationId,
        configExists: !!config
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      config: config ? {
        ...config,
        clientApiKey: config.clientApiKey ? '***ENCRYPTED***' : undefined
      } : null,
      quotaStatus,
      configured: !!config
    });

  } catch (error: any) {
    console.error('Super admin AI config fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch AI configuration'
    }, { status: 500 });
  }
}

// POST /super-admin/api/clients/[id]/ai-config - Update client AI configuration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { sessionToken, config } = superAdminAIConfigSchema.parse(body);

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const previousConfig = await multiTenantAI.getAIConfiguration(organizationId);

    // Update the AI configuration
    const updatedConfig = await multiTenantAI.upsertAIConfiguration({
      organizationId,
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      monthlyQuota: config.monthlyQuota,
      dailyQuota: config.dailyQuota,
      maxMonthlyCost: config.maxMonthlyCost
    });

    // Log the change
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'CLIENT_AI_CONFIG_UPDATED',
      {
        targetOrganizationId: organizationId,
        previousConfig: previousConfig ? {
          provider: previousConfig.provider,
          monthlyQuota: previousConfig.monthlyQuota,
          maxMonthlyCost: previousConfig.maxMonthlyCost
        } : null,
        newConfig: {
          provider: config.provider,
          monthlyQuota: config.monthlyQuota,
          maxMonthlyCost: config.maxMonthlyCost
        }
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      config: {
        ...updatedConfig,
        clientApiKey: updatedConfig.clientApiKey ? '***ENCRYPTED***' : undefined
      },
      message: 'Client AI configuration updated successfully'
    });

  } catch (error: any) {
    console.error('Super admin AI config update error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update AI configuration'
    }, { status: 500 });
  }
}

// PUT /super-admin/api/clients/[id]/ai-config - Emergency AI management actions
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { sessionToken, action, ...actionData } = body;

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || user.role !== 'SUPER_ADMIN') { // Only SUPER_ADMIN for emergency actions
      return NextResponse.json(
        { error: 'Super admin access required for emergency actions' },
        { status: 403 }
      );
    }

    const organizationId = params.id;
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);

    switch (action) {
      case 'emergency-disable':
        // Emergency disable AI for client
        await multiTenantAI.upsertAIConfiguration({
          organizationId,
          provider: 'FLOWVISION_MANAGED',
          monthlyQuota: 0,
          dailyQuota: 0,
          maxMonthlyCost: 0
        });

        await superAdminAuth.auditLog(
          user.id,
          'EMERGENCY_AI_DISABLE',
          {
            targetOrganizationId: organizationId,
            reason: actionData.reason || 'Emergency action by super admin'
          },
          ipAddress,
          userAgent
        );

        return NextResponse.json({
          success: true,
          message: 'AI services emergency disabled for client'
        });

      case 'reset-quotas':
        // Reset usage quotas
        const config = await multiTenantAI.getAIConfiguration(organizationId);
        if (config) {
          await multiTenantAI.recordUsage({
            organizationId,
            userId: user.id,
            operation: 'SUPER_ADMIN_QUOTA_RESET',
            model: config.model,
            tokensUsed: -config.currentMonthlyUsage,
            requestId: `superadmin-reset-${Date.now()}`,
            success: true
          });
        }

        await superAdminAuth.auditLog(
          user.id,
          'CLIENT_QUOTA_RESET',
          {
            targetOrganizationId: organizationId,
            resetType: 'quotas'
          },
          ipAddress,
          userAgent
        );

        return NextResponse.json({
          success: true,
          message: 'Client AI quotas reset successfully'
        });

      case 'force-provider-change':
        // Force change AI provider (emergency)
        const currentConfig = await multiTenantAI.getAIConfiguration(organizationId);
        await multiTenantAI.upsertAIConfiguration({
          organizationId,
          provider: actionData.newProvider || 'FLOWVISION_MANAGED',
          model: currentConfig?.model || 'gpt-3.5-turbo',
          maxTokens: currentConfig?.maxTokens || 500,
          temperature: currentConfig?.temperature || 0.7,
          monthlyQuota: actionData.monthlyQuota || 10000,
          dailyQuota: actionData.dailyQuota || 1000,
          maxMonthlyCost: actionData.maxMonthlyCost || 10
        });

        await superAdminAuth.auditLog(
          user.id,
          'FORCE_PROVIDER_CHANGE',
          {
            targetOrganizationId: organizationId,
            previousProvider: currentConfig?.provider,
            newProvider: actionData.newProvider,
            reason: actionData.reason
          },
          ipAddress,
          userAgent
        );

        return NextResponse.json({
          success: true,
          message: 'AI provider changed successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown emergency action: ${action}`
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Super admin emergency action error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to execute emergency action'
    }, { status: 500 });
  }
}

// DELETE /super-admin/api/clients/[id]/ai-config - Remove client AI configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      );
    }

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const organizationId = params.id;

    // Disable AI configuration
    await multiTenantAI.upsertAIConfiguration({
      organizationId,
      provider: 'FLOWVISION_MANAGED',
      monthlyQuota: 0,
      dailyQuota: 0,
      maxMonthlyCost: 0
    });

    // Log the deletion
    const { ipAddress, userAgent } = superAdminAuth.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'CLIENT_AI_CONFIG_DELETED',
      {
        targetOrganizationId: organizationId
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Client AI configuration removed successfully'
    });

  } catch (error: any) {
    console.error('Super admin AI config deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to remove AI configuration'
    }, { status: 500 });
  }
}
