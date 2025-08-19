/**
 * AI Recommendation Engine
 * BUSINESS CRITICAL: Intelligent issue-initiative-solution associations
 * 
 * Based on expert team consensus for Sprint 20 process flow optimization
 */

import { multiTenantAI } from '@/lib/multi-tenant-ai-service';
import { prisma } from '@/lib/prisma';

export interface AIRecommendation {
  id: string;
  type: 'ISSUE_TO_INITIATIVE' | 'ISSUE_TO_CLUSTER' | 'ISSUE_TO_SOLUTION' | 'CATEGORY_TREND';
  targetId: string;
  confidence: number; // 0-100
  reasoning: string;
  metadata: any;
  createdAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface RecommendationContext {
  userId: string;
  organizationId: string;
  userRole: string;
  recentActivity: any[];
  organizationPatterns: any;
}

/**
 * Client-Specific AI Model
 * Maintains isolated AI learning for each organization
 */
class ClientAIModel {
  private organizationId: string;
  private learningData: {
    acceptedRecommendations: Map<string, number>;
    rejectedRecommendations: Map<string, number>;
    successPatterns: Map<string, any>;
    terminologyMap: Map<string, string[]>;
    userPreferences: Map<string, any>;
  };
  private modelVersion: string;
  private lastTraining: Date;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.learningData = {
      acceptedRecommendations: new Map(),
      rejectedRecommendations: new Map(),
      successPatterns: new Map(),
      terminologyMap: new Map(),
      userPreferences: new Map()
    };
    this.modelVersion = '1.0.0';
    this.lastTraining = new Date();
  }

  /**
   * Initialize client model from stored data
   */
  async initialize(): Promise<void> {
    try {
      // Load existing model data from database
      const storedModel = await prisma.aIClientModel.findUnique({
        where: { organizationId: this.organizationId }
      });

      if (storedModel) {
        this.modelVersion = storedModel.version;
        this.lastTraining = storedModel.lastTraining;
        
        // Parse stored learning data
        const parsedData = storedModel.learningData as any;
        if (parsedData) {
          this.learningData = {
            acceptedRecommendations: new Map(parsedData.acceptedRecommendations || []),
            rejectedRecommendations: new Map(parsedData.rejectedRecommendations || []),
            successPatterns: new Map(parsedData.successPatterns || []),
            terminologyMap: new Map(parsedData.terminologyMap || []),
            userPreferences: new Map(parsedData.userPreferences || [])
          };
        }
      } else {
        // Create new model entry
        await this.saveModel();
      }

      // Check if model needs retraining (weekly)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (this.lastTraining < weekAgo) {
        await this.retrainModel();
      }
    } catch (error) {
      console.error(`Failed to initialize client model for ${this.organizationId}:`, error);
      // Continue with default model
    }
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(
    recommendationType: string,
    recommendationData: any,
    accepted: boolean,
    userId: string
  ): Promise<void> {
    const key = `${recommendationType}_${JSON.stringify(recommendationData)}`;
    
    if (accepted) {
      const currentCount = this.learningData.acceptedRecommendations.get(key) || 0;
      this.learningData.acceptedRecommendations.set(key, currentCount + 1);
      
      // Learn success patterns
      await this.updateSuccessPatterns(recommendationType, recommendationData);
      
      // Update user preferences
      await this.updateUserPreferences(userId, recommendationType, recommendationData);
    } else {
      const currentCount = this.learningData.rejectedRecommendations.get(key) || 0;
      this.learningData.rejectedRecommendations.set(key, currentCount + 1);
    }

    // Save updated model
    await this.saveModel();
  }

  /**
   * Calculate recommendation confidence based on client-specific learning
   */
  calculateClientSpecificConfidence(
    baseConfidence: number,
    recommendationType: string,
    recommendationData: any
  ): number {
    const key = `${recommendationType}_${JSON.stringify(recommendationData)}`;
    
    const accepted = this.learningData.acceptedRecommendations.get(key) || 0;
    const rejected = this.learningData.rejectedRecommendations.get(key) || 0;
    const total = accepted + rejected;

    if (total === 0) {
      // No historical data, use base confidence
      return baseConfidence;
    }

    // Calculate client-specific success rate
    const clientSuccessRate = accepted / total;
    
    // Weighted average with base confidence
    const weight = Math.min(total / 10, 0.8); // Max 80% weight to client data
    return (baseConfidence * (1 - weight)) + (clientSuccessRate * 100 * weight);
  }

