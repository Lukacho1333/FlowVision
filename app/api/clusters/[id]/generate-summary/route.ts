import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { openAIService } from '@/lib/openai';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Fetch the cluster with its issues
    const cluster = await prisma.issueCluster.findUnique({
      where: { id: params.id },
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

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    if (cluster.issues.length === 0) {
      return NextResponse.json(
        {
          error: 'Cannot generate summary for empty cluster',
          message: 'This cluster has no associated issues to analyze.',
        },
        { status: 400 }
      );
    }

    // Check if OpenAI is configured
    if (!openAIService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'AI analysis not available - OpenAI not configured',
          fallback: 'AI cluster analysis requires OpenAI configuration in admin settings.',
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

    // Transform database nulls to undefined for OpenAI service
    const transformedIssues = cluster.issues.map((issue) => ({
      description: issue.description,
      department: issue.department ?? undefined,
      category: issue.category ?? undefined,
      votes: issue.votes,
      heatmapScore: issue.heatmapScore,
    }));

    // Generate AI cluster summary
    const aiAnalysis = await openAIService.generateClusterSummary(
      cluster.name,
      cluster.description,
      transformedIssues,
      businessContext
    );

    if (!aiAnalysis) {
      return NextResponse.json(
        {
          error: 'Failed to generate AI cluster summary',
          fallback: 'AI service temporarily unavailable. Please try again later.',
        },
        { status: 500 }
      );
    }

    // Get current AI configuration for accurate model tracking
    const aiConfig = await prisma.aIConfiguration.findUnique({
      where: { key: 'openai_config' },
    });
    const currentModel = (aiConfig?.value as any)?.model || 'gpt-3.5-turbo';

    // Store AI summary and detailed analysis in database
    const updatedCluster = await prisma.issueCluster.update({
      where: { id: params.id },
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
        aiAnalysisDetails: {
          consolidatedSummary: aiAnalysis.consolidatedSummary,
          crossIssuePatterns: aiAnalysis.crossIssuePatterns,
          strategicPriority: aiAnalysis.strategicPriority,
          initiativeRecommendations: aiAnalysis.initiativeRecommendations,
          confidence: aiAnalysis.confidence,
          generatedAt: new Date().toISOString(),
          model: currentModel,
          issueCount: cluster.issues.length,
        },
      },
    });

    // Log the AI generation activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_CLUSTER_SUMMARY_GENERATED',
        details: {
          clusterId: params.id,
          issueCount: cluster.issues.length,
          confidence: aiAnalysis.confidence,
          model: currentModel,
        },
      },
    });

    // Return complete analysis
    return NextResponse.json({
      cluster: updatedCluster,
      analysis: {
        consolidatedSummary: aiAnalysis.consolidatedSummary,
        crossIssuePatterns: aiAnalysis.crossIssuePatterns,
        strategicPriority: aiAnalysis.strategicPriority,
        initiativeRecommendations: aiAnalysis.initiativeRecommendations,
        confidence: aiAnalysis.confidence,
        generatedAt: updatedCluster.aiGeneratedAt,
        issueCount: cluster.issues.length,
      },
    });
  } catch (error) {
    console.error('AI cluster summary generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate AI cluster summary' }, { status: 500 });
  }
}
