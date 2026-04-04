import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  acceptAdaptation,
  getAthleteByAuthUser,
  getPendingAdaptations,
  rejectAdaptation,
} from '@khepri/supabase-client';
import type { PlanAdaptationRow } from '@khepri/supabase-client';

export type AdaptationActionResult = {
  readonly success: boolean;
  readonly error?: string;
};

export type UseAdaptationsReturn = {
  readonly pendingAdaptations: PlanAdaptationRow[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
  readonly accept: (adaptationId: string) => Promise<AdaptationActionResult>;
  readonly reject: (adaptationId: string) => Promise<AdaptationActionResult>;
};

export function useAdaptations(): UseAdaptationsReturn {
  const { user } = useAuth();
  const [pendingAdaptations, setPendingAdaptations] = useState<PlanAdaptationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdaptations = useCallback(async () => {
    if (!user?.id || !supabase) {
      setPendingAdaptations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: athlete, error: athleteError } = await getAthleteByAuthUser(supabase, user.id);

      if (athleteError) {
        setError(athleteError.message);
        setIsLoading(false);
        return;
      }

      if (!athlete) {
        setPendingAdaptations([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await getPendingAdaptations(supabase, athlete.id);

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setPendingAdaptations(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adaptations');
      setPendingAdaptations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let isCurrent = true;

    void fetchAdaptations().then(() => {
      if (!isCurrent) return;
    });

    return () => {
      isCurrent = false;
    };
  }, [fetchAdaptations]);

  const accept = useCallback(async (adaptationId: string): Promise<AdaptationActionResult> => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    const { error: acceptError } = await acceptAdaptation(supabase, adaptationId);

    if (acceptError) {
      return { success: false, error: acceptError.message };
    }

    // Optimistically remove from pending list
    setPendingAdaptations((prev) => prev.filter((a) => a.id !== adaptationId));
    return { success: true };
  }, []);

  const reject = useCallback(async (adaptationId: string): Promise<AdaptationActionResult> => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    const { error: rejectError } = await rejectAdaptation(supabase, adaptationId);

    if (rejectError) {
      return { success: false, error: rejectError.message };
    }

    // Optimistically remove from pending list
    setPendingAdaptations((prev) => prev.filter((a) => a.id !== adaptationId));
    return { success: true };
  }, []);

  return {
    pendingAdaptations,
    isLoading,
    error,
    refetch: fetchAdaptations,
    accept,
    reject,
  };
}
