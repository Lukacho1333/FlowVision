import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  uptime: number;
}

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxRetries = 5;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
        
        // Connection events
        connectTimeout: 10000,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
        this.handleConnectionError();
      });

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.client.connect();
      await this.client.ping();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.handleConnectionError();
    }
  }

  private handleConnectionError() {
    this.connectionAttempts++;
    
    if (this.connectionAttempts < this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
      console.log(`Retrying Redis connection in ${delay}ms (attempt ${this.connectionAttempts}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max Redis connection retries reached. Operating without cache.');
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const finalKey = this.buildKey(key, options.prefix);
      const serializedValue = options.serialize !== false ? JSON.stringify(value) : value;
      
      if (options.ttl) {
        await this.client!.setex(finalKey, options.ttl, serializedValue);
      } else {
        await this.client!.set(finalKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const finalKey = this.buildKey(key, options.prefix);
      const value = await this.client!.get(finalKey);
      
      if (value === null) return null;
      
      return options.serialize !== false ? JSON.parse(value) : value;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const finalKey = this.buildKey(key, options.prefix);
      const result = await this.client!.del(finalKey);
      return result > 0;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const finalKey = this.buildKey(key, options.prefix);
      const result = await this.client!.exists(finalKey);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const finalKey = this.buildKey(key, options.prefix);
      const result = await this.client!.expire(finalKey, ttl);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isAvailable()) return keys.map(() => null);

    try {
      const finalKeys = keys.map(key => this.buildKey(key, options.prefix));
      const values = await this.client!.mget(...finalKeys);
      
      return values.map(value => {
        if (value === null) return null;
        return options.serialize !== false ? JSON.parse(value) : value;
      });
    } catch (error) {
      console.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  async mset(entries: [string, any][], options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const pipeline = this.client!.pipeline();
      
      for (const [key, value] of entries) {
        const finalKey = this.buildKey(key, options.prefix);
        const serializedValue = options.serialize !== false ? JSON.stringify(value) : value;
        
        if (options.ttl) {
          pipeline.setex(finalKey, options.ttl, serializedValue);
        } else {
          pipeline.set(finalKey, serializedValue);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error);
      return false;
    }
  }

  async pattern(pattern: string, options: CacheOptions = {}): Promise<string[]> {
    if (!this.isAvailable()) return [];

    try {
      const finalPattern = this.buildKey(pattern, options.prefix);
      return await this.client!.keys(finalPattern);
    } catch (error) {
      console.error('Redis KEYS error:', error);
      return [];
    }
  }

  async flush(prefix?: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      if (prefix) {
        const keys = await this.pattern(`${prefix}*`);
        if (keys.length > 0) {
          await this.client!.del(...keys);
        }
      } else {
        await this.client!.flushdb();
      }
      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error);
      return false;
    }
  }

  async stats(): Promise<CacheStats | null> {
    if (!this.isAvailable()) return null;

    try {
      const info = await this.client!.info('stats');
      const memory = await this.client!.info('memory');
      const keyspace = await this.client!.info('keyspace');
      
      // Parse Redis info response
      const parseInfo = (infoString: string) => {
        const result: Record<string, any> = {};
        infoString.split('\r\n').forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            result[key] = isNaN(Number(value)) ? value : Number(value);
          }
        });
        return result;
      };

      const statsInfo = parseInfo(info);
      const memoryInfo = parseInfo(memory);
      const keyspaceInfo = parseInfo(keyspace);

      return {
        hits: statsInfo.keyspace_hits || 0,
        misses: statsInfo.keyspace_misses || 0,
        keys: Object.keys(keyspaceInfo).length,
        memory: memoryInfo.used_memory || 0,
        uptime: statsInfo.uptime_in_seconds || 0,
      };
    } catch (error) {
      console.error('Redis STATS error:', error);
      return null;
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const basePrefix = 'flowvision';
    const parts = [basePrefix];
    
    if (prefix) parts.push(prefix);
    parts.push(key);
    
    return parts.join(':');
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Cache decorators for common patterns
  async cacheOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetchFn();
    
    // Cache the result
    await this.set(key, fresh, options);
    
    return fresh;
  }

  async remember<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    return this.cacheOrFetch(key, fetchFn, { ...options, ttl });
  }
}

// Singleton instance
export const redis = new RedisService();

// Cache prefixes for different data types
export const CachePrefix = {
  AI_RESPONSE: 'ai:response',
  USER_SESSION: 'user:session',
  ISSUE_DATA: 'issue:data',
  INITIATIVE_DATA: 'initiative:data',
  CLUSTER_DATA: 'cluster:data',
  SYSTEM_CONFIG: 'system:config',
  RATE_LIMIT: 'rate:limit',
  ANALYTICS: 'analytics',
} as const;
