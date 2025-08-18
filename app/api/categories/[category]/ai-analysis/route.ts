import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openAIService } from '@/lib/openai';
import { aiServiceMonitor } from '@/lib/ai-service-monitor';
import { aiConfigLoader } from '@/lib/ai-config-loader';
import { systemConfig } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

interface CategoryAnalysisParams {
  category: string;
}

interface CategoryAIAnalysis {
  categorySummary: string;
  crossIssuePatterns: string[];
  impactAnalysis: {
    businessImpact: 'HIGH' | 'MEDIUM' | 'LOW';
    affectedDepartments: string[];
    estimatedProductivityLoss: string;
    totalIssueCount: number;
    criticalIssueCount: number;
  };
  strategicRecommendations: string[];
  priorityIssues: string[];
  rootCauseAnalysis: string[];
  implementationRoadmap: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  confidence: number;
  generatedAt: string;
}

export async function POST(request: NextRequest, { params }: { params: CategoryAnalysisParams }) {
  try {
    const { category } = params;

    // Ensure AI configuration is loaded
    await aiConfigLoader.loadConfig();

    // Validate AI service availability
    if (!aiConfigLoader.isConfigured()) {
      return NextResponse.json(
        { error: 'AI analysis not available - OpenAI not configured' },
        { status: 503 }
      );
    }

    // Decode category name (handle URL encoding)
    const decodedCategory = decodeURIComponent(category);

    // Fetch all issues in this category
    const issues = await prisma.issue.findMany({
      where: {
        OR: [
          { category: { contains: decodedCategory, mode: 'insensitive' } },
          { description: { contains: decodedCategory, mode: 'insensitive' } },
          { keywords: { has: decodedCategory } },
        ],
      },
      include: {
        cluster: true,
      },
      orderBy: [{ heatmapScore: 'desc' }, { votes: 'desc' }, { createdAt: 'desc' }],
    });

    if (issues.length === 0) {
      return NextResponse.json({ error: 'No issues found for this category' }, { status: 404 });
    }

    // Use OpenAI service singleton
    // openAIService is already configured via ai-config-loader

    // Prepare context data for AI analysis
    const issueDescriptions = issues.map((issue) => issue.description).join('\n- ');
    const departmentCounts = issues.reduce(
      (acc, issue) => {
        if (issue.department) {
          acc[issue.department] = (acc[issue.department] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const criticalIssues = issues.filter((issue) => issue.heatmapScore >= 80);
    const averageScore = issues.reduce((sum, issue) => sum + issue.heatmapScore, 0) / issues.length;

    // Construct comprehensive AI prompt
    const prompt = `
You are an expert business analyst and AI strategist. Analyze the following category of workplace issues and provide strategic insights.

CATEGORY: ${decodedCategory}
TOTAL ISSUES: ${issues.length}
CRITICAL ISSUES (80+ score): ${criticalIssues.length}
AVERAGE SEVERITY SCORE: ${averageScore.toFixed(1)}
AFFECTED DEPARTMENTS: ${Object.keys(departmentCounts).join(', ')}

INDIVIDUAL ISSUES:
- ${issueDescriptions}

Please provide a comprehensive analysis in the following JSON format:

{
  "categorySummary": "Executive-level summary of the category's overall impact and significance (2-3 sentences)",
  "crossIssuePatterns": ["3-4 key patterns, themes, or common threads across all issues"],
  "impactAnalysis": {
    "businessImpact": "HIGH|MEDIUM|LOW based on severity and scope",
    "affectedDepartments": ["list of departments impacted"],
    "estimatedProductivityLoss": "percentage or dollar estimate of productivity impact",
    "totalIssueCount": ${issues.length},
    "criticalIssueCount": ${criticalIssues.length}
  },
  "strategicRecommendations": ["3-4 specific, actionable strategic recommendations for executives"],
  "priorityIssues": ["IDs or brief descriptions of the 2-3 highest-impact issues requiring immediate attention"],
  "rootCauseAnalysis": ["2-3 underlying systemic causes contributing to these issues"],
  "implementationRoadmap": {
    "immediate": ["2-3 actions for next 30 days"],
    "shortTerm": ["2-3 actions for next 90 days"],
    "longTerm": ["2-3 strategic initiatives for 6+ months"]
  },
  "confidence": 85
}

Focus on strategic business value, executive decision-making, and actionable insights. Consider the interconnections between issues and their cumulative impact on organizational effectiveness.
`;

    // Track AI operation
    const startTime = Date.now();

    try {
      // Get AI configuration for categorization operation
      const aiConfig = await systemConfig.getAIOperationConfig('categorization');

      // Generate AI analysis using the service method
      const analysisResult = await openAIService.generateCompletion(prompt, {
        model: aiConfig.model,
        maxTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
      });

      if (!analysisResult) {
        throw new Error('No content received from AI service');
      }
      
      const content = analysisResult;

      // Parse and validate response
      let analysisData: CategoryAIAnalysis;
      try {
        // Handle potential markdown formatting
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonContent = jsonMatch ? jsonMatch[0] : content;
        const parsedData = JSON.parse(jsonContent);

        // Validate required fields and provide defaults
        analysisData = {
          categorySummary:
            parsedData.categorySummary ||
            `Analysis of ${decodedCategory} category with ${issues.length} identified issues.`,
          crossIssuePatterns: Array.isArray(parsedData.crossIssuePatterns)
            ? parsedData.crossIssuePatterns
            : ['Multiple related issues identified'],
          impactAnalysis: {
            businessImpact:
              parsedData.impactAnalysis?.businessImpact ||
              (averageScore >= 70 ? 'HIGH' : averageScore >= 50 ? 'MEDIUM' : 'LOW'),
            affectedDepartments:
              parsedData.impactAnalysis?.affectedDepartments || Object.keys(departmentCounts),
            estimatedProductivityLoss:
              parsedData.impactAnalysis?.estimatedProductivityLoss ||
              `${Math.round(averageScore / 10)}% productivity impact estimated`,
            totalIssueCount: issues.length,
            criticalIssueCount: criticalIssues.length,
          },
          strategicRecommendations: Array.isArray(parsedData.strategicRecommendations)
            ? parsedData.strategicRecommendations
            : ['Comprehensive review and action plan recommended'],
          priorityIssues: Array.isArray(parsedData.priorityIssues)
            ? parsedData.priorityIssues
            : criticalIssues.slice(0, 3).map((issue) => issue.description.substring(0, 100)),
          rootCauseAnalysis: Array.isArray(parsedData.rootCauseAnalysis)
            ? parsedData.rootCauseAnalysis
            : ['Systemic analysis required'],
          implementationRoadmap: {
            immediate: Array.isArray(parsedData.implementationRoadmap?.immediate)
              ? parsedData.implementationRoadmap.immediate
              : ['Prioritize critical issues'],
            shortTerm: Array.isArray(parsedData.implementationRoadmap?.shortTerm)
              ? parsedData.implementationRoadmap.shortTerm
              : ['Develop comprehensive action plan'],
            longTerm: Array.isArray(parsedData.implementationRoadmap?.longTerm)
              ? parsedData.implementationRoadmap.longTerm
              : ['Implement systematic improvements'],
          },
          confidence: parsedData.confidence || 75,
          generatedAt: new Date().toISOString(),
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Provide fallback analysis
        analysisData = {
          categorySummary: `The ${decodedCategory} category contains ${issues.length} issues with an average severity of ${averageScore.toFixed(1)}. This represents a significant area requiring strategic attention.`,
          crossIssuePatterns: [
            'Multiple interconnected issues identified',
            'Common themes requiring systematic approach',
          ],
          impactAnalysis: {
            businessImpact: averageScore >= 70 ? 'HIGH' : averageScore >= 50 ? 'MEDIUM' : 'LOW',
            affectedDepartments: Object.keys(departmentCounts),
            estimatedProductivityLoss: `${Math.round(averageScore / 10)}% estimated productivity impact`,
            totalIssueCount: issues.length,
            criticalIssueCount: criticalIssues.length,
          },
          strategicRecommendations: [
            'Conduct detailed analysis of critical issues',
            'Implement systematic monitoring and tracking',
            'Develop comprehensive action plan with timelines',
          ],
          priorityIssues: criticalIssues
            .slice(0, 3)
            .map((issue) => issue.description.substring(0, 100)),
          rootCauseAnalysis: ['Requires detailed investigation of underlying causes'],
          implementationRoadmap: {
            immediate: ['Address highest-priority critical issues'],
            shortTerm: ['Develop systematic approach to category improvement'],
            longTerm: ['Implement preventive measures and monitoring'],
          },
          confidence: 60,
          generatedAt: new Date().toISOString(),
        };
      }

      // Include associated issues data in response
      const issuesForResponse = issues.map((issue) => ({
        id: issue.id,
        description: issue.description,
        heatmapScore: issue.heatmapScore,
        votes: issue.votes,
        department: issue.department,
        category: issue.category,
        status: issue.status,
      }));

      const responseData = {
        ...analysisData,
        associatedIssues: issuesForResponse,
      };

      // Record successful operation
      aiServiceMonitor.recordOperation(
        true,
        Date.now() - startTime
      );

      return NextResponse.json(responseData);
    } catch (aiError) {
      console.error('AI service error:', aiError);
      aiServiceMonitor.recordOperation(false, Date.now() - startTime, 'AI_SERVICE_ERROR');

      return NextResponse.json(
        {
          error: 'Failed to generate AI analysis',
          details: aiError instanceof Error ? aiError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Category AI analysis error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
