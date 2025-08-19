/**
 * Super Admin Client Management API
 * SECURITY CRITICAL: Client organization management for FlowVision super admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { superAdminAuth, SuperAdminAuthService } from '@/lib/super-admin-auth';
import { PrismaClient } from '../../../generated/super-admin-client';
import { z } from 'zod';

const superAdminPrisma = new PrismaClient();

const createClientSchema = z.object({
  sessionToken: z.string(),
  organization: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters'),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    domain: z.string().optional(),
    customDomain: z.string().optional(),
    planTier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']),
    billingEmail: z.string().email('Invalid billing email'),
    technicalContact: z.string().email('Invalid technical contact email'),
    userLimit: z.number().min(1).max(1000),
    storageLimit: z.number().min(1), // In GB
    aiQuotaMonthly: z.number().min(0)
  })
});

const updateClientSchema = z.object({
  sessionToken: z.string(),
  organizationId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    planTier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM']).optional(),
    isActive: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
    suspensionReason: z.string().optional(),
    userLimit: z.number().optional(),
    storageLimit: z.number().optional(),
    aiQuotaMonthly: z.number().optional()
  })
});

// GET /super-admin/api/clients - List all client organizations
export async function GET(request: NextRequest) {
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

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const planTier = searchParams.get('planTier');
    const status = searchParams.get('status'); // active, suspended, all

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { billingEmail: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (planTier) {
      where.planTier = planTier;
    }
    if (status === 'active') {
      where.isActive = true;
      where.isSuspended = false;
    } else if (status === 'suspended') {
      where.isSuspended = true;
    }

    // Get organizations with pagination
    const [organizations, totalCount] = await Promise.all([
      superAdminPrisma.clientOrganization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          usageReports: {
            where: {
              reportMonth: new Date().toISOString().slice(0, 7) // Current month
            },
            take: 1
          },
          aiConfigurations: true
        }
      }),
      superAdminPrisma.clientOrganization.count({ where })
    ]);

    // Log the access
    const { ipAddress, userAgent } = SuperAdminAuthService.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'CLIENT_LIST_VIEW',
      { page, limit, search, totalCount },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      organizations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error: any) {
    console.error('Client list error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch clients'
    }, { status: 500 });
  }
}

// POST /super-admin/api/clients - Create new client organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, organization } = createClientSchema.parse(body);

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // Check if slug already exists
    const existingOrg = await superAdminPrisma.clientOrganization.findUnique({
      where: { slug: organization.slug }
    });

    if (existingOrg) {
      return NextResponse.json({
        success: false,
        error: 'Organization slug already exists'
      }, { status: 400 });
    }

    // Create the organization
    const newOrganization = await superAdminPrisma.clientOrganization.create({
      data: {
        id: organization.slug, // Use slug as ID for simplicity
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain,
        customDomain: organization.customDomain,
        planTier: organization.planTier as any,
        billingEmail: organization.billingEmail,
        technicalContact: organization.technicalContact,
        userLimit: organization.userLimit,
        storageLimit: BigInt(organization.storageLimit * 1024 * 1024 * 1024), // Convert GB to bytes
        aiQuotaMonthly: organization.aiQuotaMonthly,
        isActive: true,
        isSuspended: false
      }
    });

    // Create default AI configuration
    await superAdminPrisma.clientAIConfiguration.create({
      data: {
        organizationId: newOrganization.id,
        provider: 'FLOWVISION_MANAGED',
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
        monthlyQuota: organization.aiQuotaMonthly,
        dailyQuota: Math.floor(organization.aiQuotaMonthly / 30),
        maxMonthlyCost: 50.00,
        isActive: true
      }
    });

    // Log the action
    const { ipAddress, userAgent } = SuperAdminAuthService.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      'CLIENT_ORGANIZATION_CREATED',
      {
        organizationId: newOrganization.id,
        organizationName: organization.name,
        planTier: organization.planTier
      },
      ipAddress,
      userAgent
    );

    // Also log in client organization actions table
    await superAdminPrisma.clientOrganizationAction.create({
      data: {
        organizationId: newOrganization.id,
        adminUserId: user.id,
        action: 'ORGANIZATION_CREATED',
        details: {
          planTier: organization.planTier,
          userLimit: organization.userLimit,
          aiQuotaMonthly: organization.aiQuotaMonthly
        },
        ipAddress,
        userAgent
      }
    });

    return NextResponse.json({
      success: true,
      organization: newOrganization,
      message: 'Client organization created successfully'
    });

  } catch (error: any) {
    console.error('Client creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create client organization'
    }, { status: 500 });
  }
}

// PUT /super-admin/api/clients - Update client organization
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, organizationId, updates } = updateClientSchema.parse(body);

    // Validate super admin session
    const user = await superAdminAuth.validateSession(sessionToken);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // Get existing organization
    const existingOrg = await superAdminPrisma.clientOrganization.findUnique({
      where: { id: organizationId }
    });

    if (!existingOrg) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.planTier) updateData.planTier = updates.planTier;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.isSuspended !== undefined) updateData.isSuspended = updates.isSuspended;
    if (updates.suspensionReason) updateData.suspensionReason = updates.suspensionReason;
    if (updates.userLimit) updateData.userLimit = updates.userLimit;
    if (updates.storageLimit) updateData.storageLimit = BigInt(updates.storageLimit * 1024 * 1024 * 1024);
    if (updates.aiQuotaMonthly) updateData.aiQuotaMonthly = updates.aiQuotaMonthly;

    // Update the organization
    const updatedOrganization = await superAdminPrisma.clientOrganization.update({
      where: { id: organizationId },
      data: updateData
    });

    // Determine action type
    let actionType = 'ORGANIZATION_UPDATED';
    if (updates.isSuspended === true) actionType = 'ORGANIZATION_SUSPENDED';
    if (updates.isSuspended === false && existingOrg.isSuspended) actionType = 'ORGANIZATION_REACTIVATED';
    if (updates.planTier && updates.planTier !== existingOrg.planTier) actionType = 'PLAN_CHANGED';

    // Log the action
    const { ipAddress, userAgent } = SuperAdminAuthService.extractRequestInfo(request);
    await superAdminAuth.auditLog(
      user.id,
      actionType,
      {
        organizationId,
        updates,
        previousValues: {
          planTier: existingOrg.planTier,
          isSuspended: existingOrg.isSuspended,
          isActive: existingOrg.isActive
        }
      },
      ipAddress,
      userAgent
    );

    // Also log in client organization actions table
    await superAdminPrisma.clientOrganizationAction.create({
      data: {
        organizationId,
        adminUserId: user.id,
        action: actionType as any,
        details: { updates, previousValues: { planTier: existingOrg.planTier } },
        ipAddress,
        userAgent
      }
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrganization,
      message: 'Client organization updated successfully'
    });

  } catch (error: any) {
    console.error('Client update error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update client organization'
    }, { status: 500 });
  }
}
