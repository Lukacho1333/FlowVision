import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    if (!user?.organizationId) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 403 });
    }

    // Gather system-wide health metrics for this organization
    const [
      systemIssueDistribution,
      systemInitiativeHealth,
      criticalSystemsAnalysis,
      systemTrends,
      overallSystemHealth
    ] = await Promise.all([
      // Issue concentration by system category
      prisma.issue.groupBy({
        by: ['category'],
        where: { 
          organizationId: user.organizationId 
        },
        _count: {
          id: true
        },
        _avg: {
          heatmapScore: true
        }
      }),

      // Initiative health by system impact
      prisma.initiative.findMany({
        where: { 
          organizationId: user.organizationId 
        },
        include: {
          addressedIssues: {
            select: {
              id: true,
              category: true,
              heatmapScore: true
            }
          }
        }
      }),

      // Identify critical systems (high issue concentration + impact)
      prisma.$queryRaw`
        SELECT 
          category as system_name,
          COUNT(*) as issue_count,
          AVG(heatmap_score) as avg_severity,
          COUNT(*) * AVG(heatmap_score) as risk_score
        FROM "Issue" 
        WHERE organization_id = ${user.organizationId}
        GROUP BY category
        HAVING COUNT(*) > 0
        ORDER BY risk_score DESC
        LIMIT 10
      `,

      // System health trends (last 30 days)
      prisma.issue.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          category: true,
          heatmapScore: true,
          createdAt: true,
          votes: true
        },
        orderBy: { createdAt: 'asc' }
      }),

      // Calculate overall system health score
      prisma.issue.aggregate({
        where: { 
          organizationId: user.organizationId 
        },
        _avg: {
          heatmapScore: true,
          votes: true
        },
        _count: {
          id: true
        }
      })
    ]);

    // Process system issue distribution
    const systemMetrics = systemIssueDistribution.map(system => ({
      systemName: system.category || 'Uncategorized',
      issueCount: system._count.id,
      averageSeverity: Math.round(system._avg.heatmapScore || 0),
      healthScore: calculateSystemHealthScore(
        system._count.id, 
        system._avg.heatmapScore || 0
      )
    }));

    // Identify critical systems requiring attention
    const criticalSystems = (criticalSystemsAnalysis as any[]).map((system: any) => ({
      systemName: system.system_name || 'Unknown System',
      issueCount: Number(system.issue_count),
      averageSeverity: Math.round(Number(system.avg_severity) || 0),
      riskScore: Math.round(Number(system.risk_score) || 0),
      status: Number(system.risk_score) > 200 ? 'critical' : 
              Number(system.risk_score) > 100 ? 'warning' : 'stable',
      recommendation: generateSystemRecommendation(
        Number(system.issue_count), 
        Number(system.avg_severity)
      )
    }));

    // Calculate system initiative coverage
    const systemInitiativeCoverage = calculateInitiativeCoverage(
      systemInitiativeHealth, 
      systemMetrics
    );

    // Process trends data for forecasting
    const trendsData = processSystemTrends(systemTrends);

    // Calculate overall organizational system health
    const organizationHealthScore = calculateOrganizationHealthScore(
      systemMetrics,
      overallSystemHealth,
      criticalSystems
    );

    // Generate executive summary insights
    const executiveSummary = generateExecutiveSummary(
      systemMetrics,
      criticalSystems,
      organizationHealthScore
    );

    return NextResponse.json({
      systemHealth: {
        overallScore: organizationHealthScore,
        trend: trendsData.overallTrend,
        lastUpdated: new Date().toISOString()
      },
      systemMetrics: systemMetrics.sort((a, b) => b.riskScore - a.riskScore),
      criticalSystems: criticalSystems.slice(0, 5), // Top 5 critical systems
      systemCoverage: systemInitiativeCoverage,
      trends: trendsData,
      executiveSummary,
      recommendations: generateSystemRecommendations(criticalSystems, systemMetrics)
    });

  } catch (error) {
    console.error('Systems health analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze systems health' }, 
      { status: 500 }
    );
  }
}

// Helper functions for system health calculations

function calculateSystemHealthScore(issueCount: number, avgSeverity: number): number {
  // Health score decreases with more issues and higher severity
  // Scale: 0-100 (100 = perfect health, 0 = critical)
  const issueImpact = Math.min(issueCount * 5, 50); // Max 50 points for issue count
  const severityImpact = Math.min(avgSeverity * 0.5, 50); // Max 50 points for severity
  return Math.max(0, 100 - issueImpact - severityImpact);
}

function generateSystemRecommendation(issueCount: number, avgSeverity: number): string {
  if (issueCount > 10 && avgSeverity > 70) {
    return "Immediate intervention required: High volume of critical issues detected";
  } else if (issueCount > 5 && avgSeverity > 50) {
    return "Schedule comprehensive system review within 2 weeks";
  } else if (issueCount > 0) {
    return "Monitor closely and address issues during next maintenance window";
  }
  return "System operating within normal parameters";
}

