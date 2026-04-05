import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  MAX_RACES,
  MAX_SEASON_GOALS,
  SeasonSetupProvider,
  getMinHoursForRaces,
  useSeasonSetup,
} from '@/contexts';
import type { SeasonGoalInput, SeasonRace, SeasonSkeletonInput } from '@/contexts';

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <SeasonSetupProvider>{children}</SeasonSetupProvider>;
}

describe('SeasonSetupContext', () => {
  // ===========================================================================
  // INITIAL STATE
  // ===========================================================================

  it('provides initial state with empty races, goals, and default preferences', () => {
    const { result } = renderHook(() => useSeasonSetup(), { wrapper });

    expect(result.current.data.races).toEqual([]);
    expect(result.current.data.goals).toEqual([]);
    expect(result.current.data.preferences.weeklyHoursMin).toBe(6);
    expect(result.current.data.preferences.weeklyHoursMax).toBe(10);
    expect(result.current.data.preferences.trainingDays).toEqual([1, 2, 3, 4, 6]);
    expect(result.current.data.preferences.sportPriority).toEqual([
      'Run',
      'Bike',
      'Swim',
      'Strength',
    ]);
    expect(result.current.data.skeleton).toBeUndefined();
  });

  it('throws when used outside provider', () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSeasonSetup())).toThrow(
      'useSeasonSetup must be used within a SeasonSetupProvider'
    );
    spy.mockRestore();
  });

  // ===========================================================================
  // RACES
  // ===========================================================================

  describe('races', () => {
    const sampleRace: SeasonRace = {
      name: 'Ironman 70.3 Geelong',
      date: '2026-06-15',
      distance: 'Ironman 70.3',
      priority: 'A',
      location: 'Geelong, VIC',
    };

    it('adds a race', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));

      expect(result.current.data.races).toHaveLength(1);
      expect(result.current.data.races[0]).toEqual(sampleRace);
    });

    it('removes a race by index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));
      act(() =>
        result.current.addRace({ ...sampleRace, name: 'Sprint Tri', distance: 'Sprint Tri' })
      );
      act(() => result.current.removeRace(0));

      expect(result.current.data.races).toHaveLength(1);
      expect(result.current.data.races[0].name).toBe('Sprint Tri');
    });

    it('does not remove race with out-of-bounds index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));
      act(() => result.current.removeRace(5));
      act(() => result.current.removeRace(-1));

      expect(result.current.data.races).toHaveLength(1);
    });

    it('updates a race at index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));
      act(() =>
        result.current.updateRace(0, { ...sampleRace, name: 'Updated Race', priority: 'B' })
      );

      expect(result.current.data.races[0].name).toBe('Updated Race');
      expect(result.current.data.races[0].priority).toBe('B');
    });

    it('does not update race with out-of-bounds index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));
      act(() => result.current.updateRace(5, { ...sampleRace, name: 'Should not exist' }));

      expect(result.current.data.races[0].name).toBe('Ironman 70.3 Geelong');
    });

    it('enforces MAX_RACES limit', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => {
        for (let i = 0; i < MAX_RACES + 3; i++) {
          result.current.addRace({ ...sampleRace, name: `Race ${i}` });
        }
      });

      expect(result.current.data.races).toHaveLength(MAX_RACES);
    });

    it('sets races replacing all existing', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addRace(sampleRace));
      act(() =>
        result.current.setRaces([
          { ...sampleRace, name: 'New Race 1' },
          { ...sampleRace, name: 'New Race 2' },
        ])
      );

      expect(result.current.data.races).toHaveLength(2);
      expect(result.current.data.races[0].name).toBe('New Race 1');
    });
  });

  // ===========================================================================
  // GOALS
  // ===========================================================================

  describe('goals', () => {
    const sampleGoal: SeasonGoalInput = {
      goalType: 'performance',
      title: 'FTP from 190W to 220W',
    };

    it('adds a goal', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addGoal(sampleGoal));

      expect(result.current.data.goals).toHaveLength(1);
      expect(result.current.data.goals[0]).toEqual(sampleGoal);
    });

    it('removes a goal by index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addGoal(sampleGoal));
      act(() => result.current.addGoal({ goalType: 'health', title: 'Stay injury-free' }));
      act(() => result.current.removeGoal(0));

      expect(result.current.data.goals).toHaveLength(1);
      expect(result.current.data.goals[0].title).toBe('Stay injury-free');
    });

    it('enforces MAX_SEASON_GOALS limit', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => {
        for (let i = 0; i < MAX_SEASON_GOALS + 3; i++) {
          result.current.addGoal({ ...sampleGoal, title: `Goal ${i}` });
        }
      });

      expect(result.current.data.goals).toHaveLength(MAX_SEASON_GOALS);
    });

    it('does not remove goal with out-of-bounds index', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.addGoal(sampleGoal));
      act(() => result.current.removeGoal(-1));
      act(() => result.current.removeGoal(5));

      expect(result.current.data.goals).toHaveLength(1);
    });
  });

  // ===========================================================================
  // PREFERENCES
  // ===========================================================================

  describe('preferences', () => {
    it('updates preferences', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() =>
        result.current.setPreferences({
          weeklyHoursMin: 8,
          weeklyHoursMax: 14,
          trainingDays: [1, 2, 3, 4, 5, 6],
          sportPriority: ['Bike', 'Run', 'Swim'],
          dayConstraints: [{ sport: 'Swim', days: [1, 3], type: 'preferred' }],
        })
      );

      expect(result.current.data.preferences.weeklyHoursMin).toBe(8);
      expect(result.current.data.preferences.weeklyHoursMax).toBe(14);
      expect(result.current.data.preferences.sportPriority).toEqual(['Bike', 'Run', 'Swim']);
      expect(result.current.data.preferences.dayConstraints).toHaveLength(1);
    });
  });

  // ===========================================================================
  // SKELETON
  // ===========================================================================

  describe('skeleton', () => {
    const sampleSkeleton: SeasonSkeletonInput = {
      totalWeeks: 20,
      phases: [
        {
          name: 'Base 1',
          startDate: '2026-04-07',
          endDate: '2026-05-03',
          weeks: 4,
          type: 'base',
          targetHoursPerWeek: 8,
          focus: 'Aerobic base building',
        },
      ],
      feasibilityNotes: ['Good training volume for your races'],
    };

    it('sets skeleton', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.setSkeleton(sampleSkeleton));

      expect(result.current.data.skeleton).toEqual(sampleSkeleton);
    });

    it('clears skeleton', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => result.current.setSkeleton(sampleSkeleton));
      act(() => result.current.setSkeleton(undefined));

      expect(result.current.data.skeleton).toBeUndefined();
    });
  });

  // ===========================================================================
  // RESET
  // ===========================================================================

  describe('reset', () => {
    it('resets all data to initial state', () => {
      const { result } = renderHook(() => useSeasonSetup(), { wrapper });

      act(() => {
        result.current.addRace({
          name: 'Race',
          date: '2026-06-15',
          distance: 'Ironman 70.3',
          priority: 'A',
        });
        result.current.addGoal({ goalType: 'performance', title: 'Goal' });
        result.current.setPreferences({
          weeklyHoursMin: 12,
          weeklyHoursMax: 16,
          trainingDays: [1, 2, 3, 4, 5, 6, 0],
          sportPriority: ['Bike'],
          dayConstraints: [],
        });
      });

      act(() => result.current.reset());

      expect(result.current.data.races).toEqual([]);
      expect(result.current.data.goals).toEqual([]);
      expect(result.current.data.preferences.weeklyHoursMin).toBe(6);
      expect(result.current.data.skeleton).toBeUndefined();
    });
  });
});

