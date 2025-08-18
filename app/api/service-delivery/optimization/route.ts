import { NextRequest, NextResponse } from 'next/server';
import { getMultiTenantContext } from '@/lib/multi-tenant-utils';
import { aiTenantOptimizer } from '@/lib/ai-tenant-optimization';
import { prisma } from '@/lib/prisma';

// Force dynamic server-side rendering for this API route
export const dynamic = 'force-dynamic';

/**
 * Service Delivery Optimization API
 * Implements FlowVision's go-to-market strategy: service delivery with learning optimization
 * Following .cursorrules: ALWAYS provide proper context for AI recommendations
 */

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Enforce multi-tenant isolation following .cursorrules
    const tenantContext = await getMultiTenantContext(request);

    // Generate AI-driven optimization recommendations
    const optimizationRecommendations = await aiTenantOptimizer.generateOptimizationRecommendations(
      tenantContext.organizationId
    );

    // Assess service delivery readiness
    const serviceDeliveryAssessment = await aiTenantOptimizer.assessServiceDeliveryReadiness(
      tenantContext.organizationId
    );

    // Implement continuous learning
    const learningProfile = await aiTenantOptimizer.implementContinuousLearning(
      tenantContext.organizationId
    );

    // Capture this interaction for learning
    await aiTenantOptimizer.captureInteraction(
      tenantContext,
      'optimization-review',
      {
        recommendationsCount: optimizationRecommendations.length,
        readinessScore: serviceDeliveryAssessment.readinessScore,
        learningProfileUpdated: true
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        optimizationRecommendations,
        serviceDeliveryAssessment,
        learningProfile,
        // AI context for transparency
        aiContext: {
          organizationId: tenantContext.organizationId,
          analysisTimestamp: new Date(),
          confidence: 'high',
          dataPoints: [
            'user-behavior-patterns',
            'initiative-success-rates',
            'ai-utilization-metrics',
            'workflow-maturity-assessment'
          ]
        }
      }
    });

  } catch (error) {
    console.error('Service delivery optimization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate optimization recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * Apply optimization recommendations
 * Implements hands-on learning approach from consulting sessions
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Enforce multi-tenant isolation following .cursorrules
    const tenantContext = await getMultiTenantContext(request);

    const body = await request.json();
    const { 
      selectedRecommendations, 
      implementationNotes, 
      expectedOutcomes 
    } = body;

    // Validate input
    if (!selectedRecommendations || !Array.isArray(selectedRecommendations)) {
      return NextResponse.json(
        { error: 'Selected recommendations are required' },
        { status: 400 }
      );
    }

    // Capture implementation decision for learning
    await aiTenantOptimizer.captureInteraction(
      tenantContext,
      'optimization-implementation',
      {
        selectedRecommendations,
        implementationNotes,
        expectedOutcomes,
        implementationDate: new Date()
      }
    );

    // For each selected recommendation, create implementation tracking
    const implementationResults = [];
    
    for (const recommendation of selectedRecommendations) {
      // Create audit trail for implementation
      await prisma.auditLog.create({
        data: {
          userId: tenantContext.userId,
          organizationId: tenantContext.organizationId,
          action: 'OPTIMIZATION_IMPLEMENTATION',
          details: {
            recommendation,
            implementationNotes,
            expectedOutcomes,
            status: 'IN_PROGRESS',
            startDate: new Date()
          }
        }
      });

      implementationResults.push({
        recommendation: recommendation.recommendation,
        status: 'scheduled',
        trackingId: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Optimization recommendations scheduled for implementation',
      data: {
        implementationResults,
        trackingInfo: {
          totalRecommendations: selectedRecommendations.length,
          scheduledDate: new Date(),
          followUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks follow-up
        }
      }
    });

  } catch (error) {
    console.error('Optimization implementation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to implement optimization recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
