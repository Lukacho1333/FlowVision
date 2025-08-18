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

    // Analyze cross-system relationships and dependencies
    const [
      crossSystemIssues,
      systemDependencies,
      initiativeImpacts,
      correlationMatrix,
      riskAssessment
    ] = await Promise.all([
      // Issues that span multiple systems
      identifyCrossSystemIssues(user.organizationId),
      
      // System dependency analysis
      analyzSystemDependencies(user.organizationId),
      
      // Initiatives affecting multiple systems
      findMultiSystemInitiatives(user.organizationId),
      
      // System correlation analysis
      buildSystemCorrelationMatrix(user.organizationId),
      
      // Integration risk assessment
      assessIntegrationRisks(user.organizationId)
    ]);

    // Generate holistic solution recommendations
    const holisticRecommendations = generateHolisticRecommendations(
      crossSystemIssues,
      systemDependencies,
      initiativeImpacts,
      riskAssessment
    );

    // Calculate cross-system complexity score
    const complexityScore = calculateCrossSystemComplexity(
      crossSystemIssues,
      systemDependencies,
      correlationMatrix
    );

    return NextResponse.json({
      analysis: {
        complexityScore,
        lastAnalyzed: new Date().toISOString(),
        totalSystems: correlationMatrix.systems.length,
        crossSystemIssues: crossSystemIssues.length,
        multiSystemInitiatives: initiativeImpacts.length
      },
      crossSystemIssues,
      systemDependencies,
      initiativeImpacts,
      correlationMatrix,
      riskAssessment,
      holisticRecommendations
    });

  } catch (error) {
    console.error('Cross-system analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to perform cross-system analysis' }, 
      { status: 500 }
    );
  }
}

// Helper functions for cross-system analysis

async function identifyCrossSystemIssues(organizationId: string) {
  // Find issues that relate to multiple system categories
  const issues = await prisma.issue.findMany({
    where: { organizationId },
    select: {
      id: true,
      description: true,
      category: true,
      heatmapScore: true,
      votes: true,
      createdAt: true
    }
  });

  // Analyze issue descriptions for cross-system keywords
  const systemKeywords = {
    'technology': ['system', 'software', 'application', 'platform', 'database'],
    'process': ['workflow', 'procedure', 'methodology', 'protocol', 'sequence'],
    'people': ['team', 'staff', 'training', 'communication', 'collaboration'],
    'integration': ['connection', 'interface', 'sync', 'data flow', 'handoff']
  };

  const crossSystemIssues = issues.filter(issue => {
    const description = issue.description.toLowerCase();
    const matchedSystems = Object.keys(systemKeywords).filter(system =>
      systemKeywords[system as keyof typeof systemKeywords].some(keyword =>
        description.includes(keyword)
      )
    );
    return matchedSystems.length > 1; // Issue spans multiple systems
  }).map(issue => ({
    ...issue,
    affectedSystems: identifyAffectedSystems(issue.description),
    impactScore: calculateCrossSystemImpact(issue.heatmapScore, issue.votes),
    urgency: issue.heatmapScore > 70 ? 'high' : issue.heatmapScore > 40 ? 'medium' : 'low'
  }));

  return crossSystemIssues.sort((a, b) => b.impactScore - a.impactScore);
}

async function analyzSystemDependencies(organizationId: string) {
  // Analyze initiative relationships to understand system dependencies
  const initiatives = await prisma.initiative.findMany({
    where: { organizationId },
    include: {
      addressedIssues: {
        select: {
          id: true,
          category: true,
          description: true
        }
      },
      solutions: {
        select: {
          id: true,
          type: true,
          description: true
        }
      }
    }
  });

  const dependencies = [];
  
  for (const initiative of initiatives) {
    const affectedSystems = new Set(
      initiative.addressedIssues.map(issue => issue.category).filter(Boolean)
    );
    
    if (affectedSystems.size > 1) {
      const systemArray = Array.from(affectedSystems);
      
      // Create dependency relationships between systems
      for (let i = 0; i < systemArray.length; i++) {
        for (let j = i + 1; j < systemArray.length; j++) {
          dependencies.push({
            systemA: systemArray[i],
            systemB: systemArray[j],
            initiativeId: initiative.id,
            initiativeTitle: initiative.title,
            dependencyType: 'bidirectional',
            strength: calculateDependencyStrength(initiative),
            riskLevel: assessDependencyRisk(initiative)
          });
        }
      }
    }
  }

  // Group and aggregate dependencies
  const aggregatedDependencies = aggregateDependencies(dependencies);
  
  return aggregatedDependencies;
}

