import type { OnboardingData } from '@/contexts';

import { saveOnboardingData } from '../onboarding';

const mockGetAthleteByAuthUser = jest.fn();
const mockUpdateAthlete = jest.fn();
const mockCreateGoal = jest.fn();
const mockCreateAthlete = jest.fn();
const mockCreateTrainingPlan = jest.fn();
const mockDeleteActiveGoals = jest.fn();

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
  createAthlete: (...args: unknown[]) => mockCreateAthlete(...args),
  createTrainingPlan: (...args: unknown[]) => mockCreateTrainingPlan(...args),
  deleteActiveGoals: (...args: unknown[]) => mockDeleteActiveGoals(...args),
}));

const mockAuthUserId = 'auth-user-123';
const mockAthlete = { id: 'athlete-456', display_name: 'Test User' };

function makeData(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return { goals: [], events: [], ...overrides };
}

describe('saveOnboardingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
    mockUpdateAthlete.mockResolvedValue({ data: mockAthlete, error: null });
    mockCreateGoal.mockResolvedValue({ data: { id: 'goal-1' }, error: null });
    mockCreateTrainingPlan.mockResolvedValue({ data: { id: 'plan-1' }, error: null });
    mockDeleteActiveGoals.mockResolvedValue({ data: null, error: null });
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
    expect(result.error).toContain('some items failed');
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

  it('creates training plan when planDurationWeeks is set', async () => {
    const result = await saveOnboardingData(mockAuthUserId, makeData({ planDurationWeeks: 12 }));

    expect(result.success).toBe(true);
    expect(mockCreateTrainingPlan).toHaveBeenCalledTimes(1);
    expect(mockCreateTrainingPlan).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        athlete_id: 'athlete-456',
        name: '12-Week Training Plan',
        total_weeks: 12,
      })
    );
    // Verify start_date and end_date are YYYY-MM-DD strings
    const callArgs = mockCreateTrainingPlan.mock.calls[0][1];
    expect(callArgs.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(callArgs.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Verify periodization data is included
    expect(callArgs.periodization).toBeDefined();
    expect(callArgs.periodization.phases).toBeInstanceOf(Array);
    expect(callArgs.periodization.phases.length).toBeGreaterThan(0);
    expect(callArgs.periodization.weekly_volumes).toBeInstanceOf(Array);
    expect(callArgs.periodization.weekly_volumes.length).toBe(12);
  });

  it('does not create training plan when planDurationWeeks is undefined', async () => {
    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockCreateTrainingPlan).not.toHaveBeenCalled();
  });

  it('deletes existing active goals before creating new ones', async () => {
    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        goals: [{ goalType: 'race', title: 'New Goal', priority: 'A' }],
      })
    );

    expect(result.success).toBe(true);
    expect(mockDeleteActiveGoals).toHaveBeenCalledWith(expect.anything(), 'athlete-456');
    expect(mockCreateGoal).toHaveBeenCalledTimes(1);
  });

  it('always deletes existing goals even when no new goals are provided', async () => {
    const result = await saveOnboardingData(mockAuthUserId, makeData());

    expect(result.success).toBe(true);
    expect(mockDeleteActiveGoals).toHaveBeenCalledWith(expect.anything(), 'athlete-456');
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('aborts goal creation when deletion fails to prevent duplicates', async () => {
    mockDeleteActiveGoals.mockResolvedValueOnce({
      data: null,
      error: new Error('Delete failed'),
    });

    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        goals: [{ goalType: 'race', title: 'Goal 1', priority: 'A' }],
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to clear existing goals');
    // Should NOT attempt to create new goals (would cause duplicates)
    expect(mockCreateGoal).not.toHaveBeenCalled();
  });

  it('saves race events as goals', async () => {
    const result = await saveOnboardingData(
      mockAuthUserId,
      makeData({
        events: [
          { name: 'Ironman 70.3', type: 'race', date: '2026-06-15', priority: 'A' },
          { name: 'Family vacation', type: 'travel', date: '2026-08-01', priority: 'C' },
        ],
      })
    );

    expect(result.success).toBe(true);
    // Only race events should be saved as goals (travel is not saved)
    expect(mockCreateGoal).toHaveBeenCalledTimes(1);
    expect(mockCreateGoal).toHaveBeenCalledWith(expect.anything(), {
      athlete_id: 'athlete-456',
      goal_type: 'race',
      title: 'Ironman 70.3',
      target_date: '2026-06-15',
      priority: 'A',
      status: 'active',
    });
  });

  it('reports partial success when training plan creation fails', async () => {
    mockCreateTrainingPlan.mockResolvedValueOnce({
      data: null,
      error: new Error('Plan insert failed'),
    });

    const result = await saveOnboardingData(mockAuthUserId, makeData({ planDurationWeeks: 8 }));

    expect(result.success).toBe(true);
    expect(result.error).toContain('Failed to create training plan');
  });
});
