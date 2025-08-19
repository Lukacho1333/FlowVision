'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Issue {
  id: string;
  description: string;
  heatmapScore: number;
  votes: number;
  department: string;
  category: string;
  comments: Array<{
    id: string;
    content: string;
    author: {
      name: string;
      email: string;
    };
    createdAt: string;
  }>;
}

interface Initiative {
  id: string;
  title: string;
  status: string;
  progress: number;
  type: string;
  owner: {
    name: string;
    email: string;
  };
  addressedIssues: Array<{
    id: string;
    description: string;
    heatmapScore: number;
  }>;
  milestones: Array<{
    title: string;
    status: string;
    dueDate: string;
    progress: number;
  }>;
}

interface ClusterDetails {
  id: string;
  name: string;
  title: string;
  theme: string;
  description: string;
  category: string;
  severity: string;
  isActive: boolean;
  color: string;
  issues: Issue[];
  initiatives: Initiative[];
  analytics: {
    totalIssues: number;
    averageScore: number;
    totalVotes: number;
    scoreDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    departmentBreakdown: Record<string, number>;
    initiativeProgress: {
      total: number;
      active: number;
      completed: number;
      averageProgress: number;
    };
  };
  recommendations: string[];
}

interface ClusterDetailsModalProps {
  clusterId: string | null;
  onClose: () => void;
}

