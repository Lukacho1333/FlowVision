import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

export interface Initiative {
  id: string;
  title: string;
  problem: string;
  goal: string;
  status: string;
  progress: number;
  type: string;
  phase: string;
  difficulty: number;
  roi: number;
  priorityScore: number;
  budget?: number;
  estimatedHours?: number;
  actualHours?: number;
  timelineStart?: string;
  timelineEnd?: string;
  ownerId: string;
  clusterId?: string;
  kpis: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InitiativeFilters {
  status?: string;
  type?: string;
  phase?: string;
  ownerId?: string;
  sortBy?: string;
}

// Query Keys
export const initiativeKeys = {
  all: ['initiatives'] as const,
  lists: () => [...initiativeKeys.all, 'list'] as const,
  list: (filters: InitiativeFilters) => [...initiativeKeys.lists(), filters] as const,
  details: () => [...initiativeKeys.all, 'detail'] as const,
  detail: (id: string) => [...initiativeKeys.details(), id] as const,
};

// API Functions
async function fetchInitiatives(filters: InitiativeFilters = {}): Promise<Initiative[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const response = await fetch(`/api/initiatives?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch initiatives: ${response.statusText}`);
  }
  return response.json();
}

async function fetchInitiative(id: string): Promise<Initiative> {
  const response = await fetch(`/api/initiatives/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch initiative: ${response.statusText}`);
  }
  return response.json();
}

async function createInitiative(initiativeData: Partial<Initiative>): Promise<Initiative> {
  const response = await fetch('/api/initiatives', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initiativeData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create initiative: ${response.statusText}`);
  }
  return response.json();
}

async function updateInitiative(id: string, initiativeData: Partial<Initiative>): Promise<Initiative> {
  const response = await fetch(`/api/initiatives/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initiativeData),
  });
  if (!response.ok) {
    throw new Error(`Failed to update initiative: ${response.statusText}`);
  }
  return response.json();
}

async function deleteInitiative(id: string): Promise<void> {
  const response = await fetch(`/api/initiatives/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete initiative: ${response.statusText}`);
  }
}

// Hooks
export function useInitiatives(filters: InitiativeFilters = {}) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: initiativeKeys.list(filters),
    queryFn: () => fetchInitiatives(filters),
    enabled: !!session,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useInitiative(id: string) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: initiativeKeys.detail(id),
    queryFn: () => fetchInitiative(id),
    enabled: !!session && !!id,
  });
}

export function useCreateInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createInitiative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
    },
  });
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Initiative> }) => 
      updateInitiative(id, data),
    onSuccess: (updatedInitiative) => {
      queryClient.setQueryData(
        initiativeKeys.detail(updatedInitiative.id),
        updatedInitiative
      );
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
    },
  });
}

export function useDeleteInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteInitiative,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: initiativeKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: initiativeKeys.lists() });
    },
  });
}
