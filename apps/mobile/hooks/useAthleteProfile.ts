import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type AthleteRow,
  type AthleteUpdate,
  getAthleteByAuthUser,
  updateAthlete,
} from '@khepri/supabase-client';

export type UpdateProfileResult = {
  success: boolean;
  error?: string;
};

export type UseAthleteProfileReturn = {
  athlete: AthleteRow | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: AthleteUpdate) => Promise<UpdateProfileResult>;
  refetch: () => Promise<void>;
};

export function useAthleteProfile(): UseAthleteProfileReturn {
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<AthleteRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id || !supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getAthleteByAuthUser(supabase, user.id);
      if (result.error) {
        setError(result.error.message);
        setAthlete(null);
      } else {
        setAthlete(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setAthlete(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: AthleteUpdate): Promise<UpdateProfileResult> => {
      if (!athlete?.id || !supabase) {
        return { success: false, error: 'No athlete profile to update' };
      }

      try {
        const result = await updateAthlete(supabase, athlete.id, updates);
        if (result.error) {
          return { success: false, error: result.error.message };
        }

        // Update local state with the returned data
        if (result.data) {
          setAthlete(result.data);
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to save profile',
        };
      }
    },
    [athlete?.id]
  );

  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return { athlete, isLoading, error, updateProfile, refetch };
}
