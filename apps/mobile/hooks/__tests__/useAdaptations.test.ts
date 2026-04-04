import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAdaptations } from '../useAdaptations';

// Mock useAuth
let mockUser: { id: string } | null = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock supabase
let mockSupabase: object | null = {};
jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// Mock supabase-client queries
const mockGetAthleteByAuthUser = jest.fn();
const mockGetPendingAdaptations = jest.fn();
const mockAcceptAdaptation = jest.fn();
const mockRejectAdaptation = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getPendingAdaptations: (...args: unknown[]) => mockGetPendingAdaptations(...args),
  acceptAdaptation: (...args: unknown[]) => mockAcceptAdaptation(...args),
  rejectAdaptation: (...args: unknown[]) => mockRejectAdaptation(...args),
}));

// =============================================================================
// Fixtures
// =============================================================================

const mockAthlete = { id: 'athlete-456', auth_user_id: 'auth-user-123' };

const mockAdaptations = [
  {
    id: 'adapt-1',
    athlete_id: 'athlete-456',
    block_id: 'block-1',
    trigger: 'coach_suggestion',
    status: 'suggested',
    reason: 'Poor sleep — reduce intensity today.',
    affected_workouts: [],
    context: {},
    created_at: '2026-04-04T08:00:00Z',
    updated_at: '2026-04-04T08:00:00Z',
    applied_at: null,
    rejected_at: null,
  },
  {
    id: 'adapt-2',
    athlete_id: 'athlete-456',
    block_id: 'block-1',
    trigger: 'coach_suggestion',
    status: 'suggested',
    reason: 'High soreness — substitute swim for run.',
    affected_workouts: [],
    context: {},
    created_at: '2026-04-04T09:00:00Z',
    updated_at: '2026-04-04T09:00:00Z',
    applied_at: null,
    rejected_at: null,
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useAdaptations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'auth-user-123' };
    mockSupabase = {};
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockGetPendingAdaptations.mockResolvedValue({ data: mockAdaptations, error: null });
  });

  it('loads pending adaptations on mount', async () => {
    const { result } = renderHook(() => useAdaptations());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toEqual(mockAdaptations);
    expect(result.current.error).toBeNull();
    expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith({}, 'auth-user-123');
    expect(mockGetPendingAdaptations).toHaveBeenCalledWith({}, 'athlete-456');
  });

  it('returns empty list when no user is authenticated', async () => {
    mockUser = null;

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toEqual([]);
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
  });

  it('returns empty list when supabase is not available', async () => {
    mockSupabase = null;

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toEqual([]);
  });

  it('sets error when athlete lookup fails', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.pendingAdaptations).toEqual([]);
  });

  it('returns empty list when athlete not found (null data, no error)', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when adaptations fetch fails', async () => {
    mockGetPendingAdaptations.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.pendingAdaptations).toEqual([]);
  });

  it('handles null data from getPendingAdaptations gracefully', async () => {
    mockGetPendingAdaptations.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('accept removes the adaptation from the list optimistically', async () => {
    mockAcceptAdaptation.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingAdaptations).toHaveLength(2);

    await act(async () => {
      const actionResult = await result.current.accept('adapt-1');
      expect(actionResult.success).toBe(true);
    });

    expect(result.current.pendingAdaptations).toHaveLength(1);
    expect(result.current.pendingAdaptations[0].id).toBe('adapt-2');
    expect(mockAcceptAdaptation).toHaveBeenCalledWith({}, 'adapt-1');
  });

  it('reject removes the adaptation from the list optimistically', async () => {
    mockRejectAdaptation.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const actionResult = await result.current.reject('adapt-2');
      expect(actionResult.success).toBe(true);
    });

    expect(result.current.pendingAdaptations).toHaveLength(1);
    expect(result.current.pendingAdaptations[0].id).toBe('adapt-1');
  });

  it('accept returns error result when acceptAdaptation fails', async () => {
    mockAcceptAdaptation.mockResolvedValue({ error: { message: 'Accept failed' } });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let actionResult: { success: boolean; error?: string } = { success: true };
    await act(async () => {
      actionResult = await result.current.accept('adapt-1');
    });

    expect(actionResult.success).toBe(false);
    expect(actionResult.error).toBe('Accept failed');
    // List should NOT be modified on failure
    expect(result.current.pendingAdaptations).toHaveLength(2);
  });

  it('reject returns error result when rejectAdaptation fails', async () => {
    mockRejectAdaptation.mockResolvedValue({ error: { message: 'Reject failed' } });

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let actionResult: { success: boolean; error?: string } = { success: true };
    await act(async () => {
      actionResult = await result.current.reject('adapt-1');
    });

    expect(actionResult.success).toBe(false);
    expect(actionResult.error).toBe('Reject failed');
    expect(result.current.pendingAdaptations).toHaveLength(2);
  });

  it('accept returns error when supabase is not available', async () => {
    mockSupabase = null;

    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let actionResult: { success: boolean; error?: string } = { success: true };
    await act(async () => {
      actionResult = await result.current.accept('adapt-1');
    });

    expect(actionResult.success).toBe(false);
    expect(actionResult.error).toBe('Supabase client not available');
  });

  it('refetch reloads adaptations', async () => {
    const { result } = renderHook(() => useAdaptations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetPendingAdaptations.mockResolvedValue({ data: [mockAdaptations[0]], error: null });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.pendingAdaptations).toHaveLength(1);
    expect(result.current.pendingAdaptations[0].id).toBe('adapt-1');
  });
});
