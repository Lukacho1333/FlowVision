/**
 * AI Performance Monitoring API
 * BUSINESS CRITICAL: Admin endpoint for monitoring AI model performance
 * 
 * Provides real-time performance metrics, alerts, and health status
 * for client-specific AI learning models
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, TenantContext } from '@/lib/api-middleware';
import { 
  getAIPerformanceStats,
  getAIPerformanceHealth,
  getAIPerformanceAlerts,
  getAIPerformanceTrends,
  aiPerformanceMonitor
} from '@/lib/ai-performance-monitor';
import { 
  getAIModelCacheHealth,
  getAIModelCacheMetrics
} from '@/lib/ai-model-cache';
import { 
  getTrainingQueueHealth,
  getTrainingQueueMetrics
} from '@/lib/ai-training-queue';

/**
 * GET /api/admin/ai/performance
 * Get AI performance metrics and system health
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth(request, ['ADMIN']) as TenantContext;
    const url = new URL(request.url);
    const metric = url.searchParams.get('metric');
    const organizationId = url.searchParams.get('organizationId') || context.organizationId;
    const days = parseInt(url.searchParams.get('days') || '7');

    switch (metric) {
      case 'health':
        return NextResponse.json({
          aiPerformance: getAIPerformanceHealth(),
          modelCache: await getAIModelCacheHealth(),
          trainingQueue: getTrainingQueueHealth(),
          timestamp: new Date().toISOString()
        });

      case 'stats':
        const timeRange = days > 0 ? {
          startTime: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          endTime: new Date()
        } : undefined;

        return NextResponse.json({
          organizationId,
          timeRange,
          performance: getAIPerformanceStats(organizationId, timeRange),
          cacheMetrics: getAIModelCacheMetrics(),
          queueMetrics: getTrainingQueueMetrics()
        });

      case 'alerts':
        return NextResponse.json({
          organizationId,
          alerts: getAIPerformanceAlerts(organizationId)
        });

      case 'trends':
        return NextResponse.json({
          organizationId,
          days,
          trends: getAIPerformanceTrends(organizationId, days)
        });

      case 'system':
        return NextResponse.json({
          systemHealth: getAIPerformanceHealth(),
          cacheHealth: await getAIModelCacheHealth(),
          queueHealth: getTrainingQueueHealth(),
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        });

      default:
        // Return comprehensive overview
        return NextResponse.json({
          organizationId,
          overview: {
            performance: getAIPerformanceStats(organizationId),
            alerts: getAIPerformanceAlerts(organizationId),
            systemHealth: getAIPerformanceHealth(),
            cacheHealth: await getAIModelCacheHealth(),
            queueHealth: getTrainingQueueHealth()
          },
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('AI Performance API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve AI performance metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai/performance
 * Update performance thresholds or resolve alerts
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireAuth(request, ['ADMIN']) as TenantContext;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'updateThresholds':
        aiPerformanceMonitor.updateThresholds(context.organizationId, data.thresholds);
        return NextResponse.json({ 
          success: true, 
          message: 'Performance thresholds updated' 
        });

      case 'resolveAlert':
        const resolved = aiPerformanceMonitor.resolveAlert(data.alertId);
        return NextResponse.json({ 
          success: resolved, 
          message: resolved ? 'Alert resolved' : 'Alert not found or already resolved' 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('AI Performance API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process performance request' },
      { status: 500 }
    );
  }
}