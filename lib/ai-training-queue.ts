/**
 * AI Training Job Queue Service
 * BUSINESS CRITICAL: Background processing for client AI model training
 * 
 * Implements job queue for processing AI model training without blocking user requests
 * Supports priority scheduling, retry logic, and progress tracking
 */

import { logger } from '@/utils/logger';
import { aiModelCache } from '@/lib/ai-model-cache';
import { prisma } from '@/lib/prisma';

interface TrainingJob {
  id: string;
  organizationId: string;
  type: 'FEEDBACK_UPDATE' | 'FULL_RETRAIN' | 'MODEL_OPTIMIZATION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRY';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress: number;
  estimatedDuration: number;
}

interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueThroughput: number;
}

class AITrainingQueueService {
  private jobQueue: Map<string, TrainingJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3; // Limit concurrent training jobs
  private queueMetrics: QueueMetrics = {
    totalJobs: 0,
    pendingJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    queueThroughput: 0
  };
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startQueueProcessor();
  }

  /**
   * Add training job to queue
   */
  async addTrainingJob(
    organizationId: string,
    type: TrainingJob['type'],
    data: any,
    priority: TrainingJob['priority'] = 'NORMAL'
  ): Promise<string> {
    const jobId = `${organizationId}-${type}-${Date.now()}`;
    
    const job: TrainingJob = {
      id: jobId,
      organizationId,
      type,
      priority,
      data,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: type === 'FEEDBACK_UPDATE' ? 3 : 5,
      createdAt: new Date(),
      progress: 0,
      estimatedDuration: this.estimateJobDuration(type)
    };

    this.jobQueue.set(jobId, job);
    this.queueMetrics.totalJobs++;
    this.queueMetrics.pendingJobs++;

    logger.info(`AI Training Queue: Added job ${jobId} (${type}) for ${organizationId}`);
    
    // Process immediately if high priority and capacity available
    if (priority === 'URGENT' && this.activeJobs.size < this.maxConcurrentJobs) {
      setImmediate(() => this.processJob(jobId));
    }

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): TrainingJob | null {
    return this.jobQueue.get(jobId) || null;
  }

  /**
   * Get jobs for organization
   */
  getOrganizationJobs(organizationId: string): TrainingJob[] {
    return Array.from(this.jobQueue.values())
      .filter(job => job.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (!job) return false;

    if (job.status === 'RUNNING') {
      logger.warn(`AI Training Queue: Cannot cancel running job ${jobId}`);
      return false;
    }

    this.jobQueue.delete(jobId);
    this.updateMetricsForJobRemoval(job);
    
    logger.info(`AI Training Queue: Cancelled job ${jobId}`);
    return true;
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    // Update current counts
    this.queueMetrics.pendingJobs = Array.from(this.jobQueue.values())
      .filter(job => job.status === 'PENDING').length;
    this.queueMetrics.runningJobs = this.activeJobs.size;
    
    return { ...this.queueMetrics };
  }

  /**
   * Get queue health status
   */
  getHealthStatus(): {
    isProcessing: boolean;
    queueSize: number;
    activeJobs: number;
    maxConcurrent: number;
    oldestPendingJob?: Date;
  } {
    const pendingJobs = Array.from(this.jobQueue.values())
      .filter(job => job.status === 'PENDING');
    
    return {
      isProcessing: !!this.processingInterval,
      queueSize: this.jobQueue.size,
      activeJobs: this.activeJobs.size,
      maxConcurrent: this.maxConcurrentJobs,
      oldestPendingJob: pendingJobs.length > 0 
        ? new Date(Math.min(...pendingJobs.map(j => j.createdAt.getTime())))
        : undefined
    };
  }

  /**
   * Start background queue processor
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processNextJob();
    }, 5000); // Check every 5 seconds

    logger.info('AI Training Queue: Background processor started');
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return; // At capacity
    }

    const nextJob = this.getNextPendingJob();
    if (!nextJob) {
      return; // No pending jobs
    }

    await this.processJob(nextJob.id);
  }

  /**
   * Get next job to process (priority-based)
   */
  private getNextPendingJob(): TrainingJob | null {
    const pendingJobs = Array.from(this.jobQueue.values())
      .filter(job => job.status === 'PENDING' || job.status === 'RETRY');

    if (pendingJobs.length === 0) return null;

    // Sort by priority, then by creation time
    pendingJobs.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
    });

    return pendingJobs[0];
  }

  /**
   * Process individual job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobQueue.get(jobId);
    if (!job || job.status === 'RUNNING') return;

    // Mark as running
    job.status = 'RUNNING';
    job.startedAt = new Date();
    job.attempts++;
    this.activeJobs.add(jobId);

    logger.info(`AI Training Queue: Processing job ${jobId} (attempt ${job.attempts})`);

    try {
      // Process based on job type
      await this.executeTrainingJob(job);
      
      // Mark as completed
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.progress = 100;
      
      this.queueMetrics.completedJobs++;
      this.updateAverageProcessingTime(job);
      
      logger.info(`AI Training Queue: Completed job ${jobId}`);
      
    } catch (error) {
      logger.error(`AI Training Queue: Job ${jobId} failed`, error);
      
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Retry logic
      if (job.attempts < job.maxAttempts) {
        job.status = 'RETRY';
        logger.info(`AI Training Queue: Retrying job ${jobId} (attempt ${job.attempts + 1})`);
      } else {
        job.status = 'FAILED';
        this.queueMetrics.failedJobs++;
        logger.error(`AI Training Queue: Job ${jobId} permanently failed after ${job.attempts} attempts`);
      }
    } finally {
      this.activeJobs.delete(jobId);
      
      // Clean up completed/failed jobs after 24 hours
      if ((job.status === 'COMPLETED' || job.status === 'FAILED') && 
          Date.now() - job.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        this.jobQueue.delete(jobId);
      }
    }
  }

  /**
   * Execute the actual training job
   */
  private async executeTrainingJob(job: TrainingJob): Promise<void> {
    switch (job.type) {
      case 'FEEDBACK_UPDATE':
        await this.processFeedbackUpdate(job);
        break;
        
      case 'FULL_RETRAIN':
        await this.processFullRetrain(job);
        break;
        
      case 'MODEL_OPTIMIZATION':
        await this.processModelOptimization(job);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Process feedback update job
   */
  private async processFeedbackUpdate(job: TrainingJob): Promise<void> {
    job.progress = 10;
    
    // Get current model
    const cachedModel = await aiModelCache.getModel(job.organizationId);
    job.progress = 30;
    
    // Get recent feedback
    const recentFeedback = await prisma.aIRecommendationFeedback.findMany({
      where: {
        organizationId: job.organizationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    
    job.progress = 60;
    
    // Update model with new feedback patterns
    if (cachedModel && recentFeedback.length > 0) {
      const updatedModelData = this.incorporateFeedback(cachedModel.modelData, recentFeedback);
      
      // Save updated model to database
      await prisma.aIClientModel.upsert({
        where: { organizationId: job.organizationId },
        create: {
          organizationId: job.organizationId,
          modelData: updatedModelData,
          version: `${cachedModel.version}.${Date.now()}`,
          lastTrainingAt: new Date()
        },
        update: {
          modelData: updatedModelData,
          version: `${cachedModel.version}.${Date.now()}`,
          lastTrainingAt: new Date()
        }
      });
      
      // Update cache
      await aiModelCache.setModel(job.organizationId, updatedModelData, cachedModel.version);
    }
    
    job.progress = 100;
  }

  /**
   * Process full retrain job
   */
  private async processFullRetrain(job: TrainingJob): Promise<void> {
    job.progress = 10;
    
    // Get all historical data
    const allFeedback = await prisma.aIRecommendationFeedback.findMany({
      where: { organizationId: job.organizationId },
      orderBy: { createdAt: 'asc' }
    });
    
    job.progress = 40;
    
    // Rebuild model from scratch
    const newModelData = this.buildModelFromScratch(allFeedback);
    job.progress = 80;
    
    // Save new model
    await prisma.aIClientModel.upsert({
      where: { organizationId: job.organizationId },
      create: {
        organizationId: job.organizationId,
        modelData: newModelData,
        version: `2.0.${Date.now()}`,
        lastTrainingAt: new Date()
      },
      update: {
        modelData: newModelData,
        version: `2.0.${Date.now()}`,
        lastTrainingAt: new Date()
      }
    });
    
    // Update cache
    await aiModelCache.setModel(job.organizationId, newModelData, '2.0');
    job.progress = 100;
  }

  /**
   * Process model optimization job
   */
  private async processModelOptimization(job: TrainingJob): Promise<void> {
    // Placeholder for model optimization logic
    job.progress = 50;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
    job.progress = 100;
  }

  /**
   * Helper methods for model training
   */
  private incorporateFeedback(currentModel: any, feedback: any[]): any {
    // Simplified feedback incorporation
    const updatedModel = { ...currentModel };
    
    // Update acceptance patterns
    feedback.forEach(fb => {
      if (fb.accepted) {
        updatedModel.acceptanceRate = (updatedModel.acceptanceRate || 0.5) * 0.9 + 0.1;
      } else {
        updatedModel.acceptanceRate = (updatedModel.acceptanceRate || 0.5) * 0.9;
      }
    });
    
    return updatedModel;
  }

  private buildModelFromScratch(feedback: any[]): any {
    // Simplified model building
    return {
      version: '2.0',
      acceptanceRate: feedback.length > 0 
        ? feedback.filter(f => f.accepted).length / feedback.length 
        : 0.5,
      totalFeedback: feedback.length,
      lastTrained: new Date()
    };
  }

  private estimateJobDuration(type: TrainingJob['type']): number {
    const durations = {
      'FEEDBACK_UPDATE': 30000,   // 30 seconds
      'FULL_RETRAIN': 300000,     // 5 minutes
      'MODEL_OPTIMIZATION': 120000 // 2 minutes
    };
    return durations[type];
  }

  private updateMetricsForJobRemoval(job: TrainingJob): void {
    this.queueMetrics.totalJobs--;
    if (job.status === 'PENDING') this.queueMetrics.pendingJobs--;
  }

  private updateAverageProcessingTime(job: TrainingJob): void {
    if (job.startedAt && job.completedAt) {
      const processingTime = job.completedAt.getTime() - job.startedAt.getTime();
      const currentAvg = this.queueMetrics.averageProcessingTime;
      const completedCount = this.queueMetrics.completedJobs;
      
      this.queueMetrics.averageProcessingTime = 
        (currentAvg * (completedCount - 1) + processingTime) / completedCount;
    }
  }
}

// Singleton instance
export const aiTrainingQueue = new AITrainingQueueService();

// Helper functions for API usage
export async function queueModelTraining(
  organizationId: string, 
  type: 'FEEDBACK_UPDATE' | 'FULL_RETRAIN' | 'MODEL_OPTIMIZATION',
  data?: any,
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
): Promise<string> {
  return await aiTrainingQueue.addTrainingJob(organizationId, type, data, priority);
}

export function getTrainingJobStatus(jobId: string) {
  return aiTrainingQueue.getJobStatus(jobId);
}

export function getTrainingQueueMetrics() {
  return aiTrainingQueue.getMetrics();
}

export function getTrainingQueueHealth() {
  return aiTrainingQueue.getHealthStatus();
}
