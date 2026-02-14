import { act, renderHook } from '@testing-library/react-native';
import { useCheckin } from '../useCheckin';

// Mock supabase-client functions
const mockGetAthleteByAuthUser = jest.fn();
const mockGetTodayCheckin = jest.fn();
const mockCreateCheckin = jest.fn();
const mockUpdateCheckin = jest.fn();
const mockUpdateCheckinRecommendation = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getTodayCheckin: (...args: unknown[]) => mockGetTodayCheckin(...args),
  createCheckin: (...args: unknown[]) => mockCreateCheckin(...args),
  updateCheckin: (...args: unknown[]) => mockUpdateCheckin(...args),
  updateCheckinRecommendation: (...args: unknown[]) => mockUpdateCheckinRecommendation(...args),
}));

// Mock AI service
const mockGetCheckinRecommendation = jest.fn();

jest.mock('@/services/ai', () => ({
  getCheckinRecommendation: (...args: unknown[]) => mockGetCheckinRecommendation(...args),
}));

// Mock supabase client
let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// Mock auth context
const mockUser = { id: 'auth-user-123', email: 'test@example.com' };
let mockAuthUser: typeof mockUser | null = null;

jest.mock('@/contexts', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

const mockAthlete = {
  id: 'athlete-456',
  auth_user_id: 'auth-user-123',
  display_name: 'Jane Doe',
};

const mockRecommendation = {
  summary: 'Good day for moderate training',
  workoutSuggestion: 'Steady state ride',
  intensityLevel: 'moderate' as const,
  duration: 60,
};

const mockCheckinRow = {
  id: 'checkin-789',
  athlete_id: 'athlete-456',
  checkin_date: '2026-02-14',
  sleep_quality: 8,
  sleep_hours: 7,
  energy_level: 7,
  stress_level: 4,
  overall_soreness: 3,
  soreness_areas: {},
  available_time_minutes: 60,
  travel_status: 'home',
  notes: null,
  ai_recommendation: null,
};

/** Fill all required form fields to make the form valid */
function fillForm(result: { current: ReturnType<typeof useCheckin> }) {
  act(() => {
    result.current.setSleepQuality(8);
    result.current.setSleepHours(7);
    result.current.setEnergyLevel(7);
    result.current.setStressLevel(4);
    result.current.setOverallSoreness(3);
    result.current.setAvailableTime(60);
  });
}

describe('useCheckin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no supabase, no user (form-only mode)
    mockSupabase = undefined;
    mockAuthUser = null;

    // Default AI recommendation response
    mockGetCheckinRecommendation.mockResolvedValue({
      data: mockRecommendation,
      error: null,
    });
  });

  // ===========================================================================
  // Form State Tests
  // ===========================================================================

  it('initializes with default form data', () => {
    const { result } = renderHook(() => useCheckin());

    expect(result.current.formData.sleepQuality).toBeNull();
    expect(result.current.formData.sleepHours).toBeNull();
    expect(result.current.formData.energyLevel).toBeNull();
    expect(result.current.formData.stressLevel).toBeNull();
    expect(result.current.formData.overallSoreness).toBeNull();
    expect(result.current.formData.availableTimeMinutes).toBeNull();
    expect(result.current.formData.constraints).toEqual([]);
    expect(result.current.formData.sorenessAreas).toEqual({});
    expect(result.current.formData.travelStatus).toBe('home');
    expect(result.current.formData.notes).toBe('');
  });

  it('initializes with idle submission state', () => {
    const { result } = renderHook(() => useCheckin());

    expect(result.current.submissionState).toBe('idle');
    expect(result.current.submissionError).toBeNull();
    expect(result.current.recommendation).toBeNull();
  });

  it('updates sleep quality', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(8);
    });

    expect(result.current.formData.sleepQuality).toBe(8);
  });

  it('updates sleep hours', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepHours(7.5);
    });

    expect(result.current.formData.sleepHours).toBe(7.5);
  });

  it('updates energy level', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setEnergyLevel(6);
    });

    expect(result.current.formData.energyLevel).toBe(6);
  });

  it('updates stress level', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setStressLevel(4);
    });

    expect(result.current.formData.stressLevel).toBe(4);
  });

  it('updates overall soreness', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setOverallSoreness(3);
    });

    expect(result.current.formData.overallSoreness).toBe(3);
  });

  it('toggles soreness area on', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.toggleSorenessArea('legs');
    });

    expect(result.current.formData.sorenessAreas).toEqual({ legs: 5 });
  });

  it('toggles soreness area off', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.toggleSorenessArea('legs');
    });

    act(() => {
      result.current.toggleSorenessArea('legs');
    });

    expect(result.current.formData.sorenessAreas).toEqual({});
  });

  it('updates available time', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setAvailableTime(60);
    });

    expect(result.current.formData.availableTimeMinutes).toBe(60);
  });

  it('updates constraints', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setConstraints(['traveling', 'limited_equipment']);
    });

    expect(result.current.formData.constraints).toEqual(['traveling', 'limited_equipment']);
  });

  it('updates notes', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setNotes('Feeling a bit tired today');
    });

    expect(result.current.formData.notes).toBe('Feeling a bit tired today');
  });

  it('reports form as invalid when fields are missing', () => {
    const { result } = renderHook(() => useCheckin());

    expect(result.current.isFormValid).toBe(false);
    expect(result.current.missingFields).toContain('Sleep Quality');
    expect(result.current.missingFields).toContain('Hours Slept');
    expect(result.current.missingFields).toContain('Energy Level');
    expect(result.current.missingFields).toContain('Stress Level');
    expect(result.current.missingFields).toContain('Soreness');
    expect(result.current.missingFields).toContain('Available Time');
  });

  it('reports form as valid when all required fields are filled', () => {
    const { result } = renderHook(() => useCheckin());

    fillForm(result);

    expect(result.current.isFormValid).toBe(true);
    expect(result.current.missingFields).toHaveLength(0);
  });

  it('resets form to default values', () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(8);
      result.current.setSleepHours(7);
      result.current.setConstraints(['traveling']);
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.sleepQuality).toBeNull();
    expect(result.current.formData.sleepHours).toBeNull();
    expect(result.current.formData.constraints).toEqual([]);
  });

  // ===========================================================================
  // Prefill Tests
  // ===========================================================================

  describe('applyPrefill', () => {
    it('fills null fields with prefill values', () => {
      const { result } = renderHook(() => useCheckin());

      act(() => {
        result.current.applyPrefill({
          sleepQuality: 7,
          sleepHours: 7.5,
          energyLevel: 7,
          stressLevel: 5,
          overallSoreness: 3,
        });
      });

      expect(result.current.formData.sleepQuality).toBe(7);
      expect(result.current.formData.sleepHours).toBe(7.5);
      expect(result.current.formData.energyLevel).toBe(7);
      expect(result.current.formData.stressLevel).toBe(5);
      expect(result.current.formData.overallSoreness).toBe(3);
    });

    it('does not overwrite user-edited fields', () => {
      const { result } = renderHook(() => useCheckin());

      // User manually sets sleep quality
      act(() => {
        result.current.setSleepQuality(9);
      });

      // Apply prefill - should not overwrite sleep quality
      act(() => {
        result.current.applyPrefill({
          sleepQuality: 7,
          sleepHours: 7.5,
          energyLevel: 7,
          stressLevel: 5,
          overallSoreness: 3,
        });
      });

      expect(result.current.formData.sleepQuality).toBe(9); // kept user value
      expect(result.current.formData.sleepHours).toBe(7.5); // prefilled
      expect(result.current.formData.energyLevel).toBe(7); // prefilled
    });

    it('handles partial prefill data', () => {
      const { result } = renderHook(() => useCheckin());

      act(() => {
        result.current.applyPrefill({
          sleepQuality: 7,
          // other fields undefined/not provided
        });
      });

      expect(result.current.formData.sleepQuality).toBe(7);
      expect(result.current.formData.sleepHours).toBeNull();
      expect(result.current.formData.energyLevel).toBeNull();
    });

    it('does not apply null prefill values', () => {
      const { result } = renderHook(() => useCheckin());

      act(() => {
        result.current.applyPrefill({
          sleepQuality: null,
          sleepHours: null,
        });
      });

      expect(result.current.formData.sleepQuality).toBeNull();
      expect(result.current.formData.sleepHours).toBeNull();
    });
  });

  // ===========================================================================
  // Submission Tests (without DB)
  // ===========================================================================

  it('does not submit when form is invalid', async () => {
    const { result } = renderHook(() => useCheckin());

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('idle');
    expect(result.current.submissionError).toBeTruthy();
  });

  it('submits and sets recommendation when form is valid', async () => {
    const { result } = renderHook(() => useCheckin());

    fillForm(result);

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('success');
    expect(result.current.recommendation).toEqual(mockRecommendation);
    expect(mockGetCheckinRecommendation).toHaveBeenCalledTimes(1);
  });

  it('handles AI service error', async () => {
    mockGetCheckinRecommendation.mockResolvedValue({
      data: null,
      error: new Error('AI service unavailable'),
    });

    const { result } = renderHook(() => useCheckin());

    fillForm(result);

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('error');
    expect(result.current.submissionError).toBe('AI service unavailable');
  });

  it('skips DB persistence when supabase is not configured', async () => {
    const { result } = renderHook(() => useCheckin());

    fillForm(result);

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('success');
    expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
    expect(mockCreateCheckin).not.toHaveBeenCalled();
  });

  it('dismisses recommendation', async () => {
    const { result } = renderHook(() => useCheckin());

    fillForm(result);

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.recommendation).toBeTruthy();

    act(() => {
      result.current.dismissRecommendation();
    });

    expect(result.current.recommendation).toBeNull();
    expect(result.current.submissionState).toBe('idle');
  });

  // ===========================================================================
  // DB Persistence Tests
  // ===========================================================================

  describe('DB persistence', () => {
    beforeEach(() => {
      mockSupabase = {};
      mockAuthUser = mockUser;
      mockGetAthleteByAuthUser.mockResolvedValue({ data: mockAthlete, error: null });
      mockGetTodayCheckin.mockResolvedValue({ data: null, error: null });
      mockCreateCheckin.mockResolvedValue({ data: mockCheckinRow, error: null });
      mockUpdateCheckin.mockResolvedValue({ data: mockCheckinRow, error: null });
      mockUpdateCheckinRecommendation.mockResolvedValue({ data: mockCheckinRow, error: null });
    });

    it('creates a new check-in with correct field mapping', async () => {
      const { result } = renderHook(() => useCheckin());

      act(() => {
        result.current.setSleepQuality(8);
        result.current.setSleepHours(7);
        result.current.setEnergyLevel(7);
        result.current.setStressLevel(4);
        result.current.setOverallSoreness(3);
        result.current.setAvailableTime(60);
        result.current.toggleSorenessArea('legs');
        result.current.setNotes('Felt good');
      });

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(mockSupabase, 'auth-user-123');
      expect(mockGetTodayCheckin).toHaveBeenCalledWith(mockSupabase, 'athlete-456');
      expect(mockCreateCheckin).toHaveBeenCalledWith(mockSupabase, {
        athlete_id: 'athlete-456',
        checkin_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        sleep_quality: 8,
        sleep_hours: 7,
        energy_level: 7,
        stress_level: 4,
        overall_soreness: 3,
        soreness_areas: { legs: 5 },
        available_time_minutes: 60,
        travel_status: 'home',
        notes: 'Felt good',
      });
      expect(result.current.submissionState).toBe('success');
    });

    it('converts empty notes to null', async () => {
      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(mockCreateCheckin).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({ notes: null })
      );
    });

    it('updates existing check-in for same-day duplicate', async () => {
      const existingCheckin = { ...mockCheckinRow, id: 'existing-checkin-id' };
      mockGetTodayCheckin.mockResolvedValue({ data: existingCheckin, error: null });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(mockCreateCheckin).not.toHaveBeenCalled();
      expect(mockUpdateCheckin).toHaveBeenCalledWith(
        mockSupabase,
        'existing-checkin-id',
        expect.objectContaining({
          sleep_quality: 8,
          sleep_hours: 7,
          energy_level: 7,
          stress_level: 4,
          overall_soreness: 3,
        })
      );
      expect(result.current.submissionState).toBe('success');
    });

    it('stores AI recommendation after successful check-in', async () => {
      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(mockUpdateCheckinRecommendation).toHaveBeenCalledWith(
        mockSupabase,
        'checkin-789',
        mockRecommendation
      );
    });

    it('succeeds even when recommendation save fails (best-effort)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockUpdateCheckinRecommendation.mockResolvedValue({
        data: null,
        error: new Error('DB write failed'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('success');
      expect(result.current.recommendation).toEqual(mockRecommendation);
      expect(warnSpy).toHaveBeenCalledWith('Failed to save AI recommendation:', 'DB write failed');
      warnSpy.mockRestore();
    });

    it('does not store recommendation when AI returns error', async () => {
      mockGetCheckinRecommendation.mockResolvedValue({
        data: null,
        error: new Error('AI failed'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(mockUpdateCheckinRecommendation).not.toHaveBeenCalled();
      expect(result.current.submissionState).toBe('error');
    });

    it('handles missing athlete profile', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('error');
      expect(result.current.submissionError).toBe('Athlete profile not found');
      expect(mockCreateCheckin).not.toHaveBeenCalled();
    });

    it('handles athlete fetch error', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('error');
      expect(result.current.submissionError).toBe('Failed to load profile: Database error');
    });

    it('handles create check-in DB error', async () => {
      mockCreateCheckin.mockResolvedValue({
        data: null,
        error: new Error('Unique constraint violation'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('error');
      expect(result.current.submissionError).toBe(
        'Failed to save check-in: Unique constraint violation'
      );
    });

    it('handles getTodayCheckin DB error', async () => {
      mockGetTodayCheckin.mockResolvedValue({
        data: null,
        error: new Error('Connection timeout'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('error');
      expect(result.current.submissionError).toBe(
        'Failed to check existing check-in: Connection timeout'
      );
      expect(mockCreateCheckin).not.toHaveBeenCalled();
      expect(mockUpdateCheckin).not.toHaveBeenCalled();
    });

    it('handles update check-in DB error', async () => {
      mockGetTodayCheckin.mockResolvedValue({ data: mockCheckinRow, error: null });
      mockUpdateCheckin.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('error');
      expect(result.current.submissionError).toBe('Failed to save check-in: Update failed');
    });

    it('skips DB persistence when user is not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      expect(result.current.submissionState).toBe('success');
      expect(mockGetAthleteByAuthUser).not.toHaveBeenCalled();
      expect(mockCreateCheckin).not.toHaveBeenCalled();
      expect(mockUpdateCheckinRecommendation).not.toHaveBeenCalled();
    });

    it('does not store recommendation when checkin ID is not available', async () => {
      mockCreateCheckin.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useCheckin());

      fillForm(result);

      await act(async () => {
        await result.current.submitCheckin();
      });

      // createCheckin returned null data (no id), so recommendation should not be stored
      expect(mockUpdateCheckinRecommendation).not.toHaveBeenCalled();
      expect(result.current.submissionState).toBe('success');
    });
  });
});
