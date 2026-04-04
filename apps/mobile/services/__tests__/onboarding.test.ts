import type { OnboardingData } from '@/contexts';

import { saveOnboardingData } from '../onboarding';

const mockGetAthleteByAuthUser = jest.fn();
const mockUpdateAthlete = jest.fn();
const mockCreateAthlete = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  updateAthlete: (...args: unknown[]) => mockUpdateAthlete(...args),
  createAthlete: (...args: unknown[]) => mockCreateAthlete(...args),
}));

const mockAuthUserId = 'auth-user-123';
const mockAthlete = { id: 'athlete-456', display_name: 'Test User' };

function makeData(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return { ...overrides };
}

describe('saveOnboardingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockUpdateAthlete.mockResolvedValue({ data: mockAthlete, error: null });
  });

  it('returns success in dev mode when supabase is not configured', async () => {
    mockSupabase = undefined;

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
  });

  it('updates athlete profile with all 6 fitness numbers', async () => {
    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        ftp: 250,
        lthr: 165,
        runThresholdPace: 330,
        css: 105,
        restingHR: 52,
        maxHR: 185,
        weight: 72,
      })
    );

    expect(result.success).toBe(true);
    expect(mockUpdateAthlete).toHaveBeenCalledWith(expect.anything(), 'athlete-456', {
      ftp_watts: 250,
      lthr: 165,
      running_threshold_pace_sec_per_km: 330,
      css_sec_per_100m: 105,
      resting_heart_rate: 52,
      max_heart_rate: 185,
      weight_kg: 72,
    });
  });

  it('sends null for missing fitness numbers', async () => {
    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockUpdateAthlete).toHaveBeenCalledWith(expect.anything(), 'athlete-456', {
      ftp_watts: null,
      lthr: null,
      running_threshold_pace_sec_per_km: null,
      css_sec_per_100m: null,
      resting_heart_rate: null,
      max_heart_rate: null,
      weight_kg: null,
    });
  });

  it('does not create goals or training plans', async () => {
    const result = await saveOnboardingData(mockAuthUserId, makeData({ ftp: 250 }));

    expect(result.success).toBe(true);
    // Only updateAthlete should be called, no goal or plan creation
    expect(mockUpdateAthlete).toHaveBeenCalledTimes(1);
  });

  it('handles athlete lookup error', async () => {
    mockGetAthleteByAuthUser.mockResolvedValueOnce({
      data: null,
      error: new Error('Database error'),
    });

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
    expect(mockUpdateAthlete).not.toHaveBeenCalled();
  });

  it('creates athlete profile when none exists', async () => {
    mockGetAthleteByAuthUser.mockResolvedValueOnce({ data: null, error: null });
    mockCreateAthlete.mockResolvedValueOnce({ data: mockAthlete, error: null });

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockCreateAthlete).toHaveBeenCalledWith(expect.anything(), {
      auth_user_id: mockAuthUserId,
    });
    expect(mockUpdateAthlete).toHaveBeenCalled();
  });

  it('handles athlete creation failure', async () => {
    mockGetAthleteByAuthUser.mockResolvedValueOnce({ data: null, error: null });
    mockCreateAthlete.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') });

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
    expect(mockUpdateAthlete).not.toHaveBeenCalled();
  });

  it('handles athlete update error', async () => {
    mockUpdateAthlete.mockResolvedValueOnce({
      data: null,
      error: new Error('Update failed'),
    });

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Update failed');
  });

  it('handles unexpected exceptions', async () => {
    mockGetAthleteByAuthUser.mockRejectedValueOnce(new Error('Network error'));

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('handles non-Error exceptions', async () => {
    mockGetAthleteByAuthUser.mockRejectedValueOnce('string error');

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to save onboarding data');
  });
});
