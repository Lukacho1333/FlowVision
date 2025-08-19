'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BuildingOfficeIcon, 
  UsersIcon, 
  BriefcaseIcon, 
  WrenchScrewdriverIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface BusinessArea {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  priority: number;
  clusters: ClusterTheme[];
}

interface ClusterTheme {
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

interface Priority {
  businessArea: BusinessArea;
  cluster: ClusterTheme;
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
}

interface ExecutiveClusteringData {
  success: boolean;
  executiveView: {
    businessAreas: BusinessArea[];
    totalIssues: number;
    strategicIssues: number;
    operationalIssues: number;
    tacticalIssues: number;
  };
  priorities: Priority[];
  stats: {
    totalIssues: number;
    businessAreas: number;
    strategicIssues: number;
    operationalIssues: number;
    tacticalIssues: number;
    activeClusters: number;
  };
}

export default function ExecutiveClusteringView() {
  const { data: session } = useSession();
  const [data, setData] = useState<ExecutiveClusteringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutiveClustering();
  }, []);

  const fetchExecutiveClustering = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/issues/cluster-executive');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch executive clustering');
      }
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getBusinessAreaIcon = (iconString: string) => {
    switch (iconString) {
      case '🏢': return BuildingOfficeIcon;
      case '🧑‍💼': return UsersIcon;
      case '💼': return BriefcaseIcon;
      case '🔧': return WrenchScrewdriverIcon;
      default: return ChartBarIcon;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactLevelIcon = (level: string) => {
    switch (level) {
      case 'strategic': return ExclamationTriangleIcon;
      case 'operational': return ClockIcon;
      case 'tactical': return CheckCircleIcon;
      default: return ChartBarIcon;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card-elevated p-8 animate-pulse">
          <div className="flex items-center mb-6">
            <div className="skeleton-modern h-6 w-6 rounded mr-3"></div>
            <div className="skeleton-modern h-8 w-96 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="skeleton-modern h-10 w-16 mx-auto mb-2 rounded"></div>
                <div className="skeleton-modern h-4 w-20 mx-auto rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Executive View</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchExecutiveClustering}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Executive Business View</h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Strategic Perspective
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalIssues}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-100">
            <div className="text-2xl font-bold text-red-600">{data.stats.strategicIssues}</div>
            <div className="text-sm text-gray-600">Strategic Impact</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-orange-100">
            <div className="text-2xl font-bold text-orange-600">{data.stats.operationalIssues}</div>
            <div className="text-sm text-gray-600">Operational</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-600">{data.stats.tacticalIssues}</div>
            <div className="text-sm text-gray-600">Tactical</div>
          </div>
        </div>
      </div>

      {/* Priority Recommendations */}
      {data.priorities.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Priorities</h3>
          <div className="space-y-3">
            {data.priorities.slice(0, 3).map((priority, index) => {
              const IconComponent = getBusinessAreaIcon(priority.businessArea.icon);
              return (
                <div
                  key={`${priority.businessArea.id}-${priority.cluster.id}`}
                  className={`p-4 rounded-lg border ${getPriorityColor(priority.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{priority.cluster.name}</h4>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50">
                          {priority.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm opacity-75 mt-1">{priority.rationale}</p>
                      <p className="text-xs opacity-60 mt-1">{priority.businessArea.name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Business Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.executiveView.businessAreas.map((area) => {
          const IconComponent = getBusinessAreaIcon(area.icon);
          const activeClusters = area.clusters.filter(c => (c.issueCount || 0) > 0);
          
          return (
            <div
              key={area.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div 
                className="p-6 border-b border-gray-100"
                style={{ borderLeftColor: area.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="h-6 w-6" style={{ color: area.color }} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                    <p className="text-sm text-gray-600">{area.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <span>{activeClusters.length} active areas</span>
                  <span>
                    {area.clusters.reduce((sum, c) => sum + (c.issueCount || 0), 0)} issues
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {activeClusters.length > 0 ? (
                  activeClusters.map((cluster) => {
                    const ImpactIcon = getImpactLevelIcon(cluster.impactLevel);
                    return (
                      <div
                        key={cluster.id}
                        className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{cluster.name}</h4>
                              <ImpactIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{cluster.description}</p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center">
                                <ChartBarIcon className="h-3 w-3 mr-1" />
                                {cluster.issueCount} issues
                              </span>
                              {cluster.averageScore && (
                                <span>Avg score: {cluster.averageScore}</span>
                              )}
                              <span className="capitalize">{cluster.impactLevel}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-400" />
                    <p className="text-sm">No active issues in this area</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Note */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Executive Clustering:</strong> Issues are automatically organized into business-relevant areas 
          rather than technical categories. Strategic issues require immediate executive attention, 
          operational issues affect day-to-day productivity, and tactical issues are specific implementation concerns.
        </p>
      </div>
    </div>
  );
}
