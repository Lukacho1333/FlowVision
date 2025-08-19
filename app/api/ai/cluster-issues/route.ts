import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * AI ISSUE CLUSTERING API
 * Provides semantic similarity analysis and dynamic clustering
 */

interface ClusteringRequest {
  issueIds?: string[];
  threshold?: number;
  maxClusters?: number;
  method?: 'semantic' | 'keyword' | 'hybrid';
}

interface SemanticSimilarity {
  issueId: string;
  similarIssues: Array<{
    issueId: string;
    similarity: number;
    commonKeywords: string[];
    theme: string;
  }>;
  suggestedCluster?: {
    clusterId: string;
    confidence: number;
    reason: string;
  };
}

// Simulated semantic similarity calculation (in production, use actual ML embeddings)
function calculateSemanticSimilarity(issue1: any, issue2: any): number {
  const desc1 = issue1.description.toLowerCase();
  const desc2 = issue2.description.toLowerCase();

  // Extract key terms
  const terms1 = new Set(desc1.split(/\s+/).filter((word: string) => word.length > 3));
  const terms2 = new Set(desc2.split(/\s+/).filter((word: string) => word.length > 3));

  // Calculate Jaccard similarity
  const intersection = new Set([...terms1].filter((x) => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  const jaccardSimilarity = intersection.size / union.size;

  // Enhanced similarity based on department and category
  let similarity = jaccardSimilarity;

  if (issue1.department === issue2.department) {
    similarity += 0.1;
  }

  if (issue1.category === issue2.category) {
    similarity += 0.15;
  }

  // Keyword-based similarity boost
  const keywordBoost = calculateKeywordSimilarity(issue1.keywords || [], issue2.keywords || []);
  similarity += keywordBoost * 0.2;

  return Math.min(similarity, 1.0);
}

function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));

  return intersection.size / Math.max(set1.size, set2.size);
}