// =============================================================================
// UTILITY: getMinHoursForRaces
// =============================================================================

describe('getMinHoursForRaces', () => {
  it('returns null for empty races', () => {
    expect(getMinHoursForRaces([])).toBeNull();
  });

  it('returns null for races with unknown distances', () => {
    expect(
      getMinHoursForRaces([
        { name: 'Custom Race', date: '2026-06-15', distance: 'Custom', priority: 'A' },
      ])
    ).toBeNull();
  });

  it('returns min hours for a single known race', () => {
    const result = getMinHoursForRaces([
      { name: 'IM 70.3', date: '2026-06-15', distance: 'Ironman 70.3', priority: 'A' },
    ]);
    expect(result).toEqual({ minHours: 8, raceType: 'Ironman 70.3' });
  });

  it('returns the highest min hours when multiple races exist', () => {
    const result = getMinHoursForRaces([
      { name: 'Sprint', date: '2026-04-15', distance: 'Sprint Tri', priority: 'C' },
      { name: 'Ironman', date: '2026-10-15', distance: 'Ironman', priority: 'A' },
      { name: 'Half Marathon', date: '2026-06-15', distance: 'Half Marathon', priority: 'B' },
    ]);
    expect(result).toEqual({ minHours: 12, raceType: 'Ironman' });
  });

  it('returns the hardest known race even with unknown races mixed in', () => {
    const result = getMinHoursForRaces([
      { name: 'Custom', date: '2026-04-15', distance: 'Custom', priority: 'A' },
      { name: 'Marathon', date: '2026-10-15', distance: 'Marathon', priority: 'B' },
    ]);
    expect(result).toEqual({ minHours: 5, raceType: 'Marathon' });
  });

  it('validates coach warning threshold for 70.3', () => {
    const result = getMinHoursForRaces([
      { name: '70.3', date: '2026-06-15', distance: 'Ironman 70.3', priority: 'A' },
    ]);
    expect(result).not.toBeNull();
    expect(result?.minHours).toBe(8);
  });
});
