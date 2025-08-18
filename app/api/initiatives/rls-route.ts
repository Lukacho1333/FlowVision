/**
 * Enhanced Initiatives API with Row-Level Security
 * SECURITY CRITICAL: Demonstrates RLS integration in API routes
 * 
 * This is an example of how to integrate RLS with existing API routes
 * For Story 19.2 - PostgreSQL Row-Level Security Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSecureAPIHandler, requireAuth, TenantContext } from '@/lib/api-middleware';
import { rlsPrisma, createTenantPrisma } from '@/lib/row-level-security';
import { scoreDifficulty, scoreROI, scorePriority } from '@/utils/ai';

// GET /api/initiatives - List initiatives with RLS enforcement
export const GET = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    // Create tenant-aware Prisma client
    const tenantPrisma = createTenantPrisma(context.organizationId, context.isSuperAdmin);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeParam = searchParams.get('include');
    const includes = includeParam ? includeParam.split(',') : [];

    // Build include object based on requested includes
    const includeClause: any = {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    };

    // Add conditional includes
    if (includes.includes('addressedIssues')) {
      includeClause.addressedIssues = {
        select: {
          id: true,
          description: true,
          votes: true,
          heatmapScore: true,
          category: true,
          status: true
        }
      };
    }

    if (includes.includes('solutions')) {
      includeClause.solutions = {
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tasks: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      };
    }

    if (includes.includes('milestones')) {
      includeClause.milestones = {
        orderBy: {
          dueDate: 'asc'
        }
      };
    }

    if (includes.includes('requirementCards')) {
      includeClause.requirementCards = {
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          orderIndex: 'asc'
        }
      };
    }

    if (includes.includes('comments')) {
      includeClause.comments = {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      };
    }

    // RLS automatically handles tenant isolation - no manual filtering needed!
    const initiatives = await tenantPrisma.initiative.findMany({
      include: includeClause,
      orderBy: { orderIndex: 'asc' }
    });

    // Admin users see all initiatives in their org, others see only their own
    const filteredInitiatives = context.isSuperAdmin || 
      await tenantPrisma.user.findFirst({
        where: { id: context.userId, role: 'ADMIN' }
      }) 
      ? initiatives 
      : initiatives.filter(init => init.ownerId === context.userId);

    return filteredInitiatives;

  } catch (error: any) {
    console.error('Failed to fetch initiatives:', error);
    throw new Error('Failed to fetch initiatives');
  }
});

// POST /api/initiatives - Create new initiative with RLS enforcement
export const POST = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    const tenantPrisma = createTenantPrisma(context.organizationId, context.isSuperAdmin);
    const body = await request.json();
    
    const {
      title,
      problem,
      goal,
      kpis = [],
      requirements = [],
      acceptanceCriteria = [],
      timelineStart,
      timelineEnd,
      budget,
      estimatedHours,
      phase = 'planning',
      type = 'Process Improvement',
      addressedIssues = [],
      clusterId
    } = body;

    // Validate required fields
    if (!title || !problem || !goal) {
      throw new Error('Title, problem, and goal are required');
    }

    // Calculate AI scores
    const difficulty = scoreDifficulty(problem, requirements.join(' '));
    const roi = scoreROI(goal, budget || 0);
    const priorityScore = scorePriority(difficulty, roi, addressedIssues.length);

    // Get the highest order index for proper ordering
    const highestOrderIndex = await tenantPrisma.initiative.findFirst({
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true }
    });
    
    const orderIndex = (highestOrderIndex?.orderIndex || 0) + 1;

    // Create initiative data
    const initiativeData: any = {
      title,
      problem,
      goal,
      kpis,
      requirements,
      acceptanceCriteria,
      ownerId: context.userId,
      // RLS will automatically enforce organizationId - but we set it explicitly for clarity
      organizationId: context.organizationId,
      timelineStart: timelineStart ? new Date(timelineStart) : null,
      timelineEnd: timelineEnd ? new Date(timelineEnd) : null,
      status: 'DRAFT',
      progress: 0,
      difficulty,
      roi,
      priorityScore,
      orderIndex,
      budget,
      estimatedHours,
      phase,
      type,
      clusterId: clusterId || null
    };

    // Create the initiative - RLS ensures it's created in the correct organization
    const initiative = await tenantPrisma.initiative.create({
      data: initiativeData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addressedIssues: {
          select: {
            id: true,
            description: true,
            votes: true,
            heatmapScore: true,
            category: true,
            status: true
          }
        }
      }
    });

    // Connect addressed issues if provided
    if (addressedIssues.length > 0) {
      await tenantPrisma.initiative.update({
        where: { id: initiative.id },
        data: {
          addressedIssues: {
            connect: addressedIssues.map((issueId: string) => ({ id: issueId }))
          }
        }
      });
    }

    // Audit the creation
    await rlsPrisma.auditLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        action: 'INITIATIVE_CREATED',
        details: {
          initiativeId: initiative.id,
          title: initiative.title,
          difficulty,
          roi,
          priorityScore,
          addressedIssuesCount: addressedIssues.length
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    return initiative;

  } catch (error: any) {
    console.error('Failed to create initiative:', error);
    throw new Error(error.message || 'Failed to create initiative');
  }
});

// PUT /api/initiatives - Update initiative order (bulk operation)
export const PUT = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    const tenantPrisma = createTenantPrisma(context.organizationId, context.isSuperAdmin);
    const { initiatives } = await request.json();

    if (!Array.isArray(initiatives)) {
      throw new Error('Initiatives must be an array');
    }

    // Validate all initiatives belong to the user's organization (RLS will enforce this)
    // But we do an explicit check for better error messages
    for (const init of initiatives) {
      const existing = await tenantPrisma.initiative.findUnique({
        where: { id: init.id },
        select: { id: true, ownerId: true }
      });

      if (!existing) {
        throw new Error(`Initiative ${init.id} not found or access denied`);
      }

      // Non-admin users can only update their own initiatives
      if (!context.isSuperAdmin && 
          !(await tenantPrisma.user.findFirst({ where: { id: context.userId, role: 'ADMIN' } })) &&
          existing.ownerId !== context.userId) {
        throw new Error(`Access denied to initiative ${init.id}`);
      }
    }

    // Update order indexes
    const updates = initiatives.map((init: any, index: number) =>
      tenantPrisma.initiative.update({
        where: { id: init.id },
        data: { orderIndex: index + 1 }
      })
    );

    await Promise.all(updates);

    // Audit the reordering
    await rlsPrisma.auditLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        action: 'INITIATIVES_REORDERED',
        details: {
          initiativeIds: initiatives.map((i: any) => i.id),
          count: initiatives.length
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    return { success: true, message: 'Initiative order updated successfully' };

  } catch (error: any) {
    console.error('Failed to update initiative order:', error);
    throw new Error(error.message || 'Failed to update initiative order');
  }
});