function calculateInitiativeCoverage(initiatives: any[], systemMetrics: any[]) {
  const systemCoverage = systemMetrics.map(system => {
    const coveringInitiatives = initiatives.filter(init => 
      init.addressedIssues?.some((issue: any) => issue.category === system.systemName)
    );
    
    return {
      systemName: system.systemName,
      issueCount: system.issueCount,
      initiativeCount: coveringInitiatives.length,
      coverageRatio: system.issueCount > 0 ? coveringInitiatives.length / system.issueCount : 0,
      status: coveringInitiatives.length === 0 ? 'uncovered' : 
              coveringInitiatives.length >= system.issueCount ? 'fully-covered' : 'partially-covered'
    };
  });

  return systemCoverage;
}

function processSystemTrends(trends: any[]) {
  // Group trends by week to identify patterns
  const weeklyData = trends.reduce((acc: any, issue: any) => {
    const week = new Date(issue.createdAt).toISOString().slice(0, 10);
    if (!acc[week]) {
      acc[week] = { date: week, issues: 0, totalSeverity: 0, systems: new Set() };
    }
    acc[week].issues++;
    acc[week].totalSeverity += issue.heatmapScore || 0;
    acc[week].systems.add(issue.category);
    return acc;
  }, {});

  const trendData = Object.values(weeklyData).map((week: any) => ({
    date: week.date,
    issueCount: week.issues,
    averageSeverity: week.totalSeverity / week.issues,
    affectedSystems: week.systems.size
  }));

  // Calculate overall trend
  const recentWeek = trendData.slice(-7).reduce((sum, day: any) => sum + day.issueCount, 0);
  const previousWeek = trendData.slice(-14, -7).reduce((sum, day: any) => sum + day.issueCount, 0);
  
  const overallTrend = recentWeek > previousWeek ? 'declining' : 
                      recentWeek < previousWeek ? 'improving' : 'stable';

  return {
    data: trendData,
    overallTrend,
    weeklyComparison: { recent: recentWeek, previous: previousWeek }
  };
}

function calculateOrganizationHealthScore(
  systemMetrics: any[], 
  overallMetrics: any, 
  criticalSystems: any[]
): number {
  const avgSystemHealth = systemMetrics.length > 0 
    ? systemMetrics.reduce((sum, system) => sum + system.healthScore, 0) / systemMetrics.length
    : 100;
  
  const criticalPenalty = criticalSystems.filter(s => s.status === 'critical').length * 10;
  const warningPenalty = criticalSystems.filter(s => s.status === 'warning').length * 5;
  
  return Math.max(0, Math.round(avgSystemHealth - criticalPenalty - warningPenalty));
}

function generateExecutiveSummary(
  systemMetrics: any[], 
  criticalSystems: any[], 
  healthScore: number
) {
  const totalIssues = systemMetrics.reduce((sum, system) => sum + system.issueCount, 0);
  const criticalCount = criticalSystems.filter(s => s.status === 'critical').length;
  const mostProblematicSystem = systemMetrics.sort((a, b) => b.issueCount - a.issueCount)[0];

  return {
    overallStatus: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'stable' : 'needs-attention',
    totalIssues,
    systemsCount: systemMetrics.length,
    criticalSystemsCount: criticalCount,
    mostProblematicSystem: mostProblematicSystem?.systemName || 'None',
    keyInsight: generateKeyInsight(systemMetrics, criticalSystems, healthScore)
  };
}

function generateKeyInsight(systemMetrics: any[], criticalSystems: any[], healthScore: number): string {
  if (healthScore < 60) {
    return `Organization requires immediate attention with ${criticalSystems.filter(s => s.status === 'critical').length} critical systems identified`;
  } else if (criticalSystems.length > 0) {
    return `${criticalSystems.length} systems require monitoring and potential intervention`;
  } else {
    return "All systems operating within acceptable parameters - maintain current practices";
  }
}

function generateSystemRecommendations(criticalSystems: any[], systemMetrics: any[]) {
  const recommendations = [];

  // Critical system recommendations
  const critical = criticalSystems.filter(s => s.status === 'critical');
  if (critical.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Address Critical Systems',
      description: `${critical.length} systems require immediate attention`,
      action: `Focus resources on: ${critical.slice(0, 3).map(s => s.systemName).join(', ')}`,
      timeline: 'Immediate (within 1 week)'
    });
  }

  // Resource allocation recommendations
  const uncoveredSystems = systemMetrics.filter(s => s.issueCount > 0);
  if (uncoveredSystems.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Initiative Coverage Gaps',
      description: `${uncoveredSystems.length} systems have issues without corresponding initiatives`,
      action: 'Create targeted initiatives for uncovered systems',
      timeline: 'Short-term (2-4 weeks)'
    });
  }

  // Proactive monitoring
  recommendations.push({
    priority: 'low',
    title: 'Proactive System Monitoring',
    description: 'Establish regular system health assessments',
    action: 'Schedule monthly system health reviews',
    timeline: 'Ongoing'
  });

  return recommendations;
}
