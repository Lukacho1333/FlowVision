'use client';

import { useEffect, useState } from 'react';
import TimelineView from '@/components/roadmap/TimelineView';
import ResourceView from '@/components/roadmap/ResourceView';
import MilestoneView from '@/components/roadmap/MilestoneView';
import Link from 'next/link';

interface Initiative {
  id: string;
  title: string;
  problem: string;
  goal: string;
  status: string;
  progress: number;
  timelineStart: string | null;
  timelineEnd: string | null;
  priorityScore: number | null;
  phase: string | null;
  budget: number | null;
  assignments: Array<{
    team: {
      id: string;
      name: string;
      department: string;
    };
    role: string;
    hoursAllocated: number;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    status: string;
    progress: number;
  }>;
  dependencies: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
  department: string;
  capacity: number;
  skills: string[];
  totalAllocated: number;
  utilizationPercent: number;
  isOverallocated: boolean;
  assignments: Array<{
    id: string;
    hoursAllocated: number;
    role: string;
    initiative: {
      id: string;
      title: string;
      status: string;
      timelineStart: string | null;
      timelineEnd: string | null;
    };
  }>;
}

interface RoadmapData {
  initiatives: Initiative[];
  metrics: {
    totalInitiatives: number;
    activeInitiatives: number;
    completedInitiatives: number;
    overdueMilestones: number;
    totalBudget: number;
    totalHours: number;
  };
  quarters?: { [key: string]: Initiative[] };
  teamUtilization?: Team[];
}

type ViewMode = 'timeline' | 'milestones' | 'resources';

export default function RoadmapPage() {
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filters, setFilters] = useState({
    phase: '',
    team: '',
    startDate: '',
    endDate: '',
  });

  const fetchRoadmapData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        view: viewMode,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      });

      const response = await fetch(`/api/roadmap?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch roadmap data');
      }

      const data = await response.json();
      setRoadmapData(data);
      setError(null);
    } catch (err) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch roadmap data:', err);
      }
      setError('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmapData();
  }, [viewMode, filters]);

  const handleInitiativeClick = (initiative: Initiative) => {
    // Navigate to initiative detail page
    window.location.href = `/initiatives/${initiative.id}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      phase: '',
      team: '',
      startDate: '',
      endDate: '',
    });
  };

  if (loading && !roadmapData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="card-primary p-6 text-center">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Roadmap</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={fetchRoadmapData} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roadmapData) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1">Strategic Roadmap</h1>
            <p className="text-body text-gray-600 mt-2">
              Visualize initiatives, dependencies, and resource allocation across your organization
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/initiatives" className="btn-secondary">
              Manage Initiatives
            </Link>
            <button onClick={fetchRoadmapData} disabled={loading} className="btn-primary">
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {roadmapData.metrics.totalInitiatives}
              </div>
              <div className="text-xs font-medium text-gray-600">Total Initiatives</div>
            </div>
          </div>
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {roadmapData.metrics.activeInitiatives}
              </div>
              <div className="text-xs font-medium text-gray-600">Active</div>
            </div>
          </div>
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {roadmapData.metrics.completedInitiatives}
              </div>
              <div className="text-xs font-medium text-gray-600">Completed</div>
            </div>
          </div>
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600 mb-1">
                {roadmapData.metrics.overdueMilestones}
              </div>
              <div className="text-xs font-medium text-gray-600">Overdue Milestones</div>
            </div>
          </div>
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-purple-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                ${roadmapData.metrics.totalBudget.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-gray-600">Total Budget</div>
            </div>
          </div>
          <div className="card-interactive group">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-indigo-600 rounded"></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {roadmapData.metrics.totalHours.toLocaleString()}h
              </div>
              <div className="text-xs font-medium text-gray-600">Total Hours</div>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="card-primary">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('milestones')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'milestones'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Milestones
                </button>
                <button
                  onClick={() => setViewMode('resources')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'resources'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Resources
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-3">
                <select
                  value={filters.phase}
                  onChange={(e) => handleFilterChange('phase', e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Phases</option>
                  <option value="planning">Planning</option>
                  <option value="development">Development</option>
                  <option value="completed">Completed</option>
                </select>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Start Date"
                />

                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="End Date"
                />

                {Object.values(filters).some((f) => f !== '') && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'timeline' && (
          <TimelineView
            initiatives={roadmapData.initiatives}
            onInitiativeClick={handleInitiativeClick}
          />
        )}

        {viewMode === 'milestones' && (
          <MilestoneView
            initiatives={roadmapData.initiatives}
            onMilestoneClick={(milestone) => {
              // Navigate to initiative detail page with milestone focus
              window.location.href = `/initiatives/${milestone.initiative.id}?milestone=${milestone.id}`;
            }}
          />
        )}

        {viewMode === 'resources' && roadmapData.teamUtilization && (
          <ResourceView
            teamUtilization={roadmapData.teamUtilization}
            initiatives={roadmapData.initiatives}
            onTeamClick={(team) => {
              // Debug log in development only
              if (process.env.NODE_ENV === 'development') {

              }
              // Could open team detail modal or navigate to team page
            }}
          />
        )}

        {roadmapData.initiatives.length === 0 && (
          <div className="card-tertiary p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-h3 text-gray-900 mb-2">No Initiatives Found</h3>
            <p className="text-body text-gray-600 mb-6">
              Start by creating your first initiative to visualize your strategic roadmap.
            </p>
            <Link href="/initiatives" className="btn-primary">
              Create Initiative
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
