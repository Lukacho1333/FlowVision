import { z } from 'zod';
import { prisma } from './prisma';
import { systemConfig } from './system-config';

// Validation Result Interface
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

// Configuration Schemas for Validation
const APIResponseThresholdsSchema = z
  .object({
    warning: z.number().min(100).max(5000),
    critical: z.number().min(500).max(10000),
    timeout: z.number().min(5000).max(60000),
    healthCheck: z.number().min(50).max(1000),
  })
  .refine((data) => data.critical > data.warning, {
    message: 'Critical threshold must be greater than warning threshold',
    path: ['critical'],
  });

const DatabaseConfigurationSchema = z
  .object({
    queryTimeout: z.number().min(1000).max(30000),
    connectionPoolMin: z.number().min(1).max(10),
    connectionPoolMax: z.number().min(5).max(50),
    slowQueryThreshold: z.number().min(100).max(5000),
    retryAttempts: z.number().min(1).max(5),
    retryDelay: z.number().min(100).max(5000),
  })
  .refine((data) => data.connectionPoolMax > data.connectionPoolMin, {
    message: 'Max pool connections must be greater than min pool connections',
    path: ['connectionPoolMax'],
  });

const CachingStrategySchema = z.object({
  defaultTTL: z.number().min(60).max(86400),
  systemConfigTTL: z.number().min(300).max(86400),
  aiResponseTTL: z.number().min(300).max(7200),
  userSessionTTL: z.number().min(3600).max(604800),
  maxCacheSize: z.number().min(100).max(10000),
  evictionPolicy: z.enum(['LRU', 'LFU', 'FIFO']),
  enableCompression: z.boolean(),
  cacheWarming: z.boolean(),
});

const RateLimitingSchema = z
  .object({
    apiCallsPerMinute: z.number().min(10).max(1000),
    apiCallsPerHour: z.number().min(100).max(10000),
    aiBurstLimit: z.number().min(1).max(20),
    aiCooldownPeriod: z.number().min(30000).max(300000),
    adminRateMultiplier: z.number().min(2).max(10),
    enableRateLimiting: z.boolean(),
    blockDuration: z.number().min(60000).max(3600000),
  })
  .refine((data) => data.apiCallsPerHour / 60 >= data.apiCallsPerMinute, {
    message: 'Hourly limit should be at least 60x the per-minute limit',
    path: ['apiCallsPerHour'],
  });

const MemoryManagementSchema = z
  .object({
    heapWarningThreshold: z.number().min(50).max(95),
    heapCriticalThreshold: z.number().min(70).max(98),
    garbageCollectionTrigger: z.number().min(60).max(95),
    maxRequestSize: z.number().min(1048576).max(104857600),
    maxResponseSize: z.number().min(1048576).max(104857600),
    enableMemoryProfiling: z.boolean(),
  })
  .refine((data) => data.heapCriticalThreshold > data.heapWarningThreshold, {
    message: 'Critical threshold must be greater than warning threshold',
    path: ['heapCriticalThreshold'],
  })
  .refine((data) => data.garbageCollectionTrigger >= data.heapWarningThreshold, {
    message: 'GC trigger should be at or above warning threshold',
    path: ['garbageCollectionTrigger'],
  });

const ScoringThresholdsSchema = z
  .object({
    critical: z.number().min(70).max(100),
    high: z.number().min(50).max(90),
    medium: z.number().min(30).max(70),
    low: z.number().min(0).max(50),
  })
  .refine(
    (data) => data.critical > data.high && data.high > data.medium && data.medium > data.low,
    {
      message: 'Thresholds must be in descending order: critical > high > medium > low',
      path: ['critical'],
    }
  );

