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

    // Analyze ROI potential by system investment
    const [
      systemROIAnalysis,
      investmentPriorities,
      costBenefitAnalysis,
      resourceAllocation,
      portfolioOptimization
    ] = await Promise.all([
      // Calculate ROI by system
      calculateSystemROI(user.organizationId),
      
      // Determine investment priorities
      determineInvestmentPriorities(user.organizationId),
      
      // Cost-benefit analysis by system
      performCostBenefitAnalysis(user.organizationId),
      
      // Resource allocation guidance
      analyzeResourceAllocation(user.organizationId),
      
      // Portfolio optimization recommendations
      optimizePortfolio(user.organizationId)
    ]);

    // Generate strategic investment recommendations
    const strategicRecommendations = generateStrategicRecommendations(
      systemROIAnalysis,
      investmentPriorities,
      costBenefitAnalysis
    );

    // Calculate overall portfolio performance
    const portfolioPerformance = calculatePortfolioPerformance(
      systemROIAnalysis,
      resourceAllocation
    );

    return NextResponse.json({
      portfolioOverview: {
        totalInvestment: portfolioPerformance.totalInvestment,
        expectedROI: portfolioPerformance.expectedROI,
        riskLevel: portfolioPerformance.riskLevel,
        systemsCount: systemROIAnalysis.length,
        lastAnalyzed: new Date().toISOString()
      },
      systemROIAnalysis: systemROIAnalysis.sort((a, b) => b.projectedROI - a.projectedROI),
      investmentPriorities: investmentPriorities.slice(0, 10), // Top 10 priorities
      costBenefitAnalysis,
      resourceAllocation,
      portfolioOptimization,
      strategicRecommendations
    });

  } catch (error) {
    console.error('ROI impact analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze ROI impact by system' }, 
      { status: 500 }
    );
  }
}

// Helper functions for ROI analysis

async function calculateSystemROI(organizationId: string) {
  // Get initiatives grouped by the systems they address
  const initiatives = await prisma.initiative.findMany({
    where: { organizationId },
    include: {
      addressedIssues: {
        select: {
          category: true,
          heatmapScore: true,
          votes: true
        }
      },
      solutions: {
        select: {
          type: true,
          estimatedHours: true,
          estimatedCost: true
        }
      }
    }
  });

  // Group initiatives by system and calculate ROI
  const systemGroups = initiatives.reduce((acc, initiative) => {
    const systems = Array.from(new Set(
      initiative.addressedIssues.map(issue => issue.category).filter(Boolean)
    )) as string[];
    
    systems.forEach(system => {
      if (!acc[system]) {
        acc[system] = {
          systemName: system,
          initiatives: [],
          totalInvestment: 0,
          potentialSavings: 0,
          riskScore: 0,
          issuesSolved: 0
        };
      }
      
      acc[system].initiatives.push(initiative);
      
      // Calculate investment cost
      const solutionCosts = initiative.solutions?.reduce(
        (sum, solution) => sum + (solution.estimatedCost || 0), 0
      ) || 0;
      const laborCosts = initiative.solutions?.reduce(
        (sum, solution) => sum + ((solution.estimatedHours || 0) * 75), 0 // $75/hour estimate
      ) || 0;
      
      acc[system].totalInvestment += solutionCosts + laborCosts;
      
      // Calculate potential savings from addressed issues
      const issueSavings = initiative.addressedIssues.reduce((sum, issue) => {
        const severityMultiplier = (issue.heatmapScore || 0) / 100;
        const communityValidation = Math.min(issue.votes || 0, 10); // Cap at 10 votes
        return sum + (1000 * severityMultiplier * (1 + communityValidation * 0.2)); // Base $1000 per issue
      }, 0);
      
      acc[system].potentialSavings += issueSavings;
      acc[system].issuesSolved += initiative.addressedIssues.length;
      
      // Risk assessment
      acc[system].riskScore = Math.max(acc[system].riskScore, calculateImplementationRisk(initiative));
    });
    
    return acc;
  }, {} as any);

  // Convert to array and calculate ROI metrics
  return Object.values(systemGroups).map((system: any) => {
    const roi = system.totalInvestment > 0 
      ? ((system.potentialSavings - system.totalInvestment) / system.totalInvestment) * 100
      : 0;
    
    const paybackPeriod = system.potentialSavings > 0 
      ? (system.totalInvestment / system.potentialSavings) * 12 // months
      : 999;
    
    return {
      ...system,
      projectedROI: Math.round(roi * 100) / 100,
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      riskAdjustedROI: Math.round((roi * (1 - system.riskScore / 100)) * 100) / 100,
      efficiencyScore: calculateEfficiencyScore(system),
      recommendation: generateSystemRecommendation(roi, paybackPeriod, system.riskScore)
    };
  });
}

