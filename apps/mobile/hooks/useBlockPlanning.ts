import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import type { RaceBlockRow, SeasonRow, WorkoutRow } from '@khepri/supabase-client';
import {
  createRaceBlock,
  getActiveSeason,
  getAthleteByAuthUser,
  getBlockWorkouts,
  getSeasonRaceBlocks,
  lockBlock,
} from '@khepri/supabase-client';

// ====================================================================
// Types
// ====================================================================

export type BlockPlanningStep = 'loading' | 'setup' | 'generating' | 'review' | 'locking' | 'done';

export interface BlockSetupData {
  readonly weeklyHoursMin: number;
  readonly weeklyHoursMax: number;
  readonly unavailableDates: readonly string[];
  readonly focusAreas: readonly string[];
}

export interface UseBlockPlanningReturn {
  readonly step: BlockPlanningStep;
  readonly season: SeasonRow | null;
  readonly block: RaceBlockRow | null;
  readonly workouts: readonly WorkoutRow[];
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly generateWorkouts: (setup: BlockSetupData) => Promise<void>;
  readonly lockIn: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly selectedWeek: number;
  readonly setSelectedWeek: (week: number) => void;
  readonly workoutsForWeek: readonly WorkoutRow[];
}

// ====================================================================
// Hook
// ====================================================================

