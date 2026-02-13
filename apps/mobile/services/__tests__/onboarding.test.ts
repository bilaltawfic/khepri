import type { OnboardingData } from '@/contexts';

import { saveOnboardingData } from '../onboarding';

const mockGetAthleteByAuthUser = jest.fn();
const mockUpdateAthlete = jest.fn();
const mockCreateGoal = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  updateAthlete: (...args: unknown[]) => mockUpdateAthlete(...args),
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
}));

const mockAuthUserId = 'auth-user-123';
const mockAthlete = { id: 'athlete-456', display_name: 'Test User' };

function makeData(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return { goals: [], ...overrides };
}

describe('saveOnboardingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockUpdateAthlete.mockResolvedValue({ data: mockAthlete, error: null });
    mockCreateGoal.mockResolvedValue({ data: { id: 'goal-1' }, error: null });
  });

  it('returns success in dev mode when supabase is not configured', async () => {
    mockSupabase = undefined;

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
  });

  it('updates athlete profile with fitness numbers', async () => {
    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({ ftp: 250, restingHR: 52, maxHR: 185, weight: 72 })
    );

    expect(result.success).toBe(true);
    expect(mockUpdateAthlete).toHaveBeenCalledWith(expect.anything(), 'athlete-456', {
      ftp_watts: 250,
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
      resting_heart_rate: null,
      max_heart_rate: null,
      weight_kg: null,
    });
  });

  it('creates goals from onboarding data', async () => {
    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        goals: [
          { goalType: 'race', title: 'Complete Ironman', targetDate: '2024-09-15', priority: 'A' },
          { goalType: 'fitness', title: 'Build base fitness', priority: 'B' },
        ],
      })
    );

    expect(result.success).toBe(true);
    expect(mockCreateGoal).toHaveBeenCalledTimes(2);
    expect(mockCreateGoal).toHaveBeenCalledWith(expect.anything(), {
      athlete_id: 'athlete-456',
      goal_type: 'race',
      title: 'Complete Ironman',
      target_date: '2024-09-15',
      priority: 'A',
      status: 'active',
    });
    expect(mockCreateGoal).toHaveBeenCalledWith(expect.anything(), {
      athlete_id: 'athlete-456',
      goal_type: 'fitness',
      title: 'Build base fitness',
      target_date: null,
      priority: 'B',
      status: 'active',
    });
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

  it('handles missing athlete profile', async () => {
    mockGetAthleteByAuthUser.mockResolvedValueOnce({ data: null, error: null });

    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
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
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('reports partial success when some goals fail', async () => {
    mockCreateGoal
      .mockResolvedValueOnce({ data: { id: 'goal-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Duplicate goal') });

    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        goals: [
          { goalType: 'race', title: 'Goal 1', priority: 'A' },
          { goalType: 'race', title: 'Goal 2', priority: 'B' },
        ],
      })
    );

    expect(result.success).toBe(true);
    expect(result.error).toContain('some goals failed');
    expect(result.error).toContain('Goal 2');
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