async function determineInvestmentPriorities(organizationId: string) {
  // Analyze urgency, impact, and opportunity for each system
  const issues = await prisma.issue.findMany({
    where: { organizationId },
    select: {
      category: true,
      heatmapScore: true,
      votes: true,
      createdAt: true
    }
  });

  // Group issues by system and calculate priority scores
  const systemPriorities = issues.reduce((acc, issue) => {
    const system = issue.category || 'Uncategorized';
    
    if (!acc[system]) {
      acc[system] = {
        systemName: system,
        urgencyScore: 0,
        impactScore: 0,
        opportunityScore: 0,
        issueCount: 0,
        averageSeverity: 0,
        communitySupport: 0,
        recentActivity: 0
      };
    }
    
    acc[system].issueCount++;
    acc[system].averageSeverity += issue.heatmapScore || 0;
    acc[system].communitySupport += issue.votes || 0;
    
    // Recent activity (last 30 days)
    const daysSinceCreated = (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 30) {
      acc[system].recentActivity++;
    }
    
    return acc;
  }, {} as any);

  // Calculate final priority scores
  return Object.values(systemPriorities).map((system: any) => {
    if (system.issueCount > 0) {
      system.averageSeverity = system.averageSeverity / system.issueCount;
    }
    
    // Scoring algorithm
    system.urgencyScore = Math.min(100, system.recentActivity * 10 + system.averageSeverity * 0.3);
    system.impactScore = Math.min(100, system.issueCount * 5 + system.averageSeverity * 0.5);
    system.opportunityScore = Math.min(100, system.communitySupport * 3 + system.averageSeverity * 0.2);
    
    const overallPriority = (system.urgencyScore * 0.4) + (system.impactScore * 0.4) + (system.opportunityScore * 0.2);
    
    return {
      ...system,
      overallPriority: Math.round(overallPriority),
      priorityLevel: overallPriority > 70 ? 'high' : overallPriority > 40 ? 'medium' : 'low',
      timeframe: system.urgencyScore > 60 ? 'immediate' : 
                system.urgencyScore > 30 ? 'short-term' : 'long-term',
      recommendedAction: generatePriorityRecommendation(system)
    };
  }).sort((a, b) => b.overallPriority - a.overallPriority);
}

