'use client';
import React, { useEffect, useState } from 'react';
import CategoryAISummary from '@/components/CategoryAISummary';

type Cluster = {
  label: string;
  issueIds: string[];
  rationale: string;
  id?: string;
  analysis?: {
    summary: string;
    crossIssuePatterns: string[];
    strategicPriority: string;
    initiativeRecommendations: string[];
    confidence: number;
  };
};

interface Props {
  onSelectAll: (issueIds: string[]) => void;
}

export default function AIClusters({ onSelectAll }: Props) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/issues/clusterize');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setClusters(data.clusters || []);
        } else setError('Failed to load clusters');
      } catch {
        setError('Failed to load clusters');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="skeleton-modern h-4 w-4 rounded-full"></div>
        <div className="text-body-sm text-gray-600">Analyzing issues with AI...</div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <div className="text-body-sm text-red-700">{error}</div>
      </div>
    );

  if (!clusters.length) return null;

  async function track(event: string, metadata?: any) {
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, metadata }),
      });
    } catch {}
  }

  async function generateDetailedAnalysis(cluster: Cluster) {
    if (!cluster.id || cluster.analysis) return;

    try {
      setGeneratingAnalysis(cluster.label);
      const response = await fetch(`/api/clusters/${cluster.id}/generate-summary`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();

        // Update the cluster with new analysis
        setClusters((prev) =>
          prev.map((c) =>
            c.label === cluster.label
              ? {
                  ...c,
                  analysis: {
                    summary: data.consolidatedSummary || 'AI analysis generated',
                    crossIssuePatterns: data.crossIssuePatterns || [],
                    strategicPriority: data.strategicPriority || 'MEDIUM',
                    initiativeRecommendations: data.initiativeRecommendations || [],
                    confidence: data.confidence || 75,
                  },
                }
              : c
          )
        );

        track('ai_cluster_analysis_generated', {
          cluster: cluster.label,
          confidence: data.confidence,
        });
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setGeneratingAnalysis(null);
    }
  }

  // Calculate category metrics for intelligent sorting
  const clustersWithMetrics = clusters.map((c) => {
    const totalIssues = c.issueIds.length;
    const avgImpact = 75; // Mock average impact score - could be calculated from actual issue scores
    const confidence = c.analysis?.confidence || 0;

    // Calculate priority score (issues count × impact × confidence)
    const priorityScore = totalIssues * (avgImpact / 100) * (confidence / 100);

    return { ...c, totalIssues, avgImpact, confidence, priorityScore };
  });

  // Sort by priority score (highest first)
  const sortedClusters = clustersWithMetrics.sort((a, b) => b.priorityScore - a.priorityScore);

  // Group categories by type for better organization
  const peopleCategories = [
    'Workload Management',
    'Communication',
    'Management Support',
    'Work Environment',
  ];
  const processCategories = ['Technology', 'Process Improvement', 'Resource Allocation'];

  const peopleClusters = sortedClusters.filter((c) =>
    peopleCategories.some((cat) => c.label.includes(cat))
  );
  const processClusters = sortedClusters.filter((c) =>
    processCategories.some((cat) => c.label.includes(cat))
  );
  const otherClusters = sortedClusters.filter(
    (c) => !peopleClusters.includes(c) && !processClusters.includes(c)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{clusters.length}</div>
          <div className="text-sm text-blue-600">Total Categories</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {clusters.reduce((sum, c) => sum + c.issueIds.length, 0)}
          </div>
          <div className="text-sm text-purple-600">Total Issues</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{peopleClusters.length}</div>
          <div className="text-sm text-emerald-600">People Issues</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{processClusters.length}</div>
          <div className="text-sm text-amber-600">Process Issues</div>
        </div>
      </div>

      {/* People-Related Categories */}
      {peopleClusters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-emerald-700">👥 People & Culture Issues</h3>
            <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              {peopleClusters.reduce((sum, c) => sum + c.issueIds.length, 0)} issues
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start auto-rows-max">
            {peopleClusters.map((c) => (
              <CategoryCard
                key={c.label}
                cluster={c}
                type="people"
                onSelectAll={onSelectAll}
                expandedCluster={expandedCluster}
                setExpandedCluster={setExpandedCluster}
                generateDetailedAnalysis={generateDetailedAnalysis}
                generatingAnalysis={generatingAnalysis}
              />
            ))}
          </div>
        </div>
      )}

      {/* Process-Related Categories */}
      {processClusters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-amber-700">⚙️ Process & Systems Issues</h3>
            <span className="text-sm text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              {processClusters.reduce((sum, c) => sum + c.issueIds.length, 0)} issues
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start auto-rows-max">
            {processClusters.map((c) => (
              <CategoryCard
                key={c.label}
                cluster={c}
                type="process"
                onSelectAll={onSelectAll}
                expandedCluster={expandedCluster}
                setExpandedCluster={setExpandedCluster}
                generateDetailedAnalysis={generateDetailedAnalysis}
                generatingAnalysis={generatingAnalysis}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Categories */}
      {otherClusters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-gray-700">📋 Other Categories</h3>
            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {otherClusters.reduce((sum, c) => sum + c.issueIds.length, 0)} issues
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start auto-rows-max">
            {otherClusters.map((c) => (
              <CategoryCard
                key={c.label}
                cluster={c}
                type="other"
                onSelectAll={onSelectAll}
                expandedCluster={expandedCluster}
                setExpandedCluster={setExpandedCluster}
                generateDetailedAnalysis={generateDetailedAnalysis}
                generatingAnalysis={generatingAnalysis}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for individual category cards
function CategoryCard({
  cluster,
  type,
  onSelectAll,
  expandedCluster,
  setExpandedCluster,
  generateDetailedAnalysis,
  generatingAnalysis,
}: {
  cluster: any;
  type: 'people' | 'process' | 'other';
  onSelectAll: (issueIds: string[]) => void;
  expandedCluster: string | null;
  setExpandedCluster: (id: string | null) => void;
  generateDetailedAnalysis: (cluster: any) => void;
  generatingAnalysis: string | null;
}) {
  const typeConfig = {
    people: {
      bg: 'rgba(16, 185, 129, 0.1)',
      activeBg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.2)',
      textColor: 'text-emerald-700',
    },
    process: {
      bg: 'rgba(245, 158, 11, 0.1)',
      activeBg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.2)',
      textColor: 'text-amber-700',
    },
    other: {
      bg: 'rgba(107, 114, 128, 0.1)',
      activeBg: 'rgba(107, 114, 128, 0.15)',
      border: 'rgba(107, 114, 128, 0.2)',
      textColor: 'text-gray-700',
    },
  };

  const config = typeConfig[type];
  const isExpanded = expandedCluster === cluster.label;

  // Priority indicator based on issue count
  const getPriorityIndicator = (count: number) => {
    if (count >= 8) return { dot: 'bg-red-500', text: 'High Priority', color: 'text-red-700' };
    if (count >= 5)
      return { dot: 'bg-yellow-500', text: 'Medium Priority', color: 'text-yellow-700' };
    return { dot: 'bg-green-500', text: 'Low Priority', color: 'text-green-700' };
  };

  const priority = getPriorityIndicator(cluster.issueIds.length);

  async function track(event: string, metadata?: any) {
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, metadata }),
      });
    } catch {}
  }

  return (
    <div
      className={`card-interactive transition-all duration-300 ${
        isExpanded
          ? 'shadow-card-elevated ring-2 ring-blue-200 ring-opacity-60'
          : 'hover:shadow-card-standard-hover hover:ring-1 hover:ring-gray-200 hover:ring-opacity-40'
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        background: isExpanded ? config.activeBg : config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {/* Cluster Header */}
      <div className="px-4 py-3 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${priority.dot} rounded-full`}></div>
              <span className={`text-body-sm font-semibold ${config.textColor}`}>
                {cluster.label}
              </span>
              {cluster.analysis?.confidence && (
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  {cluster.analysis.confidence}% confidence
                </span>
              )}
            </div>

            {/* Priority Badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color} ${
                priority.dot === 'bg-red-500'
                  ? 'bg-red-100'
                  : priority.dot === 'bg-yellow-500'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
              }`}
            >
              {priority.text}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectAll(cluster.issueIds);
                track('issues_select_all_related', {
                  label: cluster.label,
                  count: cluster.issueIds.length,
                });
              }}
              className="btn-primary text-xs hover:scale-105 transition-transform duration-200"
              title={cluster.rationale}
            >
              Select all ({cluster.issueIds.length})
            </button>

            {/* Generate Analysis Button */}
            {cluster.id && !cluster.analysis && (
              <button
                onClick={() => generateDetailedAnalysis(cluster)}
                disabled={generatingAnalysis === cluster.label}
                className="btn-secondary text-xs hover:scale-105 transition-transform duration-200 disabled:opacity-50"
              >
                {generatingAnalysis === cluster.label ? (
                  <div className="flex items-center gap-1">
                    <div className="animate-spin w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full"></div>
                    Analyzing...
                  </div>
                ) : (
                  '🧠 AI Analysis'
                )}
              </button>
            )}

            {/* Expand/Collapse Button */}
            {(cluster.analysis || cluster.rationale) && (
              <button
                onClick={() => setExpandedCluster(isExpanded ? null : cluster.label)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isExpanded
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                    : 'bg-white/60 hover:bg-white/80 text-gray-700 border border-white/60 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">{isExpanded ? '📋' : '🔍'}</span>
                {isExpanded ? 'Hide Analysis' : 'View Analysis'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Section - Always present for consistent spacing */}
      <div
        className={`border-t border-opacity-30 transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
      >
        {isExpanded ? (
          /* Expanded Details */
          <div className="px-4 py-3 bg-gradient-to-r from-white/30 to-white/10 animate-fade-in transform transition-all duration-300 ease-in-out">
            <div className="space-y-6">
              {/* AI Strategic Analysis */}
              <CategoryAISummary
                categoryName={cluster.label}
                onAnalysisGenerated={(analysis) => {
                  console.log('Category analysis generated:', analysis);
                  track('category_ai_analysis_generated', {
                    category: cluster.label,
                    confidence: analysis.confidence,
                    businessImpact: analysis.impactAnalysis.businessImpact,
                  });
                }}
              />

              {/* Basic Rationale */}
              {cluster.rationale && (
                <div>
                  <h5 className={`text-body-sm font-semibold ${config.textColor} mb-2`}>
                    Clustering Rationale
                  </h5>
                  <p className="text-body-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded-lg">
                    {cluster.rationale}
                  </p>
                </div>
              )}

              {/* AI Analysis Details */}
              {cluster.analysis && (
                <>
                  {/* Summary */}
                  <div>
                    <h5 className={`text-body-sm font-semibold ${config.textColor} mb-2`}>
                      AI Analysis Summary
                    </h5>
                    <p className="text-body-sm text-gray-800 leading-relaxed bg-white/50 p-3 rounded-lg">
                      {cluster.analysis.summary}
                    </p>
                  </div>

                  {/* Strategic Priority */}
                  <div>
                    <h5 className={`text-body-sm font-semibold ${config.textColor} mb-2`}>
                      Strategic Priority
                    </h5>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        cluster.analysis.strategicPriority === 'HIGH'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : cluster.analysis.strategicPriority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                      }`}
                    >
                      {cluster.analysis.strategicPriority} Priority
                    </span>
                  </div>

                  {/* Cross-Issue Patterns */}
                  {cluster.analysis.crossIssuePatterns.length > 0 && (
                    <div>
                      <h5 className={`text-body-sm font-semibold ${config.textColor} mb-2`}>
                        Cross-Issue Patterns
                      </h5>
                      <div className="space-y-2">
                        {cluster.analysis.crossIssuePatterns.map(
                          (pattern: string, index: number) => (
                            <div
                              key={index}
                              className="bg-white/50 p-2 rounded text-body-xs text-gray-700"
                            >
                              • {pattern}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Initiative Recommendations */}
                  {cluster.analysis.initiativeRecommendations.length > 0 && (
                    <div>
                      <h5 className={`text-body-sm font-semibold ${config.textColor} mb-2`}>
                        Strategic Recommendations
                      </h5>
                      <div className="space-y-2">
                        {cluster.analysis.initiativeRecommendations.map(
                          (rec: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 bg-white/50 p-2 rounded"
                            >
                              <div
                                className={`w-5 h-5 bg-opacity-20 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0 ${
                                  type === 'people'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : type === 'process'
                                      ? 'bg-amber-100 text-amber-600'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {index + 1}
                              </div>
                              <p className="text-body-xs text-gray-700">{rec}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed State Placeholder */
          <div className="px-4 py-3 bg-gradient-to-r from-white/20 to-white/5">
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-blue-400">🔍</span>
                <span>Click "View Analysis" to see AI insights for this category</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