  /**
   * Get client-specific terminology adjustments
   */
  getClientTerminology(term: string): string[] {
    return this.learningData.terminologyMap.get(term.toLowerCase()) || [term];
  }

  /**
   * Get user-specific preferences
   */
  getUserPreferences(userId: string): any {
    return this.learningData.userPreferences.get(userId) || {};
  }

  /**
   * Update success patterns from accepted recommendations
   */
  private async updateSuccessPatterns(
    recommendationType: string,
    recommendationData: any
  ): Promise<void> {
    const pattern = {
      type: recommendationType,
      data: recommendationData,
      timestamp: new Date(),
      count: (this.learningData.successPatterns.get(recommendationType)?.count || 0) + 1
    };
    
    this.learningData.successPatterns.set(recommendationType, pattern);
  }

  /**
   * Update user preferences
   */
  private async updateUserPreferences(
    userId: string,
    recommendationType: string,
    recommendationData: any
  ): Promise<void> {
    const currentPrefs = this.learningData.userPreferences.get(userId) || {
      preferredTypes: new Map(),
      lastActivity: new Date()
    };

    const typeCount = currentPrefs.preferredTypes.get(recommendationType) || 0;
    currentPrefs.preferredTypes.set(recommendationType, typeCount + 1);
    currentPrefs.lastActivity = new Date();

    this.learningData.userPreferences.set(userId, currentPrefs);
  }

  /**
   * Retrain model with recent data
   */
  private async retrainModel(): Promise<void> {
    try {
      // Get recent feedback data for this organization
      const recentFeedback = await prisma.aIRecommendationFeedback.findMany({
        where: {
          organizationId: this.organizationId,
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      // Analyze patterns and update model
      for (const feedback of recentFeedback) {
        // This would integrate with ML pipeline for more sophisticated learning
        // For now, we update our simple pattern tracking
      }

      this.lastTraining = new Date();
      this.modelVersion = `${parseFloat(this.modelVersion) + 0.1}`.substring(0, 5);
      
      await this.saveModel();

      // Log retraining event
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          organizationId: this.organizationId,
          action: 'AI_MODEL_RETRAINED',
          details: {
            modelVersion: this.modelVersion,
            trainingDate: this.lastTraining,
            feedbackCount: recentFeedback.length
          }
        }
      });
    } catch (error) {
      console.error(`Failed to retrain model for ${this.organizationId}:`, error);
    }
  }

