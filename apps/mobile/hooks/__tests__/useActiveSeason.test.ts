import { renderHook, waitFor } from '@testing-library/react-native';
import { useActiveSeason } from '../useActiveSeason';

const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveSeason = jest.fn();
let mockSupabase: object | undefined;

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveSeason: (...args: unknown[]) => mockGetActiveSeason(...args),
}));

describe('useActiveSeason', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
  });

  it('returns hasActiveSeason=true when season exists', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: 'athlete-1' },
      error: null,
    });
    mockGetActiveSeason.mockResolvedValue({
      data: { id: 'season-1', status: 'active' },
      error: null,
    });

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveSeason).toBe(true);
  });

  it('returns hasActiveSeason=false when no season exists', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: 'athlete-1' },
      error: null,
    });
    mockGetActiveSeason.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveSeason).toBe(false);
  });

  it('returns hasActiveSeason=false when athlete lookup fails', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: new Error('Not found'),
    });

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveSeason).toBe(false);
  });

  it('returns hasActiveSeason=false when supabase is not configured', async () => {
    mockSupabase = undefined;

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveSeason).toBe(false);
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
  });
});
