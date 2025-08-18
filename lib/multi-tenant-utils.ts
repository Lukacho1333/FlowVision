/**
 * Multi-Tenant Security Utils
 * Following .cursorrules security requirements
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Enhanced multi-tenant context with AI optimization
 */
export interface TenantContext {
  userId: string;
  organizationId: string;
  role: string;
  // AI Enhancement: Learning and optimization context
  aiContext: {
    requestPattern: string;
    userBehavior: Record<string, any>;
    optimizationHints: string[];
  };
}

/**
 * Enforces multi-tenant isolation following .cursorrules security requirements
 * ALWAYS validate organizationId exists on records before API operations
 * NEVER bypass organizationId filtering regardless of user role or admin status
 */
export async function getMultiTenantContext(req: NextRequest): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Unauthorized - No session');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true, 
      organizationId: true, 
      role: true,
      preferences: true, // For AI optimization
      aiTier: true
    }
  });

  if (!user) {
    throw new Error('Unauthorized - User not found');
  }

  if (!user.organizationId) {
    throw new Error('Security Error - User missing organization assignment');
  }

  // AI Enhancement: Capture request patterns for optimization
  const aiContext = {
    requestPattern: `${req.method}_${new URL(req.url).pathname}`,
    userBehavior: (user.preferences as any) || {},
    optimizationHints: generateOptimizationHints(user, req)
  };

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    aiContext
  };
}

/**
 * Creates secure WHERE clause for database queries
 * Following .cursorrules: ALWAYS enforce tenant isolation with organizationId filtering
 */
export function createTenantWhereClause(
  context: TenantContext, 
  additionalWhere: any = {}
): any {
  const baseWhere = {
    organizationId: context.organizationId, // CRITICAL: Always filter by organization
    ...additionalWhere
  };

  // Role-based additional filtering (but NEVER bypass organizationId)
  if (context.role !== 'ADMIN') {
    // Non-admin users might have additional restrictions
    // but organizationId filtering is ALWAYS enforced
  }

  return baseWhere;
}

/**
 * AI-driven optimization hints based on user patterns
 */
function generateOptimizationHints(user: any, req: NextRequest): string[] {
  const hints: string[] = [];
  
  // Analyze request patterns for optimization
  const url = new URL(req.url);
  
  if (url.pathname.includes('/analytics')) {
    hints.push('analytics-heavy-user');
  }
  
  if (user.aiTier === 'premium') {
    hints.push('ai-power-user');
  }
  
  return hints;
}

/**
 * Validates that a record belongs to the user's organization
 * Following .cursorrules: ALWAYS validate organizationId exists on records
 */
export async function validateTenantAccess(
  context: TenantContext,
  recordId: string,
  tableName: string
): Promise<boolean> {
  try {
    const record = await (prisma as any)[tableName].findFirst({
      where: {
        id: recordId,
        organizationId: context.organizationId
      },
      select: { id: true }
    });
    
    return !!record;
  } catch (error) {
    console.error(`Tenant access validation failed for ${tableName}:${recordId}`, error);
    return false;
  }
}

/**
 * Enhanced audit logging with tenant context
 */
export async function createTenantAuditLog(
  context: TenantContext,
  action: string,
  details: any
) {
  await prisma.auditLog.create({
    data: {
      userId: context.userId,
      action,
      details: {
        ...details,
        organizationId: context.organizationId,
        userRole: context.role,
        aiContext: context.aiContext
      },
      organizationId: context.organizationId // Ensure audit logs are tenant-isolated
    }
  });
}
