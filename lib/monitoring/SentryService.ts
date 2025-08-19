import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  extra?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class SentryService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized || !process.env.SENTRY_DSN) {
      return;
    }

    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Error filtering
        beforeSend(event, hint) {
          // Filter out known non-critical errors
          const error = hint.originalException;
          
          if (error instanceof Error) {
            // Don't report authentication errors
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
              return null;
            }
            
            // Don't report validation errors
            if (error.message.includes('validation') || error.message.includes('Invalid input')) {
              return null;
            }
          }
          
          return event;
        },

        // Additional options for Next.js
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
        ],

        // Release tracking
        release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
        
        // Security
        sendDefaultPii: false, // Don't send personally identifiable information
      });

      this.isInitialized = true;
      console.log('✅ Sentry monitoring initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  // Error tracking
  captureError(error: Error, context?: ErrorContext): string | null {
    if (!this.isInitialized) return null;

    return Sentry.withScope((scope) => {
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
          organizationId: context.user.organizationId,
        });
      }

      if (context?.request) {
        scope.setContext('request', {
          url: context.request.url,
          method: context.request.method,
          headers: this.sanitizeHeaders(context.request.headers),
          body: this.sanitizeBody(context.request.body),
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      return Sentry.captureException(error);
    });
  }

  // Message tracking
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): string | null {
    if (!this.isInitialized) return null;

    return Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context?.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      return Sentry.captureMessage(message);
    });
  }

  // Performance monitoring
  startTransaction(name: string, operation: string): Sentry.Transaction | null {
    if (!this.isInitialized) return null;

    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }

  recordPerformanceMetric(metrics: PerformanceMetrics): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${metrics.operation} completed in ${metrics.duration}ms`,
      level: metrics.success ? 'info' : 'warning',
      data: {
        operation: metrics.operation,
        duration: metrics.duration,
        success: metrics.success,
        ...metrics.metadata,
      },
    });

    // Create custom metric
    Sentry.metrics.distribution(
      'operation.duration',
      metrics.duration,
      {
        tags: {
          operation: metrics.operation,
          success: metrics.success.toString(),
        },
      }
    );
  }

  // AI-specific monitoring
  trackAIOperation(operation: string, model: string, tokens: number, cost: number, latency: number, success: boolean): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'ai',
      message: `AI ${operation} with ${model}`,
      level: success ? 'info' : 'error',
      data: {
        operation,
        model,
        tokens,
        cost,
        latency,
        success,
      },
    });

    // Track AI-specific metrics
    Sentry.metrics.distribution('ai.latency', latency, {
      tags: { operation, model, success: success.toString() },
    });

    Sentry.metrics.distribution('ai.tokens', tokens, {
      tags: { operation, model },
    });

    Sentry.metrics.distribution('ai.cost', cost, {
      tags: { operation, model },
    });
  }

  // Database operation monitoring
  trackDatabaseOperation(operation: string, table: string, duration: number, success: boolean): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'database',
      message: `Database ${operation} on ${table}`,
      level: success ? 'info' : 'warning',
      data: {
        operation,
        table,
        duration,
        success,
      },
    });

    Sentry.metrics.distribution('db.operation.duration', duration, {
      tags: { operation, table, success: success.toString() },
    });
  }

  // Cache operation monitoring
  trackCacheOperation(operation: string, key: string, hit: boolean, duration?: number): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'cache',
      message: `Cache ${operation} - ${hit ? 'HIT' : 'MISS'}`,
      level: 'info',
      data: {
        operation,
        key: this.sanitizeKey(key),
        hit,
        duration,
      },
    });

    Sentry.metrics.increment('cache.operation', 1, {
      tags: { operation, result: hit ? 'hit' : 'miss' },
    });

    if (duration) {
      Sentry.metrics.distribution('cache.operation.duration', duration, {
        tags: { operation },
      });
    }
  }

  // User activity tracking
  trackUserActivity(userId: string, action: string, metadata?: Record<string, any>): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      category: 'user_activity',
      message: `User ${action}`,
      level: 'info',
      data: {
        userId,
        action,
        ...metadata,
      },
    });
  }

  // Business metrics
  trackBusinessMetric(metric: string, value: number, tags?: Record<string, string>): void {
    if (!this.isInitialized) return;

    Sentry.metrics.gauge(metric, value, { tags });
  }

  // Custom span for detailed performance tracking
  async withSpan<T>(name: string, operation: string, callback: (span: Sentry.Span) => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      // Execute without tracing if Sentry is not available
      return callback({} as Sentry.Span);
    }

    return Sentry.withScope(async (scope) => {
      const transaction = scope.getTransaction();
      const span = transaction?.startChild({
        op: operation,
        description: name,
      });

      try {
        const result = await callback(span!);
        span?.setStatus('ok');
        return result;
      } catch (error) {
        span?.setStatus('internal_error');
        throw error;
      } finally {
        span?.finish();
      }
    });
  }

  // Helper methods
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    if (typeof body === 'object') {
      const sanitized = { ...body };
      
      // Remove sensitive fields
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.apiKey;
      delete sanitized.secret;
      
      return sanitized;
    }
    
    return '[BODY_CONTENT]';
  }

  private sanitizeKey(key: string): string {
    // Remove any potentially sensitive information from cache keys
    return key.replace(/[a-f0-9]{32,}/gi, '[HASH]').replace(/\d{10,}/g, '[ID]');
  }

  // Flush pending events (useful for serverless environments)
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;
    
    return Sentry.flush(timeout);
  }

  // Set user context globally
  setUser(user: ErrorContext['user']): void {
    if (!this.isInitialized) return;

    Sentry.setUser(user || null);
  }

  // Clear user context
  clearUser(): void {
    if (!this.isInitialized) return;

    Sentry.setUser(null);
  }
}

// Singleton instance
export const sentryService = new SentryService();
