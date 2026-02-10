import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ConstraintRow } from '@khepri/supabase-client';

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

      let fetchedConstraint: ConstraintRow | null = null;
      await act(async () => {
        fetchedConstraint = await result.current.getConstraint('constraint-123');
      });

      expect(mockGetConstraintById).toHaveBeenCalledWith(mockSupabase, 'constraint-123');
      expect(fetchedConstraint).toEqual(mockConstraint);
    });

    it('returns null on error', async () => {
      mockGetConstraintById.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let fetchedConstraint: ConstraintRow | null = null;
      await act(async () => {
        fetchedConstraint = await result.current.getConstraint('invalid-id');
      });

      expect(fetchedConstraint).toBeNull();
    });
  });

  describe('createConstraint', () => {
    it('creates a constraint successfully', async () => {
      const newConstraint = {
        constraint_type: 'injury',
        title: 'New Injury',
        start_date: '2026-02-10',
      };

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createResult: { success: boolean; error?: string };
      await act(async () => {
        createResult = await result.current.createConstraint(newConstraint);
      });

      expect(createResult!.success).toBe(true);
      expect(createResult!.error).toBeUndefined();
      expect(mockCreateConstraint).toHaveBeenCalledWith(mockSupabase, {
        ...newConstraint,
        athlete_id: 'athlete-123',
      });
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
    it('updates a constraint successfully', async () => {
      const updatedConstraint = { ...mockConstraint, title: 'Updated Title' };
      mockUpdateConstraint.mockResolvedValue({ data: updatedConstraint, error: null });

      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateConstraint('constraint-123', {
          title: 'Updated Title',
        });
      });

      expect(updateResult!.success).toBe(true);
      expect(updateResult!.error).toBeUndefined();
      expect(mockUpdateConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123', {
        title: 'Updated Title',
      });
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
    it('deletes a constraint successfully', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: { success: boolean; error?: string };
      await act(async () => {
        deleteResult = await result.current.deleteConstraint('constraint-123');
      });

      expect(deleteResult!.success).toBe(true);
      expect(deleteResult!.error).toBeUndefined();
      expect(mockDeleteConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123');
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
    it('resolves a constraint successfully', async () => {
      const { result } = renderHook(() => useConstraints());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolveResult: { success: boolean; error?: string };
      await act(async () => {
        resolveResult = await result.current.resolveConstraint('constraint-123');
      });

      expect(resolveResult!.success).toBe(true);
      expect(resolveResult!.error).toBeUndefined();
      expect(mockResolveConstraint).toHaveBeenCalledWith(mockSupabase, 'constraint-123');
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
});
