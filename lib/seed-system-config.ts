import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default System Configuration Seed Data
 *
 * This defines all the default business rules and system settings that were previously hardcoded.
 * Categories:
 * - scoring: Issue priority and validation scoring thresholds
 * - ai: AI service configuration and fallbacks
 * - performance: System performance and timing settings
 * - ux: User experience timing and interaction settings
 */

export const DEFAULT_SYSTEM_CONFIGURATIONS = [
  // ================================
  // SCORING CONFIGURATION
  // ================================
  {
    category: 'scoring',
    key: 'issue_priority_thresholds',
    value: {
      critical: 80,
      high: 60,
      medium: 40,
      low: 0,
    },
    dataType: 'json',
    description: 'Score thresholds for issue priority classification (Critical/High/Medium/Low)',
    environment: 'all',
    scope: 'global',
    tags: ['business-logic', 'user-facing', 'critical'],
    validation: {
      type: 'object',
      properties: {
        critical: { type: 'number', minimum: 60, maximum: 100 },
        high: { type: 'number', minimum: 40, maximum: 99 },
        medium: { type: 'number', minimum: 20, maximum: 79 },
        low: { type: 'number', minimum: 0, maximum: 59 },
      },
      required: ['critical', 'high', 'medium', 'low'],
    },
    constraints: {
      businessRules: [
        'critical > high > medium > low',
        'all values between 0-100',
        'minimum 10 point spread between levels',
      ],
    },
  },
  {
    category: 'scoring',
    key: 'validation_score_thresholds',
    value: {
      excellent: 80,
      good: 60,
      needsImprovement: 40,
      poor: 0,
    },
    dataType: 'json',
    description: 'Score thresholds for form validation quality assessment',
    environment: 'all',
    scope: 'global',
    tags: ['validation', 'form-quality', 'ux'],
    validation: {
      type: 'object',
      properties: {
        excellent: { type: 'number', minimum: 60, maximum: 100 },
        good: { type: 'number', minimum: 40, maximum: 99 },
        needsImprovement: { type: 'number', minimum: 20, maximum: 79 },
        poor: { type: 'number', minimum: 0, maximum: 59 },
      },
    },
  },
  {
    category: 'scoring',
    key: 'heatmap_color_mapping',
    value: {
      critical: { color: 'bg-red-500', textColor: 'text-white' },
      high: { color: 'bg-orange-500', textColor: 'text-white' },
      medium: { color: 'bg-yellow-500', textColor: 'text-black' },
      low: { color: 'bg-green-500', textColor: 'text-white' },
    },
    dataType: 'json',
    description: 'Color mappings for issue priority visualization',
    environment: 'all',
    scope: 'global',
    tags: ['ui', 'colors', 'visualization'],
  },

  // ================================
  // AI CONFIGURATION
  // ================================
  {
    category: 'ai',
    key: 'fallback_model',
    value: 'gpt-3.5-turbo',
    dataType: 'string',
    description: 'Default AI model to use when primary configuration is unavailable',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'fallback', 'reliability'],
    validation: {
      type: 'string',
      enum: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4', 'gpt-4-turbo-preview'],
    },
  },
  {
    category: 'ai',
    key: 'token_limits',
    value: {
      categorization: 800,
      analysis: 1500,
      summary: 500,
      default: 500,
    },
    dataType: 'json',
    description: 'Token limits for different types of AI operations',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'performance', 'limits'],
    validation: {
      type: 'object',
      properties: {
        categorization: { type: 'number', minimum: 100, maximum: 4000 },
        analysis: { type: 'number', minimum: 500, maximum: 8000 },
        summary: { type: 'number', minimum: 100, maximum: 2000 },
        default: { type: 'number', minimum: 100, maximum: 1000 },
      },
    },
  },
  {
    category: 'ai',
    key: 'confidence_thresholds',
    value: {
      high: 85,
      medium: 70,
      low: 50,
      minimum: 30,
    },
    dataType: 'json',
    description: 'Confidence score thresholds for AI-generated content',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'confidence', 'quality'],
    validation: {
      type: 'object',
      properties: {
        high: { type: 'number', minimum: 70, maximum: 100 },
        medium: { type: 'number', minimum: 50, maximum: 89 },
        low: { type: 'number', minimum: 30, maximum: 69 },
        minimum: { type: 'number', minimum: 0, maximum: 49 },
      },
    },
  },

  // ================================
  // AI ADVANCED CONFIGURATION
  // ================================
  {
    category: 'ai',
    key: 'model_specific_configs',
    value: {
      'gpt-3.5-turbo': {
        maxTokens: 4096,
        costPer1kInput: 0.0015,
        costPer1kOutput: 0.002,
        contextWindow: 4096,
        preferredFor: ['summaries', 'categorization', 'quick_analysis'],
      },
      'gpt-4': {
        maxTokens: 8192,
        costPer1kInput: 0.03,
        costPer1kOutput: 0.06,
        contextWindow: 8192,
        preferredFor: ['complex_analysis', 'strategic_insights', 'requirements'],
      },
      'gpt-4-turbo': {
        maxTokens: 4096,
        costPer1kInput: 0.01,
        costPer1kOutput: 0.03,
        contextWindow: 128000,
        preferredFor: ['detailed_analysis', 'clustering', 'comprehensive_summaries'],
      },
    },
    dataType: 'json',
    description: 'Model-specific configuration including costs, limits, and use cases',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'models', 'costs', 'optimization'],
    validation: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          maxTokens: { type: 'number', minimum: 100, maximum: 32000 },
          costPer1kInput: { type: 'number', minimum: 0 },
          costPer1kOutput: { type: 'number', minimum: 0 },
          contextWindow: { type: 'number', minimum: 1000 },
          preferredFor: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    category: 'ai',
    key: 'operation_defaults',
    value: {
      issue_analysis: {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
      },
      cluster_analysis: {
        model: 'gpt-4-turbo',
        maxTokens: 700,
        temperature: 0.7,
      },
      categorization: {
        model: 'gpt-3.5-turbo',
        maxTokens: 800,
        temperature: 0.3,
      },
      initiative_generation: {
        model: 'gpt-4',
        maxTokens: 1500,
        temperature: 0.3,
      },
      requirement_cards: {
        model: 'gpt-4',
        maxTokens: 500,
        temperature: 0.3,
      },
    },
    dataType: 'json',
    description: 'Default AI configuration for different operation types',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'operations', 'defaults'],
    validation: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          maxTokens: { type: 'number', minimum: 100, maximum: 8000 },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
        },
        required: ['model', 'maxTokens', 'temperature'],
      },
    },
  },
  {
    category: 'ai',
    key: 'service_health_monitoring',
    value: {
      healthCheckInterval: 300000, // 5 minutes
      maxRetries: 3,
      retryBackoffMultiplier: 2,
      connectionTimeoutMs: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 60000,
      enableMetricsCollection: true,
      enableCostTracking: true,
    },
    dataType: 'json',
    description: 'AI service health monitoring and reliability configuration',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'monitoring', 'reliability', 'health'],
    validation: {
      type: 'object',
      properties: {
        healthCheckInterval: { type: 'number', minimum: 60000, maximum: 3600000 },
        maxRetries: { type: 'number', minimum: 1, maximum: 10 },
        retryBackoffMultiplier: { type: 'number', minimum: 1, maximum: 5 },
        connectionTimeoutMs: { type: 'number', minimum: 5000, maximum: 120000 },
        circuitBreakerThreshold: { type: 'number', minimum: 3, maximum: 20 },
        circuitBreakerResetTimeout: { type: 'number', minimum: 30000, maximum: 300000 },
        enableMetricsCollection: { type: 'boolean' },
        enableCostTracking: { type: 'boolean' },
      },
    },
  },
  {
    category: 'ai',
    key: 'ab_testing_configs',
    value: {
      enableABTesting: false,
      testGroups: {
        control: {
          percentage: 50,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
        },
        experimental: {
          percentage: 50,
          model: 'gpt-4-turbo',
          temperature: 0.5,
        },
      },
      testDurationDays: 7,
      minimumSampleSize: 100,
      statisticalSignificanceThreshold: 0.95,
    },
    dataType: 'json',
    description: 'A/B testing configuration for AI parameter optimization',
    environment: 'all',
    scope: 'global',
    tags: ['ai', 'ab-testing', 'optimization', 'experimentation'],
    validation: {
      type: 'object',
      properties: {
        enableABTesting: { type: 'boolean' },
        testGroups: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              percentage: { type: 'number', minimum: 0, maximum: 100 },
              model: { type: 'string' },
              temperature: { type: 'number', minimum: 0, maximum: 2 },
            },
          },
        },
        testDurationDays: { type: 'number', minimum: 1, maximum: 30 },
        minimumSampleSize: { type: 'number', minimum: 10, maximum: 10000 },
        statisticalSignificanceThreshold: { type: 'number', minimum: 0.8, maximum: 0.99 },
      },
    },
  },

  // ================================
  // PERFORMANCE CONFIGURATION
  // ================================
  {
    category: 'performance',
    key: 'timeout_values',
    value: {
      aiRequest: 30000, // 30 seconds
      apiRequest: 10000, // 10 seconds
      databaseQuery: 5000, // 5 seconds
      fileUpload: 60000, // 60 seconds
    },
    dataType: 'json',
    description: 'Timeout values in milliseconds for various operations',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'timeout', 'reliability'],
    validation: {
      type: 'object',
      properties: {
        aiRequest: { type: 'number', minimum: 5000, maximum: 120000 },
        apiRequest: { type: 'number', minimum: 1000, maximum: 30000 },
        databaseQuery: { type: 'number', minimum: 1000, maximum: 15000 },
        fileUpload: { type: 'number', minimum: 10000, maximum: 300000 },
      },
    },
  },
  {
    category: 'performance',
    key: 'cache_settings',
    value: {
      configurationTTL: 300, // 5 minutes
      aiResponseTTL: 3600, // 1 hour
      userDataTTL: 1800, // 30 minutes
      staticDataTTL: 86400, // 24 hours
    },
    dataType: 'json',
    description: 'Cache time-to-live values in seconds',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'caching', 'memory'],
    validation: {
      type: 'object',
      properties: {
        configurationTTL: { type: 'number', minimum: 60, maximum: 3600 },
        aiResponseTTL: { type: 'number', minimum: 300, maximum: 86400 },
        userDataTTL: { type: 'number', minimum: 300, maximum: 7200 },
        staticDataTTL: { type: 'number', minimum: 3600, maximum: 604800 },
      },
    },
  },
  {
    category: 'performance',
    key: 'rate_limiting',
    value: {
      aiRequests: { perMinute: 30, perHour: 500 },
      apiRequests: { perMinute: 100, perHour: 2000 },
      fileUploads: { perMinute: 10, perHour: 50 },
    },
    dataType: 'json',
    description: 'Rate limiting thresholds for various operations',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'rate-limiting', 'security'],
  },

  // ================================
  // UX CONFIGURATION
  // ================================
  {
    category: 'ux',
    key: 'interaction_timing',
    value: {
      debounceDelay: 1000, // 1 second for AI suggestions
      navigationDelay: 1500, // 1.5 seconds for redirects
      feedbackDelay: 3000, // 3 seconds for success messages
      tooltipDelay: 500, // 0.5 seconds for tooltips
    },
    dataType: 'json',
    description: 'Timing values in milliseconds for user interactions',
    environment: 'all',
    scope: 'global',
    tags: ['ux', 'timing', 'interaction'],
    validation: {
      type: 'object',
      properties: {
        debounceDelay: { type: 'number', minimum: 300, maximum: 3000 },
        navigationDelay: { type: 'number', minimum: 500, maximum: 5000 },
        feedbackDelay: { type: 'number', minimum: 1000, maximum: 10000 },
        tooltipDelay: { type: 'number', minimum: 100, maximum: 2000 },
      },
    },
  },
  {
    category: 'ux',
    key: 'form_validation',
    value: {
      minimumDescriptionLength: 20,
      maximumDescriptionLength: 500,
      requiredFieldsForAI: 3,
      confidenceDisplayThreshold: 50,
    },
    dataType: 'json',
    description: 'Form validation rules and thresholds',
    environment: 'all',
    scope: 'global',
    tags: ['ux', 'validation', 'forms'],
    validation: {
      type: 'object',
      properties: {
        minimumDescriptionLength: { type: 'number', minimum: 10, maximum: 100 },
        maximumDescriptionLength: { type: 'number', minimum: 200, maximum: 2000 },
        requiredFieldsForAI: { type: 'number', minimum: 1, maximum: 10 },
        confidenceDisplayThreshold: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
  },

  // ================================
  // DEVELOPMENT CONFIGURATION
  // ================================
  {
    category: 'development',
    key: 'debug_settings',
    value: {
      enableVerboseLogging: false,
      logAIInteractions: true,
      trackPerformanceMetrics: true,
      enableConfigurationChangeLogs: true,
    },
    dataType: 'json',
    description: 'Development and debugging configuration settings',
    environment: 'development',
    scope: 'global',
    tags: ['development', 'debugging', 'logging'],
  },

  // Performance Configuration Settings
  {
    category: 'performance',
    key: 'api_response_thresholds',
    value: {
      warning: 500, // milliseconds - log warning if response takes longer
      critical: 2000, // milliseconds - log error if response takes longer
      timeout: 30000, // milliseconds - hard timeout for API requests
      healthCheck: 100, // milliseconds - health check endpoint threshold
    },
    dataType: 'json',
    description: 'API response time monitoring thresholds',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'monitoring', 'api'],
    validation: {
      type: 'object',
      properties: {
        warning: { type: 'number', minimum: 100, maximum: 5000 },
        critical: { type: 'number', minimum: 500, maximum: 10000 },
        timeout: { type: 'number', minimum: 5000, maximum: 60000 },
        healthCheck: { type: 'number', minimum: 50, maximum: 1000 },
      },
      required: ['warning', 'critical', 'timeout', 'healthCheck'],
    },
  },
  {
    category: 'performance',
    key: 'database_configuration',
    value: {
      queryTimeout: 10000, // milliseconds - default query timeout
      connectionPoolMin: 2, // minimum connections in pool
      connectionPoolMax: 10, // maximum connections in pool
      slowQueryThreshold: 1000, // milliseconds - log slow queries
      retryAttempts: 3, // number of retry attempts for failed queries
      retryDelay: 1000, // milliseconds - delay between retries
    },
    dataType: 'json',
    description: 'Database performance and connection configuration',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'database', 'connection-pool'],
    validation: {
      type: 'object',
      properties: {
        queryTimeout: { type: 'number', minimum: 1000, maximum: 30000 },
        connectionPoolMin: { type: 'number', minimum: 1, maximum: 10 },
        connectionPoolMax: { type: 'number', minimum: 5, maximum: 50 },
        slowQueryThreshold: { type: 'number', minimum: 100, maximum: 5000 },
        retryAttempts: { type: 'number', minimum: 1, maximum: 5 },
        retryDelay: { type: 'number', minimum: 100, maximum: 5000 },
      },
      required: ['queryTimeout', 'connectionPoolMin', 'connectionPoolMax', 'slowQueryThreshold'],
    },
  },
  {
    category: 'performance',
    key: 'caching_strategy',
    value: {
      defaultTTL: 300, // seconds - default cache TTL
      systemConfigTTL: 3600, // seconds - system config cache TTL
      aiResponseTTL: 1800, // seconds - AI response cache TTL
      userSessionTTL: 86400, // seconds - user session cache TTL
      maxCacheSize: 1000, // number of items - maximum cache entries
      evictionPolicy: 'LRU', // cache eviction policy
      enableCompression: true, // compress cached data
      cacheWarming: true, // enable cache warming on startup
    },
    dataType: 'json',
    description: 'Caching strategy and TTL configuration',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'caching', 'ttl'],
    validation: {
      type: 'object',
      properties: {
        defaultTTL: { type: 'number', minimum: 60, maximum: 86400 },
        systemConfigTTL: { type: 'number', minimum: 300, maximum: 86400 },
        aiResponseTTL: { type: 'number', minimum: 300, maximum: 7200 },
        userSessionTTL: { type: 'number', minimum: 3600, maximum: 604800 },
        maxCacheSize: { type: 'number', minimum: 100, maximum: 10000 },
        evictionPolicy: { type: 'string', enum: ['LRU', 'LFU', 'FIFO'] },
        enableCompression: { type: 'boolean' },
        cacheWarming: { type: 'boolean' },
      },
      required: ['defaultTTL', 'systemConfigTTL', 'aiResponseTTL', 'maxCacheSize'],
    },
  },
  {
    category: 'performance',
    key: 'rate_limiting',
    value: {
      apiCallsPerMinute: 100, // requests per minute per user
      apiCallsPerHour: 1000, // requests per hour per user
      aiBurstLimit: 5, // concurrent AI requests per user
      aiCooldownPeriod: 60000, // milliseconds - cooldown after burst limit
      adminRateMultiplier: 5, // admin users get 5x the limits
      enableRateLimiting: true, // global rate limiting toggle
      blockDuration: 300000, // milliseconds - how long to block after limit exceeded
    },
    dataType: 'json',
    description: 'API rate limiting and throttling configuration',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'rate-limiting', 'throttling'],
    validation: {
      type: 'object',
      properties: {
        apiCallsPerMinute: { type: 'number', minimum: 10, maximum: 1000 },
        apiCallsPerHour: { type: 'number', minimum: 100, maximum: 10000 },
        aiBurstLimit: { type: 'number', minimum: 1, maximum: 20 },
        aiCooldownPeriod: { type: 'number', minimum: 30000, maximum: 300000 },
        adminRateMultiplier: { type: 'number', minimum: 2, maximum: 10 },
        enableRateLimiting: { type: 'boolean' },
        blockDuration: { type: 'number', minimum: 60000, maximum: 3600000 },
      },
      required: ['apiCallsPerMinute', 'apiCallsPerHour', 'aiBurstLimit', 'enableRateLimiting'],
    },
  },
  {
    category: 'performance',
    key: 'memory_management',
    value: {
      heapWarningThreshold: 80, // percentage - warn when heap usage exceeds
      heapCriticalThreshold: 90, // percentage - critical when heap usage exceeds
      garbageCollectionTrigger: 85, // percentage - trigger GC when heap usage exceeds
      maxRequestSize: 10485760, // bytes - 10MB max request body size
      maxResponseSize: 52428800, // bytes - 50MB max response size
      enableMemoryProfiling: false, // enable memory profiling in development
    },
    dataType: 'json',
    description: 'Memory usage monitoring and management configuration',
    environment: 'all',
    scope: 'global',
    tags: ['performance', 'memory', 'monitoring'],
    validation: {
      type: 'object',
      properties: {
        heapWarningThreshold: { type: 'number', minimum: 50, maximum: 95 },
        heapCriticalThreshold: { type: 'number', minimum: 70, maximum: 98 },
        garbageCollectionTrigger: { type: 'number', minimum: 60, maximum: 95 },
        maxRequestSize: { type: 'number', minimum: 1048576, maximum: 104857600 },
        maxResponseSize: { type: 'number', minimum: 1048576, maximum: 104857600 },
        enableMemoryProfiling: { type: 'boolean' },
      },
      required: ['heapWarningThreshold', 'heapCriticalThreshold', 'maxRequestSize'],
    },
  },
];

