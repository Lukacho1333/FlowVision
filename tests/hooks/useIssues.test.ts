import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useIssues, useCreateIssue, useUpdateIssue, useDeleteIssue } from '../../lib/react-query/hooks/useIssues';

// Mock Next.js auth
jest.mock('next-auth/react');

// Mock fetch
global.fetch = jest.fn();

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useIssues Hook', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { email: 'test@example.com' } },
      status: 'authenticated',
    });
    
    mockFetch.mockClear();
  });

  describe('useIssues', () => {
    it('fetches issues successfully', async () => {
      const mockIssues = [
        {
          id: '1',
          description: 'Test issue',
          votes: 5,
          heatmapScore: 75,
          department: 'Engineering',
          category: 'Technical',
          status: 'OPEN',
          keywords: ['bug', 'urgent'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      } as Response);

      const { result } = renderHook(() => useIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockIssues);
      expect(result.current.isError).toBe(false);
    });

    it('handles fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      const { result } = renderHook(() => useIssues(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    it('respects filter parameters', async () => {
      const filters = { department: 'Engineering', status: 'OPEN' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      renderHook(() => useIssues(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/issues?department=Engineering&status=OPEN'
        );
      });
    });

    it('does not fetch when user is not authenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { result } = renderHook(() => useIssues(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('useCreateIssue', () => {
    it('creates issue successfully', async () => {
      const newIssue = {
        id: '2',
        description: 'New test issue',
        votes: 0,
        heatmapScore: 50,
        department: 'Engineering',
        category: 'Technical',
        status: 'OPEN',
        keywords: ['new'],
        createdAt: '2024-01-02',
        updatedAt: '2024-01-02',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newIssue),
      } as Response);

      const { result } = renderHook(() => useCreateIssue(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        description: 'New test issue',
        department: 'Engineering',
        category: 'Technical',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'New test issue',
          department: 'Engineering',
          category: 'Technical',
        }),
      });
    });

    it('handles creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      const { result } = renderHook(() => useCreateIssue(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          description: 'Invalid issue',
        })
      ).rejects.toThrow('Failed to create issue: Bad Request');
    });
  });

  describe('useUpdateIssue', () => {
    it('updates issue successfully', async () => {
      const updatedIssue = {
        id: '1',
        description: 'Updated issue',
        votes: 10,
        heatmapScore: 85,
        department: 'Engineering',
        category: 'Technical',
        status: 'IN_PROGRESS',
        keywords: ['updated'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedIssue),
      } as Response);

      const { result } = renderHook(() => useUpdateIssue(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync({
        id: '1',
        data: { status: 'IN_PROGRESS', votes: 10 },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/issues/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS', votes: 10 }),
      });
    });
  });

  describe('useDeleteIssue', () => {
    it('deletes issue successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const { result } = renderHook(() => useDeleteIssue(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/issues/1', {
        method: 'DELETE',
      });
    });

    it('handles deletion errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() => useDeleteIssue(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('999')).rejects.toThrow(
        'Failed to delete issue: Not Found'
      );
    });
  });
});
