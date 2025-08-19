/**
 * AI Recommendations API
 * BUSINESS CRITICAL: Real-time AI-powered suggestions based on expert consensus
 * 
 * Provides context-aware recommendations for issues, initiatives, and solutions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, TenantContext } from '@/lib/api-middleware';
import { aiRecommendationEngine } from '@/lib/ai-recommendation-engine';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const recommendationRequestSchema = z.object({
  entityType: z.enum(['ISSUE', 'INITIATIVE', 'SOLUTION']),
  entityId: z.string(),
  context: z.object({
    action: z.string().optional(),
    recentActivity: z.array(z.any()).optional(),
    filters: z.any().optional()
  }).optional()
});

const feedbackSchema = z.object({
  recommendationId: z.string(),
  accepted: z.boolean(),
  reason: z.string().optional()
});

// GET /api/ai/recommendations - Get AI recommendations for entity
export const GET = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');

    if (!entityType || !entityId) {
      return NextResponse.json({
        error: 'entityType and entityId are required'
      }, { status: 400 });
    }

    const requestContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      userRole: context.userRole,
      recentActivity: [], // Would be populated from user activity log
      organizationPatterns: {} // Would be populated from org analytics
    };

    let recommendations = [];

    switch (entityType) {
      case 'ISSUE':
        recommendations = await aiRecommendationEngine.getIssueRecommendations(
          entityId,
          requestContext
        );
        break;

      case 'INITIATIVE':
        recommendations = await getInitiativeRecommendations(entityId, requestContext);
        break;

      case 'SOLUTION':
        recommendations = await getSolutionRecommendations(entityId, requestContext);
        break;

      default:
        return NextResponse.json({
          error: `Unsupported entity type: ${entityType}`
        }, { status: 400 });
    }

    // Filter recommendations based on user role and permissions
    const filteredRecommendations = recommendations.filter(rec => {
      // Admin and Leader see all recommendations
      if (['ADMIN', 'LEADER'].includes(context.userRole)) {
        return true;
      }
      
      // Viewer only sees low-confidence, non-critical recommendations
      return rec.confidence < 80 && rec.type !== 'ISSUE_TO_INITIATIVE';
    });

    return NextResponse.json({
      success: true,
      recommendations: filteredRecommendations,
      metadata: {
        entityType,
        entityId,
        userRole: context.userRole,
        totalRecommendations: recommendations.length,
        filteredCount: filteredRecommendations.length
      }
    });

  } catch (error: any) {
    console.error('Failed to get AI recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI recommendations' },
      { status: 500 }
    );
  }
});

// POST /api/ai/recommendations - Record recommendation feedback
export const POST = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    const body = await request.json();
    const { recommendationId, accepted, reason } = feedbackSchema.parse(body);

    await aiRecommendationEngine.recordRecommendationFeedback(
      recommendationId,
      accepted,
      context.userId,
      context.organizationId
    );

    // Log the feedback for analytics
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        organizationId: context.organizationId,
        action: 'AI_RECOMMENDATION_FEEDBACK',
        details: {
          recommendationId,
          accepted,
          reason,
          userRole: context.userRole
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Recommendation feedback recorded successfully'
    });

  } catch (error: any) {
    console.error('Failed to record recommendation feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record recommendation feedback' },
      { status: 500 }
    );
  }
});

// GET /api/ai/recommendations/stats - Get recommendation analytics
export const statsHandler = requireAuth(async (request: NextRequest, context: TenantContext) => {
  try {
    // Only admin and leader can view recommendation stats
    if (!['ADMIN', 'LEADER'].includes(context.userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());

    const stats = await aiRecommendationEngine.getRecommendationStats(
      context.organizationId,
      startDate,
      endDate
    );

    return NextResponse.json({
      success: true,
      stats,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Failed to get recommendation stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendation stats' },
      { status: 500 }
    );
  }
});

/**
 * Get recommendations for initiatives
 */
async function getInitiativeRecommendations(
  initiativeId: string,
  context: any
): Promise<any[]> {
  // Implementation would suggest:
  // - Related issues that should be added
  // - Similar initiatives for cross-learning
  // - Solutions from other initiatives
  // - Team members who might help
  return [];
}

/**
 * Get recommendations for solutions
 */
async function getSolutionRecommendations(
  solutionId: string,
  context: any
): Promise<any[]> {
  // Implementation would suggest:
  // - Additional issues that this solution could address
  // - Similar solutions for reference
  // - Resources or team members needed
  // - Testing or validation approaches
  return [];
}

// Export individual handlers for Next.js App Router
export { statsHandler as stats };