function findBestClusterMatch(issue: any, clusters: any[]): any {
  let bestMatch = null;
  let bestScore = 0;

  for (const cluster of clusters) {
    let score = 0;
    let matchCount = 0;

    // Check keyword overlap
    if (issue.keywords && issue.keywords.length > 0) {
      const issueKeywords = new Set(issue.keywords);
      const clusterKeywords = new Set(cluster.keywords || []);
      const overlap = new Set([...issueKeywords].filter((x) => clusterKeywords.has(x)));
      score += (overlap.size / Math.max(issueKeywords.size, clusterKeywords.size)) * 0.4;
      matchCount += overlap.size;
    }

    // Check description similarity
    const description = issue.description.toLowerCase();
    const clusterWords = (cluster.keywords || []).join(' ').toLowerCase();
    const wordMatches = (cluster.keywords || []).filter((keyword: string) =>
      description.includes(keyword.toLowerCase())
    ).length;

    if (cluster.keywords && cluster.keywords.length > 0) {
      score += (wordMatches / cluster.keywords.length) * 0.6;
      matchCount += wordMatches;
    }

    if (score > bestScore && score > 0.3) {
      // Minimum threshold
      bestMatch = {
        clusterId: cluster.id,
        confidence: score,
        reason: `${matchCount} keyword matches, ${Math.round(score * 100)}% similarity`,
        clusterName: cluster.name,
      };
      bestScore = score;
    }
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: ClusteringRequest = await request.json();
    const { issueIds, threshold = 0.6, maxClusters = 10, method = 'hybrid' } = body;

    // Fetch issues to cluster
    const issues = await prisma.issue.findMany({
      where: issueIds ? { id: { in: issueIds } } : {},
      include: {
        cluster: true,
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Fetch existing clusters for matching
    const clusters = await prisma.issueCluster.findMany({
      where: { isActive: true },
    });

    // Calculate semantic similarities
    const similarities: SemanticSimilarity[] = [];

    for (const issue of issues) {
      const similarIssues = [];

      // Find similar issues
      for (const otherIssue of issues) {
        if (issue.id !== otherIssue.id) {
          const similarity = calculateSemanticSimilarity(issue, otherIssue);

          if (similarity >= threshold) {
            const commonKeywords =
              issue.keywords?.filter((keyword) => otherIssue.keywords?.includes(keyword)) || [];

            similarIssues.push({
              issueId: otherIssue.id,
              similarity: Math.round(similarity * 100) / 100,
              commonKeywords,
              theme: otherIssue.category || 'General',
            });
          }
        }
      }

      // Sort by similarity
      similarIssues.sort((a, b) => b.similarity - a.similarity);

      // Find best cluster match
      const suggestedCluster = findBestClusterMatch(issue, clusters);

      similarities.push({
        issueId: issue.id,
        similarIssues: similarIssues.slice(0, 5), // Top 5 similar issues
        suggestedCluster,
      });
    }

    // Generate clustering insights
    const clusteringInsights = {
      totalIssues: issues.length,
      clusteredIssues: similarities.filter((s) => s.suggestedCluster).length,
      averageSimilarity:
        similarities.reduce((sum, s) => sum + (s.similarIssues[0]?.similarity || 0), 0) /
        similarities.length,
      strongClusters: similarities.filter(
        (s) => s.suggestedCluster && s.suggestedCluster.confidence > 0.7
      ).length,
      recommendations: {
        newClustersNeeded: similarities.filter((s) => !s.suggestedCluster).length,
        clusterRefinements: similarities.filter(
          (s) => s.suggestedCluster && s.suggestedCluster.confidence < 0.5
        ).length,
      },
    };

    // Update cluster metrics
    for (const cluster of clusters) {
      const clusterIssues = similarities.filter(
        (s) => s.suggestedCluster?.clusterId === cluster.id
      );

      if (clusterIssues.length > 0) {
        const avgConfidence =
          clusterIssues.reduce((sum, issue) => sum + (issue.suggestedCluster?.confidence || 0), 0) /
          clusterIssues.length;

        await prisma.issueCluster.update({
          where: { id: cluster.id },
          data: {
            metrics: {
              ...(typeof cluster.metrics === 'object' && cluster.metrics !== null
                ? (cluster.metrics as Record<string, any>)
                : {}),
              analysisDate: new Date().toISOString(),
              semanticScore: Math.round(avgConfidence * 100) / 100,
              potentialIssues: clusterIssues.length,
              confidence: avgConfidence > 0.7 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low',
            } as any,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      method,
      threshold,
      similarities,
      insights: clusteringInsights,
      clusters: clusters.map((cluster) => ({
        id: cluster.id,
        name: cluster.name,
        category: cluster.category,
        severity: cluster.severity,
        issueCount: similarities.filter((s) => s.suggestedCluster?.clusterId === cluster.id).length,
      })),
    });
  } catch (error) {
    console.error('Clustering analysis failed:', error);
    return NextResponse.json({ error: 'Failed to perform clustering analysis' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get clustering status and metrics
    const clusters = await prisma.issueCluster.findMany({
      include: {
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
        initiatives: {
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalIssues = await prisma.issue.count();
    const clusteredIssues = await prisma.issue.count({
      where: { clusterId: { not: null } },
    });

    const stats = {
      totalClusters: clusters.length,
      activeClusters: clusters.filter((c) => c.isActive).length,
      totalIssues,
      clusteredIssues,
      clusteringRate: totalIssues > 0 ? Math.round((clusteredIssues / totalIssues) * 100) : 0,
      averageClusterSize: clusters.length > 0 ? Math.round(clusteredIssues / clusters.length) : 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      clusters: clusters.map((cluster) => ({
        ...cluster,
        issueCount: cluster.issues.length,
        initiativeCount: cluster.initiatives.length,
        averageScore:
          cluster.issues.length > 0
            ? Math.round(
                cluster.issues.reduce((sum, issue) => sum + issue.heatmapScore, 0) /
                  cluster.issues.length
              )
            : 0,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch clustering data:', error);
    return NextResponse.json({ error: 'Failed to fetch clustering data' }, { status: 500 });
  }
}
