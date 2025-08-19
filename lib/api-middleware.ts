/**
 * Enhanced API Middleware with Row-Level Security
 * SECURITY CRITICAL: Enforces tenant isolation at multiple layers
 * 
 * Features:
 * - Automatic tenant context setting
 * - Row-Level Security integration
 * - Cross-tenant access prevention
 * - Comprehensive audit logging
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rlsManager, rlsPrisma } from '@/lib/row-level-security';
// import { superAdminAuth } from '@/lib/super-admin-auth'; // Temporarily disabled for Sprint 20 testing

export interface TenantContext {
  userId: string;
  organizationId: string;
  userRole: string;
  isSuperAdmin: boolean;
  ipAddress: string;
  userAgent?: string;
  requestId: string;
}

export interface APIMiddlewareOptions {
  requireAuth?: boolean;
  allowSuperAdmin?: boolean;
  requiredRoles?: string[];
  skipRLS?: boolean;
  auditAction?: string;
  rateLimitKey?: string;
}

/**
 * Enhanced API middleware with RLS integration
 */
export class APIMiddleware {
  private static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static extractRequestInfo(request: NextRequest) {
    return {
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: this.generateRequestId()
    };
  }

  /**
   * Main middleware function with comprehensive security
   */
  static async withSecurity<T>(
    request: NextRequest,
    options: APIMiddlewareOptions = {},
    handler: (request: NextRequest, context: TenantContext) => Promise<T>
  ): Promise<NextResponse> {
    const {
      requireAuth = true,
      allowSuperAdmin = false,
      requiredRoles = [],
      skipRLS = false,
      auditAction,
      rateLimitKey
    } = options;

    const requestInfo = this.extractRequestInfo(request);
    const startTime = Date.now();

    try {
      // Step 1: Authentication Check
      if (requireAuth) {
        const tenantContext = await this.authenticateRequest(request, allowSuperAdmin);
        
        // Step 2: Authorization Check
        if (requiredRoles.length > 0 && !tenantContext.isSuperAdmin) {
          if (!requiredRoles.includes(tenantContext.userRole)) {
            await this.auditSecurityEvent(tenantContext, 'INSUFFICIENT_PERMISSIONS', {
              requiredRoles,
              userRole: tenantContext.userRole
            }, requestInfo);
            
            return NextResponse.json(
              { error: 'Insufficient permissions' },
              { status: 403 }
            );
          }
        }

        // Step 3: Initialize RLS Context
        if (!skipRLS) {
          await rlsManager.initializeTenantContext(
            tenantContext.organizationId,
            tenantContext.isSuperAdmin
          );
        }

        // Step 4: Rate Limiting (if configured)
        if (rateLimitKey) {
          const rateLimitResult = await this.checkRateLimit(rateLimitKey, tenantContext);
          if (!rateLimitResult.allowed) {
            return NextResponse.json(
              { error: 'Rate limit exceeded' },
              { status: 429 }
            );
          }
        }

        // Step 5: Execute Handler
        const result = await handler(request, {
          ...tenantContext,
          ...requestInfo
        });

        // Step 6: Audit Success
        if (auditAction) {
          await this.auditAPIAccess(tenantContext, auditAction, {
            success: true,
            duration: Date.now() - startTime
          }, requestInfo);
        }

        return NextResponse.json(result);

      } else {
        // No authentication required
        const result = await handler(request, {
          userId: '',
          organizationId: '',
          userRole: 'ANONYMOUS',
          isSuperAdmin: false,
          ...requestInfo
        });

        return NextResponse.json(result);
      }

    } catch (error: any) {
      console.error('API middleware error:', error);

      // Audit error
      if (auditAction) {
        try {
          const session = await getServerSession(authOptions);
          if (session?.user?.email) {
            const user = await rlsPrisma.user.findUnique({
              where: { email: session.user.email }
            });
            
            if (user) {
              await this.auditAPIAccess({
                userId: user.id,
                organizationId: user.organizationId,
                userRole: user.role,
                isSuperAdmin: false
              }, auditAction, {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
              }, requestInfo);
            }
          }
        } catch (auditError) {
          console.error('Failed to audit error:', auditError);
        }
      }

      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: error.status || 500 }
      );

    } finally {
      // Always clear RLS context
      if (!skipRLS) {
        try {
          await rlsPrisma.clearTenantContext();
        } catch (clearError) {
          console.error('Failed to clear RLS context:', clearError);
        }
      }
    }
  }

  /**
   * Authenticate request and extract tenant context
   */
  private static async authenticateRequest(
    request: NextRequest,
    allowSuperAdmin: boolean
  ): Promise<TenantContext> {
    // Check for super admin session first
    if (allowSuperAdmin) {
      const superAdminToken = request.headers.get('x-super-admin-token') ||
                            request.url.includes('sessionToken=');
      
      if (superAdminToken) {
        const token = superAdminToken.includes('sessionToken=') 
          ? new URL(request.url).searchParams.get('sessionToken')
          : superAdminToken;
        
        if (token) {
          // const superAdminUser = await superAdminAuth.validateSession(token); // Temporarily disabled
          const superAdminUser = null; // For Sprint 20 testing
          if (superAdminUser) {
            return {
              userId: superAdminUser.id,
              organizationId: '', // Super admin doesn't belong to specific org
              userRole: superAdminUser.role,
              isSuperAdmin: true,
              ipAddress: '',
              requestId: ''
            };
          }
        }
      }
    }

    // Regular authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw { status: 401, message: 'Authentication required' };
    }

    const user = await rlsPrisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true, role: true, isActive: true }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    if (!user.isActive) {
      throw { status: 403, message: 'Account is deactivated' };
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      userRole: user.role,
      isSuperAdmin: false,
      ipAddress: '',
      requestId: ''
    };
  }

  /**
   * Rate limiting implementation
   */
  private static async checkRateLimit(
    key: string,
    context: TenantContext
  ): Promise<{ allowed: boolean; resetTime?: number }> {
    // This would integrate with Redis or another rate limiting store
    // For now, return allowed
    return { allowed: true };
  }

  /**
   * Audit API access
   */
  private static async auditAPIAccess(
    context: Partial<TenantContext>,
    action: string,
    details: any,
    requestInfo: any
  ): Promise<void> {
    try {
      await rlsPrisma.auditLog.create({
        data: {
          userId: context.userId || 'system',
          organizationId: context.organizationId || '',
          action: `API_${action.toUpperCase()}`,
          details: {
            ...details,
            userRole: context.userRole,
            isSuperAdmin: context.isSuperAdmin,
            requestId: requestInfo.requestId
          },
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        }
      });
    } catch (error) {
      console.error('Failed to audit API access:', error);
    }
  }

  /**
   * Audit security events
   */
  private static async auditSecurityEvent(
    context: TenantContext,
    event: string,
    details: any,
    requestInfo: any
  ): Promise<void> {
    try {
      await rlsPrisma.auditLog.create({
        data: {
          userId: context.userId,
          organizationId: context.organizationId,
          action: `SECURITY_${event}`,
          details: {
            ...details,
            severity: 'HIGH',
            securityEvent: true,
            requestId: requestInfo.requestId
          },
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        }
      });
    } catch (error) {
      console.error('Failed to audit security event:', error);
    }
  }

  /**
   * Cross-tenant access validation
   */
  static async validateTenantAccess(
    context: TenantContext,
    resourceOrganizationId: string
  ): Promise<boolean> {
    if (context.isSuperAdmin) {
      return true; // Super admin can access any tenant
    }

    if (context.organizationId !== resourceOrganizationId) {
      await this.auditSecurityEvent(context, 'CROSS_TENANT_ACCESS_ATTEMPT', {
        userOrganization: context.organizationId,
        attemptedAccess: resourceOrganizationId
      }, { ipAddress: '', userAgent: '', requestId: context.requestId });
      
      return false;
    }

    return true;
  }

  /**
   * Validate specific resource access
   */
  static async validateResourceAccess(
    context: TenantContext,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    if (context.isSuperAdmin) {
      return true;
    }

    // Use RLS to validate access
    return await rlsPrisma.validateTenantAccess(resourceType, resourceId);
  }
}

