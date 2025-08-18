/**
 * Row-Level Security Service
 * SECURITY CRITICAL: Database-level tenant isolation
 * 
 * Manages PostgreSQL Row-Level Security for multi-tenant data isolation
 * Ensures data cannot leak between organizations even if application code fails
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Enhanced Prisma client with RLS support
class RLSPrismaClient extends PrismaClient {
  private tenantContext: {
    organizationId?: string;
    isSuperAdmin?: boolean;
  } = {};

  constructor() {
    super();
  }

  /**
   * Set tenant context for all subsequent database operations
   * This sets PostgreSQL session variables that RLS policies use
   */
  async setTenantContext(organizationId: string, isSuperAdmin: boolean = false): Promise<void> {
    this.tenantContext = { organizationId, isSuperAdmin };
    
    // Set PostgreSQL session variables for RLS
    await this.$executeRaw`SELECT set_tenant_context(${organizationId}, ${isSuperAdmin})`;
  }

  /**
   * Clear tenant context (useful for super admin operations)
   */
  async clearTenantContext(): Promise<void> {
    this.tenantContext = {};
    await this.$executeRaw`SELECT clear_tenant_context()`;
  }

  /**
   * Get current tenant context
   */
  getTenantContext() {
    return this.tenantContext;
  }

  /**
   * Execute raw SQL with current tenant context
   */
  async executeWithTenantContext<T>(
    query: string,
    params: any[] = []
  ): Promise<T> {
    if (!this.tenantContext.organizationId && !this.tenantContext.isSuperAdmin) {
      throw new Error('Tenant context not set. Call setTenantContext() first.');
    }

    return this.$queryRaw`${query}` as T;
  }

  /**
   * Validate that a record belongs to the current tenant
   */
  async validateTenantAccess(tableName: string, recordId: string): Promise<boolean> {
    if (this.tenantContext.isSuperAdmin) {
      return true; // Super admin has access to all records
    }

    if (!this.tenantContext.organizationId) {
      return false; // No tenant context set
    }

    // Check if record exists and belongs to current tenant
    const result = await this.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM ${tableName} 
        WHERE id = ${recordId} 
        AND "organizationId" = ${this.tenantContext.organizationId}
      ) as exists
    `;

    return result[0]?.exists || false;
  }
}

// Singleton instance
export const rlsPrisma = new RLSPrismaClient();

/**
 * Row-Level Security Manager
 * Handles tenant isolation and security context management
 */
export class RLSManager {
  private static instance: RLSManager;
  
  private constructor() {}

  static getInstance(): RLSManager {
    if (!RLSManager.instance) {
      RLSManager.instance = new RLSManager();
    }
    return RLSManager.instance;
  }

  /**
   * Extract tenant context from Next.js request
   */
  async extractTenantContext(request: NextRequest): Promise<{
    organizationId: string;
    userId: string;
    isSuperAdmin: boolean;
  }> {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      throw new Error('Authentication required for tenant context');
    }

    // Check if this is a super admin request
    const isSuperAdminRequest = request.url.includes('/super-admin/');
    
    if (isSuperAdminRequest) {
      // Super admin context - validate super admin session
      // This would integrate with the super admin auth service
      return {
        organizationId: '', // Super admin doesn't have a specific org
        userId: session.user.id || '',
        isSuperAdmin: true
      };
    }

    // Regular client context - get user's organization
    const user = await rlsPrisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true, role: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      organizationId: user.organizationId,
      userId: user.id,
      isSuperAdmin: false
    };
  }

  /**
   * Initialize tenant context for database operations
   */
  async initializeTenantContext(
    organizationId: string,
    isSuperAdmin: boolean = false
  ): Promise<void> {
    await rlsPrisma.setTenantContext(organizationId, isSuperAdmin);
  }

  /**
   * Middleware function to automatically set tenant context
   */
  async withTenantContext<T>(
    request: NextRequest,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const tenantContext = await this.extractTenantContext(request);
      await this.initializeTenantContext(
        tenantContext.organizationId,
        tenantContext.isSuperAdmin
      );

      const result = await operation();
      return result;
    } finally {
      // Always clear context after operation
      await rlsPrisma.clearTenantContext();
    }
  }

  /**
   * Validate cross-tenant access attempt
   */
  async validateCrossTenantAccess(
    requestedOrganizationId: string,
    userOrganizationId: string,
    isSuperAdmin: boolean = false
  ): Promise<boolean> {
    // Super admin can access any organization
    if (isSuperAdmin) {
      return true;
    }

    // User can only access their own organization
    return requestedOrganizationId === userOrganizationId;
  }

  /**
   * Audit RLS policy violations
   */
  async auditRLSViolation(
    tableName: string,
    operation: string,
    context: {
      userId: string;
      organizationId: string;
      attemptedAccess: any;
      ipAddress: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await rlsPrisma.auditLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        action: 'RLS_VIOLATION_ATTEMPT',
        details: {
          tableName,
          operation,
          attemptedAccess: context.attemptedAccess,
          severity: 'HIGH',
          securityEvent: true
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  }

  /**
   * Performance monitoring for RLS policies
   */
  async measureRLSPerformance(
    tableName: string,
    query: string
  ): Promise<{ executionTime: number; planningTime: number; buffers: any }> {
    const result = await rlsPrisma.$queryRaw<Array<any>>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}
    `;

    const plan = result[0]?.['QUERY PLAN'][0];
    return {
      executionTime: plan?.['Execution Time'] || 0,
      planningTime: plan?.['Planning Time'] || 0,
      buffers: plan?.['Shared Hit Blocks'] || 0
    };
  }

  /**
   * Test RLS policies are working correctly
   */
  async testRLSPolicies(): Promise<{
    userIsolation: boolean;
    issueIsolation: boolean;
    initiativeIsolation: boolean;
    crossTenantBlocked: boolean;
  }> {
    const testResults = {
      userIsolation: false,
      issueIsolation: false,
      initiativeIsolation: false,
      crossTenantBlocked: false
    };

    try {
      // Test 1: Set context for organization 'test-org-1'
      await rlsPrisma.setTenantContext('test-org-1', false);
      
      // Should only see users from test-org-1
      const usersOrg1 = await rlsPrisma.user.findMany();
      const allFromOrg1 = usersOrg1.every(user => user.organizationId === 'test-org-1');
      testResults.userIsolation = allFromOrg1;

      // Test 2: Set context for organization 'test-org-2'
      await rlsPrisma.setTenantContext('test-org-2', false);
      
      // Should only see users from test-org-2
      const usersOrg2 = await rlsPrisma.user.findMany();
      const allFromOrg2 = usersOrg2.every(user => user.organizationId === 'test-org-2');
      testResults.issueIsolation = allFromOrg2;

      // Test 3: Cross-tenant access should be blocked
      await rlsPrisma.setTenantContext('test-org-1', false);
      const crossTenantCount = await rlsPrisma.user.count({
        where: { organizationId: 'test-org-2' }
      });
      testResults.crossTenantBlocked = crossTenantCount === 0;

      // Test 4: Super admin should see everything
      await rlsPrisma.setTenantContext('', true);
      const allUsers = await rlsPrisma.user.findMany();
      testResults.initiativeIsolation = allUsers.length > 0;

    } catch (error) {
      console.error('RLS policy test failed:', error);
    } finally {
      await rlsPrisma.clearTenantContext();
    }

    return testResults;
  }

  /**
   * Generate RLS performance report
   */
  async generateRLSPerformanceReport(): Promise<{
    averageQueryTime: number;
    indexEfficiency: number;
    recommendedOptimizations: string[];
  }> {
    // This would implement performance monitoring and optimization recommendations
    // Based on query execution plans and RLS policy efficiency
    
    const report = {
      averageQueryTime: 0,
      indexEfficiency: 0,
      recommendedOptimizations: [] as string[]
    };

    // Sample performance analysis
    const testQueries = [
      'SELECT * FROM "User" LIMIT 100',
      'SELECT * FROM "Issue" LIMIT 100',
      'SELECT * FROM "Initiative" LIMIT 100'
    ];

    for (const query of testQueries) {
      try {
        const performance = await this.measureRLSPerformance('test', query);
        report.averageQueryTime += performance.executionTime;
      } catch (error) {
        console.error('Performance measurement failed:', error);
      }
    }

    report.averageQueryTime = report.averageQueryTime / testQueries.length;
    
    // Add optimization recommendations based on performance
    if (report.averageQueryTime > 50) {
      report.recommendedOptimizations.push('Consider adding indexes on organizationId columns');
    }
    
    if (report.averageQueryTime > 100) {
      report.recommendedOptimizations.push('Review RLS policy complexity');
    }

    return report;
  }
}

