/**
 * Executive-Friendly Clustering System
 * Transforms technical categories into business area hierarchies
 * for executive-level understanding and strategic decision making
 */

export interface BusinessArea {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  priority: number;
  clusters: ClusterTheme[];
}

export interface ClusterTheme {
  id: string;
  name: string;
  businessAreaId: string;
  description: string;
  keywords: string[];
  technicalCategories: string[];
  impactLevel: 'strategic' | 'operational' | 'tactical';
  issueCount?: number;
  averageScore?: number;
}

export interface ExecutiveClusterView {
  businessAreas: BusinessArea[];
  totalIssues: number;
  strategicIssues: number;
  operationalIssues: number;
  tacticalIssues: number;
}

// Business Area Definitions for Architecture & Engineering Firms
export const BUSINESS_AREAS: BusinessArea[] = [
  {
    id: 'operations-delivery',
    name: 'Operations & Delivery',
    icon: '🏢',
    description: 'Project execution, resource management, and operational efficiency',
    color: '#3B82F6', // Blue
    priority: 1,
    clusters: [
      {
        id: 'project-coordination',
        name: 'Project Coordination & Management',
        businessAreaId: 'operations-delivery',
        description: 'Project timeline, resource allocation, and coordination challenges',
        keywords: ['project management', 'coordination', 'timeline', 'resources', 'scheduling'],
        technicalCategories: ['Process', 'Management', 'Project Management'],
        impactLevel: 'operational',
      },
      {
        id: 'quality-standards',
        name: 'Quality & Standards',
        businessAreaId: 'operations-delivery',
        description: 'Design standards, quality control, and compliance issues',
        keywords: ['quality', 'standards', 'compliance', 'review', 'consistency'],
        technicalCategories: ['Process', 'Quality'],
        impactLevel: 'strategic',
      },
      {
        id: 'resource-allocation',
        name: 'Resource Allocation & Capacity',
        businessAreaId: 'operations-delivery',
        description: 'Workload distribution, capacity planning, and resource optimization',
        keywords: ['workload', 'capacity', 'allocation', 'utilization', 'burnout'],
        technicalCategories: ['Process', 'Management'],
        impactLevel: 'operational',
      },
    ],
  },
  {
    id: 'people-culture',
    name: 'People & Culture',
    icon: '🧑‍💼',
    description: 'Team development, communication, and organizational culture',
    color: '#10B981', // Green
    priority: 2,
    clusters: [
      {
        id: 'leadership-management',
        name: 'Leadership & Management',
        businessAreaId: 'people-culture',
        description: 'Management effectiveness, decision-making, and leadership clarity',
        keywords: ['management', 'leadership', 'priorities', 'decision making', 'direction'],
        technicalCategories: ['People', 'Management'],
        impactLevel: 'strategic',
      },
      {
        id: 'professional-development',
        name: 'Professional Development',
        businessAreaId: 'people-culture',
        description: 'Career growth, skills training, and employee advancement',
        keywords: ['training', 'development', 'career', 'skills', 'mentorship'],
        technicalCategories: ['People', 'Training'],
        impactLevel: 'strategic',
      },
      {
        id: 'communication-collaboration',
        name: 'Communication & Collaboration',
        businessAreaId: 'people-culture',
        description: 'Team communication, information sharing, and collaborative workflows',
        keywords: ['communication', 'collaboration', 'information', 'coordination', 'teams'],
        technicalCategories: ['People', 'Process', 'Communication'],
        impactLevel: 'operational',
      },
    ],
  },
  {
    id: 'client-business',
    name: 'Client & Business Development',
    icon: '💼',
    description: 'Client relationships, business processes, and growth initiatives',
    color: '#F59E0B', // Amber
    priority: 3,
    clusters: [
      {
        id: 'client-communication',
        name: 'Client Communication',
        businessAreaId: 'client-business',
        description: 'Client interaction, feedback management, and service delivery',
        keywords: ['client', 'communication', 'feedback', 'service', 'satisfaction'],
        technicalCategories: ['Process', 'Communication', 'Client'],
        impactLevel: 'strategic',
      },
      {
        id: 'change-management',
        name: 'Change Management',
        businessAreaId: 'client-business',
        description: 'Change request handling, scope management, and project adaptability',
        keywords: ['change', 'scope', 'requests', 'adaptability', 'flexibility'],
        technicalCategories: ['Process', 'Management'],
        impactLevel: 'operational',
      },
      {
        id: 'business-process',
        name: 'Business Process Optimization',
        businessAreaId: 'client-business',
        description: 'Process improvements, efficiency gains, and workflow optimization',
        keywords: ['process', 'optimization', 'efficiency', 'workflow', 'improvement'],
        technicalCategories: ['Process', 'Business'],
        impactLevel: 'tactical',
      },
    ],
  },
  {
    id: 'technology-infrastructure',
    name: 'Technology & Infrastructure',
    icon: '🔧',
    description: 'Technical systems, tools, and infrastructure supporting operations',
    color: '#8B5CF6', // Purple
    priority: 4,
    clusters: [
      {
        id: 'design-technology',
        name: 'Design Technology & CAD',
        businessAreaId: 'technology-infrastructure',
        description: 'CAD software, design tools, and technical infrastructure',
        keywords: ['CAD', 'design software', 'technology', 'tools', 'technical'],
        technicalCategories: ['Technology', 'CAD', 'Software'],
        impactLevel: 'operational',
      },
      {
        id: 'it-systems',
        name: 'IT Systems & Security',
        businessAreaId: 'technology-infrastructure',
        description: 'IT infrastructure, data security, and system reliability',
        keywords: ['IT', 'systems', 'security', 'infrastructure', 'reliability'],
        technicalCategories: ['Technology', 'IT', 'Security'],
        impactLevel: 'tactical',
      },
      {
        id: 'data-management',
        name: 'Data Management',
        businessAreaId: 'technology-infrastructure',
        description: 'File management, data organization, and information systems',
        keywords: ['data', 'files', 'management', 'organization', 'storage'],
        technicalCategories: ['Technology', 'Data'],
        impactLevel: 'tactical',
      },
    ],
  },
];

