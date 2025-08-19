import { multiModelAI } from './MultiModelService';
import type { AIAnalysisData } from '../../components/executive/AIAnalysisCard';

interface Issue {
  id: string;
  description: string;
  category: string | null;
  department: string | null;
  keywords: string[];
  votes: number;
  heatmapScore: number;
  createdAt?: Date | string;
}

interface ClusterTheme {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  impactLevel: 'strategic' | 'operational' | 'tactical';
  issueCount?: number;
  averageScore?: number;
}

interface BusinessArea {
  id: string;
  name: string;
  description: string;
  clusters: ClusterTheme[];
}

export class ExecutiveAIAnalysis {
  
  async generateClusterAnalysis(
    cluster: ClusterTheme,
    businessArea: BusinessArea,
    relatedIssues: Issue[]
  ): Promise<AIAnalysisData> {
    try {
      const prompt = this.buildClusterAnalysisPrompt(cluster, businessArea, relatedIssues);
      
      const response = await multiModelAI.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 800,
        temperature: 0.3,
        systemPrompt: this.getExecutiveSystemPrompt(),
        responseFormat: 'json',
      });

      const analysis = JSON.parse(response.content);
      
      return {
        summary: analysis.summary || this.generateFallbackSummary(cluster, relatedIssues),
        rootCauses: analysis.rootCauses || this.generateFallbackRootCauses(cluster, relatedIssues),
        recommendations: analysis.recommendations || this.generateFallbackRecommendations(cluster),
        confidence: Math.min(95, response.usage.totalTokens > 500 ? 85 : 75),
        impactEstimate: this.calculateImpactEstimate(cluster, relatedIssues),
        timeToResolve: analysis.timeToResolve || this.estimateTimeToResolve(cluster),
        costEstimate: analysis.costEstimate || this.estimateCost(cluster, relatedIssues),
        trend: analysis.trend || this.analyzeTrend(relatedIssues),
        keyMetrics: {
          productivityImpact: this.calculateProductivityImpact(relatedIssues),
          departmentsAffected: this.countAffectedDepartments(relatedIssues),
          estimatedHours: this.estimateResolutionHours(cluster, relatedIssues),
        },
      };
    } catch (error) {
      console.error('AI analysis generation failed:', error);
      return this.generateFallbackAnalysis(cluster, businessArea, relatedIssues);
    }
  }

  async generateBusinessAreaSummary(
    businessArea: BusinessArea,
    allIssues: Issue[]
  ): Promise<string> {
    try {
      const areaIssues = allIssues.filter(issue => 
        businessArea.clusters.some(cluster =>
          cluster.keywords.some(keyword =>
            issue.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase())) ||
            issue.description.toLowerCase().includes(keyword.toLowerCase())
          )
        )
      );

      const prompt = this.buildBusinessAreaSummaryPrompt(businessArea, areaIssues);
      
      const response = await multiModelAI.generateCompletion(prompt, {
        model: 'gpt-4',
        maxTokens: 300,
        temperature: 0.3,
        systemPrompt: this.getExecutiveSystemPrompt(),
      });

      return response.content || this.generateFallbackBusinessAreaSummary(businessArea, areaIssues);
    } catch (error) {
      console.error('Business area summary generation failed:', error);
      return this.generateFallbackBusinessAreaSummary(businessArea, allIssues);
    }
  }

  private getExecutiveSystemPrompt(): string {
    return `You are an executive business intelligence analyst specializing in organizational efficiency and strategic decision-making. 

Your role is to:
1. Analyze operational issues from a C-suite perspective
2. Provide strategic recommendations with business impact focus
3. Use executive-appropriate language (avoid technical jargon)
4. Focus on ROI, productivity, and competitive advantage
5. Provide actionable insights for immediate decision-making

Guidelines:
- Be concise but comprehensive
- Focus on business outcomes, not technical details
- Quantify impact when possible
- Prioritize strategic over tactical concerns
- Use confident, decisive language appropriate for executives`;
  }

  private buildClusterAnalysisPrompt(cluster: ClusterTheme, businessArea: BusinessArea, issues: Issue[]): string {
    const issueDescriptions = issues.slice(0, 5).map(i => i.description).join('\n- ');
    const avgScore = issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length;
    const totalVotes = issues.reduce((sum, i) => sum + i.votes, 0);

    return `Analyze the following business cluster for executive decision-making:

BUSINESS AREA: ${businessArea.name}
CLUSTER: ${cluster.name}
DESCRIPTION: ${cluster.description}
IMPACT LEVEL: ${cluster.impactLevel}
ISSUES COUNT: ${issues.length}
AVERAGE SEVERITY: ${avgScore.toFixed(1)}
TOTAL STAKEHOLDER VOTES: ${totalVotes}

KEY ISSUES:
- ${issueDescriptions}

Please provide a JSON response with:
{
  "summary": "Executive summary (2-3 sentences focusing on business impact)",
  "rootCauses": ["Primary root cause", "Secondary root cause"],
  "recommendations": ["Immediate action", "Short-term strategy", "Long-term solution"],
  "timeToResolve": "X-Y months",
  "costEstimate": "$X-Y range",
  "trend": "improving|stable|declining"
}

Focus on strategic business impact, not technical implementation details.`;
  }

  private buildBusinessAreaSummaryPrompt(businessArea: BusinessArea, issues: Issue[]): string {
    const activeClusters = businessArea.clusters.filter(c => (c.issueCount || 0) > 0);
    const totalIssues = issues.length;
    const avgScore = issues.length > 0 ? issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length : 0;

    return `Create an executive summary for this business area:

BUSINESS AREA: ${businessArea.name}
DESCRIPTION: ${businessArea.description}
ACTIVE CLUSTERS: ${activeClusters.length}
TOTAL ISSUES: ${totalIssues}
AVERAGE SEVERITY: ${avgScore.toFixed(1)}

CLUSTER THEMES:
${activeClusters.map(c => `- ${c.name}: ${c.issueCount} issues (${c.impactLevel})`).join('\n')}

Provide a 2-3 sentence executive summary focusing on:
1. Overall business impact
2. Key productivity or efficiency concerns
3. Strategic importance for leadership attention

Use executive-appropriate language without technical jargon.`;
  }

  private generateFallbackAnalysis(
    cluster: ClusterTheme,
    businessArea: BusinessArea,
    issues: Issue[]
  ): AIAnalysisData {
    return {
      summary: this.generateFallbackSummary(cluster, issues),
      rootCauses: this.generateFallbackRootCauses(cluster, issues),
      recommendations: this.generateFallbackRecommendations(cluster),
      confidence: 65,
      impactEstimate: this.calculateImpactEstimate(cluster, issues),
      timeToResolve: this.estimateTimeToResolve(cluster),
      costEstimate: this.estimateCost(cluster, issues),
      trend: this.analyzeTrend(issues),
      keyMetrics: {
        productivityImpact: this.calculateProductivityImpact(issues),
        departmentsAffected: this.countAffectedDepartments(issues),
        estimatedHours: this.estimateResolutionHours(cluster, issues),
      },
    };
  }

  private generateFallbackSummary(cluster: ClusterTheme, issues: Issue[]): string {
    const avgScore = issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length;
    const impactText = avgScore > 70 ? 'significant operational impact' : 'moderate operational impact';
    
    return `The ${cluster.name.toLowerCase()} cluster contains ${issues.length} issues with ${impactText}. This ${cluster.impactLevel} priority area requires executive attention to maintain operational efficiency and competitive advantage.`;
  }

  private generateFallbackRootCauses(cluster: ClusterTheme, issues: Issue[]): string[] {
    const causes = [];
    
    if (cluster.name.toLowerCase().includes('communication')) {
      causes.push('Lack of standardized communication protocols across departments');
      causes.push('Insufficient information sharing and coordination mechanisms');
    } else if (cluster.name.toLowerCase().includes('technology')) {
      causes.push('Outdated systems and insufficient technology infrastructure');
      causes.push('Lack of integrated technology solutions and optimization');
    } else if (cluster.name.toLowerCase().includes('process')) {
      causes.push('Inefficient workflow processes and operational procedures');
      causes.push('Lack of standardization and process optimization');
    } else {
      causes.push('Insufficient resource allocation and strategic planning');
      causes.push('Lack of systematic approach to issue resolution');
    }
    
    return causes.slice(0, 2);
  }

  private generateFallbackRecommendations(cluster: ClusterTheme): string[] {
    const recommendations = [];
    
    if (cluster.impactLevel === 'strategic') {
      recommendations.push('Immediate executive review and strategic planning session');
      recommendations.push('Allocate dedicated resources and establish project timeline');
      recommendations.push('Implement comprehensive solution with measurable KPIs');
    } else if (cluster.impactLevel === 'operational') {
      recommendations.push('Assign operational team lead and establish improvement plan');
      recommendations.push('Implement process improvements and monitoring systems');
      recommendations.push('Regular review and optimization of operational procedures');
    } else {
      recommendations.push('Delegate to appropriate team with clear deliverables');
      recommendations.push('Implement tactical solutions and best practices');
      recommendations.push('Monitor progress and scale successful approaches');
    }
    
    return recommendations;
  }

  private generateFallbackBusinessAreaSummary(businessArea: BusinessArea, issues: Issue[]): string {
    const activeClusters = businessArea.clusters.filter(c => (c.issueCount || 0) > 0);
    const totalIssues = issues.length;
    
    if (totalIssues === 0) {
      return `${businessArea.name} is operating efficiently with no significant issues requiring executive attention. Continue monitoring for emerging challenges.`;
    }
    
    const impactLevel = totalIssues > 5 ? 'significant' : totalIssues > 2 ? 'moderate' : 'minimal';
    
    return `${businessArea.name} shows ${impactLevel} operational challenges across ${activeClusters.length} key areas with ${totalIssues} total issues. Strategic attention recommended to optimize performance and maintain competitive advantage.`;
  }

  private calculateImpactEstimate(cluster: ClusterTheme, issues: Issue[]): string {
    const avgScore = issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length;
    
    if (avgScore > 80) return '15-25% productivity impact';
    if (avgScore > 60) return '10-15% productivity impact';
    if (avgScore > 40) return '5-10% productivity impact';
    return '2-5% productivity impact';
  }

  private estimateTimeToResolve(cluster: ClusterTheme): string {
    switch (cluster.impactLevel) {
      case 'strategic': return '6-12 months';
      case 'operational': return '3-6 months';
      case 'tactical': return '1-3 months';
      default: return '3-6 months';
    }
  }

  private estimateCost(cluster: ClusterTheme, issues: Issue[]): string {
    const complexity = issues.length * (issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length);
    
    if (complexity > 500) return '$50K-100K+';
    if (complexity > 300) return '$25K-50K';
    if (complexity > 150) return '$10K-25K';
    return '$5K-15K';
  }

  private analyzeTrend(issues: Issue[]): 'improving' | 'stable' | 'declining' {
    // Simple trend analysis based on creation dates and scores
    const recentIssues = issues.filter(i => {
      const createdAt = i.createdAt ? new Date(i.createdAt).getTime() : Date.now();
      return createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000;
    });
    
    if (recentIssues.length === 0) return 'stable';
    if (recentIssues.length > issues.length * 0.5) return 'declining';
    if (recentIssues.length < issues.length * 0.2) return 'improving';
    return 'stable';
  }

  private calculateProductivityImpact(issues: Issue[]): string {
    const totalVotes = issues.reduce((sum, i) => sum + i.votes, 0);
    const avgScore = issues.reduce((sum, i) => sum + i.heatmapScore, 0) / issues.length;
    
    if (totalVotes > 20 && avgScore > 70) return '15-20% loss';
    if (totalVotes > 10 && avgScore > 50) return '10-15% loss';
    if (totalVotes > 5) return '5-10% loss';
    return '2-5% loss';
  }

  private countAffectedDepartments(issues: Issue[]): number {
    const departments = new Set(issues.map(i => i.department).filter(Boolean));
    return departments.size || 1;
  }

  private estimateResolutionHours(cluster: ClusterTheme, issues: Issue[]): number {
    const baseHours = issues.length * 8; // 8 hours per issue base
    const complexityMultiplier = cluster.impactLevel === 'strategic' ? 3 : 
                                cluster.impactLevel === 'operational' ? 2 : 1;
    
    return Math.round(baseHours * complexityMultiplier);
  }
}

// Singleton instance
export const executiveAIAnalysis = new ExecutiveAIAnalysis();