// Schema mapping by category and key
const VALIDATION_SCHEMAS = {
  performance: {
    api_response_thresholds: APIResponseThresholdsSchema,
    database_configuration: DatabaseConfigurationSchema,
    caching_strategy: CachingStrategySchema,
    rate_limiting: RateLimitingSchema,
    memory_management: MemoryManagementSchema,
  },
  scoring: {
    issue_thresholds: ScoringThresholdsSchema,
    validation_thresholds: z.object({
      excellent: z.number().min(70).max(100),
      good: z.number().min(50).max(90),
      needsImprovement: z.number().min(0).max(70),
    }),
  },
  ai: {
    model_specific_configs: z.record(
      z.object({
        maxTokens: z.number().min(100).max(32000),
        costPer1kInput: z.number().min(0),
        costPer1kOutput: z.number().min(0),
        contextWindow: z.number().min(1000),
        preferredFor: z.array(z.string()),
      })
    ),
    operation_defaults: z.record(
      z.object({
        model: z.string().min(1),
        maxTokens: z.number().min(100).max(8000),
        temperature: z.number().min(0).max(2),
      })
    ),
  },
};

/**
 * Configuration Validator Service
 * Provides comprehensive validation, business rule checking, and change auditing
 */
export class ConfigurationValidator {
  /**
   * Validate a configuration value against its schema and business rules
   */
  static async validateConfiguration(
    category: string,
    key: string,
    value: any,
    existingConfig?: any
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      // Schema validation
      const categorySchemas = VALIDATION_SCHEMAS[category as keyof typeof VALIDATION_SCHEMAS];
      const schema = categorySchemas && key in categorySchemas ? (categorySchemas as any)[key] : undefined;
      if (schema) {
        const schemaResult = schema.safeParse(value);
        if (!schemaResult.success) {
          result.valid = false;
          schemaResult.error.errors.forEach((error: any) => {
            result.errors.push({
              field: error.path.join('.'),
              message: error.message,
              severity: 'error',
              code: error.code,
            });
          });
        }
      }

      // Business rule validation
      const businessRuleResult = await this.validateBusinessRules(
        category,
        key,
        value,
        existingConfig
      );
      result.warnings.push(...businessRuleResult.warnings);
      result.suggestions.push(...businessRuleResult.suggestions);

      // Performance impact analysis
      const performanceResult = await this.analyzePerformanceImpact(
        category,
        key,
        value,
        existingConfig
      );
      result.warnings.push(...performanceResult.warnings);
      result.suggestions.push(...performanceResult.suggestions);

      // Security validation
      const securityResult = await this.validateSecurity(category, key, value);
      if (!securityResult.valid) {
        result.valid = false;
        result.errors.push(...securityResult.errors);
      }
      result.warnings.push(...securityResult.warnings);
    } catch (error) {
      result.valid = false;
      result.errors.push({
        field: 'general',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: 'VALIDATION_ERROR',
      });
    }

