import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { getActiveSeason, getAthleteByAuthUser } from '@khepri/supabase-client';

export type UseActiveSeasonReturn = {
  readonly hasActiveSeason: boolean;
  readonly isLoading: boolean;
  readonly refresh: () => Promise<void>;
};

export function useActiveSeason(): UseActiveSeasonReturn {
  const { user } = useAuth();
  const [hasActiveSeason, setHasActiveSeason] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !user?.id) {
      setHasActiveSeason(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (athleteResult.error || !athleteResult.data) {
        setHasActiveSeason(false);
        return;
      }

      const seasonResult = await getActiveSeason(supabase, athleteResult.data.id);
      setHasActiveSeason(seasonResult.data != null);
    } catch {
      setHasActiveSeason(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hasActiveSeason, isLoading, refresh };
}
