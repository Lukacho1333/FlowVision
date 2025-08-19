'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import RequirementCardsBoard from '@/components/RequirementCardsBoard';
import SolutionsBoard from '@/components/SolutionsBoard';
import InitiativeAIContext from '@/components/InitiativeAIContext';

type Initiative = {
  id: string;
  title: string;
  problem: string;
  goal: string;
  kpis: string[];
  requirements?: string[];
  acceptanceCriteria?: string[];
  timelineStart: string | null;
  timelineEnd: string | null;
  status: string;
  progress: number;
  difficulty: number;
  roi: number;
  priorityScore: number;
  // AI Context Fields
  sourceCategory?: string;
  aiAnalysisContext?: any;
  aiConfidence?: number;
  aiGeneratedAt?: string;
  // Relationships
  addressedIssues?: any[];
  createdAt: string;
  updatedAt: string;
};

export default function InitiativeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [form, setForm] = useState<Initiative | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function loadInitiative() {
      try {
        const res = await fetch(`/api/initiatives/${id}?include=addressedIssues`);

        if (res.ok) {
          const data = await res.json();
          setForm(data);
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          setMessage(`Failed to load initiative: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        setMessage('Error loading initiative.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadInitiative();
    }
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage('Initiative saved successfully!');
        setTimeout(() => {
          router.push('/initiatives');
        }, 1500);
      } else {
        setMessage('Failed to save initiative.');
      }
    } catch (error) {
      setMessage('Error saving initiative.');
    } finally {
      setSaving(false);
    }
  }

  function updateForm(field: string, value: any) {
    if (!form) return;
    setForm({ ...form, [field]: value });
  }

  async function generateRequirementsWithAI() {
    if (!form) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/initiatives/${params.id}/generate-requirement-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(
          `AI generated ${data.cards?.length || 0} requirement cards. Review them in the Requirements section below.`
        );
        // Scroll to requirements section
        setTimeout(() => {
          const reqSection = document.getElementById('requirements-section');
          if (reqSection) {
            reqSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      } else {
        setMessage(data.fallback || data.error || 'AI could not generate requirement cards.');
      }
    } catch (e) {
      setMessage('Failed to generate requirement cards.');
    } finally {
      setAiLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'Done':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Prioritize':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header Skeleton */}
        <div className="text-center">
          <div className="skeleton h-10 w-64 mx-auto mb-4"></div>
          <div className="skeleton h-6 w-96 mx-auto"></div>
        </div>

        {/* Form Skeleton */}
        <div className="card-primary p-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="skeleton h-12 w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="skeleton h-24 w-full"></div>
              <div className="skeleton h-24 w-full"></div>
            </div>
            <div className="skeleton h-12 w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-12 w-full"></div>
              <div className="skeleton h-12 w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-h1 mb-4">Initiative Not Found</h1>
          <p className="text-body mb-6">
            The initiative you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/initiatives" className="btn-primary">
            Back to Initiatives
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-h1 mb-4">Edit Initiative</h1>
        <p className="text-body max-w-2xl mx-auto">
          Update your initiative details, timeline, and progress. Changes are saved immediately.
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center text-caption">
          <Link href="/initiatives" className="text-primary hover:underline">
            Initiatives
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">{form.title}</span>
        </nav>
      </div>

      {/* Status Message */}
      {message && (
        <div className="max-w-4xl mx-auto">
          <div
            className={`p-4 rounded-lg text-center ${
              message.includes('successfully')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message}
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="card-primary p-8 max-w-4xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Title */}
          <div>
            <label className="block text-h3 mb-3">Initiative Title</label>
            <input
              className="input-field"
              placeholder="Enter a clear, descriptive title"
              value={form.title || ''}
              onChange={(e) => updateForm('title', e.target.value)}
              required
            />
          </div>

          {/* Problem & Goal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-h3 mb-3">Problem Statement</label>
              <textarea
                className="textarea-field"
                placeholder="Describe the problem this initiative addresses..."
                value={form.problem || ''}
                onChange={(e) => updateForm('problem', e.target.value)}
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-h3 mb-3">Goal & Outcome</label>
              <textarea
                className="textarea-field"
                placeholder="What outcome will this initiative achieve?"
                value={form.goal || ''}
                onChange={(e) => updateForm('goal', e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          {/* KPIs */}
          <div>
            <label className="block text-h3 mb-3">Key Performance Indicators</label>
            <input
              className="input-field"
              placeholder="Success metrics (comma-separated)"
              value={(form.kpis || []).join(', ')}
              onChange={(e) =>
                updateForm(
                  'kpis',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
            <p className="text-caption mt-2">
              Example: Revenue Growth, Customer Satisfaction, Cost Reduction
            </p>
          </div>

          {/* Requirements Cards Section */}
          <div id="requirements-section">
            <RequirementCardsBoard
              initiativeId={params.id}
              onGenerateWithAI={generateRequirementsWithAI}
              aiLoading={aiLoading}
            />
          </div>

          {/* Solutions & Implementation Section */}
          <div id="solutions-section">
            <SolutionsBoard
              initiativeId={params.id}
              onGenerateWithAI={() => {
                // TODO: Implement AI solution generation

              }}
              aiLoading={false}
            />
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-h3 mb-3">Timeline</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-caption mb-2">Start Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.timelineStart ? String(form.timelineStart).slice(0, 10) : ''}
                  onChange={(e) => updateForm('timelineStart', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-caption mb-2">End Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.timelineEnd ? String(form.timelineEnd).slice(0, 10) : ''}
                  onChange={(e) => updateForm('timelineEnd', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-h3 mb-3">Status</label>
              <select
                className="input-field"
                value={form.status || 'Define'}
                onChange={(e) => updateForm('status', e.target.value)}
              >
                <option value="Define">Define</option>
                <option value="Prioritize">Prioritize</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
              <div className="mt-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(form.status)}`}
                >
                  {form.status}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-h3 mb-3">Progress</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input-field"
                placeholder="Progress percentage"
                value={form.progress || 0}
                onChange={(e) => updateForm('progress', Number(e.target.value))}
              />
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${form.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-caption min-w-[3rem]">{form.progress || 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Scores Display */}
          <div className="card-secondary p-6">
            <h3 className="text-h3 mb-4">AI Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{form.difficulty || 0}</div>
                <div className="text-caption">Difficulty Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">{form.roi || 0}</div>
                <div className="text-caption">ROI Score</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold mb-1 ${
                    (form.priorityScore || 0) >= 70
                      ? 'text-green-600'
                      : (form.priorityScore || 0) >= 40
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {form.priorityScore || 0}
                </div>
                <div className="text-caption">Priority Score</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link href="/initiatives" className="btn-secondary">
              Cancel
            </Link>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={aiLoading}
                onClick={generateRequirementsWithAI}
              >
                {aiLoading ? 'Generating…' : 'AI: Generate Cards'}
              </button>
              <button
                type="submit"
                className={`btn-primary ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={saving}
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 loading-spinner"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Context and Addressed Issues */}
      <div className="max-w-4xl mx-auto">
        <InitiativeAIContext
          sourceCategory={form.sourceCategory}
          aiAnalysisContext={form.aiAnalysisContext}
          aiConfidence={form.aiConfidence}
          aiGeneratedAt={form.aiGeneratedAt}
          addressedIssues={form.addressedIssues}
        />
      </div>

      {/* Metadata */}
      <div className="max-w-4xl mx-auto">
        <div className="card-tertiary p-4">
          <div className="flex items-center justify-between text-caption">
            <span>
              Created:{' '}
              {new Date(form.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span>
              Last updated:{' '}
              {new Date(form.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
