import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type ConstraintInsert,
  type ConstraintRow,
  type ConstraintUpdate,
  createConstraint,
  deleteConstraint,
  getAllConstraints,
  getAthleteByAuthUser,
  getConstraintById,
  resolveConstraint,
  updateConstraint,
} from '@khepri/supabase-client';

export type ConstraintOperationResult = {
  success: boolean;
  error?: string;
};

export type UseConstraintsReturn = {
  constraints: ConstraintRow[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  getConstraint: (id: string) => Promise<ConstraintRow | null>;
  createConstraint: (
    constraint: Omit<ConstraintInsert, 'athlete_id'>
  ) => Promise<ConstraintOperationResult>;
  updateConstraint: (id: string, updates: ConstraintUpdate) => Promise<ConstraintOperationResult>;
  deleteConstraint: (id: string) => Promise<ConstraintOperationResult>;
  resolveConstraint: (id: string) => Promise<ConstraintOperationResult>;
  refetch: () => Promise<void>;
};

/**
 * Sort constraints to match database ordering: status ascending (active first),
 * then start_date descending (newest first).
 */
function sortConstraints(constraints: ConstraintRow[]): ConstraintRow[] {
  return [...constraints].sort((a, b) => {
    // First sort by status (ascending: 'active' < 'resolved')
    const statusA = a.status ?? '';
    const statusB = b.status ?? '';
    if (statusA !== statusB) {
      return statusA.localeCompare(statusB);
    }
    // Then by start_date descending (newest first)
    return b.start_date.localeCompare(a.start_date);
  });
}

export function useConstraints(): UseConstraintsReturn {
  const { user } = useAuth();
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch athlete ID and constraints
  const fetchConstraints = useCallback(async () => {
    if (!user?.id || !supabase) {
      setConstraints([]);
      setAthleteId(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First get the athlete ID
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (athleteResult.error) {
        setError(athleteResult.error.message);
        setConstraints([]);
        setAthleteId(null);
        setIsLoading(false);
        return;
      }

      if (!athleteResult.data) {
        setError('Athlete profile not found');
        setConstraints([]);
        setAthleteId(null);
        setIsLoading(false);
        return;
      }

      setAthleteId(athleteResult.data.id);

      // Now fetch all constraints
      const constraintsResult = await getAllConstraints(supabase, athleteResult.data.id);
      if (constraintsResult.error) {
        setError(constraintsResult.error.message);
        setConstraints([]);
      } else {
        setConstraints(constraintsResult.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load constraints');
      setConstraints([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchConstraints();
  }, [fetchConstraints]);

  const getConstraint = useCallback(async (id: string): Promise<ConstraintRow | null> => {
    if (!supabase) {
      return null;
    }

    try {
      const result = await getConstraintById(supabase, id);
      if (result.error) {
        return null;
      }
      return result.data;
    } catch {
      return null;
    }
  }, []);

  const handleCreateConstraint = useCallback(
    async (
      constraint: Omit<ConstraintInsert, 'athlete_id'>
    ): Promise<ConstraintOperationResult> => {
      if (!athleteId || !supabase) {
        return { success: false, error: 'No athlete profile found' };
      }

      try {
        const result = await createConstraint(supabase, {
          ...constraint,
          athlete_id: athleteId,
        });

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Add new constraint to local state and re-sort to maintain ordering
        const newConstraint = result.data;
        if (newConstraint) {
          setConstraints((prev) => sortConstraints([newConstraint, ...prev]));
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to create constraint',
        };
      }
    },
    [athleteId]
  );

  const handleUpdateConstraint = useCallback(
    async (id: string, updates: ConstraintUpdate): Promise<ConstraintOperationResult> => {
      if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        const result = await updateConstraint(supabase, id, updates);

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Update local state and re-sort to maintain ordering (start_date may have changed)
        const updatedConstraint = result.data;
        if (updatedConstraint) {
          setConstraints((prev) =>
            sortConstraints(prev.map((c) => (c.id === id ? updatedConstraint : c)))
          );
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update constraint',
        };
      }
    },
    []
  );

  const handleDeleteConstraint = useCallback(
    async (id: string): Promise<ConstraintOperationResult> => {
      if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        const result = await deleteConstraint(supabase, id);

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Remove from local state
        setConstraints((prev) => prev.filter((c) => c.id !== id));

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to delete constraint',
        };
      }
    },
    []
  );

  const handleResolveConstraint = useCallback(
    async (id: string): Promise<ConstraintOperationResult> => {
      if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        const result = await resolveConstraint(supabase, id);

        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Update local state and re-sort (status changed to 'resolved', moves to end)
        const resolvedConstraint = result.data;
        if (resolvedConstraint) {
          setConstraints((prev) =>
            sortConstraints(prev.map((c) => (c.id === id ? resolvedConstraint : c)))
          );
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to resolve constraint',
        };
      }
    },
    []
  );

  const refetch = useCallback(async () => {
    await fetchConstraints();
  }, [fetchConstraints]);

  // isReady is true when loading is complete and athleteId is available
  // This allows the form to know if it's safe to call createConstraint
  const isReady = !isLoading && athleteId !== null;

  return {
    constraints,
    isLoading,
    isReady,
    error,
    getConstraint,
    createConstraint: handleCreateConstraint,
    updateConstraint: handleUpdateConstraint,
    deleteConstraint: handleDeleteConstraint,
    resolveConstraint: handleResolveConstraint,
    refetch,
  };
}