export function useBlockPlanning(): UseBlockPlanningReturn {
  const { user } = useAuth();
  const [step, setStep] = useState<BlockPlanningStep>('loading');
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [block, setBlock] = useState<RaceBlockRow | null>(null);
  const [workouts, setWorkouts] = useState<readonly WorkoutRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const refresh = useCallback(async () => {
    if (!supabase || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const athleteResult = await getAthleteByAuthUser(supabase, user.id);
      if (athleteResult.error || !athleteResult.data) {
        setError('Could not find athlete profile');
        setIsLoading(false);
        return;
      }

      const seasonResult = await getActiveSeason(supabase, athleteResult.data.id);
      if (seasonResult.error || !seasonResult.data) {
        setError('No active season found. Please set up a season first.');
        setIsLoading(false);
        return;
      }
      setSeason(seasonResult.data);

      // Check for existing blocks in this season
      const blocksResult = await getSeasonRaceBlocks(supabase, seasonResult.data.id);
      const existingBlock = blocksResult.data?.find(
        (b) => b.status === 'draft' || b.status === 'locked' || b.status === 'in_progress'
      );

      if (existingBlock != null) {
        setBlock(existingBlock);
        const workoutsResult = await getBlockWorkouts(supabase, existingBlock.id);
        if (workoutsResult.data != null) {
          setWorkouts(workoutsResult.data);
        }

        if (
          existingBlock.status === 'draft' &&
          workoutsResult.data != null &&
          workoutsResult.data.length > 0
        ) {
          setStep('review');
        } else if (existingBlock.status === 'locked' || existingBlock.status === 'in_progress') {
          setStep('done');
        } else {
          setStep('setup');
        }
      } else {
        setStep('setup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load block planning data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generateWorkouts = useCallback(
    async (setup: BlockSetupData) => {
      if (!supabase || !season) {
        setError('Missing configuration');
        return;
      }

      setStep('generating');
      setError(null);

      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user?.id ?? '');
        if (athleteResult.error || !athleteResult.data) {
          throw new Error('Could not find athlete profile');
        }

        const skeleton = season.skeleton as {
          phases?: readonly {
            name: string;
            startDate: string;
            endDate: string;
            focus: string;
            weeklyHours: number;
          }[];
        } | null;

        if (skeleton?.phases == null || skeleton.phases.length === 0) {
          throw new Error('Season skeleton not found. Please regenerate your season plan.');
        }

        // Find the first unplanned phase range as the block
        const blocksResult = await getSeasonRaceBlocks(supabase, season.id);
        const existingBlocks = blocksResult.data ?? [];
        const plannedEndDates = new Set(existingBlocks.map((b) => b.end_date));

        const firstUnplannedPhase = skeleton.phases.find((p) => !plannedEndDates.has(p.endDate));
        if (firstUnplannedPhase == null) {
          throw new Error('All phases are already planned');
        }

        // Collect contiguous phases for this block
        const blockPhases: Array<(typeof skeleton.phases)[number]> = [];
        let collecting = false;
        for (const phase of skeleton.phases) {
          if (phase === firstUnplannedPhase) collecting = true;
          if (collecting) {
            blockPhases.push(phase);
            // Stop at race_week or after collecting a reasonable chunk
            if (phase.focus.toLowerCase().includes('race') || blockPhases.length >= 6) break;
          }
        }

        const startDate = blockPhases[0].startDate;
        const endDate = blockPhases[blockPhases.length - 1].endDate;
        const totalWeeks = blockPhases.reduce((sum, p) => {
          const start = new Date(`${p.startDate}T00:00:00`);
          const end = new Date(`${p.endDate}T00:00:00`);
          return (
            sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 86_400_000)))
          );
        }, 0);

        const blockResult = await createRaceBlock(supabase, {
          season_id: season.id,
          athlete_id: athleteResult.data.id,
          name: blockPhases[0].name,
          start_date: startDate,
          end_date: endDate,
          total_weeks: totalWeeks,
          status: 'draft',
          phases: blockPhases.map((p) => ({
            name: p.name,
            weeks: Math.max(
              1,
              Math.round(
                (new Date(`${p.endDate}T00:00:00`).getTime() -
                  new Date(`${p.startDate}T00:00:00`).getTime()) /
                  (7 * 86_400_000)
              )
            ),
            focus: p.focus,
            weeklyHours: p.weeklyHours,
          })),
        });

        if (blockResult.error || !blockResult.data) {
          throw new Error(blockResult.error?.message ?? 'Failed to create block');
        }

        setBlock(blockResult.data);

        // Call generate-block-workouts Edge Function
        const response = await supabase.functions.invoke('generate-block-workouts', {
          body: {
            block_id: blockResult.data.id,
            season_id: season.id,
            athlete_id: athleteResult.data.id,
            start_date: startDate,
            end_date: endDate,
            phases: blockResult.data.phases,
            preferences: {
              weeklyHoursMin: setup.weeklyHoursMin,
              weeklyHoursMax: setup.weeklyHoursMax,
              availableDays: season.preferences
                ? ((season.preferences as { availableDays?: number[] }).availableDays ?? [
                    0, 1, 2, 3, 4, 5,
                  ])
                : [0, 1, 2, 3, 4, 5],
              sportPriority: season.preferences
                ? ((season.preferences as { sportPriority?: string[] }).sportPriority ?? [
                    'run',
                    'bike',
                    'swim',
                  ])
                : ['run', 'bike', 'swim'],
            },
            unavailable_dates: setup.unavailableDates,
            focus_areas: setup.focusAreas,
            generation_tier: 'template',
          },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Reload workouts
        const workoutsResult = await getBlockWorkouts(supabase, blockResult.data.id);
        if (workoutsResult.data != null) {
          setWorkouts(workoutsResult.data);
        }

        setStep('review');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate workouts');
        setStep('setup');
      }
    },
    [season, user?.id]
  );

  const lockIn = useCallback(async () => {
    if (!supabase || !block) {
      setError('No block to lock');
      return;
    }

    setStep('locking');
    setError(null);

    try {
      const result = await lockBlock(supabase, block.id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      setBlock(result.data);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock block');
      setStep('review');
    }
  }, [block]);

  const workoutsForWeek = workouts.filter((w) => w.week_number === selectedWeek);

  return {
    step,
    season,
    block,
    workouts,
    error,
    isLoading,
    generateWorkouts,
    lockIn,
    refresh,
    selectedWeek,
    setSelectedWeek,
    workoutsForWeek,
  };
}