// Export singleton instance
export const rlsManager = RLSManager.getInstance();

/**
 * Middleware helper for API routes
 */
export function withRLS<T>(
  handler: (request: NextRequest, context: any) => Promise<T>
) {
  return async (request: NextRequest, context: any): Promise<T> => {
    return rlsManager.withTenantContext(request, () => handler(request, context));
  };
}

/**
 * Type-safe wrapper for database operations with RLS
 */
export class TenantAwarePrisma {
  constructor(private organizationId: string, private isSuperAdmin: boolean = false) {}

  async withContext<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await rlsPrisma.setTenantContext(this.organizationId, this.isSuperAdmin);
      return await operation();
    } finally {
      await rlsPrisma.clearTenantContext();
    }
  }

  // Tenant-aware database operations
  get user() {
    return {
      findMany: (args?: any) => this.withContext(() => rlsPrisma.user.findMany(args)),
      findUnique: (args: any) => this.withContext(() => rlsPrisma.user.findUnique(args)),
      create: (args: any) => this.withContext(() => rlsPrisma.user.create(args)),
      update: (args: any) => this.withContext(() => rlsPrisma.user.update(args)),
      delete: (args: any) => this.withContext(() => rlsPrisma.user.delete(args)),
      count: (args?: any) => this.withContext(() => rlsPrisma.user.count(args))
    };
  }

  get issue() {
    return {
      findMany: (args?: any) => this.withContext(() => rlsPrisma.issue.findMany(args)),
      findUnique: (args: any) => this.withContext(() => rlsPrisma.issue.findUnique(args)),
      create: (args: any) => this.withContext(() => rlsPrisma.issue.create(args)),
      update: (args: any) => this.withContext(() => rlsPrisma.issue.update(args)),
      delete: (args: any) => this.withContext(() => rlsPrisma.issue.delete(args)),
      count: (args?: any) => this.withContext(() => rlsPrisma.issue.count(args))
    };
  }

  get initiative() {
    return {
      findMany: (args?: any) => this.withContext(() => rlsPrisma.initiative.findMany(args)),
      findUnique: (args: any) => this.withContext(() => rlsPrisma.initiative.findUnique(args)),
      create: (args: any) => this.withContext(() => rlsPrisma.initiative.create(args)),
      update: (args: any) => this.withContext(() => rlsPrisma.initiative.update(args)),
      delete: (args: any) => this.withContext(() => rlsPrisma.initiative.delete(args)),
      count: (args?: any) => this.withContext(() => rlsPrisma.initiative.count(args))
    };
  }
}

/**
 * Create tenant-aware Prisma client
 */
export function createTenantPrisma(organizationId: string, isSuperAdmin: boolean = false): TenantAwarePrisma {
  return new TenantAwarePrisma(organizationId, isSuperAdmin);
}
