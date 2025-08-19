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

export class AIRecommendationEngine {
  private static instance: AIRecommendationEngine;

  static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
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

    const recommendations: AIRecommendation[] = [];

    // 1. Recommend existing initiatives
    const initiativeRecommendations = await this.recommendInitiatives(issue, context);
    recommendations.push(...initiativeRecommendations);

    // 2. Recommend clustering with similar issues
    const clusterRecommendations = await this.recommendClusters(issue, context);
    recommendations.push(...clusterRecommendations);

    // 3. Recommend existing solutions
    const solutionRecommendations = await this.recommendSolutions(issue, context);
    recommendations.push(...solutionRecommendations);

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Recommend initiatives for an issue
   */
  private async recommendInitiatives(
    issue: any,
    context: RecommendationContext
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
    context: RecommendationContext
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
    context: RecommendationContext
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
    organizationId: string
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
