import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { categorizeIssuesForExecutives, getExecutivePriorities } from '@/lib/executive-clustering';

/**
 * GET /api/issues/cluster-executive
 * Returns executive-friendly business area clustering of issues
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization context
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 });
    }

    // Get all issues for the organization
    const issues = await prisma.issue.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        description: true,
        category: true,
        department: true,
        keywords: true,
        votes: true,
        heatmapScore: true,
        status: true,
        clusterId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { heatmapScore: 'desc' },
        { votes: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    // Get existing clusters for reference
    const existingClusters = await prisma.issueCluster.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        category: true,
        severity: true,
        issueCount: true,
      },
    });

    // Apply executive clustering logic
    const executiveView = categorizeIssuesForExecutives(issues);
    
    // Get priority recommendations
    const priorities = getExecutivePriorities(executiveView);

    // Create response with both views for comparison
    const response = {
      success: true,
      executiveView,
      priorities: priorities.slice(0, 5), // Top 5 priorities
      stats: {
        totalIssues: executiveView.totalIssues,
        businessAreas: executiveView.businessAreas.length,
        strategicIssues: executiveView.strategicIssues,
        operationalIssues: executiveView.operationalIssues,
        tacticalIssues: executiveView.tacticalIssues,
        activeClusters: executiveView.businessAreas.reduce(
          (sum, area) => sum + area.clusters.filter(c => (c.issueCount || 0) > 0).length, 
          0
        ),
      },
      existingClusters: existingClusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        category: cluster.category,
        severity: cluster.severity,
        issueCount: cluster.issueCount,
      })),
      generatedAt: new Date().toISOString(),
    };

    // Audit log for analytics
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'EXECUTIVE_CLUSTERING_VIEW',
          details: {
            businessAreaCount: executiveView.businessAreas.length,
            totalIssues: executiveView.totalIssues,
            strategicIssues: executiveView.strategicIssues,
            topPriorities: priorities.slice(0, 3).map(p => ({
              businessArea: p.businessArea.name,
              cluster: p.cluster.name,
              priority: p.priority,
            })),
            generatedAt: new Date().toISOString(),
          } as any,
          organizationId: user.organizationId,
        },
      });
    } catch (auditError) {
      // Log audit errors but don't fail the request
      console.warn('Failed to create audit log:', auditError);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Executive clustering error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate executive clustering view',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/issues/cluster-executive
 * Apply executive clustering to reorganize existing clusters
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true, role: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 });
    }

    // Check if user has admin/leader permissions
    if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { applyReorganization = false } = body;

    if (!applyReorganization) {
      return NextResponse.json({ error: 'Must specify applyReorganization: true' }, { status: 400 });
    }

    // Get all issues and apply executive clustering
    const issues = await prisma.issue.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        description: true,
        category: true,
        department: true,
        keywords: true,
        votes: true,
        heatmapScore: true,
        status: true,
        clusterId: true,
      },
    });

    const executiveView = categorizeIssuesForExecutives(issues);

    // Create/update clusters based on executive structure
    const clusterUpdates: Array<{
      cluster: any;
      businessArea: any;
      issues: any[];
    }> = [];

    for (const area of executiveView.businessAreas) {
      for (const cluster of area.clusters) {
        if ((cluster.issueCount || 0) > 0) {
          // Find matching issues for this cluster
          const matchingIssues = issues.filter(issue => {
            const category = issue.category || 'Process';
            const keywords = issue.keywords || [];
            const description = issue.description || '';
            
            // Use same matching logic as categorization
            return cluster.technicalCategories.includes(category) ||
                   cluster.keywords.some(keyword =>
                     keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase())) ||
                     description.toLowerCase().includes(keyword.toLowerCase())
                   );
          });

          if (matchingIssues.length > 0) {
            clusterUpdates.push({
              cluster: cluster,
              businessArea: area,
              issues: matchingIssues,
            });
          }
        }
      }
    }

    // Apply the reorganization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdClusters = [];

      for (const update of clusterUpdates) {
        // Create or update cluster
        const clusterData = {
          name: update.cluster.name,
          description: update.cluster.description,
          category: update.businessArea.name,
          severity: update.cluster.impactLevel === 'strategic' ? 'high' : 
                   update.cluster.impactLevel === 'operational' ? 'medium' : 'low',
          theme: `${update.businessArea.name}: ${update.cluster.description}`,
          keywords: update.cluster.keywords,
          issueCount: update.issues.length,
          organizationId: user.organizationId,
          aiSummary: `Executive-clustered: ${update.issues.length} issues in ${update.businessArea.name} - ${update.cluster.name}`,
          aiConfidence: 90, // High confidence for structured clustering
          aiGeneratedAt: new Date(),
        };

        const newCluster = await tx.issueCluster.create({
          data: clusterData,
        });

        // Update issues to reference this cluster
        await tx.issue.updateMany({
          where: { 
            id: { in: update.issues.map((i: any) => i.id) },
            organizationId: user.organizationId,
          },
          data: { clusterId: newCluster.id },
        });

        createdClusters.push({
          ...newCluster,
          businessArea: update.businessArea.name,
          issueIds: update.issues.map((i: any) => i.id),
        });
      }

      return createdClusters;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXECUTIVE_CLUSTERING_APPLIED',
        details: {
          clustersCreated: result.length,
          businessAreas: [...new Set(result.map(c => c.businessArea))],
          appliedAt: new Date().toISOString(),
        } as any,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      clustersCreated: result.length,
      clusters: result,
      message: `Successfully applied executive clustering: ${result.length} clusters created`,
    });

  } catch (error) {
    console.error('Executive clustering application error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to apply executive clustering',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, 
      { status: 500 }
    );
  }
}
