import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingGoal = {
  goalType: 'race' | 'performance' | 'fitness' | 'health';
  title: string;
  targetDate?: string; // ISO date
  priority: 'A' | 'B' | 'C';
};

export type OnboardingData = {
  // Step 1: Intervals.icu (optional)
  intervalsAthleteId?: string;
  intervalsApiKey?: string;

  // Step 2: Fitness numbers (all optional)
  ftp?: number;
  restingHR?: number;
  maxHR?: number;
  weight?: number;

  // Step 3: Goals
  goals: OnboardingGoal[];

  // Step 4: Plan duration
  planDurationWeeks?: number;
};

export type OnboardingContextValue = {
  data: OnboardingData;
  setIntervalsCredentials: (creds: { athleteId: string; apiKey: string }) => void;
  clearIntervalsCredentials: () => void;
  setFitnessNumbers: (numbers: {
    ftp?: number;
    restingHR?: number;
    maxHR?: number;
    weight?: number;
  }) => void;
  addGoal: (goal: OnboardingGoal) => void;
  removeGoal: (index: number) => void;
  updateGoal: (index: number, goal: OnboardingGoal) => void;
  setPlanDuration: (weeks: number | undefined) => void;
  reset: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_GOALS = 5;

const INITIAL_DATA: OnboardingData = {
  goals: [],
};

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function OnboardingProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const setIntervalsCredentials = useCallback((creds: { athleteId: string; apiKey: string }) => {
    setData((prev) => ({
      ...prev,
      intervalsAthleteId: creds.athleteId,
      intervalsApiKey: creds.apiKey,
    }));
  }, []);

  const clearIntervalsCredentials = useCallback(() => {
    setData((prev) => ({
      ...prev,
      intervalsAthleteId: undefined,
      intervalsApiKey: undefined,
    }));
  }, []);

  const setFitnessNumbers = useCallback(
    (numbers: { ftp?: number; restingHR?: number; maxHR?: number; weight?: number }) => {
      setData((prev) => ({
        ...prev,
        // Use nullish check: only update if value is not undefined
        ftp: numbers.ftp !== undefined ? numbers.ftp : prev.ftp,
        restingHR: numbers.restingHR !== undefined ? numbers.restingHR : prev.restingHR,
        maxHR: numbers.maxHR !== undefined ? numbers.maxHR : prev.maxHR,
        weight: numbers.weight !== undefined ? numbers.weight : prev.weight,
      }));
    },
    []
  );

  const addGoal = useCallback((goal: OnboardingGoal) => {
    setData((prev) => {
      // Enforce max goals limit
      if (prev.goals.length >= MAX_GOALS) {
        return prev;
      }
      return {
        ...prev,
        goals: [...prev.goals, goal],
      };
    });
  }, []);

  const removeGoal = useCallback((index: number) => {
    setData((prev) => {
      // Bounds check
      if (index < 0 || index >= prev.goals.length) {
        return prev;
      }
      return {
        ...prev,
        goals: prev.goals.filter((_, i) => i !== index),
      };
    });
  }, []);

  const updateGoal = useCallback((index: number, goal: OnboardingGoal) => {
    setData((prev) => {
      // Bounds check
      if (index < 0 || index >= prev.goals.length) {
        return prev;
      }
      const newGoals = [...prev.goals];
      newGoals[index] = goal;
      return {
        ...prev,
        goals: newGoals,
      };
    });
  }, []);

  const setPlanDuration = useCallback((weeks: number | undefined) => {
    setData((prev) => ({
      ...prev,
      planDurationWeeks: weeks,
    }));
  }, []);

  const reset = useCallback(() => {
    setData(INITIAL_DATA);
  }, []);

  const value = useMemo(
    () => ({
      data,
      setIntervalsCredentials,
      clearIntervalsCredentials,
      setFitnessNumbers,
      addGoal,
      removeGoal,
      updateGoal,
      setPlanDuration,
      reset,
    }),
    [
      data,
      setIntervalsCredentials,
      clearIntervalsCredentials,
      setFitnessNumbers,
      addGoal,
      removeGoal,
      updateGoal,
      setPlanDuration,
      reset,
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MAX_GOALS };
