/**
 * AI Service Error Handler
 * Provides robust error handling, retry logic, and timeout management for AI services
 */

export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  timeoutMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeoutMs: 30000, // 30 seconds
};

export class AIErrorHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute an AI operation with error handling, retry logic, and timeout
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'AI Operation',
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, config.timeoutMs);

        try {
          // Execute operation with timeout
          const result = await Promise.race([
            operation(),
            this.createTimeoutPromise<T>(config.timeoutMs),
          ]);

          clearTimeout(timeoutId);

          // Log successful operation
          if (attempt > 1) {

          }

          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error as Error;

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === config.maxAttempts;

        // Log attempt
        console.warn(`⚠️ ${operationName} failed on attempt ${attempt}/${config.maxAttempts}:`, {
          error: error instanceof Error ? error.message : String(error),
          retryable: isRetryable,
          willRetry: isRetryable && !isLastAttempt,
        });

        // If not retryable or last attempt, throw error
        if (!isRetryable || isLastAttempt) {
          throw this.wrapError(error, operationName, attempt);
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);

        // Add jitter to prevent thundering herd
        const jitterDelay = delay + Math.random() * 1000;

        console.log(`🕐 Retrying ${operationName} in ${Math.round(jitterDelay)}ms...`);
        await this.sleep(jitterDelay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw this.wrapError(lastError!, operationName, config.maxAttempts);
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // OpenAI specific error handling
    if (error?.status) {
      switch (error.status) {
        case 429: // Rate limit
        case 500: // Internal server error
        case 502: // Bad gateway
        case 503: // Service unavailable
        case 504: // Gateway timeout
          return true;
        case 401: // Unauthorized - API key issue
        case 403: // Forbidden
        case 400: // Bad request
          return false;
        default:
          return error.status >= 500; // Server errors are retryable
      }
    }

    // Network errors
    if (error?.code) {
      switch (error.code) {
        case 'ECONNRESET':
        case 'ECONNREFUSED':
        case 'ETIMEDOUT':
        case 'ENOTFOUND':
          return true;
        default:
          return false;
      }
    }

    // Timeout errors
    if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
      return true;
    }

    // Default: don't retry unknown errors
    return false;
  }

  /**
   * Wrap error with additional context
   */
  private wrapError(error: any, operationName: string, attempts: number): AIServiceError {
    const statusCode = error?.status || error?.statusCode;
    const code = error?.code || error?.type || 'UNKNOWN_ERROR';

    let message = `${operationName} failed after ${attempts} attempt(s)`;

    if (error?.message) {
      message += `: ${error.message}`;
    }

    // Specific error messages for common cases
    if (statusCode === 401) {
      message = 'AI service authentication failed - check API key configuration';
    } else if (statusCode === 429) {
      message = 'AI service rate limit exceeded - please try again later';
    } else if (statusCode === 503) {
      message = 'AI service temporarily unavailable - please try again later';
    }

    return new AIServiceError(message, code, statusCode, this.isRetryableError(error), error);
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    if (error instanceof AIServiceError) {
      if (error.statusCode === 401) {
        return 'AI analysis is not available - please check system configuration';
      } else if (error.statusCode === 429) {
        return 'AI service is busy - please try again in a few moments';
      } else if (error.statusCode === 503) {
        return 'AI service is temporarily unavailable - please try again later';
      } else if (error.retryable) {
        return 'AI analysis failed - please try again';
      } else {
        return 'AI analysis is currently unavailable';
      }
    }

    return 'An error occurred while processing your request';
  }

  /**
   * Check if AI service is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();

    try {
      await this.executeWithRetry(
        async () => {
          // Simple test operation
          return new Promise((resolve) => setTimeout(resolve, 100));
        },
        'AI Health Check',
        { maxAttempts: 1, timeoutMs: 5000 }
      );

      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const aiErrorHandler = new AIErrorHandler();

// Convenience functions
export const executeAIOperation = aiErrorHandler.executeWithRetry.bind(aiErrorHandler);
export const getUserFriendlyAIError = AIErrorHandler.getUserFriendlyMessage;
