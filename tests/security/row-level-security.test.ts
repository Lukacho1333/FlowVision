/**
 * Row-Level Security Test Suite
 * SECURITY CRITICAL: Validates tenant isolation at database level
 * 
 * Tests ensure data cannot leak between organizations even if application code fails
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { rlsPrisma, rlsManager, TenantAwarePrisma, createTenantPrisma } from '../../lib/row-level-security';
import { PrismaClient } from '@prisma/client';

// Test data setup
const TEST_ORG_1 = 'test-org-1';
const TEST_ORG_2 = 'test-org-2';
const SUPER_ADMIN_ORG = 'flowvision';

const testUsers = [
  {
    id: 'user-org1-1',
    email: 'user1@testorg1.com',
    organizationId: TEST_ORG_1,
    passwordHash: 'hash1',
    name: 'User 1 Org 1',
    role: 'LEADER'
  },
  {
    id: 'user-org1-2',
    email: 'user2@testorg1.com',
    organizationId: TEST_ORG_1,
    passwordHash: 'hash2',
    name: 'User 2 Org 1',
    role: 'ADMIN'
  },
  {
    id: 'user-org2-1',
    email: 'user1@testorg2.com',
    organizationId: TEST_ORG_2,
    passwordHash: 'hash3',
    name: 'User 1 Org 2',
    role: 'LEADER'
  },
  {
    id: 'user-org2-2',
    email: 'user2@testorg2.com',
    organizationId: TEST_ORG_2,
    passwordHash: 'hash4',
    name: 'User 2 Org 2',
    role: 'VIEWER'
  }
];

const testIssues = [
  {
    id: 'issue-org1-1',
    organizationId: TEST_ORG_1,
    description: 'Test issue 1 for org 1',
    authorId: 'user-org1-1',
    votes: 5,
    heatmapScore: 75
  },
  {
    id: 'issue-org1-2',
    organizationId: TEST_ORG_1,
    description: 'Test issue 2 for org 1',
    authorId: 'user-org1-2',
    votes: 3,
    heatmapScore: 50
  },
  {
    id: 'issue-org2-1',
    organizationId: TEST_ORG_2,
    description: 'Test issue 1 for org 2',
    authorId: 'user-org2-1',
    votes: 7,
    heatmapScore: 90
  }
];

describe('Row-Level Security Tests', () => {
  let directPrisma: PrismaClient;

  beforeAll(async () => {
    // Use direct Prisma client for test setup (bypassing RLS)
    directPrisma = new PrismaClient();
    
    // Ensure we have test organizations
    await directPrisma.organizations.upsert({
      where: { id: TEST_ORG_1 },
      create: {
        id: TEST_ORG_1,
        name: 'Test Organization 1',
        slug: 'test-org-1',
        planTier: 'PROFESSIONAL'
      },
      update: {}
    });

    await directPrisma.organizations.upsert({
      where: { id: TEST_ORG_2 },
      create: {
        id: TEST_ORG_2,
        name: 'Test Organization 2',
        slug: 'test-org-2',
        planTier: 'PROFESSIONAL'
      },
      update: {}
    });
  });

  beforeEach(async () => {
    // Clear and set up test data
    await directPrisma.issue.deleteMany({
      where: {
        id: { in: testIssues.map(i => i.id) }
      }
    });

    await directPrisma.user.deleteMany({
      where: {
        id: { in: testUsers.map(u => u.id) }
      }
    });

    // Create test users
    for (const user of testUsers) {
      await directPrisma.user.create({ data: user as any });
    }

    // Create test issues
    for (const issue of testIssues) {
      await directPrisma.issue.create({ data: issue as any });
    }
  });

  afterEach(async () => {
    // Clear RLS context
    await rlsPrisma.clearTenantContext();
  });

  afterAll(async () => {
    // Clean up test data
    await directPrisma.issue.deleteMany({
      where: {
        id: { in: testIssues.map(i => i.id) }
      }
    });

    await directPrisma.user.deleteMany({
      where: {
        id: { in: testUsers.map(u => u.id) }
      }
    });

    await directPrisma.$disconnect();
    await rlsPrisma.$disconnect();
  });

  describe('User Table RLS', () => {
    test('should only return users from current organization', async () => {
      // Set context to TEST_ORG_1
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      const users = await rlsPrisma.user.findMany();
      
      expect(users).toHaveLength(2);
      expect(users.every(user => user.organizationId === TEST_ORG_1)).toBe(true);
    });

    test('should isolate users between organizations', async () => {
      // Test ORG 1
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      const org1Users = await rlsPrisma.user.findMany();
      
      // Test ORG 2
      await rlsPrisma.setTenantContext(TEST_ORG_2, false);
      const org2Users = await rlsPrisma.user.findMany();
      
      expect(org1Users).toHaveLength(2);
      expect(org2Users).toHaveLength(2);
      
      // Ensure no overlap
      const org1Emails = org1Users.map(u => u.email);
      const org2Emails = org2Users.map(u => u.email);
      const overlap = org1Emails.filter(email => org2Emails.includes(email));
      
      expect(overlap).toHaveLength(0);
    });

    test('should prevent cross-tenant user creation', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      // Attempt to create user for different organization
      await expect(
        rlsPrisma.user.create({
          data: {
            id: 'malicious-user',
            email: 'malicious@testorg2.com',
            organizationId: TEST_ORG_2, // Different org!
            passwordHash: 'hash',
            name: 'Malicious User',
            role: 'ADMIN'
          }
        })
      ).rejects.toThrow();
    });

    test('super admin should see all users', async () => {
      await rlsPrisma.setTenantContext('', true);
      
      const allUsers = await rlsPrisma.user.findMany();
      
      expect(allUsers.length).toBeGreaterThanOrEqual(4);
      
      const org1Count = allUsers.filter(u => u.organizationId === TEST_ORG_1).length;
      const org2Count = allUsers.filter(u => u.organizationId === TEST_ORG_2).length;
      
      expect(org1Count).toBe(2);
      expect(org2Count).toBe(2);
    });
  });

  describe('Issue Table RLS', () => {
    test('should only return issues from current organization', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      const issues = await rlsPrisma.issue.findMany();
      
      expect(issues).toHaveLength(2);
      expect(issues.every(issue => issue.organizationId === TEST_ORG_1)).toBe(true);
    });

    test('should prevent cross-tenant issue access', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      // Try to access issue from ORG 2
      const crossTenantIssue = await rlsPrisma.issue.findUnique({
        where: { id: 'issue-org2-1' }
      });
      
      expect(crossTenantIssue).toBeNull();
    });

    test('should prevent cross-tenant issue updates', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      // Attempt to update issue from different organization
      await expect(
        rlsPrisma.issue.update({
          where: { id: 'issue-org2-1' },
          data: { description: 'Malicious update' }
        })
      ).rejects.toThrow();
    });
  });

  describe('TenantAwarePrisma Wrapper', () => {
    test('should enforce tenant context in wrapper', async () => {
      const org1Prisma = createTenantPrisma(TEST_ORG_1, false);
      
      const users = await org1Prisma.user.findMany();
      const issues = await org1Prisma.issue.findMany();
      
      expect(users.every(u => u.organizationId === TEST_ORG_1)).toBe(true);
      expect(issues.every(i => i.organizationId === TEST_ORG_1)).toBe(true);
    });

    test('should isolate operations between tenant instances', async () => {
      const org1Prisma = createTenantPrisma(TEST_ORG_1, false);
      const org2Prisma = createTenantPrisma(TEST_ORG_2, false);
      
      const org1Users = await org1Prisma.user.findMany();
      const org2Users = await org2Prisma.user.findMany();
      
      expect(org1Users).toHaveLength(2);
      expect(org2Users).toHaveLength(2);
      
      expect(org1Users.every(u => u.organizationId === TEST_ORG_1)).toBe(true);
      expect(org2Users.every(u => u.organizationId === TEST_ORG_2)).toBe(true);
    });
  });

  describe('RLS Manager', () => {
    test('should validate tenant access correctly', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      const validAccess = await rlsPrisma.validateTenantAccess('User', 'user-org1-1');
      const invalidAccess = await rlsPrisma.validateTenantAccess('User', 'user-org2-1');
      
      expect(validAccess).toBe(true);
      expect(invalidAccess).toBe(false);
    });

    test('should run RLS policy tests', async () => {
      const testResults = await rlsManager.testRLSPolicies();
      
      expect(testResults.userIsolation).toBe(true);
      expect(testResults.crossTenantBlocked).toBe(true);
    });

    test('should generate performance report', async () => {
      const report = await rlsManager.generateRLSPerformanceReport();
      
      expect(report).toHaveProperty('averageQueryTime');
      expect(report).toHaveProperty('indexEfficiency');
      expect(report).toHaveProperty('recommendedOptimizations');
      expect(Array.isArray(report.recommendedOptimizations)).toBe(true);
    });
  });

  describe('Cross-Tenant Security Validation', () => {
    test('should prevent data leakage through complex queries', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      // Try complex query that might bypass simple RLS
      const result = await rlsPrisma.$queryRaw`
        SELECT COUNT(*) as total_issues 
        FROM "Issue" 
        WHERE "organizationId" != ${TEST_ORG_1}
      `;
      
      expect((result as any)[0].total_issues).toBe('0');
    });

    test('should handle concurrent tenant contexts', async () => {
      // Simulate concurrent requests with different tenant contexts
      const promises = [
        (async () => {
          const org1Prisma = createTenantPrisma(TEST_ORG_1, false);
          return await org1Prisma.user.count();
        })(),
        (async () => {
          const org2Prisma = createTenantPrisma(TEST_ORG_2, false);
          return await org2Prisma.user.count();
        })()
      ];
      
      const [org1Count, org2Count] = await Promise.all(promises);
      
      expect(org1Count).toBe(2);
      expect(org2Count).toBe(2);
    });

    test('should audit RLS violations', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      // This should be audited as a potential violation attempt
      await rlsManager.auditRLSViolation(
        'User',
        'SELECT',
        {
          userId: 'user-org1-1',
          organizationId: TEST_ORG_1,
          attemptedAccess: { targetOrg: TEST_ORG_2 },
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        }
      );
      
      // Verify audit log was created
      const auditLogs = await rlsPrisma.auditLog.findMany({
        where: {
          action: 'RLS_VIOLATION_ATTEMPT'
        }
      });
      
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Monitoring', () => {
    test('should measure RLS performance impact', async () => {
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      
      const performance = await rlsManager.measureRLSPerformance(
        'User',
        'SELECT * FROM "User" LIMIT 10'
      );
      
      expect(performance).toHaveProperty('executionTime');
      expect(performance).toHaveProperty('planningTime');
      expect(typeof performance.executionTime).toBe('number');
    });

    test('should validate RLS overhead is acceptable', async () => {
      const startTime = Date.now();
      
      await rlsPrisma.setTenantContext(TEST_ORG_1, false);
      const users = await rlsPrisma.user.findMany();
      
      const duration = Date.now() - startTime;
      
      // RLS should not add more than 100ms overhead for simple queries
      expect(duration).toBeLessThan(100);
      expect(users).toHaveLength(2);
    });
  });
});