async function performCostBenefitAnalysis(organizationId: string) {
  // Detailed cost-benefit analysis for each system
  const systems = await prisma.issue.groupBy({
    by: ['category'],
    where: { organizationId },
    _count: { id: true },
    _avg: { heatmapScore: true }
  });

  const initiatives = await prisma.initiative.findMany({
    where: { organizationId },
    include: {
      addressedIssues: {
        select: { category: true, heatmapScore: true }
      },
      solutions: {
        select: { estimatedCost: true, estimatedHours: true }
      }
    }
  });

  return systems.map(system => {
    const systemName = system.category || 'Uncategorized';
    const relatedInitiatives = initiatives.filter(init =>
      init.addressedIssues.some(issue => issue.category === systemName)
    );

    // Cost calculations
    const directCosts = relatedInitiatives.reduce((sum, init) => 
      sum + (init.solutions?.reduce((s, sol) => s + (sol.estimatedCost || 0), 0) || 0), 0
    );
    
    const laborCosts = relatedInitiatives.reduce((sum, init) => 
      sum + (init.solutions?.reduce((s, sol) => s + ((sol.estimatedHours || 0) * 75), 0) || 0), 0
    );
    
    const indirectCosts = (directCosts + laborCosts) * 0.2; // 20% overhead
    const totalCosts = directCosts + laborCosts + indirectCosts;

    // Benefit calculations
    const issueCount = system._count.id;
    const avgSeverity = system._avg.heatmapScore || 0;
    
    // Quantifiable benefits
    const productivityGains = issueCount * avgSeverity * 50; // $50 per severity point per issue
    const qualityImprovements = issueCount * 200; // $200 per issue resolved
    const riskReduction = (avgSeverity / 100) * issueCount * 1000; // Risk mitigation value
    const totalBenefits = productivityGains + qualityImprovements + riskReduction;

    // Risk factors
    const implementationRisk = calculateSystemImplementationRisk(relatedInitiatives);
    const adoptionRisk = issueCount > 10 ? 0.3 : 0.1; // Higher risk with more complex systems
    const overallRisk = (implementationRisk + adoptionRisk) / 2;

    // NPV calculation (3-year horizon, 10% discount rate)
    const annualBenefits = totalBenefits / 3;
    const discountRate = 0.10;
    const npv = Array.from({ length: 3 }, (_, i) => 
      annualBenefits / Math.pow(1 + discountRate, i + 1)
    ).reduce((sum, value) => sum + value, 0) - totalCosts;

    return {
      systemName,
      costs: {
        direct: Math.round(directCosts),
        labor: Math.round(laborCosts),
        indirect: Math.round(indirectCosts),
        total: Math.round(totalCosts)
      },
      benefits: {
        productivity: Math.round(productivityGains),
        quality: Math.round(qualityImprovements),
        riskReduction: Math.round(riskReduction),
        total: Math.round(totalBenefits)
      },
      analysis: {
        npv: Math.round(npv),
        roi: totalCosts > 0 ? Math.round(((totalBenefits - totalCosts) / totalCosts) * 100) : 0,
        paybackPeriod: annualBenefits > 0 ? Math.round((totalCosts / annualBenefits) * 12 * 10) / 10 : 999,
        riskLevel: overallRisk > 0.5 ? 'high' : overallRisk > 0.2 ? 'medium' : 'low',
        confidence: calculateConfidenceLevel(issueCount, relatedInitiatives.length)
      },
      recommendation: generateCostBenefitRecommendation(npv, overallRisk, totalCosts)
    };
  }).sort((a, b) => b.analysis.npv - a.analysis.npv);
}

