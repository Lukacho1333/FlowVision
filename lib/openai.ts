import OpenAI from 'openai';
import { executeAIOperation, getUserFriendlyAIError, AIServiceError } from './ai-error-handler';
import { AIJSONParser } from './ai-json-parser';
import { aiConfigLoader } from './ai-config-loader';
import { systemConfig, type OperationConfig } from './system-config';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
}

export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  lastUsed: string;
  costEstimate: number;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;

  constructor() {
    // Don't initialize in constructor - do it lazily when needed
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.config && this.client) {
      return true; // Already initialized
    }

    try {
      // Load configuration from database via aiConfigLoader
      const dbConfig = await aiConfigLoader.loadConfig();
      if (dbConfig) {
        this.config = {
          apiKey: dbConfig.apiKey,
          model: dbConfig.model,
          maxTokens: dbConfig.maxTokens,
          temperature: dbConfig.temperature,
          enabled: dbConfig.enabled,
        };
        this.client = new OpenAI({ apiKey: dbConfig.apiKey });

        return true;
      } else {
        console.warn('⚠️ No AI configuration found in database, service will be disabled');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI service from database:', error);
      // Fall back to environment variables
      this.initializeFromEnv();
      return this.config !== null;
    }
  }

  /**
   * Get operation-specific AI configuration with fallbacks
   */
  private async getOperationConfig(
    operationType: keyof import('./system-config').OperationDefaults
  ): Promise<OperationConfig> {
    try {
      return await systemConfig.getAIOperationConfig(operationType);
    } catch (error) {
      console.warn(`⚠️ Failed to load ${operationType} config, using fallbacks:`, error);
      // Fallback to basic configuration
      return {
        model: this.config?.model || 'gpt-3.5-turbo',
        maxTokens: this.config?.maxTokens || 500,
        temperature: this.config?.temperature || 0.7,
      };
    }
  }

  // Legacy method for backward compatibility
  private initializeFromEnv() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.config = {
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        enabled: process.env.OPENAI_ENABLED !== 'false',
      };
      this.client = new OpenAI({ apiKey });
    }
  }

  public configure(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  public isConfigured(): boolean {
    return !!(this.client && this.config?.apiKey);
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

  public async generateIssueInsights(
    description: string,
    businessContext?: any
  ): Promise<{ insights: string; model: string } | null> {
    // Ensure configuration is loaded from database
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.config?.enabled) {
      return null;
    }

    try {
      // Get operation-specific configuration
      const operationConfig = await this.getOperationConfig('issue_analysis');

      const prompt = `
Analyze this operational issue for a ${businessContext?.industry || 'business'} company with ${businessContext?.size || 'unknown'} employees:

Issue: "${description}"

Provide insights on:
1. Root cause analysis
2. Potential impact on operations
3. Suggested priority level (High/Medium/Low)
4. Quick win solutions
5. Long-term strategic considerations

Keep response concise and actionable.
`;

      const response = await this.client!.chat.completions.create({
        model: operationConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: operationConfig.maxTokens,
        temperature: operationConfig.temperature,
      });

      const insights = response.choices[0]?.message?.content;
      if (insights) {
        return {
          insights,
          model: response.model || operationConfig.model,
        };
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  public async generateInitiativeRecommendations(
    title: string,
    problem: string,
    businessContext?: any
  ): Promise<{
    recommendations?: string;
    estimatedDifficulty?: number;
    estimatedROI?: number;
    suggestedKPIs?: string[];
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      // Get operation-specific configuration for initiative generation
      const operationConfig = await this.getOperationConfig('initiative_generation');

      const prompt = `
For a ${businessContext?.industry || 'business'} company with ${businessContext?.size || 'unknown'} employees:

Initiative: "${title}"
Problem: "${problem}"

Provide structured analysis:
1. Implementation recommendations
2. Difficulty score (0-100, where 100 is most difficult)
3. Expected ROI score (0-100, where 100 is highest ROI)
4. Suggested KPIs to track success (list 3-5 specific metrics)

Format as JSON with keys: recommendations, estimatedDifficulty, estimatedROI, suggestedKPIs
`;

      const response = await this.client!.chat.completions.create({
        model: operationConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: operationConfig.maxTokens,
        temperature: operationConfig.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const expectedFields = [
          'recommendations',
          'estimatedDifficulty',
          'estimatedROI',
          'suggestedKPIs',
        ];
        const parseResult = AIJSONParser.parseByModel(
          content,
          operationConfig.model,
          expectedFields
        );

        if (parseResult.success) {
          return parseResult.data;
        } else {
          // If JSON parsing fails, return as text recommendations
          return { recommendations: content };
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  public async generateRequirementsFromDescription(description: string): Promise<{
    title?: string;
    problem?: string;
    goal?: string;
    acceptanceCriteria?: string[];
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      // Get operation-specific configuration for requirement cards
      const operationConfig = await this.getOperationConfig('requirement_cards');

      const prompt = `
Convert this business description into a structured requirement:

"${description}"

Extract and format as JSON:
{
  "title": "Clear, actionable title",
  "problem": "Problem statement",
  "goal": "Desired outcome",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"]
}
`;

      const response = await this.client!.chat.completions.create({
        model: operationConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: operationConfig.maxTokens,
        temperature: operationConfig.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const expectedFields = ['title', 'problem', 'goal', 'acceptanceCriteria'];
        const parseResult = AIJSONParser.parseByModel(
          content,
          operationConfig.model,
          expectedFields
        );

        if (parseResult.success) {
          return parseResult.data;
        } else {
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  public async generateIssueSummary(
    description: string,
    department?: string,
    category?: string,
    businessContext?: any
  ): Promise<{
    summary: string;
    rootCauses: string[];
    impact: string;
    recommendations: string[];
    confidence: number;
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      // Get operation-specific configuration for issue analysis
      const operationConfig = await this.getOperationConfig('issue_analysis');

      const contextInfo = businessContext
        ? `\nBusiness Context: ${businessContext.industry || 'Architecture & Engineering'} firm with ${businessContext.size || 'unknown'} employees.`
        : '\nBusiness Context: Architecture & Engineering firm.';

      const prompt = `
Analyze this operational issue from an A&E firm perspective:

Issue: "${description}"
Department: ${department || 'Unknown'}
Category: ${category || 'Operational'}
${contextInfo}

Provide a structured analysis in JSON format:
{
  "summary": "2-3 sentence executive summary highlighting the core problem and business impact",
  "rootCauses": ["3-4 potential root causes in order of likelihood"],
  "impact": "Specific impact on operations, timeline, client satisfaction, or team productivity",
  "recommendations": ["3-4 specific, actionable recommendations to address this issue"],
  "confidence": 85
}

Focus on practical A&E operational challenges like coordination, technical complexity, client communication, regulatory compliance, and project delivery.
`;

      const response = await executeAIOperation(async () => {
        return await this.client!.chat.completions.create({
          model: operationConfig.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: operationConfig.maxTokens,
          temperature: operationConfig.temperature,
        });
      }, 'Generate Issue Summary');

      const content = response.choices[0]?.message?.content;
      if (content) {
        const expectedFields = ['summary', 'rootCauses', 'impact', 'recommendations', 'confidence'];
        const parseResult = AIJSONParser.parseByModel(
          content,
          operationConfig.model,
          expectedFields
        );

        if (parseResult.success) {
          const validatedResult = AIJSONParser.validateIssueAnalysis(parseResult);
          return {
            summary: validatedResult.data.summary || 'AI analysis generated',
            rootCauses: Array.isArray(validatedResult.data.rootCauses)
              ? validatedResult.data.rootCauses
              : [],
            impact: validatedResult.data.impact || 'Impact analysis pending',
            recommendations: Array.isArray(validatedResult.data.recommendations)
              ? validatedResult.data.recommendations
              : [],
            confidence: validatedResult.data.confidence || validatedResult.confidence,
          };
        } else {
          // Use fallback data from parser
          return {
            summary: parseResult.data.summary || content.substring(0, 200) + '...',
            rootCauses: parseResult.data.rootCauses || ['Analysis available in summary'],
            impact: parseResult.data.impact || 'Detailed analysis in summary section',
            recommendations: parseResult.data.recommendations || [
              'Review full analysis for recommendations',
            ],
            confidence: parseResult.confidence,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI issue summary error:', error);
      return null;
    }
  }

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
    businessContext?: any
  ): Promise<{
    consolidatedSummary: string;
    crossIssuePatterns: string[];
    strategicPriority: string;
    initiativeRecommendations: string[];
    confidence: number;
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      const contextInfo = businessContext
        ? `\nBusiness Context: ${businessContext.industry || 'Architecture & Engineering'} firm with ${businessContext.size || 'unknown'} employees.`
        : '\nBusiness Context: Architecture & Engineering firm.';

      const issuesList = issues
        .map(
          (issue, index) =>
            `${index + 1}. ${issue.description} (Dept: ${issue.department || 'Unknown'}, Score: ${issue.heatmapScore}, Votes: ${issue.votes})`
        )
        .join('\n');

      const prompt = `
Analyze this cluster of related issues from an A&E firm:

Cluster: "${clusterName}"
Description: "${clusterDescription}"
${contextInfo}

Related Issues:
${issuesList}

Provide a strategic cluster analysis in JSON format:
{
  "consolidatedSummary": "Executive summary of the cluster's systemic impact on the firm",
  "crossIssuePatterns": ["3-4 patterns you see across these issues"],
  "strategicPriority": "HIGH/MEDIUM/LOW with justification",
  "initiativeRecommendations": ["3-4 strategic initiatives to address this cluster"],
  "confidence": 90
}

Focus on systemic problems, cross-departmental impacts, client effects, and strategic solutions for A&E operations.
`;

      // Get operation-specific configuration for cluster analysis
      const operationConfig = await this.getOperationConfig('cluster_analysis');

      const response = await this.client!.chat.completions.create({
        model: operationConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: operationConfig.maxTokens,
        temperature: operationConfig.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const expectedFields = [
          'consolidatedSummary',
          'crossIssuePatterns',
          'strategicPriority',
          'initiativeRecommendations',
          'confidence',
        ];
        const parseResult = AIJSONParser.parseByModel(
          content,
          operationConfig.model,
          expectedFields
        );

        if (parseResult.success) {
          const validatedResult = AIJSONParser.validateClusterAnalysis(parseResult);
          return {
            consolidatedSummary:
              validatedResult.data.consolidatedSummary || 'Cluster analysis generated',
            crossIssuePatterns: Array.isArray(validatedResult.data.crossIssuePatterns)
              ? validatedResult.data.crossIssuePatterns
              : [],
            strategicPriority: validatedResult.data.strategicPriority || 'MEDIUM',
            initiativeRecommendations: Array.isArray(validatedResult.data.initiativeRecommendations)
              ? validatedResult.data.initiativeRecommendations
              : [],
            confidence: validatedResult.data.confidence || validatedResult.confidence,
          };
        } else {
          // Use fallback data from parser
          return {
            consolidatedSummary: parseResult.data.summary || content.substring(0, 250) + '...',
            crossIssuePatterns: parseResult.data.crossIssuePatterns || [
              'Analysis available in summary',
            ],
            strategicPriority: 'MEDIUM - Requires review',
            initiativeRecommendations: parseResult.data.recommendations || [
              'Review cluster summary for recommendations',
            ],
            confidence: parseResult.confidence,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI cluster summary error:', error);
      return null;
    }
  }

  public async generateRequirementsFromSummary(
    summary: string,
    initiativeTitle: string,
    initiativeGoal: string,
    businessContext?: any
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
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      const contextInfo = businessContext
        ? `\nBusiness Context: ${businessContext.industry || 'Architecture & Engineering'} firm with ${businessContext.size || 'unknown'} employees.`
        : '\nBusiness Context: Architecture & Engineering firm.';

      const prompt = `
Generate requirement cards for this initiative based on AI analysis:

Initiative: "${initiativeTitle}"
Goal: "${initiativeGoal}"
AI Summary: "${summary}"
${contextInfo}

Generate 4-6 specific requirement cards in JSON format:
{
  "cards": [
    {
      "title": "Clear, specific requirement title",
      "description": "Detailed requirement description with success criteria",
      "type": "BUSINESS|FUNCTIONAL|ACCEPTANCE",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "category": "Implementation|Process|Technology|Training"
    }
  ],
  "confidence": 85
}

Focus on practical A&E requirements like workflow integration, staff training, client communication, compliance, and measurable success criteria.
`;

      const response = await this.client!.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 800,
        temperature: this.config.temperature || 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return {
            cards: Array.isArray(parsed.cards) ? parsed.cards : [],
            confidence: Math.min(Math.max(parsed.confidence || 75, 0), 100),
          };
        } catch {
          // Fallback: create basic requirements from summary
          return {
            cards: [
              {
                title: 'Implementation Planning',
                description: 'Plan and execute the solution based on AI analysis findings',
                type: 'BUSINESS' as const,
                priority: 'HIGH' as const,
                category: 'Implementation',
              },
            ],
            confidence: 50,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI requirements generation error:', error);
      return null;
    }
  }

  public async generateRequirementCards(
    title: string,
    problem: string,
    goal: string,
    businessContext?: any
  ): Promise<{
    cards: Array<{
      title: string;
      description: string;
      type: 'BUSINESS' | 'FUNCTIONAL' | 'ACCEPTANCE';
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      category?: string;
    }>;
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    try {
      const contextStr = businessContext
        ? `Business Context: ${businessContext.industry}, ${businessContext.size} employees`
        : '';

      const prompt = `
You are an expert business analyst helping SMB leaders create requirement cards for their initiative.

Initiative:
Title: "${title}"
Problem: "${problem}"
Goal: "${goal}"
${contextStr}

Generate 5-8 requirement cards that cover:
1. Business requirements (what the business needs)
2. Functional requirements (how it should work)
3. Acceptance criteria (how to verify success)

Each card should be specific, actionable, and help execution teams understand what to build.

Format as JSON:
{
  "cards": [
    {
      "title": "Clear, specific requirement title",
      "description": "Detailed description that execution teams can understand and implement",
      "type": "BUSINESS|FUNCTIONAL|ACCEPTANCE",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "category": "optional grouping like 'User Experience' or 'Data Management'"
    }
  ]
}

Focus on requirements that are:
- Specific and measurable
- Clear for implementation teams
- Business-value focused for SMB operations
- Realistic and achievable
`;

      const response = await this.client!.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 800,
        temperature: 0.4,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          // Validate the structure
          if (parsed.cards && Array.isArray(parsed.cards)) {
            return parsed;
          }
          return null;
        } catch {
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return null;
    }
  }

  /**
   * Generate a cohesive initiative suggestion from multiple related issues
   */
  public async generateInitiativeFromIssues(
    issues: Array<{ id: string; description: string; heatmapScore: number; votes: number }>,
    businessContext?: any
  ): Promise<{
    title: string;
    problem: string;
    goal: string;
    kpis: string[];
    type: string;
    estimatedCost: number;
    estimatedBenefit: number;
    estimatedHours: number;
    reasoning?: string;
  } | null> {
    if (!this.isConfigured() || !this.config?.enabled) {
      return null;
    }

    const issueDescriptions = issues.map((i) => i.description).join('\n• ');
    const totalVotes = issues.reduce((sum, i) => sum + i.votes, 0);
    const avgHeatmapScore = issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length;
    const maxHeatmapScore = Math.max(...issues.map((i) => i.heatmapScore));

    const prompt = `You are an expert business strategist helping a ${businessContext?.industry || 'business'} company with ${businessContext?.size || 'unknown'} employees create a comprehensive initiative from multiple related issues.

CONTEXT:
Company Industry: ${businessContext?.industry || 'Unknown'}
Company Size: ${businessContext?.size || 'unknown'} employees
Number of Issues: ${issues.length}
Total Community Votes: ${totalVotes}
Average Issue Severity: ${avgHeatmapScore.toFixed(1)}/100
Highest Issue Severity: ${maxHeatmapScore}/100

ISSUES TO ADDRESS:
• ${issueDescriptions}

REQUIREMENTS:
Create a strategic initiative that addresses all these issues comprehensively. Consider:
- Root cause analysis across all issues
- Synergies between issue resolutions
- Resource optimization by solving multiple problems together
- Business impact and ROI potential
- Implementation complexity and timeline

RESPONSE FORMAT (JSON):
{
  "title": "Strategic initiative title (60 chars max)",
  "problem": "Comprehensive problem statement connecting all issues",
  "goal": "Specific, measurable goal addressing the root causes",
  "kpis": ["KPI 1", "KPI 2", "KPI 3"],
  "type": "operational|strategic|innovation",
  "estimatedCost": 50000,
  "estimatedBenefit": 200000,
  "estimatedHours": 320,
  "complexity": "low|medium|high",
  "reasoning": "Brief explanation of how this initiative addresses all issues"
}`;

    try {
      const response = await this.client!.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 800,
        temperature: this.config.temperature || 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || `Strategic Initiative for ${issues.length} Issues`,
        problem:
          parsed.problem ||
          `Multiple operational issues affecting business performance: ${issueDescriptions}`,
        goal:
          parsed.goal ||
          `Systematically address and resolve ${issues.length} related operational issues`,
        kpis: Array.isArray(parsed.kpis)
          ? parsed.kpis
          : ['Issue Resolution Rate', 'Process Efficiency', 'Customer Satisfaction'],
        type: parsed.type || 'operational',
        estimatedCost:
          typeof parsed.estimatedCost === 'number' ? parsed.estimatedCost : 25000 * issues.length,
        estimatedBenefit:
          typeof parsed.estimatedBenefit === 'number'
            ? parsed.estimatedBenefit
            : 75000 * issues.length,
        estimatedHours:
          typeof parsed.estimatedHours === 'number' ? parsed.estimatedHours : 40 * issues.length,
        reasoning: parsed.reasoning,
      };
    } catch (err) {
      console.error('OpenAI API error:', err);
      return null;
    }
  }

  public getConfig(): OpenAIConfig | null {
    return this.config;
  }

  public async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string | null> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const completion = await this.client!.chat.completions.create({
        model: options.model || this.config!.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || this.config!.maxTokens || 1000,
        temperature: options.temperature ?? (this.config!.temperature || 0.7),
      });

      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw error;
    }
  }

  public async getUsageEstimate(): Promise<AIUsageStats | null> {
    try {
      // Derive rough usage from audit logs (OPENAI_* actions)
      const { prisma } = await import('@/lib/prisma');
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const logs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['OPENAI_CONNECTION_TEST', 'OPENAI_CONFIG_UPDATE'] },
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const totalRequests = logs.length;
      // No token metadata yet; default to 0 until we start recording per-call tokens
      const totalTokens = 0;
      const lastUsed = logs[0]?.timestamp?.toISOString?.() || null;
      const costEstimate = 0;

      return {
        totalRequests,
        totalTokens,
        lastUsed: lastUsed || new Date(0).toISOString(),
        costEstimate,
      };
    } catch (err) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        lastUsed: new Date(0).toISOString(),
        costEstimate: 0,
      };
    }
  }

  // Generate structured JSON responses for categorization
  public async generateStructuredResponse(prompt: string): Promise<string | null> {
    // Ensure configuration is loaded from database
    const initialized = await this.ensureInitialized();
    if (!initialized || !this.config?.enabled) {

      return null;
    }

    try {
      // Get operation-specific configuration for categorization
      const operationConfig = await this.getOperationConfig('categorization');

      const response = await this.client!.chat.completions.create({
        model: operationConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: operationConfig.maxTokens,
        temperature: operationConfig.temperature,
      });

      const content = response.choices[0]?.message?.content;


      return content || null;
    } catch (error) {
      console.error('❌ OpenAI structured response error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();

// Type exports
export type { OpenAI };
export default openAIService;
