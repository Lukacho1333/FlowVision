import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface Issue {
  id: string;
  description: string;
  votes: number;
  heatmapScore: number;
  department: string;
  category: string;
  status: string;
  keywords: string[];
  clusterId?: string;
  createdAt: string;
  updatedAt: string;
  // Executive clustering fields
  businessAreaId?: string;
  impactLevel?: 'strategic' | 'operational' | 'tactical';
}

export interface IssueFilters {
  department?: string;
  category?: string;
  status?: string;
  sortBy?: string;
}

// Query Keys
export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters: IssueFilters) => [...issueKeys.lists(), filters] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
};

// API Functions
async function fetchIssues(filters: IssueFilters = {}): Promise<Issue[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const response = await fetch(`/api/issues?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }
  return response.json();
}

async function fetchIssue(id: string): Promise<Issue> {
  const response = await fetch(`/api/issues/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch issue: ${response.statusText}`);
  }
  return response.json();
}

async function createIssue(issueData: Partial<Issue>): Promise<Issue> {
  const response = await fetch('/api/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issueData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create issue: ${response.statusText}`);
  }
  return response.json();
}

async function updateIssue(id: string, issueData: Partial<Issue>): Promise<Issue> {
  const response = await fetch(`/api/issues/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issueData),
  });
  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.statusText}`);
  }
  return response.json();
}

async function deleteIssue(id: string): Promise<void> {
  const response = await fetch(`/api/issues/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete issue: ${response.statusText}`);
  }
}

// Hooks
export function useIssues(filters: IssueFilters = {}) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: issueKeys.list(filters),
    queryFn: () => fetchIssues(filters),
    enabled: !!session,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useIssue(id: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => fetchIssue(id),
    enabled: !!session && !!id,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createIssue,
    onSuccess: () => {
      // Invalidate and refetch issues lists
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Issue> }) => 
      updateIssue(id, data),
    onSuccess: (updatedIssue) => {
      // Update the specific issue in cache
      queryClient.setQueryData(
        issueKeys.detail(updatedIssue.id),
        updatedIssue
      );
      // Invalidate lists to ensure they're fresh
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteIssue,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: issueKeys.detail(deletedId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}
