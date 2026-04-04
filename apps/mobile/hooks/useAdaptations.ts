import { useCallback, useEffect, useRef, useState } from 'react';

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
  const isMountedRef = useRef(true);

  const fetchAdaptations = useCallback(async () => {
    if (!user?.id || !supabase) {
      if (isMountedRef.current) {
        setPendingAdaptations([]);
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { data: athlete, error: athleteError } = await getAthleteByAuthUser(supabase, user.id);

      if (!isMountedRef.current) return;

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

      if (!isMountedRef.current) return;

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setPendingAdaptations(data ?? []);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load adaptations');
      setPendingAdaptations([]);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchAdaptations();
    return () => {
      isMountedRef.current = false;
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