/**
 * Seed default system configurations
 */
export async function seedSystemConfiguration(adminUserId?: string) {

  let seedCount = 0;
  let updateCount = 0;

  for (const config of DEFAULT_SYSTEM_CONFIGURATIONS) {
    try {
      const existing = await prisma.systemConfiguration.findUnique({
        where: {
          category_key_environment_scope: {
            category: config.category,
            key: config.key,
            environment: config.environment,
            scope: config.scope,
          },
        },
      });

      if (existing) {
        // Update existing configuration but preserve version and user changes
        await prisma.systemConfiguration.update({
          where: { id: existing.id },
          data: {
            description: config.description,
            validation: config.validation,
            constraints: config.constraints,
            tags: config.tags,
            // Don't overwrite value - respect existing customizations
            updatedBy: adminUserId,
          },
        });
        updateCount++;

      } else {
        // Create new configuration
        await prisma.systemConfiguration.create({
          data: {
            ...config,
            updatedBy: adminUserId,
          },
        });
        seedCount++;

      }
    } catch (error) {
      console.error(`  ❌ Failed to seed ${config.category}.${config.key}:`, error);
    }
  }




  return {
    created: seedCount,
    updated: updateCount,
    total: DEFAULT_SYSTEM_CONFIGURATIONS.length,
  };
}

export default seedSystemConfiguration;