/**
 * Convenience wrapper for common API patterns
 */
export function createSecureAPIHandler<T>(
  options: APIMiddlewareOptions = {},
  handler: (request: NextRequest, context: TenantContext) => Promise<T>
) {
  return (request: NextRequest) => {
    return APIMiddleware.withSecurity(request, options, handler);
  };
}

/**
 * Specific wrappers for different security levels
 */
export const requireAuth = <T>(
  handler: (request: NextRequest, context: TenantContext) => Promise<T>
) => createSecureAPIHandler({ requireAuth: true }, handler);

export const requireAdmin = <T>(
  handler: (request: NextRequest, context: TenantContext) => Promise<T>
) => createSecureAPIHandler({ 
  requireAuth: true, 
  requiredRoles: ['ADMIN'] 
}, handler);

export const allowSuperAdmin = <T>(
  handler: (request: NextRequest, context: TenantContext) => Promise<T>
) => createSecureAPIHandler({ 
  requireAuth: true, 
  allowSuperAdmin: true 
}, handler);

export const requireSuperAdmin = <T>(
  handler: (request: NextRequest, context: TenantContext) => Promise<T>
) => createSecureAPIHandler({ 
  requireAuth: true, 
  allowSuperAdmin: true,
  requiredRoles: ['SUPER_ADMIN', 'ADMIN'] 
}, handler);