  /**
   * Save model data to database
   */
  private async saveModel(): Promise<void> {
    try {
      const learningDataSerialized = {
        acceptedRecommendations: Array.from(this.learningData.acceptedRecommendations.entries()),
        rejectedRecommendations: Array.from(this.learningData.rejectedRecommendations.entries()),
        successPatterns: Array.from(this.learningData.successPatterns.entries()),
        terminologyMap: Array.from(this.learningData.terminologyMap.entries()),
        userPreferences: Array.from(this.learningData.userPreferences.entries())
      };

      await prisma.aIClientModel.upsert({
        where: { organizationId: this.organizationId },
        create: {
          organizationId: this.organizationId,
          version: this.modelVersion,
          learningData: learningDataSerialized as any,
          lastTraining: this.lastTraining,
          createdAt: new Date()
        },
        update: {
          version: this.modelVersion,
          learningData: learningDataSerialized as any,
          lastTraining: this.lastTraining,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Failed to save model for ${this.organizationId}:`, error);
    }
  }
}

export class AIRecommendationEngine {
  private static instance: AIRecommendationEngine;
  private clientModels: Map<string, ClientAIModel> = new Map();

  static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
  }

  /**
   * Get or create client-specific AI model
   */
  private async getClientModel(organizationId: string): Promise<ClientAIModel> {
    if (!this.clientModels.has(organizationId)) {
      const clientModel = new ClientAIModel(organizationId);
      await clientModel.initialize();
      this.clientModels.set(organizationId, clientModel);
    }
    return this.clientModels.get(organizationId)!;
  }

  /**
   * Get AI recommendations for a specific issue
   */
  async getIssueRecommendations(
    issueId: string,
    context: RecommendationContext
  ): Promise<AIRecommendation[]> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        User: true,
        votes: true
      }
    });

    if (!issue) {
      throw new Error('Issue not found');
    }

    // Get client-specific AI model
    const clientModel = await this.getClientModel(context.organizationId);

    const recommendations: AIRecommendation[] = [];

    // 1. Recommend existing initiatives (with client-specific learning)
    const initiativeRecommendations = await this.recommendInitiatives(issue, context, clientModel);
    recommendations.push(...initiativeRecommendations);

    // 2. Recommend clustering with similar issues (with client-specific learning)
    const clusterRecommendations = await this.recommendClusters(issue, context, clientModel);
    recommendations.push(...clusterRecommendations);

    // 3. Recommend existing solutions (with client-specific learning)
    const solutionRecommendations = await this.recommendSolutions(issue, context, clientModel);
    recommendations.push(...solutionRecommendations);

    // Apply client-specific confidence adjustments
    const adjustedRecommendations = recommendations.map(rec => ({
      ...rec,
      confidence: clientModel.calculateClientSpecificConfidence(
        rec.confidence,
        rec.type,
        rec.metadata
      )
    }));

    return adjustedRecommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Recommend initiatives for an issue
   */
  private async recommendInitiatives(
    issue: any,
    context: RecommendationContext,
    clientModel: ClientAIModel
  ): Promise<AIRecommendation[]> {
    // Get existing initiatives in the organization
    const initiatives = await prisma.initiative.findMany({
      where: {
        organizationId: context.organizationId,
        status: { in: ['DRAFT', 'PLANNING', 'IN_PROGRESS'] }
      },
      include: {
        addressedIssues: true
      }
    });

    const recommendations: AIRecommendation[] = [];

    for (const initiative of initiatives) {
      const prompt = `
        Analyze if this issue should be added to this initiative:
        
        Issue: "${issue.description}"
        Category: ${issue.category}
        Votes: ${issue.votes.length}
        
        Initiative: "${initiative.title}"
        Problem: "${initiative.problem}"
        Goal: "${initiative.goal}"
        Current Issues: ${initiative.addressedIssues.length}
        
        Respond with JSON:
        {
          "shouldRecommend": boolean,
          "confidence": number (0-100),
          "reasoning": "explanation"
        }
      `;

      try {
        const response = await multiTenantAI.generateCompletion(
          context.organizationId,
          context.userId,
          'ISSUE_INITIATIVE_RECOMMENDATION',
          prompt,
          { maxTokens: 200, temperature: 0.3 }
        );

        const analysis = JSON.parse(response.content);
        
        if (analysis.shouldRecommend && analysis.confidence > 60) {
          recommendations.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ISSUE_TO_INITIATIVE',
            targetId: initiative.id,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            metadata: {
              initiativeTitle: initiative.title,
              currentIssueCount: initiative.addressedIssues.length
            },
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to generate initiative recommendation:', error);
      }
    }

    return recommendations;
  }

  /**
   * Recommend clusters for an issue
   */
  private async recommendClusters(
    issue: any,
    context: RecommendationContext,
    clientModel: ClientAIModel
  ): Promise<AIRecommendation[]> {
    // Get recent issues that could form clusters
    const recentIssues = await prisma.issue.findMany({
      where: {
        organizationId: context.organizationId,
        id: { not: issue.id },
        clusterId: null, // Not already clustered
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      take: 10,
      orderBy: { votes: 'desc' }
    });

    const recommendations: AIRecommendation[] = [];

    if (recentIssues.length >= 2) {
      const prompt = `
        Analyze if these issues should be clustered together:
        
        Target Issue: "${issue.description}"
        Category: ${issue.category}
        
        Related Issues:
        ${recentIssues.map((i, idx) => `${idx + 1}. "${i.description}" (Category: ${i.category})`).join('\n')}
        
        Respond with JSON:
        {
          "shouldCluster": boolean,
          "confidence": number (0-100),
          "reasoning": "explanation",
          "suggestedClusterName": "string",
          "relatedIssueIds": ["id1", "id2"]
        }
      `;

      try {
        const response = await multiTenantAI.generateCompletion(
          context.organizationId,
          context.userId,
          'ISSUE_CLUSTER_RECOMMENDATION',
          prompt,
          { maxTokens: 300, temperature: 0.4 }
        );

        const analysis = JSON.parse(response.content);
        
        if (analysis.shouldCluster && analysis.confidence > 70) {
          recommendations.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ISSUE_TO_CLUSTER',
            targetId: 'new_cluster',
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            metadata: {
              suggestedClusterName: analysis.suggestedClusterName,
              relatedIssueIds: analysis.relatedIssueIds,
              issueCount: analysis.relatedIssueIds.length + 1
            },
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to generate cluster recommendation:', error);
      }
    }

    return recommendations;
  }

  /**
   * Recommend solutions for an issue
   */
  private async recommendSolutions(
    issue: any,
    context: RecommendationContext,
    clientModel: ClientAIModel
  ): Promise<AIRecommendation[]> {
    // Get existing solutions that might be relevant
    const solutions = await prisma.solution.findMany({
      where: {
        organizationId: context.organizationId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] }
      },
      include: {
        initiative: {
          include: {
            addressedIssues: true
          }
        }
      },
      take: 5
    });

    const recommendations: AIRecommendation[] = [];

    for (const solution of solutions) {
      const prompt = `
        Analyze if this issue is related to this solution:
        
        Issue: "${issue.description}"
        Category: ${issue.category}
        
        Solution: "${solution.title}"
        Description: "${solution.description}"
        Initiative: "${solution.initiative.title}"
        Related Issues: ${solution.initiative.addressedIssues.length}
        
        Respond with JSON:
        {
          "isRelated": boolean,
          "confidence": number (0-100),
          "reasoning": "explanation"
        }
      `;

      try {
        const response = await multiTenantAI.generateCompletion(
          context.organizationId,
          context.userId,
          'ISSUE_SOLUTION_RECOMMENDATION',
          prompt,
          { maxTokens: 200, temperature: 0.3 }
        );

        const analysis = JSON.parse(response.content);
        
        if (analysis.isRelated && analysis.confidence > 65) {
          recommendations.push({
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ISSUE_TO_SOLUTION',
            targetId: solution.id,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            metadata: {
              solutionTitle: solution.title,
              initiativeTitle: solution.initiative.title
            },
            createdAt: new Date()
          });
        }
      } catch (error) {
        console.error('Failed to generate solution recommendation:', error);
      }
    }

    return recommendations;
  }

  /**
   * Record user feedback on recommendation
   */
  async recordRecommendationFeedback(
    recommendationId: string,
    accepted: boolean,
    userId: string,
    organizationId: string,
    recommendationType?: string,
    recommendationData?: any
  ): Promise<void> {
    await prisma.aIRecommendationFeedback.create({
      data: {
        recommendationId,
        userId,
        organizationId,
        accepted,
        timestamp: new Date()
      }
    });

    // Update client-specific AI model with feedback
    const clientModel = await this.getClientModel(organizationId);
    if (recommendationType && recommendationData) {
      await clientModel.learnFromFeedback(
        recommendationType,
        recommendationData,
        accepted,
        userId
      );
    }

    // Update AI learning models based on feedback
    await this.updateAIModels(recommendationId, accepted, organizationId);
  }

  /**
   * Update AI models based on user feedback
   */
  private async updateAIModels(
    recommendationId: string,
    accepted: boolean,
    organizationId: string
  ): Promise<void> {
    // This would integrate with ML pipeline to improve future recommendations
    // For now, we'll log the feedback for future model training
    
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        organizationId,
        action: 'AI_RECOMMENDATION_FEEDBACK',
        details: {
          recommendationId,
          accepted,
          timestamp: new Date()
        }
      }
    });
  }

  /**
   * Get recommendation statistics for analytics
   */
  async getRecommendationStats(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRecommendations: number;
    acceptanceRate: number;
    topRecommendationTypes: Array<{ type: string; count: number; acceptanceRate: number }>;
  }> {
    const recommendations = await prisma.aIRecommendationFeedback.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalRecommendations = recommendations.length;
    const acceptedRecommendations = recommendations.filter(r => r.accepted).length;
    const acceptanceRate = totalRecommendations > 0 ? (acceptedRecommendations / totalRecommendations) * 100 : 0;

    // Group by recommendation type
    const typeStats = recommendations.reduce((acc, rec) => {
      // You'd need to join with actual recommendation data to get type
      // This is a simplified version
      const type = 'ISSUE_TO_INITIATIVE'; // Would come from actual recommendation
      if (!acc[type]) {
        acc[type] = { total: 0, accepted: 0 };
      }
      acc[type].total++;
      if (rec.accepted) {
        acc[type].accepted++;
      }
      return acc;
    }, {} as Record<string, { total: number; accepted: number }>);

    const topRecommendationTypes = Object.entries(typeStats).map(([type, stats]) => ({
      type,
      count: stats.total,
      acceptanceRate: (stats.accepted / stats.total) * 100
    }));

    return {
      totalRecommendations,
      acceptanceRate,
      topRecommendationTypes
    };
  }
}

// Export singleton
export const aiRecommendationEngine = AIRecommendationEngine.getInstance();
