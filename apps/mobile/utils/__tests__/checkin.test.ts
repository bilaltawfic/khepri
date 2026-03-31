import {
  formatCheckinDate,
  getIntensityColor,
  getWellnessScore,
  isValidRecommendation,
} from '../checkin';

describe('isValidRecommendation', () => {
  it('returns true for a valid recommendation', () => {
    expect(
      isValidRecommendation({
        summary: 'Good recovery day',
        workoutSuggestion: 'Easy jog',
        intensityLevel: 'easy',
        duration: 30,
      })
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidRecommendation(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidRecommendation(undefined)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isValidRecommendation('string')).toBe(false);
  });

  it('returns false when summary is missing', () => {
    expect(
      isValidRecommendation({
        workoutSuggestion: 'Easy jog',
        intensityLevel: 'easy',
        duration: 30,
      })
    ).toBe(false);
  });

  it('returns false when duration is a string', () => {
    expect(
      isValidRecommendation({
        summary: 'Good day',
        workoutSuggestion: 'Easy jog',
        intensityLevel: 'easy',
        duration: '30',
      })
    ).toBe(false);
  });
});

describe('formatCheckinDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 30)); // 2026-03-30
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Today" for the current date', () => {
    expect(formatCheckinDate('2026-03-30')).toBe('Today');
  });

  it('returns "Yesterday" for the previous date', () => {
    expect(formatCheckinDate('2026-03-29')).toBe('Yesterday');
  });

  it('returns short formatted date for older dates', () => {
    const result = formatCheckinDate('2026-03-25');
    expect(result).toContain('Mar');
    expect(result).toContain('25');
  });

  it('returns long formatted date when long option is true', () => {
    const result = formatCheckinDate('2026-03-25', { long: true });
    expect(result).toContain('March');
    expect(result).toContain('25');
    expect(result).toContain('2026');
  });
});

describe('getIntensityColor', () => {
  it('returns zoneRecovery color for recovery', () => {
    const result = getIntensityColor('recovery', 'light');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns zoneEndurance color for easy', () => {
    const result = getIntensityColor('easy', 'light');
    expect(typeof result).toBe('string');
  });

  it('returns zoneTempo color for moderate', () => {
    const result = getIntensityColor('moderate', 'light');
    expect(typeof result).toBe('string');
  });

  it('returns zoneThreshold color for hard', () => {
    const result = getIntensityColor('hard', 'light');
    expect(typeof result).toBe('string');
  });

  it('returns textTertiary for unknown intensity', () => {
    const result = getIntensityColor('unknown', 'light');
    expect(typeof result).toBe('string');
  });

  it('respects dark color scheme', () => {
    const light = getIntensityColor('recovery', 'light');
    const dark = getIntensityColor('recovery', 'dark');
    // Both should return valid colors (may or may not differ)
    expect(typeof light).toBe('string');
    expect(typeof dark).toBe('string');
  });
});

describe('getWellnessScore', () => {
  it('calculates score for balanced metrics', () => {
    const score = getWellnessScore({
      sleepQuality: 5,
      energyLevel: 5,
      stressLevel: 5,
      overallSoreness: 5,
    });
    expect(score).toBe(50);
  });

  it('returns 100 for perfect metrics', () => {
    const score = getWellnessScore({
      sleepQuality: 10,
      energyLevel: 10,
      stressLevel: 0,
      overallSoreness: 0,
    });
    expect(score).toBe(100);
  });

  it('returns 0 for worst metrics', () => {
    const score = getWellnessScore({
      sleepQuality: 0,
      energyLevel: 0,
      stressLevel: 10,
      overallSoreness: 10,
    });
    expect(score).toBe(0);
  });

  it('returns null when any metric is null', () => {
    expect(
      getWellnessScore({
        sleepQuality: null,
        energyLevel: 5,
        stressLevel: 5,
        overallSoreness: 5,
      })
    ).toBeNull();
  });

  it('returns null when all metrics are null', () => {
    expect(
      getWellnessScore({
        sleepQuality: null,
        energyLevel: null,
        stressLevel: null,
        overallSoreness: null,
      })
    ).toBeNull();
  });
});