export default function ClusterDetailsModal({ clusterId, onClose }: ClusterDetailsModalProps) {
  const [cluster, setCluster] = useState<ClusterDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'initiatives' | 'analytics'>(
    'overview'
  );
  const [creatingInitiative, setCreatingInitiative] = useState(false);

  useEffect(() => {
    if (clusterId) {
      fetchClusterDetails();
    }
  }, [clusterId]);

  async function fetchClusterDetails() {
    if (!clusterId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/clusters/${clusterId}`);
      const data = await response.json();

      if (data.success) {
        setCluster(data.cluster);
      } else {
        setError(data.error || 'Failed to fetch cluster details');
      }
    } catch (err) {
      setError('Failed to load cluster details');
      console.error('Cluster details fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInitiative(clusterId: string) {
    if (!cluster) return;

    try {
      setCreatingInitiative(true);

      const response = await fetch(`/api/clusters/${clusterId}/initiatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${cluster.name} Resolution Initiative`,
          problem: `Addressing ${cluster.analytics.totalIssues} issues in ${cluster.name} cluster`,
          goal: `Resolve systemic issues in ${cluster.category} category to improve operational efficiency`,
          useAI: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {

        alert(
          `Initiative "${data.initiative.title}" created successfully! Redirecting to view details.`
        );
        // Redirect to the new initiative
        window.location.href = `/initiatives/${data.initiative.id}`;
      } else {
        console.error('❌ Failed to create initiative:', data);
        alert(`Failed to create initiative: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error creating initiative:', error);
      alert(
        `Error creating initiative: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setCreatingInitiative(false);
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'active':
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'planning':
        return 'text-yellow-600 bg-yellow-100';
      case 'on_hold':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  function getTypeIcon(type: string) {
    switch (type.toLowerCase()) {
      case 'process improvement':
        return '🔄';
      case 'technology':
        return '⚙️';
      case 'strategic':
        return '🎯';
      case 'operational':
        return '📋';
      case 'quality':
        return '✨';
      case 'cost reduction':
        return '💰';
      default:
        return '📁';
    }
  }

  if (!clusterId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: cluster?.color || '#6366f1' }}
            ></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {cluster?.name || cluster?.title || 'Loading...'}
              </h2>
              {cluster && (
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(cluster.severity)}`}
                  >
                    {cluster.severity}
                  </span>
                  <span className="text-sm text-gray-500">{cluster.category}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-80px)]">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: EyeIcon },
              { id: 'issues', label: 'Issues', icon: ExclamationTriangleIcon },
              { id: 'initiatives', label: 'Initiatives', icon: CheckCircleIcon },
              { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.id === 'issues' && cluster && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {cluster.analytics.totalIssues}
                  </span>
                )}
                {tab.id === 'initiatives' && cluster && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {cluster.analytics.initiativeProgress.total}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-600">{error}</p>
                  <button onClick={fetchClusterDetails} className="btn-primary mt-4">
                    Retry
                  </button>
                </div>
              </div>
            ) : cluster ? (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                      <p className="text-gray-600 mb-4">{cluster.description}</p>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Theme Analysis</h4>
                        <p className="text-blue-800">{cluster.theme}</p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {cluster.analytics.totalIssues}
                        </div>
                        <div className="text-sm text-gray-600">Total Issues</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {cluster.analytics.averageScore}
                        </div>
                        <div className="text-sm text-gray-600">Avg Score</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {cluster.analytics.initiativeProgress.total}
                        </div>
                        <div className="text-sm text-gray-600">Initiatives</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {cluster.analytics.totalVotes}
                        </div>
                        <div className="text-sm text-gray-600">Total Votes</div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {cluster.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Strategic Recommendations
                        </h3>
                        <div className="space-y-2">
                          {cluster.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg"
                            >
                              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-sm font-medium mt-0.5">
                                {index + 1}
                              </div>
                              <p className="text-yellow-800">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Issues Tab */}
                {activeTab === 'issues' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Issues in Cluster ({cluster.analytics.totalIssues})
                      </h3>
                      <Link href="/issues" className="btn-secondary text-sm">
                        View All Issues
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {cluster.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {issue.department || 'General'}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {issue.category}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">{issue.votes} votes</span>
                              <span className="text-lg font-semibold text-blue-600">
                                {issue.heatmapScore}
                              </span>
                            </div>
                          </div>

                          <p className="text-gray-900 mb-3">{issue.description}</p>

                          {issue.comments.length > 0 && (
                            <div className="border-t border-gray-100 pt-3">
                              <div className="text-xs text-gray-500 mb-2">Recent Comments:</div>
                              <div className="space-y-2">
                                {issue.comments.slice(0, 2).map((comment) => (
                                  <div key={comment.id} className="text-sm">
                                    <span className="font-medium text-gray-700">
                                      {comment.author.name}:
                                    </span>
                                    <span className="text-gray-600 ml-1">{comment.content}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Initiatives Tab */}
                {activeTab === 'initiatives' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Initiatives ({cluster.analytics.initiativeProgress.total})
                      </h3>
                      <button
                        onClick={() => handleCreateInitiative(cluster.id)}
                        disabled={creatingInitiative}
                        className="btn-primary text-sm flex items-center space-x-2 disabled:opacity-50"
                      >
                        {creatingInitiative ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon className="h-4 w-4" />
                            <span>Create Initiative</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {cluster.initiatives.map((initiative) => (
                        <div
                          key={initiative.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg">{getTypeIcon(initiative.type)}</span>
                                <h4 className="font-medium text-gray-900">{initiative.title}</h4>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(initiative.status)}`}
                                >
                                  {initiative.status.replace('_', ' ')}
                                </span>
                                <span className="text-sm text-gray-500">{initiative.type}</span>
                                <span className="text-sm text-gray-500">
                                  Owner: {initiative.owner.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                {initiative.progress}%
                              </div>
                              <div className="text-xs text-gray-500">Progress</div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${initiative.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Addressed Issues */}
                          {initiative.addressedIssues && initiative.addressedIssues.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-gray-500 mb-1">
                                Addresses {initiative.addressedIssues.length} issues:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {initiative.addressedIssues.slice(0, 3).map((issue) => (
                                  <span
                                    key={issue.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                                  >
                                    Score: {issue.heatmapScore}
                                  </span>
                                ))}
                                {initiative.addressedIssues.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{initiative.addressedIssues.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {initiative.milestones && initiative.milestones.length > 0 && (
                            <div className="border-t border-gray-100 pt-3">
                              <div className="text-xs text-gray-500 mb-2">Recent Milestones:</div>
                              <div className="space-y-1">
                                {initiative.milestones.slice(0, 2).map((milestone, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-gray-700">{milestone.title}</span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${getStatusColor(milestone.status)}`}
                                    >
                                      {milestone.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    {/* Score Distribution */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Issue Score Distribution
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {cluster.analytics.scoreDistribution.high}
                          </div>
                          <div className="text-sm text-red-700">High Priority (85+)</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {cluster.analytics.scoreDistribution.medium}
                          </div>
                          <div className="text-sm text-yellow-700">Medium Priority (70-85)</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {cluster.analytics.scoreDistribution.low}
                          </div>
                          <div className="text-sm text-green-700">Low Priority (&lt;70)</div>
                        </div>
                      </div>
                    </div>

                    {/* Department Breakdown */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Department Breakdown
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(cluster.analytics.departmentBreakdown).map(
                          ([dept, count]) => (
                            <div
                              key={dept}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <span className="font-medium text-gray-900">{dept}</span>
                              <span className="text-blue-600 font-semibold">{count} issues</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Initiative Progress */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Initiative Progress
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-lg font-semibold text-blue-600">
                            {cluster.analytics.initiativeProgress.active}
                          </div>
                          <div className="text-sm text-blue-700">Active Initiatives</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-lg font-semibold text-green-600">
                            {cluster.analytics.initiativeProgress.completed}
                          </div>
                          <div className="text-sm text-green-700">Completed Initiatives</div>
                        </div>
                      </div>

                      {cluster.analytics.initiativeProgress.total > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Overall Progress
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {cluster.analytics.initiativeProgress.averageProgress}%
                            </span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${cluster.analytics.initiativeProgress.averageProgress}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