async function analyzeResourceAllocation(organizationId: string) {
  // Analyze current resource allocation and provide optimization guidance
  const initiatives = await prisma.initiative.findMany({
    where: { organizationId },
    include: {
      owner: { select: { name: true, email: true } },
      addressedIssues: { select: { category: true, heatmapScore: true } },
      solutions: { 
        select: { 
          estimatedHours: true, 
          estimatedCost: true,
          type: true 
        } 
      }
    }
  });

  // Group by system and analyze resource distribution
  const systemResources = initiatives.reduce((acc, initiative) => {
    const systems = Array.from(new Set(
      initiative.addressedIssues.map(issue => issue.category).filter(Boolean)
    )) as string[];
    
    const totalHours = initiative.solutions?.reduce(
      (sum, sol) => sum + (sol.estimatedHours || 0), 0
    ) || 0;
    
    const totalCost = initiative.solutions?.reduce(
      (sum, sol) => sum + (sol.estimatedCost || 0), 0
    ) || 0;

    systems.forEach(system => {
      if (!acc[system]) {
        acc[system] = {
          systemName: system,
          allocatedHours: 0,
          allocatedBudget: 0,
          initiativeCount: 0,
          ownerDistribution: {},
          solutionTypes: {},
          priorityScore: 0
        };
      }
      
      acc[system].allocatedHours += totalHours / systems.length; // Distribute evenly
      acc[system].allocatedBudget += totalCost / systems.length;
      acc[system].initiativeCount++;
      
      // Track owner distribution
      const ownerName = initiative.owner?.name || 'Unassigned';
      acc[system].ownerDistribution[ownerName] = 
        (acc[system].ownerDistribution[ownerName] || 0) + 1;
      
      // Track solution types
      initiative.solutions?.forEach(solution => {
        const type = solution.type || 'Unknown';
        acc[system].solutionTypes[type] = 
          (acc[system].solutionTypes[type] || 0) + 1;
      });
      
      // Calculate priority score based on issues
      const systemIssues = initiative.addressedIssues.filter(
        issue => issue.category === system
      );
      acc[system].priorityScore += systemIssues.reduce(
        (sum, issue) => sum + (issue.heatmapScore || 0), 0
      );
    });
    
    return acc;
  }, {} as any);

  // Convert to array and add analytics
  const resourceAnalysis = Object.values(systemResources).map((system: any) => {
    const resourceDensity = system.allocatedHours / Math.max(system.initiativeCount, 1);
    const budgetEfficiency = system.priorityScore / Math.max(system.allocatedBudget, 1);
    
    return {
      ...system,
      metrics: {
        resourceDensity: Math.round(resourceDensity),
        budgetEfficiency: Math.round(budgetEfficiency * 100) / 100,
        resourceUtilization: calculateResourceUtilization(system),
        diversityIndex: calculateOwnerDiversityIndex(system.ownerDistribution)
      },
      recommendations: generateResourceRecommendations(system)
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Overall resource allocation summary
  const totalHours = resourceAnalysis.reduce((sum, sys) => sum + sys.allocatedHours, 0);
  const totalBudget = resourceAnalysis.reduce((sum, sys) => sum + sys.allocatedBudget, 0);
  
  const allocationSummary = {
    totalAllocatedHours: Math.round(totalHours),
    totalAllocatedBudget: Math.round(totalBudget),
    systemsCount: resourceAnalysis.length,
    averageHoursPerSystem: Math.round(totalHours / Math.max(resourceAnalysis.length, 1)),
    averageBudgetPerSystem: Math.round(totalBudget / Math.max(resourceAnalysis.length, 1)),
    resourceDistribution: calculateResourceDistribution(resourceAnalysis),
    optimizationOpportunities: identifyOptimizationOpportunities(resourceAnalysis)
  };

  return {
    summary: allocationSummary,
    systemAnalysis: resourceAnalysis,
    rebalancingRecommendations: generateRebalancingRecommendations(resourceAnalysis)
  };
}

async function optimizePortfolio(organizationId: string) {
  // Portfolio optimization recommendations for maximum ROI
  const systemROI = await calculateSystemROI(organizationId);
  const priorities = await determineInvestmentPriorities(organizationId);
  
  // Modern Portfolio Theory-inspired optimization
  const optimizedPortfolio = {
    highROI: systemROI.filter(s => s.projectedROI > 50).slice(0, 3),
    balancedRisk: systemROI.filter(s => s.riskScore < 30 && s.projectedROI > 20).slice(0, 3),
    quickWins: systemROI.filter(s => s.paybackPeriod < 6).slice(0, 3),
    strategicBets: priorities.filter(p => p.priorityLevel === 'high').slice(0, 2)
  };

  const portfolioMetrics = {
    expectedReturn: calculatePortfolioExpectedReturn(optimizedPortfolio),
    riskLevel: calculatePortfolioRisk(optimizedPortfolio),
    diversificationScore: calculateDiversificationScore(optimizedPortfolio),
    timeHorizon: calculateOptimalTimeHorizon(optimizedPortfolio)
  };

  return {
    optimizedAllocation: optimizedPortfolio,
    portfolioMetrics,
    implementationStrategy: generateImplementationStrategy(optimizedPortfolio),
    monitoringFramework: generateMonitoringFramework(optimizedPortfolio)
  };
}

// Additional helper functions

function calculateImplementationRisk(initiative: any): number {
  const solutionComplexity = initiative.solutions?.length || 0;
  const systemCount = new Set(
    initiative.addressedIssues?.map((issue: any) => issue.category).filter(Boolean)
  ).size;
  
  return Math.min(100, (solutionComplexity * 10) + (systemCount * 15));
}

function calculateEfficiencyScore(system: any): number {
  const issuesPerDollar = system.totalInvestment > 0 ? system.issuesSolved / system.totalInvestment * 1000 : 0;
  const savingsRatio = system.totalInvestment > 0 ? system.potentialSavings / system.totalInvestment : 0;
  
  return Math.round((issuesPerDollar * 30) + (savingsRatio * 70));
}

function generateSystemRecommendation(roi: number, paybackPeriod: number, riskScore: number): string {
  if (roi > 100 && paybackPeriod < 12) {
    return "High-priority investment: Excellent ROI with quick payback";
  } else if (roi > 50 && riskScore < 30) {
    return "Recommended investment: Good returns with manageable risk";
  } else if (paybackPeriod < 6) {
    return "Quick win opportunity: Fast payback despite moderate returns";
  } else if (riskScore > 70) {
    return "High-risk investment: Consider risk mitigation strategies";
  } else {
    return "Evaluate thoroughly: Mixed indicators require detailed analysis";
  }
}

function generatePriorityRecommendation(system: any): string {
  if (system.urgencyScore > 60) {
    return "Immediate action required: System showing critical warning signs";
  } else if (system.impactScore > 60) {
    return "High-impact opportunity: Significant organizational benefits possible";
  } else if (system.opportunityScore > 60) {
    return "Community-validated need: Strong support for improvements";
  } else {
    return "Monitor and evaluate: Consider for future investment cycles";
  }
}

function calculateSystemImplementationRisk(initiatives: any[]): number {
  if (initiatives.length === 0) return 0.5; // Default moderate risk
  
  const avgSolutionComplexity = initiatives.reduce((sum, init) => 
    sum + (init.solutions?.length || 0), 0
  ) / initiatives.length;
  
  return Math.min(1.0, avgSolutionComplexity / 10); // Normalize to 0-1
}

function calculateConfidenceLevel(issueCount: number, initiativeCount: number): number {
  const dataPoints = issueCount + initiativeCount;
  if (dataPoints > 20) return 95;
  if (dataPoints > 10) return 80;
  if (dataPoints > 5) return 65;
  return 50;
}

function generateCostBenefitRecommendation(npv: number, risk: number, cost: number): string {
  if (npv > cost * 0.5 && risk < 0.3) {
    return "Strongly recommended: High value with acceptable risk";
  } else if (npv > 0 && risk < 0.5) {
    return "Recommended: Positive NPV with manageable risk";
  } else if (npv > 0) {
    return "Consider with caution: Positive returns but high risk";
  } else {
    return "Not recommended: Negative NPV or excessive risk";
  }
}

function calculateResourceUtilization(system: any): number {
  // Simple utilization based on hours vs initiatives
  const hoursPerInitiative = system.allocatedHours / Math.max(system.initiativeCount, 1);
  return Math.min(100, hoursPerInitiative / 40 * 100); // Assuming 40 hours is optimal
}

function calculateOwnerDiversityIndex(distribution: any): number {
  const owners = Object.values(distribution) as number[];
  const total = owners.reduce((sum: number, count: number) => sum + count, 0);
  
  if (total === 0) return 0;
  
  const entropy = owners.reduce((sum: number, count: number) => {
    const p = count / total;
    return sum - (p * Math.log2(p));
  }, 0);
  
  return Math.round(entropy * 100) / 100;
}

function generateResourceRecommendations(system: any): string[] {
  const recommendations = [];
  
  if (system.metrics.resourceUtilization > 80) {
    recommendations.push("Consider additional resources - system may be over-utilized");
  }
  
  if (system.metrics.diversityIndex < 1) {
    recommendations.push("Increase owner diversity to reduce dependency risks");
  }
  
  if (system.metrics.budgetEfficiency < 0.5) {
    recommendations.push("Review budget allocation - low efficiency detected");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Resource allocation appears optimal");
  }
  
  return recommendations;
}

function calculateResourceDistribution(analysis: any[]): any {
  const total = analysis.reduce((sum, sys) => sum + sys.allocatedBudget, 0);
  
  return analysis.map(sys => ({
    systemName: sys.systemName,
    percentage: total > 0 ? Math.round((sys.allocatedBudget / total) * 100) : 0,
    isOptimal: sys.allocatedBudget / total < 0.5 // No single system should get >50%
  }));
}

function identifyOptimizationOpportunities(analysis: any[]): string[] {
  const opportunities = [];
  
  const overUtilized = analysis.filter(sys => sys.metrics.resourceUtilization > 80);
  if (overUtilized.length > 0) {
    opportunities.push(`${overUtilized.length} systems appear over-resourced`);
  }
  
  const underUtilized = analysis.filter(sys => sys.metrics.resourceUtilization < 40);
  if (underUtilized.length > 0) {
    opportunities.push(`${underUtilized.length} systems could handle additional workload`);
  }
  
  const lowEfficiency = analysis.filter(sys => sys.metrics.budgetEfficiency < 1);
  if (lowEfficiency.length > 0) {
    opportunities.push(`${lowEfficiency.length} systems show low budget efficiency`);
  }
  
  return opportunities;
}

function generateRebalancingRecommendations(analysis: any[]): any[] {
  // Identify specific rebalancing actions
  const recommendations = [];
  
  const sorted = analysis.sort((a, b) => b.priorityScore - a.priorityScore);
  const highPriority = sorted.slice(0, Math.ceil(sorted.length / 3));
  const lowPriority = sorted.slice(-Math.ceil(sorted.length / 3));
  
  // Suggest moving resources from low to high priority systems
  for (let i = 0; i < Math.min(highPriority.length, lowPriority.length); i++) {
    const from = lowPriority[i];
    const to = highPriority[i];
    
    if (from.allocatedBudget > to.allocatedBudget) {
      recommendations.push({
        action: 'reallocate',
        from: from.systemName,
        to: to.systemName,
        amount: Math.round((from.allocatedBudget - to.allocatedBudget) / 2),
        rationale: `${to.systemName} has higher priority score than ${from.systemName}`,
        expectedImpact: 'Improved overall portfolio performance'
      });
    }
  }
  
  return recommendations.slice(0, 5); // Top 5 recommendations
}

function calculatePortfolioExpectedReturn(portfolio: any): number {
  const allSystems = [
    ...portfolio.highROI,
    ...portfolio.balancedRisk,
    ...portfolio.quickWins
  ];
  
  if (allSystems.length === 0) return 0;
  
  return allSystems.reduce((sum, sys) => sum + (sys.projectedROI || 0), 0) / allSystems.length;
}

function calculatePortfolioRisk(portfolio: any): number {
  const allSystems = [
    ...portfolio.highROI,
    ...portfolio.balancedRisk,
    ...portfolio.quickWins
  ];
  
  if (allSystems.length === 0) return 0;
  
  return allSystems.reduce((sum, sys) => sum + (sys.riskScore || 0), 0) / allSystems.length;
}

function calculateDiversificationScore(portfolio: any): number {
  const systemNames = new Set([
    ...portfolio.highROI.map((s: any) => s.systemName),
    ...portfolio.balancedRisk.map((s: any) => s.systemName),
    ...portfolio.quickWins.map((s: any) => s.systemName)
  ]);
  
  return Math.min(100, systemNames.size * 20); // 5 different systems = 100% diversification
}

function calculateOptimalTimeHorizon(portfolio: any): string {
  const avgPayback = [...portfolio.highROI, ...portfolio.balancedRisk, ...portfolio.quickWins]
    .reduce((sum, sys) => sum + (sys.paybackPeriod || 12), 0) / Math.max(portfolio.highROI.length + portfolio.balancedRisk.length + portfolio.quickWins.length, 1);
  
  if (avgPayback < 6) return 'Short-term (3-6 months)';
  if (avgPayback < 12) return 'Medium-term (6-12 months)';
  return 'Long-term (12+ months)';
}

function generateImplementationStrategy(portfolio: any): any {
  return {
    phase1: {
      title: 'Quick Wins (Months 1-3)',
      systems: portfolio.quickWins.slice(0, 2),
      objective: 'Build momentum with fast payback initiatives'
    },
    phase2: {
      title: 'High ROI Focus (Months 3-9)',
      systems: portfolio.highROI.slice(0, 2),
      objective: 'Maximize returns with proven high-ROI systems'
    },
    phase3: {
      title: 'Strategic Expansion (Months 9-18)',
      systems: portfolio.strategicBets,
      objective: 'Long-term positioning with strategic investments'
    }
  };
}

function generateMonitoringFramework(portfolio: any): any {
  return {
    kpis: [
      'Portfolio ROI vs. target',
      'Individual system performance',
      'Risk-adjusted returns',
      'Implementation timeline adherence'
    ],
    reviewCadence: 'Monthly portfolio reviews, quarterly deep dives',
    alertThresholds: {
      roiBelow: 15,
      riskAbove: 70,
      paybackExceeds: 18
    }
  };
}

function calculatePortfolioPerformance(systemROI: any[], resourceAllocation: any) {
  const totalInvestment = resourceAllocation.summary?.totalAllocatedBudget || 0;
  const weightedROI = systemROI.reduce((sum, sys) => {
    const weight = sys.totalInvestment / Math.max(totalInvestment, 1);
    return sum + (sys.projectedROI * weight);
  }, 0);
  
  const avgRisk = systemROI.reduce((sum, sys) => sum + sys.riskScore, 0) / Math.max(systemROI.length, 1);
  
  return {
    totalInvestment,
    expectedROI: Math.round(weightedROI * 100) / 100,
    riskLevel: avgRisk > 50 ? 'high' : avgRisk > 25 ? 'medium' : 'low'
  };
}

function generateStrategicRecommendations(
  systemROI: any[],
  priorities: any[],
  costBenefit: any[]
): any[] {
  const recommendations = [];

  // High ROI opportunities
  const topROI = systemROI.filter(s => s.projectedROI > 50).slice(0, 3);
  if (topROI.length > 0) {
    recommendations.push({
      type: 'investment',
      priority: 'high',
      title: 'Capitalize on High-ROI Systems',
      description: `${topROI.length} systems show exceptional ROI potential (>50%)`,
      systems: topROI.map(s => s.systemName),
      expectedImpact: `Average ROI: ${Math.round(topROI.reduce((sum, s) => sum + s.projectedROI, 0) / topROI.length)}%`,
      timeline: '3-6 months',
      action: 'Prioritize resource allocation to these systems'
    });
  }

  // Quick wins
  const quickWins = systemROI.filter(s => s.paybackPeriod < 6).slice(0, 3);
  if (quickWins.length > 0) {
    recommendations.push({
      type: 'execution',
      priority: 'high',
      title: 'Execute Quick Win Initiatives',
      description: `${quickWins.length} systems offer rapid payback (<6 months)`,
      systems: quickWins.map(s => s.systemName),
      expectedImpact: `Average payback: ${Math.round(quickWins.reduce((sum, s) => sum + s.paybackPeriod, 0) / quickWins.length)} months`,
      timeline: '1-3 months',
      action: 'Fast-track implementation for immediate results'
    });
  }

  // Risk mitigation
  const highRisk = systemROI.filter(s => s.riskScore > 60);
  if (highRisk.length > 0) {
    recommendations.push({
      type: 'risk',
      priority: 'medium',
      title: 'Address High-Risk Investments',
      description: `${highRisk.length} systems carry elevated implementation risk`,
      systems: highRisk.map(s => s.systemName),
      expectedImpact: 'Reduced portfolio risk and improved success probability',
      timeline: '2-4 months',
      action: 'Develop risk mitigation strategies before proceeding'
    });
  }

  return recommendations;
}
