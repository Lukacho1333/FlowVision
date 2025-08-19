'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SmartFormValidation from '@/components/SmartFormValidation';
import { ValidationResult } from '@/lib/smart-form-validation';
import { systemConfig } from '@/lib/system-config';

import ClusteringView from './clustering-view';
import AIClusters from './ai-clusters';
import AISummary from '@/components/AISummary';
import ExecutiveClusteringView from '@/components/ExecutiveClusteringView';
import { trackEvent } from '@/utils/analytics';
import { useToast } from '@/components/ToastProvider';

type Issue = {
  id: string;
  description: string;
  votes: number;
  heatmapScore: number;
  status?: string;
  category?: string;
  createdAt: string;
  aiSummary?: string | null;
  aiConfidence?: number | null;
  aiGeneratedAt?: string | null;
  aiVersion?: string | null;
  initiatives?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
};

export default function IssuesPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIssue, setNewIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'browse' | 'executive'>(
    'overview'
  );
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // AI Category Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({
    businessArea: '',
    department: '',
    impactType: '',
  });

  // Configuration-driven scoring
  const [scoringConfig, setScoringConfig] = useState<{
    thresholds: { critical: number; high: number; medium: number; low: number };
    colorMapping: { [key: string]: { color: string; textColor: string } };
  } | null>(null);

  // Smart Form Validation State
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/auth');
      return;
    }
    fetchIssues();
  }, [session, router]);

  // Load scoring configuration on component mount
  useEffect(() => {
    const loadScoringConfig = async () => {
      try {
        const [thresholds, colorMapping] = await Promise.all([
          systemConfig.getScoringThresholds(),
          systemConfig.getColorMapping(),
        ]);
        setScoringConfig({ thresholds, colorMapping: colorMapping as any });
      } catch (error) {
        console.error('Failed to load scoring configuration:', error);
        // Set fallback configuration
        setScoringConfig({
          thresholds: { critical: 80, high: 60, medium: 40, low: 0 },
          colorMapping: {
            critical: { color: 'bg-red-500', textColor: 'text-white' },
            high: { color: 'bg-orange-500', textColor: 'text-white' },
            medium: { color: 'bg-yellow-500', textColor: 'text-black' },
            low: { color: 'bg-green-500', textColor: 'text-white' },
          },
        });
      }
    };

    loadScoringConfig();
  }, []);

  // Restore persisted selection
  useEffect(() => {
    if (!session?.user?.email) return;
    try {
      const storageKey = `issues:selected:${session.user.email}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const ids: unknown = JSON.parse(raw);
        if (Array.isArray(ids)) {
          // Filter against current issues once loaded
          const valid = ids.filter((id) => typeof id === 'string');
          setSelectedIssues(new Set(valid as string[]));
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // Keep selection valid when issue list changes
  useEffect(() => {
    if (!issues?.length) return;
    setSelectedIssues((prev) => {
      const issueIds = new Set(issues.map((i) => i.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (issueIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [issues]);

  // Persist selection
  useEffect(() => {
    if (!session?.user?.email) return;
    try {
      const storageKey = `issues:selected:${session.user.email}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(selectedIssues)));
    } catch {}
  }, [selectedIssues, session?.user?.email]);

  async function fetchIssues() {
    try {
      const res = await fetch('/api/issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      } else {
        setMessage('Failed to load issues');
      }
    } catch (error) {
      setMessage('Failed to load issues');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newIssue.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newIssue,
          selectedCategories,
          validationResult,
          aiSuggestions,
        }),
      });

      if (res.ok) {
        // Reset all form data
        setNewIssue('');
        setSelectedCategories({
          businessArea: '',
          department: '',
          impactType: '',
        });
        setAiSuggestions(null);
        setValidationResult(null);
        setShowValidation(false);

        fetchIssues(); // Refresh the list
        setMessage('Issue created successfully');
        trackEvent('issues_create_success');
        showToast('Issue created', 'success');
      } else {
        setMessage('Failed to create issue');
        trackEvent('issues_create_fail');
        showToast('Failed to create issue', 'error');
      }
    } catch (error) {
      setMessage('Failed to create issue');
      showToast('Failed to create issue', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(issueId: string, increment: boolean) {
    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment }),
      });

      if (res.ok) {
        fetchIssues(); // Refresh to show updated votes
        trackEvent('issues_vote', { issueId, up: increment });
        showToast(increment ? 'Upvoted issue' : 'Downvoted issue', 'success');
      } else {
        setMessage('Failed to vote on issue');
        showToast('Failed to vote on issue', 'error');
      }
    } catch (error) {
      setMessage('Failed to vote on issue');
    }
  }

  async function handleConvertToInitiative(issue: Issue) {
    // Navigate to initiatives page with pre-filled data
    const params = new URLSearchParams({
      fromIssue: 'true',
      problem: issue.description,
      title: `Initiative: ${issue.description.substring(0, 50)}...`,
    });
    router.push(`/initiatives?${params.toString()}`);
  }

  function handleSelectIssue(issueId: string, checked: boolean) {
    const newSelected = new Set(selectedIssues);
    if (checked) newSelected.add(issueId);
    else newSelected.delete(issueId);
    setSelectedIssues(newSelected);
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIssues(checked ? new Set(issues.map((i) => i.id)) : new Set());
  }

  async function handleCreateInitiativeFromSelected() {
    if (selectedIssues.size === 0) {
      setMessage('Please select at least one issue to create an initiative');
      return;
    }

    setBulkActionLoading(true);
    setMessage(null);

    try {
      const selectedIssueObjects = issues.filter((issue) => selectedIssues.has(issue.id));

      const res = await fetch('/api/initiatives/from-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issues: selectedIssueObjects.map((issue) => ({
            id: issue.id,
            description: issue.description,
            heatmapScore: issue.heatmapScore,
            votes: issue.votes,
            aiSummary: issue.aiSummary,
            aiConfidence: issue.aiConfidence,
          })),
        }),
      });

      if (res.ok) {
        const initiative = await res.json();
        setSelectedIssues(new Set()); // Clear selection
        setMessage(
          `Initiative "${initiative.title}" created successfully from ${selectedIssues.size} issue(s)`
        );
        trackEvent('initiative_created_from_issues', {
          count: selectedIssues.size,
          initiativeId: initiative.id,
        });
        showToast('Initiative created from selected issues', 'success');

        // Navigate to the new initiative after a short delay
        setTimeout(() => {
          router.push(`/initiatives/${initiative.id}`);
        }, 1500);
      } else {
        const error = await res.json();
        setMessage(error.error || 'Failed to create initiative from issues');
        trackEvent('initiative_create_from_issues_fail', { count: selectedIssues.size });
        showToast('Failed to create initiative from issues', 'error');
      }
    } catch (error) {
      setMessage('Failed to create initiative from issues');
      showToast('Failed to create initiative from issues', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  }

  function getHeatmapColor(score: number): string {
    if (!scoringConfig) {
      // Fallback to hardcoded colors if configuration not loaded
      if (score >= 80) return 'bg-red-500';
      if (score >= 60) return 'bg-orange-500';
      if (score >= 40) return 'bg-yellow-500';
      return 'bg-green-500';
    }

    const { thresholds, colorMapping } = scoringConfig;
    if (score >= thresholds.critical) return colorMapping.critical.color;
    if (score >= thresholds.high) return colorMapping.high.color;
    if (score >= thresholds.medium) return colorMapping.medium.color;
    return colorMapping.low.color;
  }

  // Generate AI category suggestions
  async function generateAISuggestions(description: string) {
    if (!description.trim() || description.length < 20) {
      setAiSuggestions(null);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data);

        // Auto-select the highest confidence suggestions
        if (data.suggestions) {
          const topBusinessArea = data.suggestions.businessAreas?.[0];
          const topDepartment = data.suggestions.departments?.[0];
          const topImpact = data.suggestions.impactTypes?.[0];

          setSelectedCategories({
            businessArea: topBusinessArea?.businessArea || '',
            department: topDepartment?.department || '',
            impactType: topImpact?.impactType || '',
          });
        }
      } else {
        console.error('Failed to get AI suggestions:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
        // Set a fallback to show the user something is wrong
        setAiSuggestions({
          suggestions: null,
          aiConfidence: 0,
          error: errorData.error || `API error: ${response.status}`,
        });
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      // Set a fallback to show the user there was an error
      setAiSuggestions({
        suggestions: null,
        aiConfidence: 0,
        error: 'Network error or AI service unavailable',
      });
    } finally {
      setSuggestionsLoading(false);
    }
  }

  // Handle validation result updates
  const handleValidationChange = (result: ValidationResult) => {
    setValidationResult(result);
  };

  // Show validation when user starts typing meaningful content
  useEffect(() => {
    setShowValidation(newIssue.trim().length >= 10);
  }, [newIssue]);

  // Debounced AI suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newIssue.trim().length >= 20) {
        generateAISuggestions(newIssue);
      }
    }, 1000); // 1 second delay after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newIssue]);

  function getHeatmapLabel(score: number): string {
    if (!scoringConfig) {
      // Fallback to hardcoded labels if configuration not loaded
      if (score >= 80) return 'Critical';
      if (score >= 60) return 'High';
      if (score >= 40) return 'Medium';
      return 'Low';
    }

    const { thresholds } = scoringConfig;
    if (score >= thresholds.critical) return 'Critical';
    if (score >= thresholds.high) return 'High';
    if (score >= thresholds.medium) return 'Medium';
    return 'Low';
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header Skeleton */}
        <div className="text-center">
          <div className="skeleton h-12 w-80 mx-auto mb-4"></div>
          <div className="skeleton h-6 w-96 mx-auto mb-6"></div>
          <div className="flex justify-center gap-4">
            <div className="skeleton h-4 w-24"></div>
            <div className="skeleton h-4 w-20"></div>
          </div>
        </div>

        {/* Form Skeleton */}
        <div className="card-primary p-6 max-w-2xl mx-auto">
          <div className="skeleton h-8 w-48 mx-auto mb-6"></div>
          <div className="skeleton h-24 w-full mb-4"></div>
          <div className="flex justify-center">
            <div className="skeleton h-10 w-32"></div>
          </div>
        </div>

        {/* Legend Skeleton */}
        <div className="card-secondary p-6 max-w-4xl mx-auto">
          <div className="skeleton h-6 w-40 mx-auto mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg text-center">
                <div className="skeleton h-6 w-6 mx-auto mb-2 rounded-full"></div>
                <div className="skeleton h-4 w-16 mx-auto mb-1"></div>
                <div className="skeleton h-3 w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues List Skeleton */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-secondary p-6">
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2 min-w-[80px]">
                  <div className="skeleton h-8 w-8 rounded-lg"></div>
                  <div className="skeleton h-8 w-8"></div>
                  <div className="skeleton h-8 w-8 rounded-lg"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-full"></div>
                      <div className="skeleton h-4 w-3/4"></div>
                    </div>
                    <div className="skeleton h-6 w-20 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-24"></div>
                    <div className="skeleton h-8 w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Clean Header */}
      <div className="text-center">
        <h1 className="text-h1 mb-4">Issue Identification</h1>
        <p className="text-body max-w-2xl mx-auto mb-6">
          Identify and prioritize problems that need attention. Vote on issues to help determine
          which ones should become initiatives.
        </p>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="max-w-6xl mx-auto">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8 justify-center">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Overview
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {issues.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'report'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📝 Report Issue
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Browse Issues
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {issues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('executive')}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'executive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏛️ Executive View
              <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">Business</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card-primary p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{issues.length}</div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
              <div className="card-primary p-6 text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {
                    issues.filter(
                      (i) => i.heatmapScore >= (scoringConfig?.thresholds.critical || 80)
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="card-primary p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{selectedIssues.size}</div>
                <div className="text-sm text-gray-600">Selected</div>
              </div>
              <div className="card-primary p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {issues.filter((i) => i.aiSummary).length}
                </div>
                <div className="text-sm text-gray-600">AI Analyzed</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-secondary p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('report')}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">📝</span>
                  <div className="text-left">
                    <div className="font-medium">Report New Issue</div>
                    <div className="text-sm text-gray-600">Submit a new problem</div>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <div className="font-medium">Browse Issues</div>
                    <div className="text-sm text-gray-600">View, vote & manage existing issues</div>
                  </div>
                </button>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-8">
            {/* Enhanced Issue Reporting Form */}
            <div className="card-primary p-8 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-h2 mb-4">Report New Issue</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Help us identify problems that need attention. Your input drives strategic
                  improvements across the organization.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="issue-description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Issue Description
                  </label>
                  <textarea
                    id="issue-description"
                    className={`textarea-field transition-colors ${
                      newIssue.trim().length > 0
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="Describe the issue or problem you've identified. Be specific and include:

• What is the problem?
• How often does it occur?
• What is the business impact?
• Who is affected?
• When does this typically happen?

Example: 'Our project approval process takes 3-4 weeks due to unclear requirements and multiple approval rounds. This affects all departments when requesting new initiatives and delays strategic implementations by 30-60 days.'"
                    value={newIssue}
                    onChange={(e) => setNewIssue(e.target.value)}
                    rows={8}
                    disabled={submitting}
                    required
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {newIssue.trim().length > 20
                        ? '✓ Good detail level'
                        : newIssue.trim().length > 0
                          ? 'Add more detail for better analysis'
                          : 'Minimum 20 characters recommended'}
                    </span>
                    <span className={`${newIssue.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {newIssue.length}/500
                    </span>
                  </div>
                </div>

                {/* Smart Form Validation */}
                {showValidation && (
                  <SmartFormValidation
                    description={newIssue}
                    selectedCategories={selectedCategories}
                    onValidationChange={handleValidationChange}
                    showSuggestions={true}
                    className="mb-4"
                  />
                )}

                {/* AI Category Suggestions */}
                {newIssue.trim().length >= 20 && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🤖</span>
                      </div>
                      <h3 className="text-lg font-semibold text-purple-900">
                        AI Category Suggestions
                      </h3>
                      {suggestionsLoading && (
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {suggestionsLoading ? (
                      <div className="text-purple-700 text-sm">
                        Analyzing your issue for smart categorization...
                      </div>
                    ) : aiSuggestions ? (
                      <div className="space-y-4">
                        {/* Duplicate Warning */}
                        {aiSuggestions.duplicateCheck?.isDuplicate && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium mb-2">
                              <span>⚠️</span>
                              Similar issues found
                            </div>
                            <div className="text-yellow-700 text-xs">
                              Consider reviewing existing issues before submitting
                            </div>
                          </div>
                        )}

                        {/* Category Suggestions Grid */}
                        <div className="grid md:grid-cols-3 gap-4">
                          {/* Business Area */}
                          <div>
                            <label className="block text-sm font-medium text-purple-800 mb-2">
                              Business Area
                            </label>
                            <div className="space-y-2">
                              {aiSuggestions.suggestions?.businessAreas?.map(
                                (suggestion: any, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategories((prev) => ({
                                        ...prev,
                                        businessArea: suggestion.businessArea,
                                      }))
                                    }
                                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                                      selectedCategories.businessArea === suggestion.businessArea
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white border border-purple-200 hover:bg-purple-50'
                                    }`}
                                  >
                                    <div className="font-medium">{suggestion.businessArea}</div>
                                    <div className="text-xs opacity-75">
                                      {suggestion.confidence}% confidence
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Department */}
                          <div>
                            <label className="block text-sm font-medium text-purple-800 mb-2">
                              Department
                            </label>
                            <div className="space-y-2">
                              {aiSuggestions.suggestions?.departments?.map(
                                (suggestion: any, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategories((prev) => ({
                                        ...prev,
                                        department: suggestion.department,
                                      }))
                                    }
                                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                                      selectedCategories.department === suggestion.department
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border border-blue-200 hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="font-medium">{suggestion.department}</div>
                                    <div className="text-xs opacity-75">
                                      {suggestion.confidence}% confidence
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Impact Type */}
                          <div>
                            <label className="block text-sm font-medium text-purple-800 mb-2">
                              Impact Type
                            </label>
                            <div className="space-y-2">
                              {aiSuggestions.suggestions?.impactTypes?.map(
                                (suggestion: any, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() =>
                                      setSelectedCategories((prev) => ({
                                        ...prev,
                                        impactType: suggestion.impactType,
                                      }))
                                    }
                                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                                      selectedCategories.impactType === suggestion.impactType
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white border border-green-200 hover:bg-green-50'
                                    }`}
                                  >
                                    <div className="font-medium">{suggestion.impactType}</div>
                                    <div className="text-xs opacity-75">
                                      {suggestion.confidence}% confidence
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        {/* AI Confidence */}
                        <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                          <div className="text-sm text-purple-700">
                            AI Analysis Confidence:{' '}
                            <span className="font-semibold">{aiSuggestions.aiConfidence}%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => generateAISuggestions(newIssue)}
                            className="text-xs text-purple-600 hover:text-purple-800 underline"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    ) : aiSuggestions?.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-2">
                          <span>❌</span>
                          AI Categorization Failed
                        </div>
                        <div className="text-red-700 text-xs mb-2">{aiSuggestions.error}</div>
                        <button
                          type="button"
                          onClick={() => generateAISuggestions(newIssue)}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <div className="text-purple-700 text-sm">
                        Keep typing for AI-powered categorization suggestions...
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="submit"
                      className={`btn-primary px-8 py-3 text-base font-semibold transition-all duration-200 ${
                        submitting || !newIssue.trim() || newIssue.length > 500
                          ? 'opacity-50 cursor-not-allowed'
                          : validationResult?.score &&
                              validationResult.score >= (scoringConfig?.thresholds.critical || 80)
                            ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl hover:scale-105'
                            : validationResult?.score &&
                                validationResult.score >= (scoringConfig?.thresholds.high || 60)
                              ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg hover:shadow-xl hover:scale-105'
                              : 'hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                      disabled={submitting || !newIssue.trim() || newIssue.length > 500}
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 loading-spinner"></div>
                          Submitting Issue...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {validationResult?.score &&
                          validationResult.score >= (scoringConfig?.thresholds.critical || 80) ? (
                            <span>✅</span>
                          ) : validationResult?.score &&
                            validationResult.score >= (scoringConfig?.thresholds.high || 60) ? (
                            <span>⚠️</span>
                          ) : (
                            <span>📝</span>
                          )}
                          Submit Issue
                          {validationResult?.score && (
                            <span className="text-xs opacity-75">
                              ({validationResult.score}/100)
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Validation Status Indicator */}
                    {validationResult && !submitting && (
                      <div className="text-xs text-center">
                        {validationResult.score >= (scoringConfig?.thresholds.critical || 80) ? (
                          <span className="text-green-600 font-medium">
                            🎉 Excellent quality - ready to submit!
                          </span>
                        ) : validationResult.score >= (scoringConfig?.thresholds.high || 60) ? (
                          <span className="text-yellow-600 font-medium">
                            👍 Good quality - consider improvements above
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">
                            🔧 Needs improvement - check suggestions above
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {newIssue.trim().length > 0 && !submitting && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewIssue('');
                        setSelectedCategories({
                          businessArea: '',
                          department: '',
                          impactType: '',
                        });
                        setAiSuggestions(null);
                        setValidationResult(null);
                        setShowValidation(false);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                    >
                      Clear Form
                    </button>
                  )}
                </div>
              </form>

              {message && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">✅</span>
                    <div className="text-green-800 font-medium">Issue Submitted Successfully!</div>
                  </div>
                  <p className="text-green-700 text-sm mt-1">{message}</p>
                </div>
              )}

              {/* Helper Tips */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  💡 Tips for Effective Issue Reports
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <div className="font-medium">✅ Be Specific</div>
                    <div>Include concrete examples and measurable impacts</div>
                  </div>
                  <div>
                    <div className="font-medium">✅ Focus on Business Impact</div>
                    <div>Explain how this affects productivity, costs, or goals</div>
                  </div>
                  <div>
                    <div className="font-medium">✅ Include Frequency</div>
                    <div>Daily, weekly, or project-specific occurrences</div>
                  </div>
                  <div>
                    <div className="font-medium">✅ Identify Stakeholders</div>
                    <div>Who is affected and in what departments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-8">
            {/* Issues Heatmap Legend */}
            <div className="card-secondary p-6 max-w-4xl mx-auto">
              <h3 className="text-h3 mb-4 text-center">Priority Heatmap</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="status-critical p-3 rounded-lg text-center">
                  <div className="w-6 h-6 bg-red-500 rounded-full mx-auto mb-2"></div>
                  <div className="font-medium text-sm">Critical</div>
                  <div className="text-xs opacity-75">80-100</div>
                </div>
                <div className="status-high p-3 rounded-lg text-center">
                  <div className="w-6 h-6 bg-orange-500 rounded-full mx-auto mb-2"></div>
                  <div className="font-medium text-sm">High</div>
                  <div className="text-xs opacity-75">60-79</div>
                </div>
                <div className="status-medium p-3 rounded-lg text-center">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                  <div className="font-medium text-sm">Medium</div>
                  <div className="text-xs opacity-75">40-59</div>
                </div>
                <div className="status-low p-3 rounded-lg text-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full mx-auto mb-2"></div>
                  <div className="font-medium text-sm">Low</div>
                  <div className="text-xs opacity-75">0-39</div>
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {issues.length > 0 && (
              <div className="card-secondary p-4 max-w-4xl mx-auto mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIssues.size === issues.length && issues.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">
                        {selectedIssues.size === 0
                          ? `Select All (${issues.length})`
                          : selectedIssues.size === issues.length
                            ? `All Selected (${issues.length})`
                            : `${selectedIssues.size} of ${issues.length} Selected`}
                      </span>
                    </label>

                    {selectedIssues.size > 0 && (
                      <button
                        onClick={() => setSelectedIssues(new Set())}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {selectedIssues.size > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600">
                        {selectedIssues.size} issue{selectedIssues.size === 1 ? '' : 's'} selected
                      </div>
                      <button
                        onClick={handleCreateInitiativeFromSelected}
                        disabled={bulkActionLoading}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        {bulkActionLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Create Initiative from Selected
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issues List */}
            <div>
              {issues.length === 0 ? (
                <div className="card-tertiary p-8 text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-h3 mb-2">No Issues Yet</h3>
                  <p className="text-caption">
                    Be the first to identify a problem that needs attention!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`card-secondary p-6 hover:shadow-card-primary transition-all duration-200 ${
                        selectedIssues.has(issue.id) ? 'ring-2 ring-primary bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-6">
                        {/* Selection Checkbox */}
                        <div className="flex items-center pt-2">
                          <input
                            type="checkbox"
                            data-cy="issue-checkbox"
                            checked={selectedIssues.has(issue.id)}
                            onChange={(e) => handleSelectIssue(issue.id, e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>

                        {/* Voting Section */}
                        <div className="flex flex-col items-center gap-2 min-w-[80px]">
                          <button
                            onClick={() => handleVote(issue.id, true)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Upvote this issue"
                          >
                            <svg
                              className="w-4 h-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <span className="text-2xl font-bold text-gray-900">{issue.votes}</span>
                          <button
                            onClick={() => handleVote(issue.id, false)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-100 rounded-lg transition-colors"
                            title="Downvote this issue"
                          >
                            <svg
                              className="w-4 h-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <div className="text-xs text-gray-500 text-center">votes</div>
                        </div>

                        {/* Issue Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <p className="text-body flex-1">{issue.description}</p>

                            {/* Heatmap Score Badge */}
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                issue.heatmapScore >= (scoringConfig?.thresholds.critical || 80)
                                  ? 'status-critical'
                                  : issue.heatmapScore >= (scoringConfig?.thresholds.high || 60)
                                    ? 'status-high'
                                    : issue.heatmapScore >= (scoringConfig?.thresholds.medium || 40)
                                      ? 'status-medium'
                                      : 'status-low'
                              }`}
                            >
                              {getHeatmapLabel(issue.heatmapScore)} ({issue.heatmapScore})
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <div className="text-caption">
                              Created{' '}
                              {new Date(issue.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConvertToInitiative(issue)}
                                className="btn-success text-sm"
                              >
                                Convert to Initiative
                              </button>
                            </div>
                          </div>

                          {/* AI Summary Section */}
                          <div className="border-t pt-4">
                            <AISummary
                              itemId={issue.id}
                              itemType="issue"
                              summary={issue.aiSummary}
                              confidence={issue.aiConfidence}
                              generatedAt={issue.aiGeneratedAt}
                              version={issue.aiVersion}
                              onSummaryGenerated={(summary) => {
                                // Update the issue in the local state
                                setIssues((prev) =>
                                  prev.map((i) =>
                                    i.id === issue.id
                                      ? {
                                          ...i,
                                          aiSummary: summary,
                                          aiGeneratedAt: new Date().toISOString(),
                                        }
                                      : i
                                  )
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}



        {activeTab === 'executive' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Executive Business View</h2>
                  <p className="text-sm text-gray-600">Issues organized by business impact and strategic importance</p>
                </div>
              </div>
              <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
                <strong>For Executives:</strong> This view transforms technical issue categories into business-relevant areas 
                for strategic decision making. Strategic issues require immediate executive attention, operational issues 
                affect daily productivity, and tactical issues are implementation-specific concerns.
              </div>
            </div>
            <ExecutiveClusteringView />
          </div>
        )}
      </div>
    </div>
  );
}
