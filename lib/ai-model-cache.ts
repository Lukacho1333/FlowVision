/**
 * AI Model Caching Service
 * BUSINESS CRITICAL: Enterprise-scale performance infrastructure for client AI models
 * 
 * Implements Redis-based caching for client-specific AI learning models
 * Supports memory management, versioning, and monitoring
 */

import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';

interface CachedModel {
  organizationId: string;
  version: string;
  modelData: any;
  lastTraining: Date;
  confidence: number;
  loadedAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

interface ModelMetrics {
  loadTime: number;
  accessCount: number;
  hitRate: number;
  memoryUsage: number;
}

class AIModelCacheService {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, CachedModel> = new Map();
  private maxMemoryModels = 50; // Maximum models to keep in memory
  private modelMetrics: Map<string, ModelMetrics> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Redis connection for production
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
        
        await this.redis.ping();
        logger.info('AI Model Cache: Redis connection established');
      } else {
        logger.warn('AI Model Cache: Redis not configured, using in-memory fallback');
      }
    } catch (error) {
      logger.error('AI Model Cache: Redis connection failed, using in-memory fallback', error);
      this.redis = null;
    }
  }

  /**
   * Get cached AI model for organization
   */
  async getModel(organizationId: string): Promise<CachedModel | null> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(organizationId);

    try {
      // Try in-memory cache first (fastest)
      if (this.inMemoryCache.has(cacheKey)) {
        const model = this.inMemoryCache.get(cacheKey)!;
        this.updateAccessMetrics(organizationId, Date.now() - startTime, true);
        
        // Update last accessed time
        model.lastAccessed = new Date();
        model.accessCount++;
        
        logger.debug(`AI Model Cache: Memory hit for ${organizationId}`);
        return model;
      }

      // Try Redis cache
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const model = JSON.parse(cached) as CachedModel;
          
          // Load into memory cache if space available
          if (this.inMemoryCache.size < this.maxMemoryModels) {
            this.inMemoryCache.set(cacheKey, model);
          }
          
          this.updateAccessMetrics(organizationId, Date.now() - startTime, true);
          logger.debug(`AI Model Cache: Redis hit for ${organizationId}`);
          return model;
        }
      }

      // Cache miss
      this.updateAccessMetrics(organizationId, Date.now() - startTime, false);
      logger.debug(`AI Model Cache: Miss for ${organizationId}`);
      return null;
      
    } catch (error) {
      logger.error(`AI Model Cache: Error retrieving model for ${organizationId}`, error);
      return null;
    }
  }

  /**
   * Cache AI model with automatic memory management
   */
  async setModel(organizationId: string, modelData: any, version: string): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId);
    const model: CachedModel = {
      organizationId,
      version,
      modelData,
      lastTraining: new Date(),
      confidence: modelData.confidence || 0.5,
      loadedAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date()
    };

    try {
      // Store in Redis with TTL (24 hours)
      if (this.redis) {
        await this.redis.setex(cacheKey, 86400, JSON.stringify(model));
      }

      // Memory management: Remove oldest models if at capacity
      if (this.inMemoryCache.size >= this.maxMemoryModels) {
        this.evictOldestModel();
      }

      // Store in memory cache
      this.inMemoryCache.set(cacheKey, model);
      
      logger.info(`AI Model Cache: Cached model for ${organizationId} (version: ${version})`);
      
    } catch (error) {
      logger.error(`AI Model Cache: Error caching model for ${organizationId}`, error);
    }
  }

  /**
   * Remove model from cache (for versioning/rollback)
   */
  async invalidateModel(organizationId: string): Promise<void> {
    const cacheKey = this.getCacheKey(organizationId);

    try {
      // Remove from Redis
      if (this.redis) {
        await this.redis.del(cacheKey);
      }

      // Remove from memory
      this.inMemoryCache.delete(cacheKey);
      
      logger.info(`AI Model Cache: Invalidated model for ${organizationId}`);
      
    } catch (error) {
      logger.error(`AI Model Cache: Error invalidating model for ${organizationId}`, error);
    }
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): { [organizationId: string]: ModelMetrics } {
    const metrics: { [organizationId: string]: ModelMetrics } = {};
    
    for (const [orgId, metric] of this.modelMetrics.entries()) {
      metrics[orgId] = {
        ...metric,
        memoryUsage: this.calculateMemoryUsage(orgId)
      };
    }
    
    return metrics;
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    redis: boolean;
    memoryModels: number;
    maxMemoryModels: number;
    redisConnected: boolean;
  }> {
    let redisConnected = false;
    
    if (this.redis) {
      try {
        await this.redis.ping();
        redisConnected = true;
      } catch {
        redisConnected = false;
      }
    }

    return {
      redis: !!this.redis,
      memoryModels: this.inMemoryCache.size,
      maxMemoryModels: this.maxMemoryModels,
      redisConnected
    };
  }

  /**
   * Private helper methods
   */
  private getCacheKey(organizationId: string): string {
    return `ai-model:${organizationId}`;
  }

  private updateAccessMetrics(organizationId: string, loadTime: number, hit: boolean): void {
    const existing = this.modelMetrics.get(organizationId) || {
      loadTime: 0,
      accessCount: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    existing.loadTime = (existing.loadTime + loadTime) / 2; // Running average
    existing.accessCount++;
    
    if (hit) {
      existing.hitRate = (existing.hitRate * (existing.accessCount - 1) + 1) / existing.accessCount;
    } else {
      existing.hitRate = (existing.hitRate * (existing.accessCount - 1)) / existing.accessCount;
    }

    this.modelMetrics.set(organizationId, existing);
  }

  private evictOldestModel(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, model] of this.inMemoryCache.entries()) {
      if (model.lastAccessed.getTime() < oldestTime) {
        oldestTime = model.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.inMemoryCache.delete(oldestKey);
      logger.debug(`AI Model Cache: Evicted oldest model ${oldestKey}`);
    }
  }

  private calculateMemoryUsage(organizationId: string): number {
    const cacheKey = this.getCacheKey(organizationId);
    const model = this.inMemoryCache.get(cacheKey);
    
    if (!model) return 0;
    
    // Rough estimation of memory usage in bytes
    return JSON.stringify(model).length * 2; // UTF-16 encoding
  }

  /**
   * Background cleanup job
   */
  async performMaintenance(): Promise<void> {
    try {
      // Clean up old metrics
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      
      for (const [key, model] of this.inMemoryCache.entries()) {
        if (model.lastAccessed.getTime() < cutoffTime) {
          this.inMemoryCache.delete(key);
        }
      }

      logger.info('AI Model Cache: Maintenance completed');
      
    } catch (error) {
      logger.error('AI Model Cache: Maintenance error', error);
    }
  }
}

// Singleton instance
export const aiModelCache = new AIModelCacheService();

// Health check endpoint helper
export async function getAIModelCacheHealth() {
  return await aiModelCache.getHealthStatus();
}

// Metrics endpoint helper
export function getAIModelCacheMetrics() {
  return aiModelCache.getMetrics();
}