/**
 * Categorizes issues into executive-friendly business areas and clusters
 */
export function categorizeIssuesForExecutives(issues: any[]): ExecutiveClusterView {
  const businessAreasWithData = BUSINESS_AREAS.map(area => ({
    ...area,
    clusters: area.clusters.map(cluster => ({
      ...cluster,
      issueCount: 0,
      averageScore: 0,
    })),
  }));

  let totalIssues = 0;
  let strategicIssues = 0;
  let operationalIssues = 0;
  let tacticalIssues = 0;

  // Categorize each issue
  issues.forEach(issue => {
    const category = issue.category || 'Process';
    const keywords = issue.keywords || [];
    const description = issue.description || '';
    
    // Find best matching cluster
    let bestMatch = null;
    let bestScore = 0;

    for (const area of businessAreasWithData) {
      for (const cluster of area.clusters) {
        let score = 0;

        // Check category match
        if (cluster.technicalCategories.includes(category)) {
          score += 3;
        }

        // Check keyword matches
        const keywordMatches = cluster.keywords.filter(keyword =>
          keywords.some((k: string) => k.toLowerCase().includes(keyword.toLowerCase())) ||
          description.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        score += keywordMatches * 2;

        // Department/context matching
        if (issue.department && cluster.keywords.some(k => 
          issue.department.toLowerCase().includes(k.toLowerCase())
        )) {
          score += 1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = cluster;
        }
      }
    }

    // Assign issue to best matching cluster or fallback
    if (bestMatch) {
      bestMatch.issueCount++;
      bestMatch.averageScore = (bestMatch.averageScore || 0) + (issue.heatmapScore || 0);
      
      // Count by impact level
      switch (bestMatch.impactLevel) {
        case 'strategic': strategicIssues++; break;
        case 'operational': operationalIssues++; break;
        case 'tactical': tacticalIssues++; break;
      }
    }

    totalIssues++;
  });

  // Calculate average scores
  businessAreasWithData.forEach(area => {
    area.clusters.forEach(cluster => {
      if ((cluster.issueCount || 0) > 0) {
        cluster.averageScore = Math.round(cluster.averageScore / cluster.issueCount);
      }
    });
  });

  return {
    businessAreas: businessAreasWithData,
    totalIssues,
    strategicIssues,
    operationalIssues,
    tacticalIssues,
  };
}

/**
 * Get priority recommendations for executives
 */
export function getExecutivePriorities(clusterView: ExecutiveClusterView): {
  businessArea: BusinessArea;
  cluster: ClusterTheme;
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
}[] {
  const priorities = [];

  for (const area of clusterView.businessAreas) {
    for (const cluster of area.clusters) {
      if ((cluster.issueCount || 0) > 0) {
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
        let rationale = '';

        // Determine priority based on impact level, issue count, and average score
        if (cluster.impactLevel === 'strategic' && (cluster.issueCount || 0) >= 3) {
          priority = 'critical';
          rationale = `Strategic impact with ${cluster.issueCount || 0} issues affecting core business operations`;
        } else if (cluster.impactLevel === 'strategic' || ((cluster.issueCount || 0) >= 4 && (cluster.averageScore || 0) >= 75)) {
          priority = 'high';
          rationale = `High business impact with ${cluster.issueCount || 0} issues (avg score: ${cluster.averageScore || 0})`;
        } else if ((cluster.issueCount || 0) >= 2 && (cluster.averageScore || 0) >= 60) {
          priority = 'medium';
          rationale = `Moderate impact requiring attention (${cluster.issueCount || 0} issues)`;
        } else {
          priority = 'low';
          rationale = `Lower priority with ${cluster.issueCount || 0} issues`;
        }

        priorities.push({
          businessArea: area,
          cluster,
          priority,
          rationale,
        });
      }
    }
  }

  // Sort by priority and impact
  return priorities.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    return (b.cluster.issueCount || 0) - (a.cluster.issueCount || 0);
  });
}
