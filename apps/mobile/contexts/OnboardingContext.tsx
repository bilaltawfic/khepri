import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingData = {
  // Step 1: Intervals.icu (optional)
  intervalsAthleteId?: string;
  intervalsApiKey?: string;

  // Step 2: Fitness numbers (all optional)
  ftp?: number;
  lthr?: number;
  runThresholdPace?: number; // sec/km
  css?: number; // sec/100m
  restingHR?: number;
  maxHR?: number;
  weight?: number;
};

export type OnboardingContextValue = {
  data: OnboardingData;
  setIntervalsCredentials: (creds: { athleteId: string; apiKey: string }) => void;
  clearIntervalsCredentials: () => void;
  setFitnessNumbers: (numbers: {
    ftp?: number | null;
    lthr?: number | null;
    runThresholdPace?: number | null;
    css?: number | null;
    restingHR?: number | null;
    maxHR?: number | null;
    weight?: number | null;
  }) => void;
  reset: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Factory function to create fresh initial data.
 * Using a factory prevents shared mutable state between provider instances
 * and ensures reset() creates a truly fresh state.
 */
function getInitialData(): OnboardingData {
  return {};
}

// =============================================================================
// CONTEXT
// =============================================================================

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function OnboardingProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [data, setData] = useState<OnboardingData>(getInitialData);

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
    (numbers: {
      ftp?: number | null;
      lthr?: number | null;
      runThresholdPace?: number | null;
      css?: number | null;
      restingHR?: number | null;
      maxHR?: number | null;
      weight?: number | null;
    }) => {
      setData((prev) => ({
        ...prev,
        // undefined = keep previous value, null = clear, number = set
        ftp: numbers.ftp === undefined ? prev.ftp : (numbers.ftp ?? undefined),
        lthr: numbers.lthr === undefined ? prev.lthr : (numbers.lthr ?? undefined),
        runThresholdPace:
          numbers.runThresholdPace === undefined
            ? prev.runThresholdPace
            : (numbers.runThresholdPace ?? undefined),
        css: numbers.css === undefined ? prev.css : (numbers.css ?? undefined),
        restingHR:
          numbers.restingHR === undefined ? prev.restingHR : (numbers.restingHR ?? undefined),
        maxHR: numbers.maxHR === undefined ? prev.maxHR : (numbers.maxHR ?? undefined),
        weight: numbers.weight === undefined ? prev.weight : (numbers.weight ?? undefined),
      }));
    },
    []
  );

  const reset = useCallback(() => {
    setData(getInitialData());
  }, []);

  const value = useMemo(
    () => ({
      data,
      setIntervalsCredentials,
      clearIntervalsCredentials,
      setFitnessNumbers,
      reset,
    }),
    [data, setIntervalsCredentials, clearIntervalsCredentials, setFitnessNumbers, reset]
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
