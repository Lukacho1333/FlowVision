import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMultiTenantContext } from '@/lib/multi-tenant-utils';

// Force dynamic server-side rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Enforce multi-tenant isolation following .cursorrules
    const tenantContext = await getMultiTenantContext(request);

    // Get efficiency metrics - TENANT ISOLATED following .cursorrules
    const orgFilter = { organizationId: tenantContext.organizationId };
    const [
      totalInitiatives,
      completedInitiatives,
      activeInitiatives,
      totalIssues,
      resolvedIssues,
      recentActivity,
      initiativesByPhase,
      issuesOverTime,
      aiUsageStats,
    ] = await Promise.all([
      // Total initiatives - TENANT ISOLATED
      prisma.initiative.count({ where: orgFilter }),

      // Completed initiatives - TENANT ISOLATED
      prisma.initiative.count({ where: { ...orgFilter, status: 'COMPLETED' } }),

      // Active initiatives - TENANT ISOLATED
      prisma.initiative.count({ where: { ...orgFilter, status: 'ACTIVE' } }),

      // Total issues - TENANT ISOLATED
      prisma.issue.count({ where: orgFilter }),

      // Resolved issues - TENANT ISOLATED
      prisma.issue.count({ where: { ...orgFilter, votes: { gte: 5 } } }),

      // Recent activity - TENANT ISOLATED
      prisma.auditLog.count({
        where: {
          ...orgFilter,
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Initiatives by phase - TENANT ISOLATED
      prisma.initiative.groupBy({
        by: ['phase'],
        where: orgFilter,
        _count: true,
      }),

      // Issues over time - TENANT ISOLATED
      prisma.issue.findMany({
        where: {
          ...orgFilter,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          createdAt: true,
          votes: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // AI usage statistics - TENANT ISOLATED
      prisma.auditLog.count({
        where: {
          ...orgFilter,
          action: {
            startsWith: 'AI_',
          },
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Calculate efficiency metrics
    const completionRate =
      totalInitiatives > 0 ? (completedInitiatives / totalInitiatives) * 100 : 0;
    const resolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0;

    // Process phase distribution
    const phaseDistribution = initiativesByPhase.reduce(
      (acc, item) => {
        const key = (item as any).phase ?? 'unspecified';
        const count =
          typeof (item as any)._count === 'number'
            ? (item as any)._count
            : ((item as any)._count?._all ?? 0);
        (acc as Record<string, number>)[key] = ((acc as Record<string, number>)[key] || 0) + count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate average time to completion for completed initiatives
    const completedInitiativesWithDates = await prisma.initiative.findMany({
      where: { status: 'COMPLETED' },
      select: { createdAt: true, updatedAt: true },
    });

    const avgCompletionTime =
      completedInitiativesWithDates.length > 0
        ? completedInitiativesWithDates.reduce((sum, init) => {
            const days = Math.ceil(
              (new Date(init.updatedAt).getTime() - new Date(init.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedInitiativesWithDates.length
        : 0;

    // AI insights data
    const insights = [
      {
        type: 'efficiency',
        title: 'Workflow Efficiency',
        value: completionRate,
        trend: completionRate > 70 ? 'up' : completionRate > 40 ? 'stable' : 'down',
        description: `${completionRate.toFixed(1)}% of initiatives completed successfully`,
      },
      {
        type: 'resolution',
        title: 'Issue Resolution Rate',
        value: resolutionRate,
        trend: resolutionRate > 60 ? 'up' : resolutionRate > 30 ? 'stable' : 'down',
        description: `${resolutionRate.toFixed(1)}% of issues have community support (5+ votes)`,
      },
      {
        type: 'velocity',
        title: 'Average Completion Time',
        value: avgCompletionTime,
        trend: avgCompletionTime < 30 ? 'up' : avgCompletionTime < 60 ? 'stable' : 'down',
        description: `${avgCompletionTime.toFixed(1)} days average to complete initiatives`,
      },
      {
        type: 'engagement',
        title: 'Team Engagement',
        value: recentActivity,
        trend: recentActivity > 20 ? 'up' : recentActivity > 10 ? 'stable' : 'down',
        description: `${recentActivity} team actions in the last 7 days`,
      },
    ];

    return NextResponse.json({
      overview: {
        totalInitiatives,
        completedInitiatives,
        activeInitiatives,
        totalIssues,
        resolvedIssues,
        recentActivity,
        completionRate: Math.round(completionRate),
        resolutionRate: Math.round(resolutionRate),
        avgCompletionTime: Math.round(avgCompletionTime),
      },
      phaseDistribution,
      insights,
      trends: {
        issuesOverTime: issuesOverTime.map((issue) => ({
          date: issue.createdAt.toISOString().split('T')[0],
          votes: issue.votes,
        })),
        aiUsage: aiUsageStats,
      },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
