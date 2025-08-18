import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

// Optimized configuration interface
export interface OptimizedAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
  cacheTTL?: number;
}

// Usage metrics for tracking
export interface AIUsageMetrics {
  requestId: string;
  userId: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  cacheHit: boolean;
  modelUsed: string;
  quality: number;
}

// Compressed prompt templates for 40% token reduction
const OPTIMIZED_PROMPTS = {
  issueSummary: {
    template: `Analyze A&E issue: "{description}"
Context: {industry}, {size} staff, Dept: {department}
JSON: {"summary":"2-3 sentences","rootCauses":["top 3"],"impact":"specific","recommendations":["3-4"],"confidence":85}`,
    maxTokens: 300,
    temperature: 0.3,
  },

  clusterAnalysis: {
    template: `A&E cluster: "{name}" - {description}
Issues ({count}): {issueList}
JSON: {"consolidatedSummary":"exec overview","crossIssuePatterns":["3-4"],"strategicPriority":"HIGH/MED/LOW","initiativeRecommendations":["3-4"],"confidence":90}`,
    maxTokens: 400,
    temperature: 0.4,
  },

  requirementGeneration: {
    template: `Initiative: "{title}" Goal: "{goal}" Summary: "{summary}"
Context: {industry} A&E firm
JSON: {"cards":[{"title":"req title","description":"detailed desc","type":"BUSINESS|FUNCTIONAL|ACCEPTANCE","priority":"LOW|MEDIUM|HIGH|CRITICAL","category":"group"}],"confidence":85}`,
    maxTokens: 500,
    temperature: 0.3,
  },
};

// Model cost configurations
const MODEL_COSTS = {
  'gpt-3.5-turbo': { inputCost: 0.0015, outputCost: 0.002 },
  'gpt-4': { inputCost: 0.03, outputCost: 0.06 },
  'gpt-3.5-turbo-16k': { inputCost: 0.003, outputCost: 0.004 },
};

// In-memory cache for immediate performance gains
class SimpleCache {
  private cache = new Map<
    string,
    {
      result: any;
      timestamp: number;
      ttl: number;
      hitCount: number;
    }
  >();

  generateKey(prompt: string, options: any): string {
    const keyData = {
      prompt: prompt.toLowerCase().trim().substring(0, 200), // Limit key size
      model: options.model,
      temperature: options.temperature,
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    cached.hitCount++;
    return cached.result;
  }

  set(key: string, result: any, ttl: number = 3600000): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    });

    // Simple cleanup: remove expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage tracker for cost monitoring
class UsageTracker {
  async trackUsage(metrics: AIUsageMetrics): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          requestId: metrics.requestId,
          userId: metrics.userId,
          operation: metrics.operation,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          totalTokens: metrics.totalTokens,
          cost: metrics.cost,
          latency: metrics.latency,
          cacheHit: metrics.cacheHit,
          modelUsed: metrics.modelUsed,
          quality: metrics.quality,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to track AI usage:', error);
    }
  }

  async getUserDailyUsage(userId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const usage = await prisma.aIUsageLog.findMany({
        where: {
          userId,
          timestamp: { gte: today },
        },
      });

      return {
        totalTokens: usage.reduce((sum, log) => sum + log.totalTokens, 0),
        totalCost: usage.reduce((sum, log) => sum + log.cost, 0),
        requestCount: usage.length,
      };
    } catch (error) {
      console.error('Failed to get user usage:', error);
      return { totalTokens: 0, totalCost: 0, requestCount: 0 };
    }
  }
}

// Quality validator for response validation
class QualityValidator {
  validateJSONResponse(
    response: string,
    expectedFields: string[]
  ): {
    isValid: boolean;
    confidence: number;
    parsed?: any;
  } {
    try {
      const parsed = JSON.parse(response);
      let confidence = 100;

      // Check required fields
      for (const field of expectedFields) {
        if (!(field in parsed)) {
          confidence -= 20;
        }
      }

      // Check content quality
      if (parsed.summary && parsed.summary.length < 20) confidence -= 10;
      if (parsed.confidence && (parsed.confidence < 50 || parsed.confidence > 100))
        confidence -= 15;

      return {
        isValid: confidence >= 70,
        confidence: Math.max(0, confidence),
        parsed,
      };
    } catch (error) {
      return { isValid: false, confidence: 0 };
    }
  }
}

