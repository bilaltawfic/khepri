import type { ConstraintRow } from '@khepri/supabase-client';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useConstraints } from '../useConstraints';

// Mock supabase-client functions
const mockGetAthleteByAuthUser = jest.fn();
const mockGetAllConstraints = jest.fn();
const mockGetConstraintById = jest.fn();
const mockCreateConstraint = jest.fn();
const mockUpdateConstraint = jest.fn();
const mockDeleteConstraint = jest.fn();
const mockResolveConstraint = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getAllConstraints: (...args: unknown[]) => mockGetAllConstraints(...args),
  getConstraintById: (...args: unknown[]) => mockGetConstraintById(...args),
  createConstraint: (...args: unknown[]) => mockCreateConstraint(...args),
  updateConstraint: (...args: unknown[]) => mockUpdateConstraint(...args),
  deleteConstraint: (...args: unknown[]) => mockDeleteConstraint(...args),
  resolveConstraint: (...args: unknown[]) => mockResolveConstraint(...args),
}));

// Mock supabase client
let mockSupabase: object | undefined = {};

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// Mock auth context
const mockUser = { id: 'auth-user-123', email: 'test@example.com' };
let mockAuthUser: typeof mockUser | null = mockUser;

jest.mock('@/contexts', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

const mockAthlete = {
  id: 'athlete-123',
  auth_user_id: 'auth-user-123',
  display_name: 'Test Athlete',
};

const mockConstraint = {
  id: 'constraint-123',
  athlete_id: 'athlete-123',
  constraint_type: 'injury',
  title: 'Left Knee Pain',
  description: 'Mild discomfort while running',
  start_date: '2026-02-01',
  end_date: null,
  status: 'active',
  injury_body_part: 'left_knee',
  injury_severity: 'mild',
  injury_restrictions: ['no_running'],
  travel_destination: null,
  travel_equipment_available: null,
  travel_facilities_available: null,
  availability_hours_per_week: null,
  availability_days_available: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
};

const mockResolvedConstraint = {
  ...mockConstraint,
  id: 'constraint-456',
  title: 'Old Injury',
  status: 'resolved',
};

describe('useConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockAuthUser = mockUser;
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockGetAllConstraints.mockResolvedValue({
      data: [mockConstraint, mockResolvedConstraint],
      error: null,
    });
    mockGetConstraintById.mockResolvedValue({ data: mockConstraint, error: null });
    mockCreateConstraint.mockResolvedValue({ data: mockConstraint, error: null });
    mockUpdateConstraint.mockResolvedValue({ data: mockConstraint, error: null });
    mockDeleteConstraint.mockResolvedValue({ data: null, error: null });
    mockResolveConstraint.mockResolvedValue({
      data: { ...mockConstraint, status: 'resolved' },
      error: null,
    });
  });

  describe('initial load', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useConstraints());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.constraints).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('fetches constraints on mount', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(mockSupabase, 'auth-user-123');
      expect(mockGetAllConstraints).toHaveBeenCalledWith(mockSupabase, 'athlete-123');
      expect(result.current.constraints).toEqual([mockConstraint, mockResolvedConstraint]);
      expect(result.current.error).toBeNull();
    });

    it('handles athlete fetch error', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('Athlete not found'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.constraints).toEqual([]);
      expect(result.current.error).toBe('Athlete not found');
    });

    it('handles athlete not found', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.constraints).toEqual([]);
      expect(result.current.error).toBe('Athlete profile not found');
    });

    it('handles constraints fetch error', async () => {
      mockGetAllConstraints.mockResolvedValue({
        data: null,
        error: new Error('Failed to fetch constraints'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.constraints).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch constraints');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthUser = null;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.constraints).toEqual([]);
    });
  });

  describe('when supabase is not configured', () => {
    beforeEach(() => {
      mockSupabase = undefined;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.constraints).toEqual([]);
    });
  });

  describe('getConstraint', () => {
    it('fetches a single constraint by ID', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let fetchResult: { data: ConstraintRow | null; error: string | null } = {
        data: null,
        error: null,
      };
      await act(async () => {
        fetchResult = await result.current.getConstraint('constraint-123');
      });

      expect(mockGetConstraintById).toHaveBeenCalledWith(mockSupabase, 'constraint-123');
      expect(fetchResult.data).toEqual(mockConstraint);
      expect(fetchResult.error).toBeNull();
    });

    it('returns error when constraint not found', async () => {
      mockGetConstraintById.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let fetchResult: { data: ConstraintRow | null; error: string | null } = {
        data: null,
        error: null,
      };
      await act(async () => {
        fetchResult = await result.current.getConstraint('invalid-id');
      });

      expect(fetchResult.data).toBeNull();
      expect(fetchResult.error).toBe('Not found');
    });
  });

  describe('createConstraint', () => {
    it('creates a constraint and adds it to local state', async () => {
      const newConstraintData = {
        constraint_type: 'injury',
        title: 'New Injury',
        start_date: '2026-02-10',
      };

      const createdConstraint = {
        ...mockConstraint,
        id: 'new-constraint-id',
        title: 'New Injury',
        start_date: '2026-02-10',
      };

      mockCreateConstraint.mockResolvedValue({ data: createdConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially has 2 constraints
      expect(result.current.constraints).toHaveLength(2);

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint(newConstraintData);
      });

      expect(createResult!.success).toBe(true);
      expect(mockCreateConstraint).toHaveBeenCalledWith(mockSupabase, {
        ...newConstraintData,
        athlete_id: 'athlete-123',
      });

      // Verify the new constraint was added to local state
      expect(result.current.constraints).toHaveLength(3);
      expect(result.current.constraints.some((c) => c.id === 'new-constraint-id')).toBe(true);
    });

    it('handles create error', async () => {
      mockCreateConstraint.mockResolvedValue({
        data: null,
        error: new Error('Create failed'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint({
          constraint_type: 'injury',
          title: 'Test',
          start_date: '2026-02-10',
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Create failed');
    });

    it('returns error when athlete not loaded', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint({
          constraint_type: 'injury',
          title: 'Test',
          start_date: '2026-02-10',
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('No athlete profile found');
    });
  });

  describe('updateConstraint', () => {
    it('updates a constraint and reflects changes in local state', async () => {
      const updatedConstraint = { ...mockConstraint, title: 'Updated Title' };
      mockUpdateConstraint.mockResolvedValue({ data: updatedConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify original title before update
      const originalConstraint = result.current.constraints.find((c) => c.id === 'constraint-123');
      expect(originalConstraint?.title).toBe('Left Knee Pain');

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'Updated Title',
        });
      });

      expect(updateResult!.success).toBe(true);
      expect(mockUpdateConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123', {
        title: 'Updated Title',
      });

      // Verify the constraint was updated in local state
      const updatedInState = result.current.constraints.find((c) => c.id === 'constraint-123');
      expect(updatedInState?.title).toBe('Updated Title');
    });

    it('handles update error', async () => {
      mockUpdateConstraint.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'New Title',
        });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Update failed');
    });
  });

  describe('deleteConstraint', () => {
    it('deletes a constraint and removes it from local state', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify constraint exists before delete
      expect(result.current.constraints).toHaveLength(2);
      expect(result.current.constraints.some((c) => c.id === 'constraint-123')).toBe(true);

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(true);
      expect(mockDeleteConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123');

      // Verify the constraint was removed from local state
      expect(result.current.constraints).toHaveLength(1);
      expect(result.current.constraints.some((c) => c.id === 'constraint-123')).toBe(false);
    });

    it('handles delete error', async () => {
      mockDeleteConstraint.mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(false);
      expect(deleteResult!.error).toBe('Delete failed');
    });
  });

  describe('resolveConstraint', () => {
    it('resolves a constraint and updates status in local state', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify constraint is active before resolve
      const beforeResolve = result.current.constraints.find((c) => c.id === 'constraint-123');
      expect(beforeResolve?.status).toBe('active');

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(true);
      expect(mockResolveConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123');

      // Verify the constraint status was updated in local state
      const afterResolve = result.current.constraints.find((c) => c.id === 'constraint-123');
      expect(afterResolve?.status).toBe('resolved');
    });

    it('handles resolve error', async () => {
      mockResolveConstraint.mockResolvedValue({
        data: null,
        error: new Error('Resolve failed'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(false);
      expect(resolveResult!.error).toBe('Resolve failed');
    });
  });

  describe('refetch', () => {
    it('refetches constraints', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAllConstraints).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetAllConstraints).toHaveBeenCalledTimes(2);
    });
  });

  describe('sorting behavior', () => {
    it('re-sorts constraints after creating a new one', async () => {
      // Database returns sorted data: active (Feb 1) then resolved (Feb 1)
      const sortedFromDb = [
        { ...mockConstraint, id: 'existing', status: 'active', start_date: '2026-02-01' },
        { ...mockResolvedConstraint, id: 'resolved', status: 'resolved', start_date: '2026-02-01' },
      ];
      mockGetAllConstraints.mockResolvedValue({ data: sortedFromDb, error: null });

      // New constraint has later date (Feb 15) - should sort to top
      const newConstraint = {
        ...mockConstraint,
        id: 'new',
        status: 'active',
        start_date: '2026-02-15',
      };
      mockCreateConstraint.mockResolvedValue({ data: newConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial state from database
      expect(result.current.constraints.map((c) => c.id)).toEqual(['existing', 'resolved']);

      await act(async () => {
        await result.current.createConstraint({
          constraint_type: 'injury',
          title: 'New',
          start_date: '2026-02-15',
        });
      });

      // After create: new (active, Feb 15) first, existing (active, Feb 1) second, resolved last
      const ids = result.current.constraints.map((c) => c.id);
      expect(ids).toEqual(['new', 'existing', 'resolved']);
    });

    it('moves constraint to resolved section after resolving', async () => {
      // Start with 2 active constraints (sorted by date desc from DB)
      const activeConstraints = [
        { ...mockConstraint, id: 'c1', status: 'active', start_date: '2026-02-01' },
        { ...mockConstraint, id: 'c2', status: 'active', start_date: '2026-01-15' },
      ];
      mockGetAllConstraints.mockResolvedValue({ data: activeConstraints, error: null });

      const resolvedConstraint = { ...activeConstraints[0], status: 'resolved' };
      mockResolveConstraint.mockResolvedValue({ data: resolvedConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Before: c1 (active, newer) comes first
      expect(result.current.constraints[0]?.id).toBe('c1');
      expect(result.current.constraints[0]?.status).toBe('active');

      await act(async () => {
        await result.current.resolveConstraint('c1');
      });

      // After: c2 (still active) comes first, c1 (now resolved) moves to end
      expect(result.current.constraints[0]?.id).toBe('c2');
      expect(result.current.constraints[0]?.status).toBe('active');
      expect(result.current.constraints[1]?.id).toBe('c1');
      expect(result.current.constraints[1]?.status).toBe('resolved');
    });

    it('maintains sort order after updating a constraint date', async () => {
      // Start with 2 active constraints sorted by date
      const constraints = [
        { ...mockConstraint, id: 'c1', status: 'active', start_date: '2026-02-01' },
        { ...mockConstraint, id: 'c2', status: 'active', start_date: '2026-01-15' },
      ];
      mockGetAllConstraints.mockResolvedValue({ data: constraints, error: null });

      // Update c2 to have a later date than c1
      const updatedConstraint = { ...constraints[1], start_date: '2026-03-01' };
      mockUpdateConstraint.mockResolvedValue({ data: updatedConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Before: c1 (Feb 1) first, c2 (Jan 15) second
      expect(result.current.constraints.map((c) => c.id)).toEqual(['c1', 'c2']);

      await act(async () => {
        await result.current.updateConstraint('c2', { start_date: '2026-03-01' });
      });

      // After: c2 (Mar 1) first, c1 (Feb 1) second
      expect(result.current.constraints.map((c) => c.id)).toEqual(['c2', 'c1']);
    });
  });

  describe('exception handling', () => {
    it('handles exception in fetchConstraints', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.constraints).toEqual([]);
    });

    it('handles non-Error exception in fetchConstraints', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue('string error');

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load constraints');
    });

    it('handles exception in getConstraint', async () => {
      mockGetConstraintById.mockRejectedValue(new Error('Fetch error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let fetchResult: { data: ConstraintRow | null; error: string | null } = {
        data: null,
        error: null,
      };
      await act(async () => {
        fetchResult = await result.current.getConstraint('constraint-123');
      });

      expect(fetchResult.data).toBeNull();
      expect(fetchResult.error).toBe('Fetch error');
    });

    it('handles exception in createConstraint', async () => {
      mockCreateConstraint.mockRejectedValue(new Error('Create network error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint({
          constraint_type: 'injury',
          title: 'Test',
          start_date: '2026-02-10',
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Create network error');
    });

    it('handles non-Error exception in createConstraint', async () => {
      mockCreateConstraint.mockRejectedValue('string error');

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint({
          constraint_type: 'injury',
          title: 'Test',
          start_date: '2026-02-10',
        });
      });

      expect(createResult!.success).toBe(false);
      expect(createResult!.error).toBe('Failed to create constraint');
    });

    it('handles exception in updateConstraint', async () => {
      mockUpdateConstraint.mockRejectedValue(new Error('Update network error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'Updated',
        });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Update network error');
    });

    it('handles non-Error exception in updateConstraint', async () => {
      mockUpdateConstraint.mockRejectedValue('string error');

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'Updated',
        });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Failed to update constraint');
    });

    it('handles exception in deleteConstraint', async () => {
      mockDeleteConstraint.mockRejectedValue(new Error('Delete network error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(false);
      expect(deleteResult!.error).toBe('Delete network error');
    });

    it('handles non-Error exception in deleteConstraint', async () => {
      mockDeleteConstraint.mockRejectedValue('string error');

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(false);
      expect(deleteResult!.error).toBe('Failed to delete constraint');
    });

    it('handles exception in resolveConstraint', async () => {
      mockResolveConstraint.mockRejectedValue(new Error('Resolve network error'));

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(false);
      expect(resolveResult!.error).toBe('Resolve network error');
    });

    it('handles non-Error exception in resolveConstraint', async () => {
      mockResolveConstraint.mockRejectedValue('string error');

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(false);
      expect(resolveResult!.error).toBe('Failed to resolve constraint');
    });
  });

  describe('supabase not configured for operations', () => {
    beforeEach(() => {
      mockSupabase = undefined;
    });

    it('returns error for getConstraint when supabase not configured', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let fetchResult: { data: ConstraintRow | null; error: string | null } = {
        data: null,
        error: null,
      };
      await act(async () => {
        fetchResult = await result.current.getConstraint('constraint-123');
      });

      expect(fetchResult.data).toBeNull();
      expect(fetchResult.error).toBe('Supabase client not initialized');
    });

    it('returns error for updateConstraint', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'Updated',
        });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Supabase not configured');
    });

    it('returns error for deleteConstraint', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(false);
      expect(deleteResult!.error).toBe('Supabase not configured');
    });

    it('returns error for resolveConstraint', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(false);
      expect(resolveResult!.error).toBe('Supabase not configured');
    });
  });
});
