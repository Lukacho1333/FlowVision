/**
 * AI Service Health Monitor
 * Provides real-time monitoring, alerting, and health checks for AI services
 */

import { aiErrorHandler } from './ai-error-handler';
import { aiConfigLoader } from './ai-config-loader';
import { AIMigration } from './ai-migration';

export interface AIServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  configurationValid: boolean;
  details: {
    openaiStatus: 'ok' | 'error' | 'timeout';
    configurationLoaded: boolean;
    lastError?: string;
    uptime: number;
  };
}

export interface AIServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
  healthHistory: Array<{
    timestamp: Date;
    status: string;
    responseTime: number;
  }>;
}

class AIServiceMonitor {
  private healthHistory: Array<{ timestamp: Date; status: string; responseTime: number }> = [];
  private metrics: AIServiceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: {},
    healthHistory: [],
  };
  private lastHealthCheck: AIServiceHealth | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Perform comprehensive AI service health check
   */
  async performHealthCheck(): Promise<AIServiceHealth> {
    const startTime = Date.now();
    const health: AIServiceHealth = {
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      configurationValid: false,
      details: {
        openaiStatus: 'error',
        configurationLoaded: false,
        uptime: Date.now() - startTime,
      },
    };

    try {
      // Check configuration

      const config = await aiConfigLoader.loadConfig();
      health.details.configurationLoaded = config !== null;
      health.configurationValid = config !== null && config.enabled;

      if (!health.configurationValid) {
        health.status = 'unhealthy';
        health.details.lastError = 'AI configuration not loaded or disabled';
        return health;
      }

      // Check AI service connectivity

      const isConfigured = await AIMigration.isConfigured();
      if (!isConfigured) {
        health.status = 'unhealthy';
        health.details.lastError = 'AI services not configured';
        return health;
      }

      // Perform actual AI operation test

      const testResult = await AIMigration.testConnection();

      if (testResult.success) {
        health.details.openaiStatus = 'ok';
        health.status = 'healthy';
      } else {
        health.details.openaiStatus = 'error';
        health.details.lastError = testResult.error;
        health.status = 'degraded';
      }

      // Calculate response time
      health.responseTime = Date.now() - startTime;
      health.details.uptime = health.responseTime;

      // Calculate error rate from recent history
      health.errorRate = this.calculateErrorRate();

      // Adjust status based on error rate
      if (health.errorRate > 0.5) {
        health.status = 'unhealthy';
      } else if (health.errorRate > 0.2) {
        health.status = 'degraded';
      }
    } catch (error) {
      console.error('Health check failed:', error);
      health.status = 'unhealthy';
      health.responseTime = Date.now() - startTime;
      health.details.lastError = error instanceof Error ? error.message : String(error);
    }

    // Store health check result
    this.lastHealthCheck = health;
    this.healthHistory.push({
      timestamp: new Date(),
      status: health.status,
      responseTime: health.responseTime,
    });

    // Keep only last 100 entries
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    console.log(`🏥 AI Service Health: ${health.status} (${health.responseTime}ms)`);
    return health;
  }

  /**
   * Record AI operation metrics
   */
  recordOperation(success: boolean, responseTime: number, errorType?: string): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

      if (errorType) {
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      }
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests;
  }

  /**
   * Get current AI service metrics
   */
  getMetrics(): AIServiceMetrics {
    return {
      ...this.metrics,
      healthHistory: [...this.healthHistory],
    };
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): AIServiceHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Calculate error rate from recent operations
   */
  private calculateErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return this.metrics.failedRequests / this.metrics.totalRequests;
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    // Perform initial health check
    this.performHealthCheck().catch((error) => {
      console.error('Initial health check failed:', error);
    });

    // Set up periodic health checks (every 5 minutes)
    this.monitoringInterval = setInterval(
      () => {
        this.performHealthCheck().catch((error) => {
          console.error('Periodic health check failed:', error);
        });
      },
      5 * 60 * 1000
    );
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Generate health status summary for admin dashboard
   */
  getHealthSummary(): {
    status: string;
    uptime: string;
    errorRate: string;
    lastCheck: string;
    recommendations: string[];
  } {
    const health = this.lastHealthCheck;
    const metrics = this.metrics;

    if (!health) {
      return {
        status: 'Unknown',
        uptime: 'N/A',
        errorRate: 'N/A',
        lastCheck: 'Never',
        recommendations: ['Perform initial health check'],
      };
    }

    const recommendations: string[] = [];

    if (health.status === 'unhealthy') {
      recommendations.push('Check AI service configuration');
      recommendations.push('Verify OpenAI API key validity');
      recommendations.push('Check network connectivity');
    } else if (health.status === 'degraded') {
      recommendations.push('Monitor for continued issues');
      recommendations.push('Consider implementing circuit breaker');
    }

    if (health.errorRate > 0.1) {
      recommendations.push('High error rate detected - investigate root cause');
    }

    if (health.responseTime > 10000) {
      recommendations.push('Slow response times - check API limits');
    }

    return {
      status: health.status.charAt(0).toUpperCase() + health.status.slice(1),
      uptime: `${((Date.now() - health.lastCheck.getTime()) / 1000 / 60).toFixed(1)} minutes ago`,
      errorRate: `${(health.errorRate * 100).toFixed(1)}%`,
      lastCheck: health.lastCheck.toLocaleString(),
      recommendations: recommendations.length > 0 ? recommendations : ['All systems operational'],
    };
  }
}

// Export singleton instance
export const aiServiceMonitor = new AIServiceMonitor();

// Export for testing
export { AIServiceMonitor };
