import { PrismaClient } from '@prisma/client';
import { openAIService } from '@/lib/openai';
import { optimizedOpenAIService } from '@/lib/optimized-openai-service';

const prisma = new PrismaClient();

export interface DatabaseAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  userId?: string;
}

export class AIConfigLoader {
  private static instance: AIConfigLoader;
  private config: DatabaseAIConfig | null = null;
  private loaded = false;

  private constructor() {}

  public static getInstance(): AIConfigLoader {
    if (!AIConfigLoader.instance) {
      AIConfigLoader.instance = new AIConfigLoader();
    }
    return AIConfigLoader.instance;
  }

  /**
   * Load AI configuration from database with environment fallback
   */
  public async loadConfig(): Promise<DatabaseAIConfig | null> {
    if (this.loaded && this.config) {
      return this.config;
    }

    try {
      // Try to load from database first
      const dbConfig = await this.loadFromDatabase();
      if (dbConfig) {
        this.config = dbConfig;
        this.loaded = true;
        this.applyConfiguration(dbConfig);
        return dbConfig;
      }

      // Fallback to environment variables
      const envConfig = this.loadFromEnvironment();
      if (envConfig) {
        this.config = envConfig;
        this.loaded = true;
        this.applyConfiguration(envConfig);
        return envConfig;
      }

      return null;
    } catch (error) {
      console.error('Failed to load AI configuration:', error);

      // Emergency fallback to environment
      const envConfig = this.loadFromEnvironment();
      if (envConfig) {
        this.config = envConfig;
        this.applyConfiguration(envConfig);
        return envConfig;
      }

      return null;
    }
  }

  /**
   * Save configuration to database
   */
  public async saveConfig(config: DatabaseAIConfig, userId: string): Promise<boolean> {
    try {
      // Validate configuration
      if (!config.apiKey || !config.apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key');
      }

      if (!config.model || typeof config.model !== 'string') {
        throw new Error('Invalid model specified');
      }

      // Save to database
      await prisma.aIConfiguration.upsert({
        where: { key: 'openai_config' },
        update: {
          value: {
            apiKey: config.apiKey,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            enabled: config.enabled,
          },
          updatedBy: userId,
          updatedAt: new Date(),
        },
        create: {
          key: 'openai_config',
          value: {
            apiKey: config.apiKey,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            enabled: config.enabled,
          },
          description: 'OpenAI API Configuration',
          updatedBy: userId,
        },
      });

      // Update in-memory config
      this.config = { ...config, userId };
      this.applyConfiguration(config);

      return true;
    } catch (error) {
      console.error('❌ Failed to save AI configuration:', error);
      return false;
    }
  }

  /**
   * Test the current configuration
   */
  public async testConfiguration(testConfig?: Partial<DatabaseAIConfig>): Promise<{
    success: boolean;
    error?: string;
    model?: string;
  }> {
    const configToTest = testConfig
      ? ({ ...this.config, ...testConfig } as DatabaseAIConfig)
      : this.config;

    if (!configToTest) {
      return { success: false, error: 'No configuration available' };
    }

    try {
      // Temporarily configure the service for testing
      const tempConfig = {
        apiKey: configToTest.apiKey,
        model: configToTest.model,
        maxTokens: 10, // Minimal for testing
        temperature: configToTest.temperature,
        enabled: true,
      };

      openAIService.configure(tempConfig);

      const result = await openAIService.testConnection();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Test failed' };
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): DatabaseAIConfig | null {
    return this.config;
  }

  /**
   * Check if AI is configured
   */
  public isConfigured(): boolean {
    return !!(this.config?.apiKey && this.config.enabled);
  }

  /**
   * Force reload configuration
   */
  public async reloadConfig(): Promise<DatabaseAIConfig | null> {
    this.loaded = false;
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(): Promise<DatabaseAIConfig | null> {
    try {
      const dbConfig = await prisma.aIConfiguration.findUnique({
        where: { key: 'openai_config' },
        include: { updatedUser: { select: { id: true, name: true } } },
      });

      if (!dbConfig || !dbConfig.isActive) {
        return null;
      }

      const configValue = dbConfig.value as any;

      if (!configValue.apiKey || !configValue.model) {
        console.warn('⚠️ Incomplete AI configuration in database');
        return null;
      }

      return {
        apiKey: configValue.apiKey,
        model: configValue.model,
        maxTokens: configValue.maxTokens || 500,
        temperature: configValue.temperature || 0.7,
        enabled: configValue.enabled !== false,
        userId: dbConfig.updatedBy,
      };
    } catch (error) {
      console.error('Failed to load config from database:', error);
      return null;
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): DatabaseAIConfig | null {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      return null;
    }

    return {
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      enabled: process.env.OPENAI_ENABLED !== 'false',
    };
  }

  /**
   * Apply configuration to AI services
   */
  private applyConfiguration(config: DatabaseAIConfig): void {
    try {
      // Configure both services
      openAIService.configure({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        enabled: config.enabled,
      });

      optimizedOpenAIService.configure({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        enabled: config.enabled,
        cacheTTL: 3600000, // 1 hour
      });

    } catch (error) {
      console.error('Failed to apply AI configuration:', error);
    }
  }
}

// Singleton instance
export const aiConfigLoader = AIConfigLoader.getInstance();

// Initialize configuration on module load
aiConfigLoader.loadConfig().catch((error) => {
  console.error('Failed to initialize AI configuration:', error);
});

export default aiConfigLoader;
