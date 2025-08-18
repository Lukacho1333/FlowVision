'use client';

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface AssociatedIssue {
  id: string;
  description: string;
  heatmapScore: number;
  votes: number;
  department?: string;
  category?: string;
  status?: string;
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
  associatedIssues?: AssociatedIssue[];
}

interface CategoryAISummaryProps {
  categoryName: string;
  onAnalysisGenerated?: (analysis: CategoryAIAnalysis) => void;
}

export default function CategoryAISummary({
  categoryName,
  onAnalysisGenerated,
}: CategoryAISummaryProps) {
  const [analysis, setAnalysis] = useState<CategoryAIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'overview' | 'patterns' | 'recommendations' | 'roadmap'
  >('overview');
  const [showAssociatedIssues, setShowAssociatedIssues] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Function to load associated issues for the category
  async function loadAssociatedIssues() {
    if (!categoryName || analysis?.associatedIssues) return;

    setLoadingIssues(true);
    try {
      const response = await fetch(
        `/api/issues?category=${encodeURIComponent(categoryName)}&limit=10&sortBy=heatmapScore`
      );

      if (response.ok) {
        const issues = await response.json();
        if (analysis) {
          setAnalysis({
            ...analysis,
            associatedIssues: issues,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load associated issues:', err);
    } finally {
      setLoadingIssues(false);
    }
  }

  // Utility function to get heatmap color
  const getHeatmapColor = (score: number): string => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Utility function to get heatmap label
  const getHeatmapLabel = (score: number): string => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  async function generateAnalysis() {
    if (!categoryName) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/categories/${encodeURIComponent(categoryName)}/ai-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate analysis');
      }

      const analysisData = await response.json();
      setAnalysis(analysisData);

      // Persist analysis to localStorage for future visits
      const storageKey = `ai-analysis-${categoryName}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data: analysisData,
          timestamp: Date.now(),
          categoryName,
        })
      );

      onAnalysisGenerated?.(analysisData);
    } catch (err) {
      console.error('Analysis generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  }

  async function createInitiativeFromAnalysis() {
    if (!analysis) return;

    try {
      setLoading(true);

      // First, get all issues in this category to link to the initiative
      const issuesResponse = await fetch(
        `/api/issues?category=${encodeURIComponent(categoryName)}`
      );
      const categoryIssues = issuesResponse.ok ? await issuesResponse.json() : [];

      // Create initiative from AI analysis with complete context
      const initiativeData = {
        title: `${categoryName} Strategic Initiative`,
        problem: analysis.categorySummary,
        goal: analysis.strategicRecommendations[0] || `Resolve ${categoryName} challenges`,
        kpis: [
          `Improve ${categoryName} satisfaction by 25%`,
          `Reduce related issues by 50%`,
          `Achieve sustained improvement metrics`,
        ],
        // AI Context Preservation
        sourceCategory: categoryName,
        aiAnalysisContext: {
          categorySummary: analysis.categorySummary,
          strategicRecommendations: analysis.strategicRecommendations,
          impactAnalysis: analysis.impactAnalysis,
          patterns: analysis.crossIssuePatterns || [],
          rootCauses: analysis.rootCauseAnalysis || [],
          businessImpact: analysis.impactAnalysis || {},
          confidence: analysis.confidence,
          generatedAt: new Date().toISOString(),
          issueCount: categoryIssues.length,
        },
        aiConfidence: analysis.confidence,
        aiGeneratedAt: new Date().toISOString(),
        // Link all issues in this category
        addressedIssueIds: categoryIssues.map((issue: any) => issue.id),
        // Update linked issues to "BEING_ADDRESSED" status
        updateIssueStatus: true,
      };

      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initiativeData),
      });

      if (response.ok) {
        const initiative = await response.json();
        // Show success message and redirect
        alert(
          `Initiative created successfully! ${categoryIssues.length} issues have been linked and marked as "Being Addressed".`
        );
        window.location.href = `/initiatives/${initiative.id}`;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create initiative');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create initiative');
      console.error('Initiative creation error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Load cached analysis on component mount
  React.useEffect(() => {
    if (!categoryName) return;

    const storageKey = `ai-analysis-${categoryName}`;
    const cached = localStorage.getItem(storageKey);

    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Use cached analysis if less than 7 days old
        const daysSinceGenerated = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

        if (daysSinceGenerated < 7) {
          setAnalysis(data);
        }
      } catch (err) {
        console.warn('Failed to load cached analysis:', err);
      }
    }
  }, [categoryName]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'LOW':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'patterns', label: 'Patterns', icon: CpuChipIcon },
    { id: 'recommendations', label: 'Strategy', icon: LightBulbIcon },
    { id: 'roadmap', label: 'Roadmap', icon: ClockIcon },
  ] as const;

  if (!analysis && !loading && !error) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">AI Strategic Analysis</h3>
              <p className="text-sm text-blue-700">
                Generate comprehensive insights for{' '}
                <span className="font-medium">{categoryName}</span> category
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateAnalysis}
              className="btn-primary flex items-center gap-2 hover:scale-105 transition-transform duration-200"
            >
              <CpuChipIcon className="w-4 h-4" />
              Generate Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <div className="text-lg font-semibold text-blue-900">Generating AI Analysis...</div>
            <div className="text-sm text-blue-700">
              Analyzing {categoryName} patterns, impacts, and strategic recommendations
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-semibold text-red-900">Analysis Failed</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
          <button
            onClick={generateAnalysis}
            className="btn-secondary text-sm hover:scale-105 transition-transform duration-200"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6 animate-fade-in h-fit">
      {/* Header */}
      <div className="space-y-4 mb-6">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-blue-900 break-words">AI Strategic Analysis</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-blue-700 mt-1">
                <span className="break-words">
                  Category: <span className="font-medium">{categoryName}</span>
                </span>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border self-start ${getImpactColor(analysis.impactAnalysis.businessImpact)}`}
                >
                  {analysis.impactAnalysis.businessImpact} Impact
                </span>
                <span className="flex items-center gap-1 self-start">
                  <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
                  {analysis.confidence}% Confidence
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={generateAnalysis}
              disabled={loading}
              className="btn-secondary text-sm hover:scale-105 transition-transform duration-200 whitespace-nowrap"
            >
              {loading ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
            <button
              onClick={createInitiativeFromAnalysis}
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 text-sm hover:scale-105 transition-transform duration-200 whitespace-nowrap"
            >
              <LightBulbIcon className="w-4 h-4 flex-shrink-0" />
              Create Initiative
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-white/50 p-1 rounded-lg">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                activeSection === section.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-blue-600 hover:bg-white/30'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {activeSection === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Executive Summary */}
            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5" />
                Executive Summary
              </h4>
              <p className="text-blue-800 leading-relaxed">{analysis.categorySummary}</p>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/60 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {analysis.impactAnalysis.totalIssueCount}
                </div>
                <div className="text-sm text-blue-600">Total Issues</div>
              </div>
              <div className="bg-white/60 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-700">
                  {analysis.impactAnalysis.criticalIssueCount}
                </div>
                <div className="text-sm text-red-600">Critical Issues</div>
              </div>
              <div className="bg-white/60 border border-purple-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-700">
                  {analysis.impactAnalysis.affectedDepartments.length}
                </div>
                <div className="text-sm text-purple-600">Departments</div>
              </div>
              <div className="bg-white/60 border border-orange-200 rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-orange-700">
                  {analysis.impactAnalysis.estimatedProductivityLoss}
                </div>
                <div className="text-sm text-orange-600">Est. Impact</div>
              </div>
            </div>

            {/* Associated Issues Section */}
            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  Associated Issues ({analysis.impactAnalysis.totalIssueCount})
                </h4>
                <button
                  onClick={() => {
                    if (!showAssociatedIssues && !analysis.associatedIssues) {
                      loadAssociatedIssues();
                    }
                    setShowAssociatedIssues(!showAssociatedIssues);
                  }}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  disabled={loadingIssues}
                >
                  {loadingIssues ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      {showAssociatedIssues ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                      <span>{showAssociatedIssues ? 'Hide' : 'Show'} Issues</span>
                    </>
                  )}
                </button>
              </div>

              {showAssociatedIssues && analysis.associatedIssues && (
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-100 hover:scrollbar-thumb-blue-400 pr-2">
                  {analysis.associatedIssues.slice(0, 5).map((issue, index) => (
                    <div
                      key={issue.id}
                      className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        // Navigate to issue details
                        window.open(`/issues#${issue.id}`, '_blank');
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {issue.department && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {issue.department}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getHeatmapColor(issue.heatmapScore)}`}
                          >
                            {getHeatmapLabel(issue.heatmapScore)} ({issue.heatmapScore})
                          </span>
                          {issue.status && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {issue.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed">
                          {issue.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end ml-4 space-y-1">
                        <span className="text-xs text-gray-500">{issue.votes} votes</span>
                        <span className="text-xs text-blue-600 font-medium">View →</span>
                      </div>
                    </div>
                  ))}

                  {analysis.associatedIssues.length > 5 && (
                    <div className="text-center pt-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // Navigate to full issues list for this category
                          window.open(
                            `/issues?category=${encodeURIComponent(categoryName)}`,
                            '_blank'
                          );
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        View all {analysis.associatedIssues.length} issues →
                      </button>
                    </div>
                  )}

                  {showAssociatedIssues && analysis.associatedIssues.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <UsersIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No associated issues found for this category.</p>
                    </div>
                  )}
                </div>
              )}

              {!showAssociatedIssues && (
                <div className="text-center py-3">
                  <p className="text-sm text-blue-700">
                    Click "Show Issues" to see the {analysis.impactAnalysis.totalIssueCount} issues
                    that contributed to this analysis
                  </p>
                </div>
              )}
            </div>

            {/* Root Causes */}
            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Root Cause Analysis
              </h4>
              <div className="space-y-2">
                {analysis.rootCauseAnalysis.map((cause, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-blue-800 text-sm">{cause}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'patterns' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5" />
                Cross-Issue Patterns
              </h4>
              <div className="space-y-3">
                {analysis.crossIssuePatterns.map((pattern, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-blue-800">{pattern}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Priority Issues
              </h4>
              <div className="space-y-2">
                {analysis.priorityIssues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center text-red-700 text-xs font-bold flex-shrink-0">
                      !
                    </div>
                    <p className="text-red-800 text-sm">{issue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'recommendations' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/60 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5" />
                Strategic Recommendations
              </h4>
              <div className="space-y-3">
                {analysis.strategicRecommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-green-800">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'roadmap' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid gap-4">
              {/* Immediate Actions */}
              <div className="bg-white/60 border border-red-200 rounded-lg p-5">
                <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  Immediate Actions (Next 30 Days)
                </h4>
                <div className="space-y-2">
                  {analysis.implementationRoadmap.immediate.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-medium mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-red-800 text-sm">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Short-term Actions */}
              <div className="bg-white/60 border border-yellow-200 rounded-lg p-5">
                <h4 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5" />
                  Short-term Actions (Next 90 Days)
                </h4>
                <div className="space-y-2">
                  {analysis.implementationRoadmap.shortTerm.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-xs font-medium mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-yellow-800 text-sm">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Long-term Strategic Initiatives */}
              <div className="bg-white/60 border border-green-200 rounded-lg p-5">
                <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  Long-term Strategy (6+ Months)
                </h4>
                <div className="space-y-2">
                  {analysis.implementationRoadmap.longTerm.map((action, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-medium mt-0.5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-green-800 text-sm">{action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-blue-200 flex items-center justify-between text-xs text-blue-600">
        <span>Generated: {new Date(analysis.generatedAt).toLocaleString()}</span>
        <span className="flex items-center gap-1">
          <CheckCircleIcon className="w-4 h-4" />
          AI Confidence: {analysis.confidence}%
        </span>
      </div>
    </div>
  );
}
