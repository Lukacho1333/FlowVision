import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface LogContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  sessionId?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogMetrics {
  timestamp: string;
  level: string;
  message: string;
  context: LogContext;
  environment: string;
  service: string;
  version: string;
}

class StructuredLogger {
  private logger: winston.Logger;
  private metricsLogger: winston.Logger;

  constructor() {
    this.logger = this.createApplicationLogger();
    this.metricsLogger = this.createMetricsLogger();
  }

  private createApplicationLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        
        const logEntry: LogMetrics = {
          timestamp,
          level,
          message,
          context: meta.context || {},
          environment: process.env.NODE_ENV || 'development',
          service: 'flowvision',
          version: process.env.APP_VERSION || '1.0.0',
        };

        // Add any additional metadata
        if (Object.keys(meta).length > 0) {
          logEntry.context.metadata = meta;
        }

        return JSON.stringify(logEntry);
      })
    );

    const transports: winston.transport[] = [
      // Console transport with colorized output for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf((info) => {
            const { timestamp, level, message, context } = info;
            let output = `${timestamp} [${level}]: ${message}`;
            
            if (context && Object.keys(context).length > 0) {
              output += ` ${JSON.stringify(context)}`;
            }
            
            return output;
          })
        ),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      }),
    ];

    // Add file transports for production
    if (process.env.NODE_ENV === 'production') {
      // Application logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
          level: 'info',
        })
      );

      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
          level: 'error',
        })
      );
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
      ],
    });
  }

  private createMetricsLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/metrics-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '7d',
        }),
      ],
    });
  }

  // Application logging methods
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { context });
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, { context });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { context });
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  // Structured logging for specific operations
  logAPIRequest(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info('API Request', {
      ...context,
      operation: 'api_request',
      metadata: {
        method,
        url,
        statusCode,
        duration,
      },
    });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, context?: LogContext): void {
    this.info('Database Operation', {
      ...context,
      operation: 'database_operation',
      duration,
      metadata: {
        operation,
        table,
        success,
      },
    });
  }

  logAIOperation(
    model: string,
    operation: string,
    tokens: number,
    cost: number,
    latency: number,
    success: boolean,
    context?: LogContext
  ): void {
    this.info('AI Operation', {
      ...context,
      operation: 'ai_operation',
      duration: latency,
      metadata: {
        model,
        operation,
        tokens,
        cost,
        success,
      },
    });
  }

  logCacheOperation(operation: string, key: string, hit: boolean, duration?: number, context?: LogContext): void {
    this.info('Cache Operation', {
      ...context,
      operation: 'cache_operation',
      duration,
      metadata: {
        operation,
        key: this.sanitizeKey(key),
        hit,
      },
    });
  }

  logBusinessEvent(event: string, data: Record<string, any>, context?: LogContext): void {
    this.info('Business Event', {
      ...context,
      operation: 'business_event',
      metadata: {
        event,
        data,
      },
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', data: Record<string, any>, context?: LogContext): void {
    this.warn('Security Event', {
      ...context,
      operation: 'security_event',
      metadata: {
        event,
        severity,
        data,
      },
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.metricsLogger.info('Performance Metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context,
    });
  }

  // User activity logging
  logUserActivity(userId: string, action: string, details?: Record<string, any>, context?: LogContext): void {
    this.info('User Activity', {
      ...context,
      userId,
      operation: 'user_activity',
      metadata: {
        action,
        details,
      },
    });
  }

  // Authentication logging
  logAuthEvent(event: 'login' | 'logout' | 'failed_login' | 'password_reset', userId?: string, context?: LogContext): void {
    this.info('Authentication Event', {
      ...context,
      userId,
      operation: 'auth_event',
      metadata: {
        event,
      },
    });
  }

  // System health logging
  logSystemHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics?: Record<string, any>): void {
    this.info('System Health Check', {
      operation: 'health_check',
      metadata: {
        component,
        status,
        metrics,
      },
    });
  }

  // Error aggregation for monitoring
  logCriticalError(error: Error, context?: LogContext): void {
    this.error('Critical Error', error, {
      ...context,
      operation: 'critical_error',
    });

    // Also log to metrics for alerting
    this.metricsLogger.error('Critical Error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
      context,
    });
  }

  // Helper methods
  private sanitizeKey(key: string): string {
    // Remove sensitive information from keys for logging
    return key.replace(/[a-f0-9]{32,}/gi, '[HASH]').replace(/\d{10,}/g, '[ID]');
  }

  // Correlation ID management
  withCorrelationId<T>(correlationId: string, fn: () => T): T {
    // Store correlation ID in async local storage or similar
    // For now, we'll pass it through context
    return fn();
  }

  // Log sampling for high-volume operations
  logSampled(samplingRate: number, logFn: () => void): void {
    if (Math.random() < samplingRate) {
      logFn();
    }
  }

  // Graceful shutdown
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end();
      this.metricsLogger.end();
      setTimeout(resolve, 1000); // Give time for logs to flush
    });
  }

  // Create child logger with default context
  child(defaultContext: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger();
    
    // Override logging methods to include default context
    const originalMethods = ['debug', 'info', 'warn', 'error'] as const;
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (message: string, contextOrError?: any, context?: LogContext) => {
        const mergedContext = { ...defaultContext, ...context };
        
        if (method === 'error' && contextOrError instanceof Error) {
          originalMethod(message, contextOrError, mergedContext);
        } else {
          originalMethod(message, mergedContext);
        }
      };
    });
    
    return childLogger;
  }
}

// Singleton instance
export const logger = new StructuredLogger();

// Context helpers for request correlation
export function createRequestContext(requestId: string, userId?: string, organizationId?: string): LogContext {
  return {
    requestId,
    userId,
    organizationId,
    operation: 'request',
  };
}

export function createOperationContext(operation: string, metadata?: Record<string, any>): LogContext {
  return {
    operation,
    metadata,
  };
}
