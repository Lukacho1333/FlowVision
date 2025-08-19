/**
 * AI Performance Monitoring Service
 * BUSINESS CRITICAL: Real-time monitoring and alerting for AI model performance
 * 
 * Tracks model performance metrics, detects anomalies, and provides insights
 * for optimizing client-specific AI learning models
 */

import { logger } from '@/utils/logger';
import { prisma } from '@/lib/prisma';

interface PerformanceMetric {
  organizationId: string;
  modelVersion: string;
  timestamp: Date;
  responseTime: number;
  accuracy: number;
  confidence: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface PerformanceAlert {
  id: string;
  organizationId: string;
  type: 'HIGH_RESPONSE_TIME' | 'LOW_ACCURACY' | 'HIGH_ERROR_RATE' | 'MEMORY_USAGE' | 'DEGRADED_PERFORMANCE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface PerformanceThresholds {
  maxResponseTime: number;      // milliseconds
  minAccuracy: number;          // percentage (0-1)
  maxErrorRate: number;         // percentage (0-1)
  maxMemoryUsage: number;       // MB
  minThroughput: number;        // requests per minute
}

class AIPerformanceMonitorService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: PerformanceThresholds = {
    maxResponseTime: 500,       // 500ms
    minAccuracy: 0.7,          // 70%
    maxErrorRate: 0.05,        // 5%
    maxMemoryUsage: 512,       // 512MB
    minThroughput: 10          // 10 requests/minute
  };
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Record performance metric for an AI operation
   */
  recordMetric(
    organizationId: string,
    operation: {
      modelVersion: string;
      responseTime: number;
      accuracy?: number;
      confidence?: number;
      success: boolean;
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): void {
    const metric: PerformanceMetric = {
      organizationId,
      modelVersion: operation.modelVersion,
      timestamp: new Date(),
      responseTime: operation.responseTime,
      accuracy: operation.accuracy || 0,
      confidence: operation.confidence || 0,
      throughput: 0, // Will be calculated in aggregation
      errorRate: operation.success ? 0 : 1,
      memoryUsage: operation.memoryUsage || 0,
      cpuUsage: operation.cpuUsage || 0
    };

    // Store in memory (keep last 1000 metrics per organization)
    const orgMetrics = this.metrics.get(organizationId) || [];
    orgMetrics.push(metric);
    if (orgMetrics.length > 1000) {
      orgMetrics.shift(); // Remove oldest
    }
    this.metrics.set(organizationId, orgMetrics);

    // Check for threshold violations
    this.checkThresholds(organizationId, metric);

    // Store in database for long-term analysis
    this.persistMetric(metric).catch(error => {
      logger.error('AI Performance Monitor: Failed to persist metric', error);
    });
  }

  /**
   * Get performance metrics for organization
   */
  getMetrics(
    organizationId: string,
    timeRange: {
      startTime: Date;
      endTime: Date;
    }
  ): PerformanceMetric[] {
    const orgMetrics = this.metrics.get(organizationId) || [];
    
    return orgMetrics.filter(metric => 
      metric.timestamp >= timeRange.startTime && 
      metric.timestamp <= timeRange.endTime
    );
  }

  /**
   * Get aggregated performance statistics
   */
  getPerformanceStats(organizationId: string, timeRange?: {
    startTime: Date;
    endTime: Date;
  }): {
    avgResponseTime: number;
    avgAccuracy: number;
    avgConfidence: number;
    errorRate: number;
    throughput: number;
    totalRequests: number;
    peakMemoryUsage: number;
    avgCpuUsage: number;
  } {
    let metrics = this.metrics.get(organizationId) || [];
    
    if (timeRange) {
      metrics = metrics.filter(metric => 
        metric.timestamp >= timeRange.startTime && 
        metric.timestamp <= timeRange.endTime
      );
    }

    if (metrics.length === 0) {
      return {
        avgResponseTime: 0,
        avgAccuracy: 0,
        avgConfidence: 0,
        errorRate: 0,
        throughput: 0,
        totalRequests: 0,
        peakMemoryUsage: 0,
        avgCpuUsage: 0
      };
    }

    const totalRequests = metrics.length;
    const errors = metrics.filter(m => m.errorRate > 0).length;
    
    // Calculate time span for throughput
    const timeSpanMs = Math.max(
      metrics[metrics.length - 1].timestamp.getTime() - metrics[0].timestamp.getTime(),
      60000 // Minimum 1 minute
    );
    const throughput = (totalRequests / timeSpanMs) * 60000; // Per minute

    return {
      avgResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests,
      avgAccuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / totalRequests,
      avgConfidence: metrics.reduce((sum, m) => sum + m.confidence, 0) / totalRequests,
      errorRate: errors / totalRequests,
      throughput,
      totalRequests,
      peakMemoryUsage: Math.max(...metrics.map(m => m.memoryUsage)),
      avgCpuUsage: metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / totalRequests
    };
  }

  /**
   * Get active alerts for organization
   */
  getActiveAlerts(organizationId: string): PerformanceAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.organizationId === organizationId && !alert.resolved)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get system-wide health overview
   */
  getSystemHealth(): {
    totalOrganizations: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgSystemResponseTime: number;
    systemErrorRate: number;
    systemThroughput: number;
  } {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const allAlerts = Array.from(this.alerts.values()).filter(a => !a.resolved);
    
    if (allMetrics.length === 0) {
      return {
        totalOrganizations: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        avgSystemResponseTime: 0,
        systemErrorRate: 0,
        systemThroughput: 0
      };
    }

    // Get recent metrics (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMetrics = allMetrics.filter(m => m.timestamp >= oneHourAgo);
    
    return {
      totalOrganizations: this.metrics.size,
      activeAlerts: allAlerts.length,
      criticalAlerts: allAlerts.filter(a => a.severity === 'CRITICAL').length,
      avgSystemResponseTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
        : 0,
      systemErrorRate: recentMetrics.length > 0
        ? recentMetrics.filter(m => m.errorRate > 0).length / recentMetrics.length
        : 0,
      systemThroughput: recentMetrics.length // Simplified throughput
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(organizationId: string, newThresholds: Partial<PerformanceThresholds>): void {
    // For now, use global thresholds, but could be made per-organization
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info(`AI Performance Monitor: Updated thresholds for ${organizationId}`);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    logger.info(`AI Performance Monitor: Resolved alert ${alertId}`);
    return true;
  }

  /**
   * Get performance trends for dashboard
   */
  getPerformanceTrends(organizationId: string, days: number = 7): {
    responseTimeTrend: { date: string; avgResponseTime: number }[];
    accuracyTrend: { date: string; avgAccuracy: number }[];
    throughputTrend: { date: string; throughput: number }[];
    errorRateTrend: { date: string; errorRate: number }[];
  } {
    const metrics = this.metrics.get(organizationId) || [];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoffDate);

    // Group by day
    const dailyGroups = new Map<string, PerformanceMetric[]>();
    
    recentMetrics.forEach(metric => {
      const dateKey = metric.timestamp.toISOString().split('T')[0];
      const group = dailyGroups.get(dateKey) || [];
      group.push(metric);
      dailyGroups.set(dateKey, group);
    });

    const responseTimeTrend: { date: string; avgResponseTime: number }[] = [];
    const accuracyTrend: { date: string; avgAccuracy: number }[] = [];
    const throughputTrend: { date: string; throughput: number }[] = [];
    const errorRateTrend: { date: string; errorRate: number }[] = [];

    for (const [date, dayMetrics] of dailyGroups.entries()) {
      const stats = {
        avgResponseTime: dayMetrics.reduce((sum, m) => sum + m.responseTime, 0) / dayMetrics.length,
        avgAccuracy: dayMetrics.reduce((sum, m) => sum + m.accuracy, 0) / dayMetrics.length,
        throughput: dayMetrics.length, // Simplified
        errorRate: dayMetrics.filter(m => m.errorRate > 0).length / dayMetrics.length
      };

      responseTimeTrend.push({ date, avgResponseTime: stats.avgResponseTime });
      accuracyTrend.push({ date, avgAccuracy: stats.avgAccuracy });
      throughputTrend.push({ date, throughput: stats.throughput });
      errorRateTrend.push({ date, errorRate: stats.errorRate });
    }

    return {
      responseTimeTrend: responseTimeTrend.sort((a, b) => a.date.localeCompare(b.date)),
      accuracyTrend: accuracyTrend.sort((a, b) => a.date.localeCompare(b.date)),
      throughputTrend: throughputTrend.sort((a, b) => a.date.localeCompare(b.date)),
      errorRateTrend: errorRateTrend.sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  /**
   * Private helper methods
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) return;

    // Run monitoring checks every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.cleanupOldData();
    }, 30000);

    logger.info('AI Performance Monitor: Background monitoring started');
  }

  private checkThresholds(organizationId: string, metric: PerformanceMetric): void {
    const alerts: Omit<PerformanceAlert, 'id' | 'triggeredAt' | 'resolved'>[] = [];

    // Check response time
    if (metric.responseTime > this.thresholds.maxResponseTime) {
      alerts.push({
        organizationId,
        type: 'HIGH_RESPONSE_TIME',
        severity: metric.responseTime > this.thresholds.maxResponseTime * 2 ? 'CRITICAL' : 'WARNING',
        message: `High response time detected: ${metric.responseTime}ms`,
        threshold: this.thresholds.maxResponseTime,
        currentValue: metric.responseTime
      });
    }

    // Check accuracy
    if (metric.accuracy > 0 && metric.accuracy < this.thresholds.minAccuracy) {
      alerts.push({
        organizationId,
        type: 'LOW_ACCURACY',
        severity: metric.accuracy < this.thresholds.minAccuracy * 0.8 ? 'CRITICAL' : 'WARNING',
        message: `Low model accuracy detected: ${(metric.accuracy * 100).toFixed(1)}%`,
        threshold: this.thresholds.minAccuracy,
        currentValue: metric.accuracy
      });
    }

    // Check memory usage
    if (metric.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push({
        organizationId,
        type: 'MEMORY_USAGE',
        severity: metric.memoryUsage > this.thresholds.maxMemoryUsage * 1.5 ? 'CRITICAL' : 'WARNING',
        message: `High memory usage detected: ${metric.memoryUsage}MB`,
        threshold: this.thresholds.maxMemoryUsage,
        currentValue: metric.memoryUsage
      });
    }

    // Create alerts
    alerts.forEach(alertData => {
      const alertId = `${organizationId}-${alertData.type}-${Date.now()}`;
      const alert: PerformanceAlert = {
        ...alertData,
        id: alertId,
        triggeredAt: new Date(),
        resolved: false
      };
      
      this.alerts.set(alertId, alert);
      logger.warn(`AI Performance Monitor: Alert triggered - ${alert.message}`);
    });
  }

  private async persistMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await prisma.aIPerformanceMetric.create({
        data: {
          operation: 'ai-recommendation',
          model: metric.modelVersion,
          avgLatency: Math.round(metric.responseTime),
          avgCost: 0, // Would need to calculate based on tokens/usage
          avgQuality: Math.round(metric.accuracy * 100),
          successRate: metric.errorRate === 0 ? 1.0 : 0.0,
          requestCount: 1,
          totalTokens: 0, // Would need to track
          date: metric.timestamp
        }
      });
    } catch (error) {
      // Handle unique constraint violations gracefully
      if (error instanceof Error && error.message.includes('unique constraint')) {
        // Update existing record instead
        try {
          await prisma.aIPerformanceMetric.updateMany({
            where: {
              operation: 'ai-recommendation',
              model: metric.modelVersion,
              date: metric.timestamp
            },
            data: {
              avgLatency: Math.round(metric.responseTime),
              avgQuality: Math.round(metric.accuracy * 100),
              requestCount: { increment: 1 }
            }
          });
        } catch (updateError) {
          logger.error('AI Performance Monitor: Failed to update metric', updateError);
        }
      } else {
        throw error;
      }
    }
  }

  private performHealthChecks(): void {
    // Check for organizations with degraded performance
    for (const [organizationId, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
      );

      if (recentMetrics.length >= 5) {
        const stats = this.getPerformanceStats(organizationId, {
          startTime: new Date(Date.now() - 15 * 60 * 1000),
          endTime: new Date()
        });

        // Check for degraded performance patterns
        if (stats.errorRate > this.thresholds.maxErrorRate) {
          const alertId = `${organizationId}-HIGH_ERROR_RATE-${Date.now()}`;
          this.alerts.set(alertId, {
            id: alertId,
            organizationId,
            type: 'HIGH_ERROR_RATE',
            severity: stats.errorRate > this.thresholds.maxErrorRate * 2 ? 'CRITICAL' : 'WARNING',
            message: `High error rate detected: ${(stats.errorRate * 100).toFixed(1)}%`,
            threshold: this.thresholds.maxErrorRate,
            currentValue: stats.errorRate,
            triggeredAt: new Date(),
            resolved: false
          });
        }
      }
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean up old metrics
    for (const [organizationId, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);
      this.metrics.set(organizationId, recentMetrics);
    }

    // Clean up resolved alerts older than 24 hours
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && 
          Date.now() - alert.resolvedAt.getTime() > cutoffTime) {
        this.alerts.delete(alertId);
      }
    }
  }
}

// Singleton instance
export const aiPerformanceMonitor = new AIPerformanceMonitorService();

// Helper functions for easy integration
export function recordAIPerformance(
  organizationId: string,
  operation: {
    modelVersion: string;
    responseTime: number;
    accuracy?: number;
    confidence?: number;
    success: boolean;
    memoryUsage?: number;
    cpuUsage?: number;
  }
): void {
  aiPerformanceMonitor.recordMetric(organizationId, operation);
}

export function getAIPerformanceStats(organizationId: string, timeRange?: {
  startTime: Date;
  endTime: Date;
}) {
  return aiPerformanceMonitor.getPerformanceStats(organizationId, timeRange);
}

export function getAIPerformanceHealth() {
  return aiPerformanceMonitor.getSystemHealth();
}

export function getAIPerformanceAlerts(organizationId: string) {
  return aiPerformanceMonitor.getActiveAlerts(organizationId);
}

export function getAIPerformanceTrends(organizationId: string, days?: number) {
  return aiPerformanceMonitor.getPerformanceTrends(organizationId, days);
}