    return result;
  }

  /**
   * Validate business rules and cross-configuration dependencies
   */
  private static async validateBusinessRules(
    category: string,
    key: string,
    value: any,
    existingConfig?: any
  ): Promise<{ warnings: ValidationWarning[]; suggestions: string[] }> {
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    if (category === 'performance') {
      switch (key) {
        case 'api_response_thresholds':
          if (value.warning > 1000) {
            warnings.push({
              field: 'warning',
              message: 'Warning threshold above 1000ms may impact user experience',
              recommendation: 'Consider setting warning threshold below 1000ms for better UX',
            });
          }
          if (value.timeout < 10000) {
            suggestions.push('Consider increasing timeout for complex AI operations');
          }
          break;

        case 'database_configuration':
          if (value.connectionPoolMax > 20) {
            warnings.push({
              field: 'connectionPoolMax',
              message: 'High connection pool may impact database performance',
              recommendation: 'Monitor database performance with high connection counts',
            });
          }
          if (value.queryTimeout < 5000) {
            suggestions.push('Consider increasing query timeout for complex analytics queries');
          }
          break;

        case 'rate_limiting':
          if (!value.enableRateLimiting) {
            warnings.push({
              field: 'enableRateLimiting',
              message: 'Rate limiting is disabled - system may be vulnerable to abuse',
              recommendation: 'Enable rate limiting for production environments',
            });
          }
          if (value.apiCallsPerMinute > 500) {
            suggestions.push('High rate limits may impact system performance under load');
          }
          break;

        case 'memory_management':
          if (value.heapCriticalThreshold > 90) {
            warnings.push({
              field: 'heapCriticalThreshold',
              message: 'Very high critical threshold may cause system instability',
              recommendation: 'Keep critical threshold below 90% for system stability',
            });
          }
          if (value.enableMemoryProfiling && process.env.NODE_ENV === 'production') {
            warnings.push({
              field: 'enableMemoryProfiling',
              message: 'Memory profiling enabled in production environment',
              recommendation: 'Disable memory profiling in production for performance',
            });
          }
          break;
      }
    }

    if (category === 'ai' && key === 'operation_defaults') {
      Object.entries(value).forEach(([operation, config]: [string, any]) => {
        if (config.maxTokens > 4000 && operation !== 'initiative_generation') {
          suggestions.push(
            `Consider reducing maxTokens for ${operation} to improve response times`
          );
        }
        if (config.temperature > 0.8) {
          warnings.push({
            field: `${operation}.temperature`,
            message: 'High temperature may produce inconsistent results',
            recommendation: 'Consider using temperature below 0.8 for more predictable outputs',
          });
        }
      });
    }

    return { warnings, suggestions };
  }

  /**
   * Analyze performance impact of configuration changes
   */
  private static async analyzePerformanceImpact(
    category: string,
    key: string,
    newValue: any,
    existingValue?: any
  ): Promise<{ warnings: ValidationWarning[]; suggestions: string[] }> {
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    if (!existingValue) return { warnings, suggestions };

    if (category === 'performance') {
      switch (key) {
        case 'caching_strategy':
          if (newValue.defaultTTL < existingValue.defaultTTL) {
            warnings.push({
              field: 'defaultTTL',
              message: 'Reducing TTL will increase database load',
              recommendation: 'Monitor database performance after reducing cache TTL',
            });
          }
          if (newValue.maxCacheSize > existingValue.maxCacheSize * 2) {
            warnings.push({
              field: 'maxCacheSize',
              message: 'Significant cache size increase will impact memory usage',
              recommendation: 'Monitor memory usage after increasing cache size',
            });
          }
          break;

        case 'database_configuration':
          if (newValue.connectionPoolMax > existingValue.connectionPoolMax * 1.5) {
            warnings.push({
              field: 'connectionPoolMax',
              message: 'Significant increase in connection pool size',
              recommendation: 'Monitor database server resource usage',
            });
          }
          break;
      }
    }

    return { warnings, suggestions };
  }

  /**
   * Validate security implications of configuration changes
   */
  private static async validateSecurity(
    category: string,
    key: string,
    value: any
  ): Promise<{ valid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (category === 'performance' && key === 'rate_limiting') {
      if (value.apiCallsPerMinute > 1000) {
        warnings.push({
          field: 'apiCallsPerMinute',
          message: 'Very high rate limits may expose system to abuse',
          recommendation: 'Consider implementing additional security measures',
        });
      }

      if (value.adminRateMultiplier > 10) {
        warnings.push({
          field: 'adminRateMultiplier',
          message: 'Very high admin multiplier may be exploited if admin account is compromised',
          recommendation: 'Keep admin multiplier reasonable to limit potential abuse',
        });
      }
    }

    if (category === 'performance' && key === 'memory_management') {
      if (value.maxRequestSize > 50 * 1024 * 1024) {
        // 50MB
        warnings.push({
          field: 'maxRequestSize',
          message: 'Large request size limit may enable DoS attacks',
          recommendation: 'Consider implementing additional request validation',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Test configuration change in isolated environment
   */
  static async testConfiguration(
    category: string,
    key: string,
    value: any
  ): Promise<{ success: boolean; results: any; errors: string[] }> {
    const errors: string[] = [];
    const results: any = {};

    try {
      // Create test instance of configuration
      const testConfig = { ...value };

      // Run specific tests based on configuration type
      switch (category) {
        case 'performance':
          if (key === 'api_response_thresholds') {
            results.thresholdValidation = this.testAPIThresholds(testConfig);
          } else if (key === 'caching_strategy') {
            results.cacheValidation = this.testCachingStrategy(testConfig);
          } else if (key === 'rate_limiting') {
            results.rateLimitValidation = this.testRateLimiting(testConfig);
          }
          break;

        case 'ai':
          if (key === 'operation_defaults') {
            results.aiConfigValidation = this.testAIConfiguration(testConfig);
          }
          break;
      }

      return {
        success: errors.length === 0,
        results,
        errors,
      };
    } catch (error) {
      errors.push(
        `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        success: false,
        results: {},
        errors,
      };
    }
  }

  /**
   * Test API threshold configuration
   */
  private static testAPIThresholds(config: any): any {
    return {
      thresholdsOrdered: config.critical > config.warning,
      reasonableTimeouts: config.timeout <= 30000,
      healthCheckResponsive: config.healthCheck <= 200,
      configurationValid: true,
    };
  }

  /**
   * Test caching strategy configuration
   */
  private static testCachingStrategy(config: any): any {
    const estimatedMemoryUsage = config.maxCacheSize * 1024; // Rough estimate
    return {
      memoryUsageEstimate: `${(estimatedMemoryUsage / (1024 * 1024)).toFixed(1)}MB`,
      ttlConfiguration: config.defaultTTL > 0,
      evictionPolicyValid: ['LRU', 'LFU', 'FIFO'].includes(config.evictionPolicy),
      configurationValid: true,
    };
  }

  /**
   * Test rate limiting configuration
   */
  private static testRateLimiting(config: any): any {
    return {
      rateLimitsConsistent: config.apiCallsPerHour / 60 >= config.apiCallsPerMinute,
      burstLimitReasonable: config.aiBurstLimit <= 20,
      cooldownAdequate: config.aiCooldownPeriod >= 30000,
      configurationValid: true,
    };
  }

  /**
   * Test AI configuration
   */
  private static testAIConfiguration(config: any): any {
    const results: any = {
      configurationValid: true,
      operationTests: {},
    };

    Object.entries(config).forEach(([operation, operationConfig]: [string, any]) => {
      results.operationTests[operation] = {
        modelValid: typeof operationConfig.model === 'string' && operationConfig.model.length > 0,
        tokensReasonable: operationConfig.maxTokens >= 100 && operationConfig.maxTokens <= 8000,
        temperatureValid: operationConfig.temperature >= 0 && operationConfig.temperature <= 2,
      };
    });

    return results;
  }

  /**
   * Create configuration change audit entry
   */
  static async auditConfigurationChange(
    category: string,
    key: string,
    oldValue: any,
    newValue: any,
    userId: string,
    validationResult: ValidationResult
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SYSTEM_CONFIG_CHANGE',
          details: {
            category,
            key,
            oldValue,
            newValue,
            validation: {
              valid: validationResult.valid,
              errorsCount: validationResult.errors.length,
              warningsCount: validationResult.warnings.length,
              suggestionsCount: validationResult.suggestions.length,
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
    }
  }

  /**
   * Get configuration change history
   */
  static async getConfigurationHistory(
    category?: string,
    key?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const where: any = {
        action: 'SYSTEM_CONFIG_CHANGE',
      };

      if (category && key) {
        where.details = {
          path: ['category'],
          equals: category,
        };
      }

      return await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });
    } catch (error) {
      console.error('Failed to fetch configuration history:', error);
      return [];
    }
  }
}

export default ConfigurationValidator;
