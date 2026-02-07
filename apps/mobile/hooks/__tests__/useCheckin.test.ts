import { act, renderHook } from '@testing-library/react-native';
import { useCheckin } from '../useCheckin';

describe('useCheckin', () => {
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

    act(() => {
      result.current.setSleepQuality(8);
      result.current.setSleepHours(7);
      result.current.setEnergyLevel(7);
      result.current.setStressLevel(4);
      result.current.setOverallSoreness(3);
      result.current.setAvailableTime(60);
    });

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

  it('does not submit when form is invalid', async () => {
    const { result } = renderHook(() => useCheckin());

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('idle');
    expect(result.current.submissionError).toBeTruthy();
  });

  it('submits and generates recommendation when form is valid', async () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(8);
      result.current.setSleepHours(7);
      result.current.setEnergyLevel(7);
      result.current.setStressLevel(4);
      result.current.setOverallSoreness(3);
      result.current.setAvailableTime(60);
    });

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.submissionState).toBe('success');
    expect(result.current.recommendation).toBeTruthy();
    expect(result.current.recommendation?.summary).toBeTruthy();
    expect(result.current.recommendation?.workoutSuggestion).toBeTruthy();
    expect(result.current.recommendation?.intensityLevel).toBeTruthy();
    expect(result.current.recommendation?.duration).toBeGreaterThan(0);
  });

  it('generates recovery recommendation for poor wellness', async () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(3);
      result.current.setSleepHours(4);
      result.current.setEnergyLevel(2);
      result.current.setStressLevel(9);
      result.current.setOverallSoreness(8);
      result.current.setAvailableTime(60);
    });

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.recommendation?.intensityLevel).toBe('recovery');
  });

  it('generates harder recommendation for good wellness', async () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(9);
      result.current.setSleepHours(8);
      result.current.setEnergyLevel(9);
      result.current.setStressLevel(2);
      result.current.setOverallSoreness(1);
      result.current.setAvailableTime(90);
    });

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(['moderate', 'hard']).toContain(result.current.recommendation?.intensityLevel);
  });

  it('overrides to recovery when feeling unwell', async () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(8);
      result.current.setSleepHours(8);
      result.current.setEnergyLevel(8);
      result.current.setStressLevel(2);
      result.current.setOverallSoreness(2);
      result.current.setAvailableTime(90);
      result.current.setConstraints(['feeling_unwell']);
    });

    await act(async () => {
      await result.current.submitCheckin();
    });

    expect(result.current.recommendation?.intensityLevel).toBe('recovery');
  });

  it('dismisses recommendation', async () => {
    const { result } = renderHook(() => useCheckin());

    act(() => {
      result.current.setSleepQuality(8);
      result.current.setSleepHours(7);
      result.current.setEnergyLevel(7);
      result.current.setStressLevel(4);
      result.current.setOverallSoreness(3);
      result.current.setAvailableTime(60);
    });

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
});