async function findMultiSystemInitiatives(organizationId: string) {
  const initiatives = await prisma.initiative.findMany({
    where: { organizationId },
    include: {
      addressedIssues: {
        select: {
          category: true,
          heatmapScore: true
        }
      },
      owner: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return initiatives
    .filter(init => {
      const uniqueSystems = new Set(
        init.addressedIssues.map(issue => issue.category).filter(Boolean)
      );
      return uniqueSystems.size > 1;
    })
    .map(init => {
      const affectedSystems = Array.from(new Set(
        init.addressedIssues.map(issue => issue.category).filter(Boolean)
      )) as string[];
      
      return {
        id: init.id,
        title: init.title,
        status: init.status,
        progress: init.progress,
        owner: init.owner?.name || 'Unassigned',
        affectedSystems,
        systemCount: affectedSystems.length,
        totalImpact: init.addressedIssues.reduce((sum, issue) => sum + (issue.heatmapScore || 0), 0),
        averageImpact: init.addressedIssues.length > 0 
          ? init.addressedIssues.reduce((sum, issue) => sum + (issue.heatmapScore || 0), 0) / init.addressedIssues.length
          : 0,
        complexity: calculateInitiativeComplexity(init, affectedSystems)
      };
    })
    .sort((a, b) => b.complexity - a.complexity);
}

async function buildSystemCorrelationMatrix(organizationId: string) {
  // Get all issues and their system categories
  const issues = await prisma.issue.findMany({
    where: { organizationId },
    select: {
      category: true,
      heatmapScore: true,
      votes: true,
      createdAt: true
    }
  });

  // Get unique systems
  const systems = Array.from(new Set(
    issues.map(issue => issue.category).filter(Boolean)
  )) as string[];

  // Build correlation matrix
  const matrix = systems.map(systemA => ({
    system: systemA,
    correlations: systems.map(systemB => {
      if (systemA === systemB) {
        return { system: systemB, correlation: 1.0, strength: 'self' };
      }
      
      const correlation = calculateSystemCorrelation(issues, systemA, systemB);
      return {
        system: systemB,
        correlation: correlation.coefficient,
        strength: correlation.strength,
        sharedIssues: correlation.sharedIssues
      };
    })
  }));

  return {
    systems,
    matrix,
    strongCorrelations: extractStrongCorrelations(matrix),
    timestamp: new Date().toISOString()
  };
}

async function assessIntegrationRisks(organizationId: string) {
  // Assess risks in system integrations and cross-dependencies
  const issues = await prisma.issue.findMany({
    where: { 
      organizationId,
      description: {
        contains: 'integration',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      description: true,
      category: true,
      heatmapScore: true,
      votes: true
    }
  });

  const integrationRisks = issues.map(issue => ({
    issueId: issue.id,
    description: issue.description,
    primarySystem: issue.category,
    riskLevel: issue.heatmapScore > 70 ? 'high' : issue.heatmapScore > 40 ? 'medium' : 'low',
    impactScore: issue.heatmapScore,
    communitySupport: issue.votes,
    riskType: classifyIntegrationRisk(issue.description),
    mitigationPriority: calculateMitigationPriority(issue.heatmapScore, issue.votes)
  }));

  // Aggregate risk assessment
  const riskSummary = {
    totalRisks: integrationRisks.length,
    highRiskCount: integrationRisks.filter(r => r.riskLevel === 'high').length,
    averageRiskScore: integrationRisks.length > 0 
      ? integrationRisks.reduce((sum, r) => sum + r.impactScore, 0) / integrationRisks.length
      : 0,
    topRiskAreas: identifyTopRiskAreas(integrationRisks)
  };

  return {
    summary: riskSummary,
    risks: integrationRisks.sort((a, b) => b.mitigationPriority - a.mitigationPriority),
    recommendations: generateRiskMitigationRecommendations(integrationRisks)
  };
}

// Additional helper functions

function identifyAffectedSystems(description: string): string[] {
  const systemIndicators = {
    'Technology': ['software', 'system', 'application', 'platform', 'database', 'server'],
    'Process': ['workflow', 'procedure', 'process', 'method', 'protocol'],
    'People': ['team', 'staff', 'training', 'communication', 'collaboration'],
    'Integration': ['integration', 'interface', 'sync', 'connection', 'handoff']
  };

  const lowerDesc = description.toLowerCase();
  return Object.keys(systemIndicators).filter(system =>
    systemIndicators[system as keyof typeof systemIndicators].some(indicator =>
      lowerDesc.includes(indicator)
    )
  );
}

function calculateCrossSystemImpact(heatmapScore: number, votes: number): number {
  // Cross-system issues have amplified impact
  const baseImpact = heatmapScore || 0;
  const communityMultiplier = 1 + (votes || 0) * 0.1;
  const crossSystemMultiplier = 1.5; // 50% amplification for cross-system issues
  
  return Math.round(baseImpact * communityMultiplier * crossSystemMultiplier);
}

function calculateDependencyStrength(initiative: any): number {
  // Strength based on number of addressed issues and their severity
  const issueCount = initiative.addressedIssues?.length || 0;
  const avgSeverity = issueCount > 0 
    ? initiative.addressedIssues.reduce((sum: number, issue: any) => sum + (issue.heatmapScore || 0), 0) / issueCount
    : 0;
  
  return Math.round((issueCount * 10) + (avgSeverity * 0.5));
}

function assessDependencyRisk(initiative: any): 'low' | 'medium' | 'high' {
  const systemCount = new Set(
    initiative.addressedIssues?.map((issue: any) => issue.category).filter(Boolean)
  ).size;
  
  if (systemCount > 3) return 'high';
  if (systemCount > 1) return 'medium';
  return 'low';
}

function aggregateDependencies(dependencies: any[]) {
  const grouped = dependencies.reduce((acc, dep) => {
    const key = [dep.systemA, dep.systemB].sort().join('-');
    if (!acc[key]) {
      acc[key] = {
        systemA: dep.systemA < dep.systemB ? dep.systemA : dep.systemB,
        systemB: dep.systemA < dep.systemB ? dep.systemB : dep.systemA,
        initiatives: [],
        totalStrength: 0,
        highestRisk: 'low'
      };
    }
    
    acc[key].initiatives.push({
      id: dep.initiativeId,
      title: dep.initiativeTitle
    });
    acc[key].totalStrength += dep.strength;
    
    if (dep.riskLevel === 'high' || acc[key].highestRisk === 'high') {
      acc[key].highestRisk = 'high';
    } else if (dep.riskLevel === 'medium' && acc[key].highestRisk !== 'high') {
      acc[key].highestRisk = 'medium';
    }
    
    return acc;
  }, {} as any);

  return Object.values(grouped).sort((a: any, b: any) => b.totalStrength - a.totalStrength);
}

function calculateInitiativeComplexity(initiative: any, affectedSystems: string[]): number {
  const systemCount = affectedSystems.length;
  const issueCount = initiative.addressedIssues?.length || 0;
  const avgSeverity = issueCount > 0 
    ? initiative.addressedIssues.reduce((sum: number, issue: any) => sum + (issue.heatmapScore || 0), 0) / issueCount
    : 0;
  
  return Math.round((systemCount * 20) + (issueCount * 5) + (avgSeverity * 0.5));
}

function calculateSystemCorrelation(issues: any[], systemA: string, systemB: string) {
  // Simple correlation based on co-occurrence patterns
  const systemAIssues = issues.filter(i => i.category === systemA);
  const systemBIssues = issues.filter(i => i.category === systemB);
  
  if (systemAIssues.length === 0 || systemBIssues.length === 0) {
    return { coefficient: 0, strength: 'none', sharedIssues: 0 };
  }

  // Look for temporal correlations (issues created around the same time)
  let sharedTimeframes = 0;
  const timeWindow = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  systemAIssues.forEach(issueA => {
    const hasCorrelatedIssue = systemBIssues.some(issueB => 
      Math.abs(new Date(issueA.createdAt).getTime() - new Date(issueB.createdAt).getTime()) < timeWindow
    );
    if (hasCorrelatedIssue) sharedTimeframes++;
  });

  const correlation = sharedTimeframes / Math.max(systemAIssues.length, systemBIssues.length);
  
  let strength = 'weak';
  if (correlation > 0.7) strength = 'strong';
  else if (correlation > 0.4) strength = 'medium';
  
  return {
    coefficient: Math.round(correlation * 100) / 100,
    strength,
    sharedIssues: sharedTimeframes
  };
}

function extractStrongCorrelations(matrix: any[]) {
  const strong = [];
  
  for (const row of matrix) {
    for (const correlation of row.correlations) {
      if (correlation.strength === 'strong' && correlation.system !== row.system) {
        strong.push({
          systemA: row.system,
          systemB: correlation.system,
          strength: correlation.correlation,
          sharedIssues: correlation.sharedIssues
        });
      }
    }
  }
  
  return strong;
}

function classifyIntegrationRisk(description: string): string {
  const riskKeywords = {
    'data': ['data loss', 'data corruption', 'data sync'],
    'performance': ['slow', 'timeout', 'performance', 'latency'],
    'connectivity': ['connection', 'network', 'api', 'endpoint'],
    'compatibility': ['version', 'compatibility', 'upgrade', 'migration']
  };

  const lowerDesc = description.toLowerCase();
  for (const [type, keywords] of Object.entries(riskKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return type;
    }
  }
  return 'general';
}

function calculateMitigationPriority(impactScore: number, votes: number): number {
  return impactScore + (votes * 5); // Votes amplify priority
}

function identifyTopRiskAreas(risks: any[]) {
  const areas = risks.reduce((acc, risk) => {
    acc[risk.riskType] = (acc[risk.riskType] || 0) + 1;
    return acc;
  }, {} as any);

  return Object.entries(areas)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 3)
    .map(([area, count]) => ({ area, count }));
}

function generateRiskMitigationRecommendations(risks: any[]) {
  const recommendations = [];
  
  const highRisks = risks.filter(r => r.riskLevel === 'high');
  if (highRisks.length > 0) {
    recommendations.push({
      priority: 'critical',
      title: 'Address High-Risk Integration Issues',
      description: `${highRisks.length} high-risk integration issues require immediate attention`,
      action: 'Prioritize resolution of data sync and connectivity problems',
      timeline: 'Within 48 hours'
    });
  }

  const dataRisks = risks.filter(r => r.riskType === 'data');
  if (dataRisks.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Data Integrity Protection',
      description: 'Multiple data-related integration risks detected',
      action: 'Implement data validation and backup procedures',
      timeline: 'Within 1 week'
    });
  }

  recommendations.push({
    priority: 'medium',
    title: 'Integration Monitoring',
    description: 'Establish proactive integration health monitoring',
    action: 'Set up automated integration testing and alerts',
    timeline: 'Within 2 weeks'
  });

  return recommendations;
}

function calculateCrossSystemComplexity(
  crossSystemIssues: any[], 
  dependencies: any[], 
  correlationMatrix: any
): number {
  const issueComplexity = crossSystemIssues.length * 10;
  const dependencyComplexity = dependencies.reduce((sum: number, dep: any) => sum + dep.totalStrength, 0);
  const correlationComplexity = correlationMatrix.strongCorrelations?.length * 15 || 0;
  
  const totalComplexity = issueComplexity + dependencyComplexity + correlationComplexity;
  
  // Normalize to 0-100 scale
  return Math.min(100, Math.round(totalComplexity / 10));
}

function generateHolisticRecommendations(
  crossSystemIssues: any[],
  dependencies: any[],
  initiatives: any[],
  riskAssessment: any
) {
  const recommendations = [];

  // Cross-system coordination
  if (crossSystemIssues.length > 3) {
    recommendations.push({
      type: 'coordination',
      priority: 'high',
      title: 'Cross-System Coordination Required',
      description: `${crossSystemIssues.length} issues span multiple systems`,
      solution: 'Establish cross-functional teams to address systemic issues',
      expectedImpact: 'Reduce issue resolution time by 40%',
      timeline: '2-3 weeks'
    });
  }

  // Dependency management
  const highRiskDependencies = dependencies.filter((dep: any) => dep.highestRisk === 'high');
  if (highRiskDependencies.length > 0) {
    recommendations.push({
      type: 'dependency',
      priority: 'high',
      title: 'High-Risk Dependencies Need Attention',
      description: `${highRiskDependencies.length} system dependencies at high risk`,
      solution: 'Implement dependency mapping and risk mitigation strategies',
      expectedImpact: 'Prevent cascade failures and improve system reliability',
      timeline: '1-2 weeks'
    });
  }

  // Initiative optimization
  const complexInitiatives = initiatives.filter((init: any) => init.complexity > 60);
  if (complexInitiatives.length > 0) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      title: 'Simplify Complex Multi-System Initiatives',
      description: `${complexInitiatives.length} initiatives have high cross-system complexity`,
      solution: 'Break down complex initiatives into system-specific phases',
      expectedImpact: 'Improve initiative success rate by 30%',
      timeline: '3-4 weeks'
    });
  }

  return recommendations;
}
