import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { openAIService } from '@/lib/openai';

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

    const body = await request.json();
    const {
      issueIds,
      clusterIds,
      force = false, // Force regeneration even if AI summary exists
    } = body;

    if ((!issueIds || issueIds.length === 0) && (!clusterIds || clusterIds.length === 0)) {
      return NextResponse.json(
        { error: 'No issues or clusters specified for analysis' },
        { status: 400 }
      );
    }

    // Check if OpenAI is configured
    if (!openAIService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'AI analysis not available - OpenAI not configured',
          fallback: 'Batch AI analysis requires OpenAI configuration in admin settings.',
        },
        { status: 503 }
      );
    }

    // Get user's business profile for context
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
    });

    const businessContext = businessProfile
      ? {
          industry: businessProfile.industry,
          size: businessProfile.size,
          metrics: businessProfile.metrics,
        }
      : undefined;

    // Get current AI configuration for accurate model tracking
    const aiConfig = await prisma.aIConfiguration.findUnique({
      where: { key: 'openai_config' },
    });
    const currentModel = (aiConfig?.value as any)?.model || 'gpt-3.5-turbo';

    const results = {
      issues: [] as any[],
      clusters: [] as any[],
      errors: [] as any[],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      },
    };

    // Process issues
    if (issueIds && issueIds.length > 0) {
      const issues = await prisma.issue.findMany({
        where: {
          id: { in: issueIds },
          ...(force ? {} : { aiSummary: null }), // Only process issues without AI summary unless forced
        },
      });

      for (const issue of issues) {
        try {
          results.summary.totalProcessed++;

          const aiAnalysis = await openAIService.generateIssueSummary(
            issue.description,
            issue.department || undefined,
            issue.category || undefined,
            businessContext
          );

          if (aiAnalysis) {
            const updatedIssue = await prisma.issue.update({
              where: { id: issue.id },
              data: {
                aiSummary: aiAnalysis.summary,
                aiConfidence: aiAnalysis.confidence,
                aiGeneratedAt: new Date(),
                aiVersion: currentModel,
              },
            });

            results.issues.push({
              id: issue.id,
              summary: aiAnalysis.summary,
              confidence: aiAnalysis.confidence,
              analysis: aiAnalysis,
            });

            results.summary.successful++;
          } else {
            results.errors.push({
              type: 'issue',
              id: issue.id,
              error: 'AI analysis returned null',
            });
            results.summary.failed++;
          }
        } catch (error) {
          results.errors.push({
            type: 'issue',
            id: issue.id,
            error: (error as Error).message,
          });
          results.summary.failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Process clusters
    if (clusterIds && clusterIds.length > 0) {
      const clusters = await prisma.issueCluster.findMany({
        where: {
          id: { in: clusterIds },
          ...(force ? {} : { aiSummary: null }), // Only process clusters without AI summary unless forced
        },
        include: {
          issues: {
            select: {
              id: true,
              description: true,
              department: true,
              category: true,
              votes: true,
              heatmapScore: true,
            },
          },
        },
      });

      for (const cluster of clusters) {
        try {
          results.summary.totalProcessed++;

          if (cluster.issues.length === 0) {
            results.summary.skipped++;
            continue;
          }

          // Transform database nulls to undefined for OpenAI service
          const transformedIssues = cluster.issues.map((issue) => ({
            description: issue.description,
            department: issue.department ?? undefined,
            category: issue.category ?? undefined,
            votes: issue.votes,
            heatmapScore: issue.heatmapScore,
          }));

          const aiAnalysis = await openAIService.generateClusterSummary(
            cluster.name,
            cluster.description,
            transformedIssues,
            businessContext
          );

          if (aiAnalysis) {
            const updatedCluster = await prisma.issueCluster.update({
              where: { id: cluster.id },
              data: {
                aiSummary: aiAnalysis.consolidatedSummary,
                aiInsights: {
                  crossIssuePatterns: aiAnalysis.crossIssuePatterns,
                  strategicPriority: aiAnalysis.strategicPriority,
                  initiativeRecommendations: aiAnalysis.initiativeRecommendations,
                  analysisDate: new Date().toISOString(),
                  issueCount: cluster.issues.length,
                },
                aiConfidence: aiAnalysis.confidence,
                aiGeneratedAt: new Date(),
                aiVersion: currentModel,
              },
            });

            results.clusters.push({
              id: cluster.id,
              summary: aiAnalysis.consolidatedSummary,
              confidence: aiAnalysis.confidence,
              analysis: aiAnalysis,
            });

            results.summary.successful++;
          } else {
            results.errors.push({
              type: 'cluster',
              id: cluster.id,
              error: 'AI analysis returned null',
            });
            results.summary.failed++;
          }
        } catch (error) {
          results.errors.push({
            type: 'cluster',
            id: cluster.id,
            error: (error as Error).message,
          });
          results.summary.failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Log the batch operation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_BATCH_ANALYSIS',
        details: {
          totalProcessed: results.summary.totalProcessed,
          successful: results.summary.successful,
          failed: results.summary.failed,
          skipped: results.summary.skipped,
          issueCount: results.issues.length,
          clusterCount: results.clusters.length,
        },
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Batch AI analysis failed:', error);
    return NextResponse.json({ error: 'Failed to perform batch AI analysis' }, { status: 500 });
  }
}