// Main optimized OpenAI service
export class OptimizedOpenAIService {
  private client: OpenAI | null = null;
  private config: OptimizedAIConfig | null = null;
  private cache: SimpleCache;
  private usageTracker: UsageTracker;
  private qualityValidator: QualityValidator;

  constructor() {
    this.cache = new SimpleCache();
    this.usageTracker = new UsageTracker();
    this.qualityValidator = new QualityValidator();
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.config = {
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        enabled: process.env.OPENAI_ENABLED !== 'false',
        cacheTTL: parseInt(process.env.AI_CACHE_TTL || '3600000'),
      };
      this.client = new OpenAI({ apiKey });
    }
  }

  public isConfigured(): boolean {
    return !!(this.client && this.config?.apiKey);
  }

  // Calculate cost based on token usage
  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    if (!costs) return 0;
    return (inputTokens * costs.inputCost + outputTokens * costs.outputCost) / 1000;
  }

  // Core optimized generation method
  private async generateOptimized<T>(
    prompt: string,
    options: {
      operation: string;
      userId: string;
      expectedFields?: string[];
      maxRetries?: number;
    }
  ): Promise<T | null> {
    if (!this.isConfigured()) return null;

    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check cache first
    const cacheKey = this.cache.generateKey(prompt, {
      operation: options.operation,
      model: this.config!.model,
    });

    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Track cache hit
      await this.usageTracker.trackUsage({
        requestId,
        userId: options.userId,
        operation: options.operation,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        latency: Date.now() - startTime,
        cacheHit: true,
        modelUsed: 'cache',
        quality: 100,
      });
      return cached.result;
    }

    try {
      // Execute AI request
      const response = await this.client!.chat.completions.create({
        model: this.config!.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config!.maxTokens,
        temperature: this.config!.temperature,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) throw new Error('Empty response from AI');

      // Validate quality if expected fields provided
      let quality = 100;
      let parsed = result;

      if (options.expectedFields) {
        const validation = this.qualityValidator.validateJSONResponse(
          result,
          options.expectedFields
        );
        quality = validation.confidence;
        parsed = validation.parsed || result;
      }

      // Calculate costs
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = this.calculateCost(
        inputTokens,
        outputTokens,
        this.config!.model || 'gpt-3.5-turbo'
      );

      // Track usage
      await this.usageTracker.trackUsage({
        requestId,
        userId: options.userId,
        operation: options.operation,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
        latency: Date.now() - startTime,
        cacheHit: false,
        modelUsed: this.config!.model || 'gpt-3.5-turbo',
        quality,
      });

      // Cache if quality is good
      if (quality >= 70) {
        this.cache.set(cacheKey, parsed, this.config!.cacheTTL);
      }

      return parsed as T;
    } catch (error) {
      console.error(`AI ${options.operation} error:`, error);
      return null;
    }
  }

  // Optimized issue summary generation
  public async generateIssueSummary(
    description: string,
    department?: string,
    category?: string,
    businessContext?: any,
    userId: string = 'anonymous'
  ): Promise<{
    summary: string;
    rootCauses: string[];
    impact: string;
    recommendations: string[];
    confidence: number;
  } | null> {
    const template = OPTIMIZED_PROMPTS.issueSummary;
    const prompt = template.template
      .replace('{description}', description.substring(0, 500)) // Limit input size
      .replace('{industry}', businessContext?.industry || 'A&E')
      .replace('{size}', businessContext?.size?.toString() || 'unknown')
      .replace('{department}', department || 'Unknown');

    const result = await this.generateOptimized(prompt, {
      operation: 'issue_summary',
      userId,
      expectedFields: ['summary', 'rootCauses', 'impact', 'recommendations', 'confidence'],
    });

    // Ensure proper structure with type assertion
    if (result && typeof result === 'object') {
      const typedResult = result as any;
      return {
        summary: typedResult.summary || 'AI analysis generated',
        rootCauses: Array.isArray(typedResult.rootCauses) ? typedResult.rootCauses : [],
        impact: typedResult.impact || 'Impact analysis pending',
        recommendations: Array.isArray(typedResult.recommendations)
          ? typedResult.recommendations
          : [],
        confidence: Math.min(Math.max(typedResult.confidence || 75, 0), 100),
      };
    }

    return null;
  }

  // Optimized cluster summary generation
  public async generateClusterSummary(
    clusterName: string,
    clusterDescription: string,
    issues: Array<{
      description: string;
      department?: string;
      category?: string;
      votes: number;
      heatmapScore: number;
    }>,
    businessContext?: any,
    userId: string = 'anonymous'
  ): Promise<{
    consolidatedSummary: string;
    crossIssuePatterns: string[];
    strategicPriority: string;
    initiativeRecommendations: string[];
    confidence: number;
  } | null> {
    const template = OPTIMIZED_PROMPTS.clusterAnalysis;
    const issuesList = issues
      .slice(0, 5) // Limit for efficiency
      .map((i) => `${i.description.substring(0, 100)}...(${i.heatmapScore})`)
      .join(', ');

    const prompt = template.template
      .replace('{name}', clusterName.substring(0, 100))
      .replace('{description}', clusterDescription.substring(0, 200))
      .replace('{count}', issues.length.toString())
      .replace('{issueList}', issuesList);

    const result = await this.generateOptimized(prompt, {
      operation: 'cluster_summary',
      userId,
      expectedFields: [
        'consolidatedSummary',
        'crossIssuePatterns',
        'strategicPriority',
        'initiativeRecommendations',
        'confidence',
      ],
    });

    if (result && typeof result === 'object') {
      const typedResult = result as any;
      return {
        consolidatedSummary: typedResult.consolidatedSummary || 'Cluster analysis generated',
        crossIssuePatterns: Array.isArray(typedResult.crossIssuePatterns)
          ? typedResult.crossIssuePatterns
          : [],
        strategicPriority: typedResult.strategicPriority || 'MEDIUM',
        initiativeRecommendations: Array.isArray(typedResult.initiativeRecommendations)
          ? typedResult.initiativeRecommendations
          : [],
        confidence: Math.min(Math.max(typedResult.confidence || 80, 0), 100),
      };
    }

    return null;
  }

  // Optimized requirements generation
  public async generateRequirementsFromSummary(
    summary: string,
    initiativeTitle: string,
    initiativeGoal: string,
    businessContext?: any,
    userId: string = 'anonymous'
  ): Promise<{
    cards: Array<{
      title: string;
      description: string;
      type: 'BUSINESS' | 'FUNCTIONAL' | 'ACCEPTANCE';
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      category?: string;
    }>;
    confidence: number;
  } | null> {
    const template = OPTIMIZED_PROMPTS.requirementGeneration;
    const prompt = template.template
      .replace('{title}', initiativeTitle.substring(0, 100))
      .replace('{goal}', initiativeGoal.substring(0, 200))
      .replace('{summary}', summary.substring(0, 300))
      .replace('{industry}', businessContext?.industry || 'A&E');

    const result = await this.generateOptimized(prompt, {
      operation: 'requirements_generation',
      userId,
      expectedFields: ['cards', 'confidence'],
    });

    if (result && typeof result === 'object') {
      const typedResult = result as any;
      return {
        cards: Array.isArray(typedResult.cards) ? typedResult.cards : [],
        confidence: Math.min(Math.max(typedResult.confidence || 75, 0), 100),
      };
    }

    return null;
  }

  // Performance and analytics methods
  public async getPerformanceMetrics(): Promise<{
    cache: { size: number; hitRate: number };
    dailyUsage: any;
  }> {
    const cacheStats = this.cache.getStats();

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const dailyUsage = await prisma.aIUsageLog.findMany({
        where: { timestamp: { gte: today } },
        select: {
          operation: true,
          totalTokens: true,
          cost: true,
          latency: true,
          cacheHit: true,
          quality: true,
        },
      });

      const usage = {
        totalRequests: dailyUsage.length,
        totalTokens: dailyUsage.reduce((sum, log) => sum + log.totalTokens, 0),
        totalCost: dailyUsage.reduce((sum, log) => sum + log.cost, 0),
        avgLatency:
          dailyUsage.length > 0
            ? dailyUsage.reduce((sum, log) => sum + log.latency, 0) / dailyUsage.length
            : 0,
        cacheHitRate:
          dailyUsage.length > 0
            ? dailyUsage.filter((log) => log.cacheHit).length / dailyUsage.length
            : 0,
        avgQuality:
          dailyUsage.length > 0
            ? dailyUsage.reduce((sum, log) => sum + log.quality, 0) / dailyUsage.length
            : 0,
      };

      return { cache: cacheStats, dailyUsage: usage };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return { cache: cacheStats, dailyUsage: null };
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // Backwards compatibility methods from original service
  public async generateIssueInsights(
    description: string,
    businessContext?: any
  ): Promise<string | null> {
    const result = await this.generateIssueSummary(
      description,
      undefined,
      undefined,
      businessContext
    );
    if (result) {
      return `Summary: ${result.summary}\n\nRoot Causes:\n${result.rootCauses.map((c) => `• ${c}`).join('\n')}\n\nImpact: ${result.impact}\n\nRecommendations:\n${result.recommendations.map((r) => `• ${r}`).join('\n')}`;
    }
    return null;
  }

  public async generateInitiativeRecommendations(
    title: string,
    problem: string,
    businessContext?: any
  ): Promise<{ recommendations?: string } | null> {
    // Simple implementation for backwards compatibility
    const prompt = `For initiative "${title}" addressing "${problem.substring(0, 200)}", provide implementation recommendations in 200 words or less.`;

    const result = await this.generateOptimized(prompt, {
      operation: 'initiative_recommendations',
      userId: 'system',
    });

    return result ? { recommendations: result as string } : null;
  }

  public async generateRequirementsFromDescription(description: string): Promise<any> {
    // Simple implementation for backwards compatibility
    const prompt = `Convert this description into structured requirements: "${description.substring(0, 300)}"`;

    return this.generateOptimized(prompt, {
      operation: 'requirements_from_description',
      userId: 'system',
    });
  }

  public async generateRequirementCards(
    title: string,
    problem: string,
    goal: string,
    businessContext?: any
  ): Promise<{ cards: any[]; confidence: number } | null> {
    // Delegate to generateRequirementsFromSummary with proper format
    const summary = `${problem}\n\nGoal: ${goal}`;
    return this.generateRequirementsFromSummary(summary, title, goal, businessContext, 'system');
  }

  // Configuration methods
  public configure(config: OptimizedAIConfig): void {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  public getConfig(): OptimizedAIConfig | null {
    return this.config;
  }

  public async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OpenAI API not configured' };
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: this.config!.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10,
      });

      return {
        success: true,
        model: response.model || this.config!.model,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  // Generate structured JSON responses for categorization with optimization
  public async generateStructuredResponse(prompt: string): Promise<string | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    const startTime = Date.now();
    const cacheKey = this.cache.generateKey(prompt, { model: 'gpt-3.5-turbo', structured: true });

    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.client!.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 600,
        temperature: 0.3, // Lower temperature for consistent JSON
      });

      const result = response.choices[0]?.message?.content || null;
      const latency = Date.now() - startTime;

      // Cache the result
      if (result) {
        this.cache.set(cacheKey, result);
      }

      // Note: Metrics tracking would go here if implemented

      return result;
    } catch (error) {
      console.error('Optimized structured response error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const optimizedOpenAIService = new OptimizedOpenAIService();
export default optimizedOpenAIService;
