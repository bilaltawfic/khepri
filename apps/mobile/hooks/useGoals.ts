import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type GoalInsert,
  type GoalRow,
  type GoalUpdate,
  createGoal as createGoalQuery,
  deleteGoal as deleteGoalQuery,
  getActiveGoals,
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

  // Fetch athlete ID from user
  useEffect(() => {
    async function fetchAthleteIdFromUser() {
      if (!user?.id || !supabase) {
        // Clear all state when user is not available
        setAthleteId(null);
        setGoals([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getAthleteByAuthUser(supabase, user.id);

        if (result.error) {
          setError(result.error.message);
          setIsLoading(false);
          return;
        }

        // Handle case where no athlete row exists for this user
        if (!result.data) {
          setAthleteId(null);
          setGoals([]);
          setError('No athlete profile found for this user');
          setIsLoading(false);
          return;
        }

        setAthleteId(result.data.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athlete');
        setIsLoading(false);
      }
    }

    void fetchAthleteIdFromUser();
  }, [user?.id]);

  // Fetch goals when athlete ID is available
  const fetchGoals = useCallback(async () => {
    if (!athleteId || !supabase) {
      // Clear stale state when athlete is not available
      setGoals([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all goals for the athlete (active, completed, cancelled)
      // We use getActiveGoals for now which returns active goals sorted by priority
      // The UI filters locally for active vs completed
      const result = await getActiveGoals(supabase, athleteId);

      if (result.error) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setGoals(result.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId) {
      void fetchGoals();
    }
  }, [athleteId, fetchGoals]);

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
              // Sort by priority (A, B, C) with nulls last
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
    await fetchGoals();
  }, [fetchGoals]);

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
