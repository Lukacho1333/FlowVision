import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/rbac';
import AIMigration from '@/lib/ai-migration';

interface CreateClusterInitiativeRequest {
  title: string;
  problem?: string;
  goal?: string;
  selectedIssueIds?: string[];
  useAI?: boolean;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch cluster with its initiatives
    const cluster = await prisma.issueCluster.findUnique({
      where: { id: params.id },
      include: {
        initiatives: {
          include: {
            owner: {
              select: { name: true, email: true, role: true },
            },
            addressedIssues: {
              select: {
                id: true,
                description: true,
                heatmapScore: true,
                department: true,
                category: true,
              },
            },
            milestones: {
              select: {
                title: true,
                status: true,
                dueDate: true,
                progress: true,
              },
            },
            comments: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: {
                author: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        issues: {
          select: {
            id: true,
            description: true,
            heatmapScore: true,
            votes: true,
            department: true,
            category: true,
          },
        },
      },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Calculate cluster-initiative metrics
    const metrics = {
      totalInitiatives: cluster.initiatives.length,
      activeInitiatives: cluster.initiatives.filter((i) => i.status === 'ACTIVE').length,
      completedInitiatives: cluster.initiatives.filter((i) => i.status === 'COMPLETED').length,
      totalIssues: cluster.issues.length,
      addressedIssues: new Set(
        cluster.initiatives.flatMap((i) => (i.addressedIssues || []).map((issue) => issue.id))
      ).size,
      coveragePercentage:
        cluster.issues.length > 0
          ? Math.round(
              (new Set(
                cluster.initiatives.flatMap((i) =>
                  (i.addressedIssues || []).map((issue) => issue.id)
                )
              ).size /
                cluster.issues.length) *
                100
            )
          : 0,
      averageProgress:
        cluster.initiatives.length > 0
          ? Math.round(
              cluster.initiatives.reduce((sum, init) => sum + init.progress, 0) /
                cluster.initiatives.length
            )
          : 0,
    };

    // Identify unaddressed issues
    const addressedIssueIds = new Set(
      cluster.initiatives.flatMap((i) => (i.addressedIssues || []).map((issue) => issue.id))
    );
    const unaddressedIssues = cluster.issues.filter((issue) => !addressedIssueIds.has(issue.id));

    return NextResponse.json({
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        category: cluster.category,
        severity: cluster.severity,
      },
      initiatives: cluster.initiatives,
      metrics,
      unaddressedIssues,
      recommendations: generateInitiativeRecommendations(cluster, metrics, unaddressedIssues),
    });
  } catch (error) {
    console.error('Failed to fetch cluster initiatives:', error);
    return NextResponse.json({ error: 'Failed to fetch cluster initiatives' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateClusterInitiativeRequest = await request.json();
    const { title, problem, goal, selectedIssueIds, useAI = true } = body;

    // Fetch cluster and selected issues
    const cluster = await prisma.issueCluster.findUnique({
      where: { id: params.id },
      include: {
        issues: true,
      },
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Get selected issues or use all cluster issues
    const targetIssues =
      selectedIssueIds && selectedIssueIds.length > 0
        ? cluster.issues.filter((issue) => selectedIssueIds.includes(issue.id))
        : cluster.issues;

    let initiativeData: any = {
      title,
      problem: problem || `Addressing ${targetIssues.length} issues in ${cluster.name} cluster`,
      goal: goal || `Resolve systemic issues in ${cluster.category} category`,
      status: 'PLANNING',
      phase: 'IDENTIFY',
      ownerId: user.id,
      clusterId: cluster.id,
      crossImpact: {
        clusterBased: true,
        issueCount: targetIssues.length,
        departments: [...new Set(targetIssues.map((issue) => issue.department).filter(Boolean))],
        estimatedImpact:
          cluster.severity === 'high' ? 'High' : cluster.severity === 'medium' ? 'Medium' : 'Low',
      },
      clusterMetrics: {
        targetIssues: targetIssues.length,
        averageScore:
          targetIssues.length > 0
            ? Math.round(
                targetIssues.reduce((sum, issue) => sum + issue.heatmapScore, 0) /
                  targetIssues.length
              )
            : 0,
        clusterCategory: cluster.category,
        estimatedROI:
          typeof cluster.metrics === 'object' &&
          cluster.metrics !== null &&
          (cluster.metrics as any).estimatedROI
            ? (cluster.metrics as any).estimatedROI
            : 'TBD',
      },
    };

    // Use AI to enhance the initiative if requested
    if (useAI) {
      try {
        // Use the singleton openAIService instance
        const aiPrompt = `Create a comprehensive strategic initiative for a ${cluster.category} cluster with the following context:

Cluster: ${cluster.name}
Description: ${cluster.description}
Severity: ${cluster.severity}
Issues to Address: ${targetIssues.length}

Issue Details:
${targetIssues.map((issue) => `- ${issue.description.substring(0, 200)}... (Score: ${issue.heatmapScore})`).join('\n')}

Generate a detailed initiative in JSON format:
{
  "title": "Enhanced title",
  "problem": "Comprehensive problem statement",
  "goal": "SMART goal with measurable outcomes",
  "kpis": ["Key performance indicators"],
  "estimatedTimeline": "Implementation timeline",
  "budget": "Estimated budget range",
  "phases": [
    {
      "name": "Phase name",
      "duration": "Duration",
      "objectives": ["Phase objectives"],
      "deliverables": ["Key deliverables"]
    }
  ],
  "successMetrics": ["Success measurements"],
  "riskFactors": ["Potential risks"],
  "resourceRequirements": ["Required resources"]
}`;

        const aiResponse = await AIMigration.generateIssueInsights(
          aiPrompt,
          {
            industry: 'business',
            size: 'SMB',
          },
          user.id
        );

        try {
          // If AI response is available, parse the insights string
          let parsedAI = null;
          if (aiResponse?.insights) {
            try {
              parsedAI = JSON.parse(aiResponse.insights);
            } catch (parseError) {
              console.warn('Failed to parse AI insights:', parseError);
            }
          }
          
          initiativeData = {
            ...initiativeData,
            title: parsedAI?.title || initiativeData.title,
            problem: parsedAI?.problem || initiativeData.problem,
            goal: parsedAI?.goal || initiativeData.goal,
            kpis: parsedAI?.kpis || [],
            estimatedHours: parsedAI?.estimatedTimeline ? 160 : undefined, // Default estimation
            clusterMetrics: {
              ...initiativeData.clusterMetrics,
              aiEnhanced: true,
              phases: parsedAI?.phases || [],
              successMetrics: parsedAI?.successMetrics || [],
              riskFactors: parsedAI?.riskFactors || [],
              resourceRequirements: parsedAI?.resourceRequirements || [],
            },
          };
        } catch (parseError) {
          console.warn('AI response parsing failed, using manual data');
        }
      } catch (aiError) {
        console.warn('AI enhancement failed, proceeding with manual data:', aiError);
      }
    }

    // Create the initiative
    const newInitiative = await prisma.initiative.create({
      data: initiativeData,
      include: {
        owner: {
          select: { name: true, email: true },
        },
        cluster: {
          select: { name: true, category: true },
        },
      },
    });

    // Connect the initiative to the selected issues
    if (targetIssues.length > 0) {
      await prisma.initiative.update({
        where: { id: newInitiative.id },
        data: {
          addressedIssues: {
            connect: targetIssues.map((issue) => ({ id: issue.id })),
          },
        },
      });
    }

    // Log the initiative creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CLUSTER_INITIATIVE_CREATED',
        details: {
          initiativeId: newInitiative.id,
          initiativeTitle: newInitiative.title,
          clusterId: cluster.id,
          clusterName: cluster.name,
          issueCount: targetIssues.length,
          aiEnhanced: useAI,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      initiative: newInitiative,
      message: `Cluster-based initiative created successfully${useAI ? ' with AI enhancement' : ''}`,
    });
  } catch (error) {
    console.error('Failed to create cluster initiative:', error);
    return NextResponse.json({ error: 'Failed to create cluster initiative' }, { status: 500 });
  }
}

function generateInitiativeRecommendations(cluster: any, metrics: any, unaddressedIssues: any[]) {
  const recommendations = [];

  // Coverage gap recommendation
  if (metrics.coveragePercentage < 70 && unaddressedIssues.length > 0) {
    const highPriorityUnaddressed = unaddressedIssues.filter((issue) => issue.heatmapScore > 80);

    recommendations.push({
      type: 'coverage',
      priority: highPriorityUnaddressed.length > 0 ? 'high' : 'medium',
      title: 'Address Coverage Gaps',
      description: `${unaddressedIssues.length} issues (${highPriorityUnaddressed.length} high-priority) not addressed by current initiatives`,
      action: 'create_comprehensive_initiative',
      suggestedIssues: highPriorityUnaddressed.slice(0, 3).map((issue) => ({
        id: issue.id,
        description: issue.description.substring(0, 100) + '...',
        score: issue.heatmapScore,
      })),
    });
  }

  // Performance improvement recommendation
  if (metrics.averageProgress < 50 && metrics.activeInitiatives > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      title: 'Accelerate Initiative Progress',
      description: `Current initiatives averaging ${metrics.averageProgress}% progress. Consider resource reallocation or process improvements.`,
      action: 'review_initiative_resources',
    });
  }

  // Strategic consolidation recommendation
  if (metrics.totalInitiatives > 3 && metrics.averageProgress < 60) {
    recommendations.push({
      type: 'consolidation',
      priority: 'medium',
      title: 'Consider Initiative Consolidation',
      description: `${metrics.totalInitiatives} initiatives with slow progress. Consolidating into fewer, well-resourced initiatives may be more effective.`,
      action: 'consolidate_initiatives',
    });
  }

  // Success amplification recommendation
  if (metrics.completedInitiatives > 0 && metrics.coveragePercentage > 80) {
    recommendations.push({
      type: 'success',
      priority: 'low',
      title: 'Successful Cluster Management',
      description: `Strong performance with ${metrics.completedInitiatives} completed initiatives and ${metrics.coveragePercentage}% issue coverage. Consider sharing best practices.`,
      action: 'document_success_patterns',
    });
  }

  return recommendations;
}
