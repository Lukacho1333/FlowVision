import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AIMigration from '@/lib/ai-migration';

// Database-driven taxonomy loading
async function loadTaxonomyFromDatabase() {
  try {
    const businessAreas = await prisma.systemCategory.findMany({
      where: {
        type: 'PROCESS',
        isActive: true,
        tags: { has: 'business-area' },
      },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    const departments = await prisma.systemCategory.findMany({
      where: {
        type: 'PEOPLE',
        isActive: true,
        tags: { has: 'department' },
      },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    const impactTypes = await prisma.systemCategory.findMany({
      where: {
        type: 'PROCESS',
        isActive: true,
        tags: { has: 'impact-type' },
      },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });

    return {
      businessAreas: businessAreas.map((cat) => cat.name),
      departments: departments.map((cat) => cat.name),
      impactTypes: impactTypes.map((cat) => cat.name),
    };
  } catch (error) {
    console.error('Failed to load taxonomy from database:', error);
    // Fallback to default categories if database fails
    return {
      businessAreas: [
        'Operations',
        'People & Culture',
        'Technology',
        'Financial',
        'Strategy',
        'Compliance',
      ],
      departments: [
        'Engineering',
        'Sales',
        'Marketing',
        'HR',
        'Finance',
        'Operations',
        'Leadership',
        'Customer Service',
        'Legal',
        'IT',
      ],
      impactTypes: [
        'Productivity Loss',
        'Employee Satisfaction',
        'Customer Impact',
        'Revenue Impact',
        'Cost Increase',
        'Risk/Compliance',
        'Quality Issues',
        'Communication Problems',
      ],
    };
  }
}

interface CategorySuggestion {
  businessArea: string;
  confidence: number;
  reasoning: string;
}

interface DepartmentSuggestion {
  department: string;
  confidence: number;
  reasoning: string;
}

interface ImpactSuggestion {
  impactType: string;
  confidence: number;
  reasoning: string;
}

interface CategorySuggestionsResponse {
  suggestions: {
    businessAreas: CategorySuggestion[];
    departments: DepartmentSuggestion[];
    impactTypes: ImpactSuggestion[];
  };
  duplicateCheck: {
    isDuplicate: boolean;
    similarIssues: Array<{
      id: string;
      description: string;
      similarity: number;
    }>;
  };
  aiConfidence: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Issue description is required' }, { status: 400 });
    }

    // Get business context for better suggestions
    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: user.id },
    });

    const businessContext = businessProfile
      ? {
          industry: businessProfile.industry,
          size: businessProfile.size,
          metrics: businessProfile.metrics,
        }
      : undefined;

    // Load taxonomy from database
    const taxonomy = await loadTaxonomyFromDatabase();

    // Generate AI category suggestions
    console.log(
      '🤖 Generating AI suggestions for description:',
      description.substring(0, 100) + '...'
    );
    const suggestions = await generateCategorySuggestions(description, businessContext, taxonomy);

    // Check for duplicate issues
    const duplicateCheck = await checkForDuplicates(description);

    // Log the AI usage
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_CATEGORY_SUGGESTION',
        details: {
          description: description.substring(0, 100) + '...',
          hasSuggestions: !!suggestions,
          duplicatesFound: duplicateCheck.isDuplicate,
        },
      },
    });

    return NextResponse.json({
      suggestions,
      duplicateCheck,
      aiConfidence: suggestions ? 85 : 0,
    });
  } catch (error) {
    console.error('Category suggestion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate category suggestions',
        fallback: 'AI categorization temporarily unavailable. Please select categories manually.',
      },
      { status: 500 }
    );
  }
}

async function generateCategorySuggestions(
  description: string,
  businessContext?: any,
  taxonomy?: { businessAreas: string[]; departments: string[]; impactTypes: string[] }
): Promise<CategorySuggestionsResponse['suggestions'] | null> {
  if (!taxonomy) {
    console.error('No taxonomy provided for AI categorization');
    return null;
  }

  try {
    console.log('📝 Creating AI prompt with taxonomy:', {
      businessAreas: taxonomy.businessAreas.slice(0, 3),
      departments: taxonomy.departments.slice(0, 3),
      impactTypes: taxonomy.impactTypes.slice(0, 3),
    });

    const prompt = `
Analyze this business issue and suggest appropriate categorization for a ${businessContext?.industry || 'business'} company:

Issue: "${description}"

Categorize this issue into:

1. BUSINESS AREA (select 1-2 most relevant):
${taxonomy.businessAreas.map((area) => `- ${area}`).join('\n')}

2. DEPARTMENTS (select 1-3 most affected):
${taxonomy.departments.map((dept) => `- ${dept}`).join('\n')}

3. IMPACT TYPES (select 1-2 most relevant):
${taxonomy.impactTypes.map((impact) => `- ${impact}`).join('\n')}

Respond in this exact JSON format:
{
  "businessAreas": [
    {"businessArea": "Operations", "confidence": 90, "reasoning": "Brief explanation"}
  ],
  "departments": [
    {"department": "Engineering", "confidence": 85, "reasoning": "Brief explanation"}
  ],
  "impactTypes": [
    {"impactType": "Productivity Loss", "confidence": 80, "reasoning": "Brief explanation"}
  ]
}

Use confidence scores 0-100 based on how clearly the issue fits each category.
`;

    const response = await AIMigration.generateStructuredResponse(prompt);

    if (!response) {
      console.error('❌ AI service returned null response');
      return null;
    }

    // Parse the JSON response
    try {
      const parsed = JSON.parse(response);

      // Validate the response structure
      if (parsed.businessAreas && parsed.departments && parsed.impactTypes) {
        return parsed;
      }

      return null;
    } catch (parseError) {
      console.error('Failed to parse AI category response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('AI category generation error:', error);
    return null;
  }
}

async function checkForDuplicates(
  description: string
): Promise<CategorySuggestionsResponse['duplicateCheck']> {
  try {
    // Get recent issues to check for duplicates
    const recentIssues = await prisma.issue.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
      },
    });

    // Simple keyword-based duplicate detection
    const keywords = extractKeywords(description);
    const similarIssues = [];

    for (const issue of recentIssues) {
      const similarity = calculateSimilarity(keywords, extractKeywords(issue.description));

      if (similarity > 0.7) {
        similarIssues.push({
          id: issue.id,
          description: issue.description.substring(0, 100) + '...',
          similarity: Math.round(similarity * 100),
        });
      }
    }

    return {
      isDuplicate: similarIssues.length > 0,
      similarIssues: similarIssues.slice(0, 3), // Top 3 matches
    };
  } catch (error) {
    console.error('Duplicate check error:', error);
    return {
      isDuplicate: false,
      similarIssues: [],
    };
  }
}

function extractKeywords(text: string): string[] {
  // Extract meaningful keywords from text
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'can',
    'may',
    'might',
    'must',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
