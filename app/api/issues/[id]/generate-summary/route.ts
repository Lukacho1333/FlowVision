import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AIMigration from '@/lib/ai-migration';
import { getUserFriendlyAIError } from '@/lib/ai-error-handler';
import { aiServiceMonitor } from '@/lib/ai-service-monitor';

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

    // Fetch the issue
    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Check if AI service is configured
    if (!AIMigration.isConfigured()) {
      return NextResponse.json(
        {
          error: 'AI analysis not available - OpenAI not configured',
          fallback: 'AI summary generation requires OpenAI configuration in admin settings.',
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

    // Generate AI summary using optimized service with user context
    const startTime = Date.now();
    const aiAnalysis = await AIMigration.generateIssueSummary(
      issue.description,
      issue.department || undefined,
      issue.category || undefined,
      businessContext,
      user.id
    );

    // Record operation metrics
    const responseTime = Date.now() - startTime;
    aiServiceMonitor.recordOperation(
      !!aiAnalysis,
      responseTime,
      aiAnalysis ? undefined : 'GENERATION_FAILED'
    );

    if (!aiAnalysis) {
      return NextResponse.json(
        {
          error: 'Failed to generate AI summary',
          fallback: getUserFriendlyAIError(new Error('AI generation failed')),
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
    const updatedIssue = await prisma.issue.update({
      where: { id: params.id },
      data: {
        aiSummary: aiAnalysis.summary,
        aiConfidence: aiAnalysis.confidence,
        aiGeneratedAt: new Date(),
        aiVersion: currentModel, // Now dynamic based on current config
        aiAnalysisDetails: {
          summary: aiAnalysis.summary,
          rootCauses: aiAnalysis.rootCauses,
          impact: aiAnalysis.impact,
          recommendations: aiAnalysis.recommendations,
          confidence: aiAnalysis.confidence,
          generatedAt: new Date().toISOString(),
          model: currentModel,
        },
      },
    });

    // Log the AI generation activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_SUMMARY_GENERATED',
        details: {
          issueId: params.id,
          confidence: aiAnalysis.confidence,
          model: currentModel,
        },
      },
    });

    // Return complete analysis
    return NextResponse.json({
      issue: updatedIssue,
      analysis: {
        summary: aiAnalysis.summary,
        rootCauses: aiAnalysis.rootCauses,
        impact: aiAnalysis.impact,
        recommendations: aiAnalysis.recommendations,
        confidence: aiAnalysis.confidence,
        generatedAt: updatedIssue.aiGeneratedAt,
      },
    });
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 });
  }
}
