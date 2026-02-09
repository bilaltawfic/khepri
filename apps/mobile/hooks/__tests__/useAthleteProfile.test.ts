import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAthleteProfile } from '../useAthleteProfile';

// Mock supabase
const mockGetAthleteByAuthUser = jest.fn();
const mockUpdateAthlete = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  updateAthlete: (...args: unknown[]) => mockUpdateAthlete(...args),
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
  weight_kg: 70,
  height_cm: 175,
  ftp_watts: 250,
  resting_heart_rate: 50,
  max_heart_rate: 185,
  preferred_units: 'metric',
  timezone: 'UTC',
  date_of_birth: '1990-01-15',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useAthleteProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockAuthUser = mockUser;
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockUpdateAthlete.mockResolvedValue({ data: mockAthlete, error: null });
  });

  describe('initial load', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAthleteProfile());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.athlete).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('fetches athlete profile on mount', async () => {
      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(mockSupabase, 'auth-user-123');
      expect(result.current.athlete).toEqual(mockAthlete);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('Profile not found'),
      });

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.athlete).toBeNull();
      expect(result.current.error).toBe('Profile not found');
    });

    it('handles fetch rejection', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.athlete).toBeNull();
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthUser = null;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.athlete).toBeNull();
    });
  });

  describe('when supabase is not configured', () => {
    beforeEach(() => {
      mockSupabase = undefined;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(result.current.athlete).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates profile successfully', async () => {
      const updatedAthlete = { ...mockAthlete, display_name: 'Updated Name' };
      mockUpdateAthlete.mockResolvedValue({ data: updatedAthlete, error: null });

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'Updated Name' });
      });

      expect(updateResult!.success).toBe(true);
      expect(updateResult!.error).toBeUndefined();
      expect(mockUpdateAthlete).toHaveBeenCalledWith(mockSupabase, 'athlete-123', {
        display_name: 'Updated Name',
      });
      expect(result.current.athlete?.display_name).toBe('Updated Name');
    });

    it('handles update error', async () => {
      mockUpdateAthlete.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Update failed');
    });

    it('handles update rejection', async () => {
      mockUpdateAthlete.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('Network error');
    });

    it('returns error when no athlete profile exists', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: { success: boolean; error?: string };
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(updateResult!.success).toBe(false);
      expect(updateResult!.error).toBe('No athlete profile to update');
      expect(mockUpdateAthlete).not.toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('refetches athlete profile', async () => {
      const { result } = renderHook(() => useAthleteProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledTimes(2);
    });
  });
});
