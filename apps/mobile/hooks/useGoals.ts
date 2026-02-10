import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type GoalInsert,
  type GoalRow,
  type GoalUpdate,
  createGoal as createGoalQuery,
  deleteGoal as deleteGoalQuery,
  getAllGoals,
  getAthleteByAuthUser,
  getGoalById,
  updateGoal as updateGoalQuery,
} from '@khepri/supabase-client';

export type UseGoalsResult = {
  success: boolean;
  error?: string;
};

export type UseGoalsReturn = {
  goals: GoalRow[];
  isLoading: boolean;
  error: string | null;
  createGoal: (goal: Omit<GoalInsert, 'athlete_id'>) => Promise<UseGoalsResult>;
  updateGoal: (id: string, updates: GoalUpdate) => Promise<UseGoalsResult>;
  deleteGoal: (id: string) => Promise<UseGoalsResult>;
  getGoal: (id: string) => Promise<GoalRow | null>;
  refetch: () => Promise<void>;
};

export function useGoals(): UseGoalsReturn {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  // Fetch athlete ID and goals when user changes
  useEffect(() => {
    // Track whether this effect is still current to avoid stale updates
    let isCurrent = true;

    async function fetchAthleteAndGoals() {
      if (!user?.id || !supabase) {
        // Clear all state when user is not available
        setAthleteId(null);
        setGoals([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      // User is available: start a new loading cycle
      // Clear user-scoped state so we don't expose stale data from a previous session
      setIsLoading(true);
      setError(null);
      setAthleteId(null);
      setGoals([]);

      try {
        // Step 1: Get athlete ID
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);

        // Ignore stale responses from previous user.id values
        if (!isCurrent) return;

        if (athleteResult.error) {
          setError(athleteResult.error.message);
          setAthleteId(null);
          setGoals([]);
          setIsLoading(false);
          return;
        }

        // Handle case where no athlete row exists for this user
        if (!athleteResult.data) {
          setAthleteId(null);
          setGoals([]);
          setError('No athlete profile found for this user');
          setIsLoading(false);
          return;
        }

        const fetchedAthleteId = athleteResult.data.id;
        setAthleteId(fetchedAthleteId);

        // Step 2: Get goals for this athlete
        const goalsResult = await getAllGoals(supabase, fetchedAthleteId);

        // Ignore stale responses
        if (!isCurrent) return;

        if (goalsResult.error) {
          setError(goalsResult.error.message);
          setGoals([]);
          setIsLoading(false);
          return;
        }

        setGoals(goalsResult.data ?? []);
      } catch (err) {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load goals');
        setGoals([]);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void fetchAthleteAndGoals();

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  const createGoal = useCallback(
    async (goal: Omit<GoalInsert, 'athlete_id'>): Promise<UseGoalsResult> => {
      if (!athleteId || !supabase) {
        return { success: false, error: 'No athlete profile available' };
      }

      try {
        const result = await createGoalQuery(supabase, {
          ...goal,
          athlete_id: athleteId,
        });

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Add new goal to state (optimistic update with server data)
        const newGoal = result.data;
        if (newGoal) {
          setGoals((prev) => {
            // Insert at correct position based on priority
            const newGoals = [...prev, newGoal];
            return newGoals.sort((a, b) => {
              // Sort by priority (A, B, C); null defaults to 'B' (matching UI display)
              const priorityA = a.priority ?? 'B';
              const priorityB = b.priority ?? 'B';
              return priorityA.localeCompare(priorityB);
            });
          });
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to create goal',
        };
      }
    },
    [athleteId]
  );

  const updateGoal = useCallback(
    async (id: string, updates: GoalUpdate): Promise<UseGoalsResult> => {
      if (!supabase) {
        return { success: false, error: 'Supabase not available' };
      }

      try {
        const result = await updateGoalQuery(supabase, id, updates);

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Update goal in state
        const updatedGoal = result.data;
        if (updatedGoal) {
          setGoals((prev) => {
            const updatedGoals = prev.map((g) => (g.id === id ? updatedGoal : g));
            return updatedGoals.sort((a, b) => {
              const priorityA = a.priority ?? 'Z';
              const priorityB = b.priority ?? 'Z';
              return priorityA.localeCompare(priorityB);
            });
          });
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update goal',
        };
      }
    },
    []
  );

  const deleteGoal = useCallback(async (id: string): Promise<UseGoalsResult> => {
    if (!supabase) {
      return { success: false, error: 'Supabase not available' };
    }

    try {
      const result = await deleteGoalQuery(supabase, id);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      // Remove goal from state
      setGoals((prev) => prev.filter((g) => g.id !== id));

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete goal',
      };
    }
  }, []);

  const getGoal = useCallback(async (id: string): Promise<GoalRow | null> => {
    if (!supabase) {
      return null;
    }

    try {
      const result = await getGoalById(supabase, id);
      return result.data;
    } catch {
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!supabase || !user?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If athleteId is missing (e.g., initial fetch failed), re-fetch it first
      let currentAthleteId = athleteId;
      if (!currentAthleteId) {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (athleteResult.error) {
          setError(athleteResult.error.message);
          return;
        }
        if (!athleteResult.data) {
          setError('No athlete profile found for this user');
          return;
        }
        currentAthleteId = athleteResult.data.id;
        setAthleteId(currentAthleteId);
      }

      const result = await getAllGoals(supabase, currentAthleteId);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setGoals(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, user?.id]);

  return {
    goals,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoal,
    refetch,
  };
}
