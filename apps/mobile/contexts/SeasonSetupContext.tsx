import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type SeasonRace = {
  name: string;
  date: string; // YYYY-MM-DD
  distance: string;
  priority: 'A' | 'B' | 'C';
  location?: string;
  targetTimeSeconds?: number;
};

export type SeasonGoalInput = {
  goalType: 'performance' | 'fitness' | 'health';
  title: string;
  targetDate?: string;
};

export type SeasonPreferencesInput = {
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  trainingDays: readonly number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  sportPriority: readonly string[];
  dayConstraints: readonly DayConstraint[];
};

export type DayConstraint = {
  sport: string;
  days: readonly number[];
  type: 'preferred' | 'only';
};

export type SeasonSkeletonPhaseInput = {
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
  type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race_week' | 'off_season';
  raceId?: string;
  targetHoursPerWeek: number;
  focus: string;
};

export type SeasonSkeletonInput = {
  totalWeeks: number;
  phases: readonly SeasonSkeletonPhaseInput[];
  feasibilityNotes: readonly string[];
};

export type SeasonSetupData = {
  races: readonly SeasonRace[];
  goals: readonly SeasonGoalInput[];
  preferences: SeasonPreferencesInput;
  skeleton?: SeasonSkeletonInput;
};

export type SeasonSetupContextValue = {
  data: SeasonSetupData;
  setRaces: (races: readonly SeasonRace[]) => void;
  addRace: (race: SeasonRace) => void;
  removeRace: (index: number) => void;
  updateRace: (index: number, race: SeasonRace) => void;
  setGoals: (goals: readonly SeasonGoalInput[]) => void;
  addGoal: (goal: SeasonGoalInput) => void;
  removeGoal: (index: number) => void;
  setPreferences: (preferences: SeasonPreferencesInput) => void;
  setSkeleton: (skeleton: SeasonSkeletonInput | undefined) => void;
  reset: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_RACES = 10;
export const MAX_SEASON_GOALS = 5;

export const RACE_DISTANCES = [
  'Sprint Tri',
  'Olympic Tri',
  '70.3',
  'Ironman',
  '5K',
  '10K',
  'Half Marathon',
  'Marathon',
  'Ultra',
  'Custom',
] as const;

export const MIN_HOURS_BY_RACE: Record<string, number> = {
  'Sprint Tri': 4,
  'Olympic Tri': 6,
  '70.3': 8,
  Ironman: 12,
  Marathon: 5,
  'Half Marathon': 4,
};

export const DEFAULT_SPORT_PRIORITY = ['Run', 'Bike', 'Swim'] as const;

function getInitialPreferences(): SeasonPreferencesInput {
  return {
    weeklyHoursMin: 6,
    weeklyHoursMax: 10,
    trainingDays: [1, 2, 3, 4, 6], // Mon-Thu, Sat
    sportPriority: [...DEFAULT_SPORT_PRIORITY],
    dayConstraints: [],
  };
}

function getInitialData(): SeasonSetupData {
  return {
    races: [],
    goals: [],
    preferences: getInitialPreferences(),
  };
}

// =============================================================================
// CONTEXT
// =============================================================================

const SeasonSetupContext = createContext<SeasonSetupContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function SeasonSetupProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [data, setData] = useState<SeasonSetupData>(getInitialData);

  const setRaces = useCallback((races: readonly SeasonRace[]) => {
    setData((prev) => ({ ...prev, races: races.slice(0, MAX_RACES) }));
  }, []);

  const addRace = useCallback((race: SeasonRace) => {
    setData((prev) => {
      if (prev.races.length >= MAX_RACES) return prev;
      return { ...prev, races: [...prev.races, race] };
    });
  }, []);

  const removeRace = useCallback((index: number) => {
    setData((prev) => {
      if (index < 0 || index >= prev.races.length) return prev;
      return { ...prev, races: prev.races.filter((_, i) => i !== index) };
    });
  }, []);

  const updateRace = useCallback((index: number, race: SeasonRace) => {
    setData((prev) => {
      if (index < 0 || index >= prev.races.length) return prev;
      const newRaces = [...prev.races];
      newRaces[index] = race;
      return { ...prev, races: newRaces };
    });
  }, []);

  const setGoals = useCallback((goals: readonly SeasonGoalInput[]) => {
    setData((prev) => ({ ...prev, goals: goals.slice(0, MAX_SEASON_GOALS) }));
  }, []);

  const addGoal = useCallback((goal: SeasonGoalInput) => {
    setData((prev) => {
      if (prev.goals.length >= MAX_SEASON_GOALS) return prev;
      return { ...prev, goals: [...prev.goals, goal] };
    });
  }, []);

  const removeGoal = useCallback((index: number) => {
    setData((prev) => {
      if (index < 0 || index >= prev.goals.length) return prev;
      return { ...prev, goals: prev.goals.filter((_, i) => i !== index) };
    });
  }, []);

  const setPreferences = useCallback((preferences: SeasonPreferencesInput) => {
    setData((prev) => ({ ...prev, preferences }));
  }, []);

  const setSkeleton = useCallback((skeleton: SeasonSkeletonInput | undefined) => {
    setData((prev) => ({ ...prev, skeleton }));
  }, []);

  const reset = useCallback(() => {
    setData(getInitialData());
  }, []);

  const value = useMemo(
    () => ({
      data,
      setRaces,
      addRace,
      removeRace,
      updateRace,
      setGoals,
      addGoal,
      removeGoal,
      setPreferences,
      setSkeleton,
      reset,
    }),
    [
      data,
      setRaces,
      addRace,
      removeRace,
      updateRace,
      setGoals,
      addGoal,
      removeGoal,
      setPreferences,
      setSkeleton,
      reset,
    ]
  );

  return <SeasonSetupContext.Provider value={value}>{children}</SeasonSetupContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSeasonSetup(): SeasonSetupContextValue {
  const context = useContext(SeasonSetupContext);
  if (context === undefined) {
    throw new Error('useSeasonSetup must be used within a SeasonSetupProvider');
  }
  return context;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Returns the minimum recommended weekly hours for the hardest race in the list.
 * Returns null if no race has a known minimum.
 */
export function getMinHoursForRaces(races: readonly SeasonRace[]): {
  minHours: number;
  raceType: string;
} | null {
  let result: { minHours: number; raceType: string } | null = null;
  for (const race of races) {
    const minHours = MIN_HOURS_BY_RACE[race.distance];
    if (minHours != null && (result == null || minHours > result.minHours)) {
      result = { minHours, raceType: race.distance };
    }
  }
  return result;
}
