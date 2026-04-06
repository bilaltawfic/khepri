import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import type { UnavailableDate } from '@khepri/core';
import type { RaceBlockRow, SeasonRow, WorkoutRow } from '@khepri/supabase-client';
import {
  cancelBlock,
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

interface SkeletonPhase {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly focus: string;
  readonly weeklyHours: number;
}

export interface BlockSetupData {
  readonly weeklyHoursMin: number;
  readonly weeklyHoursMax: number;
  readonly unavailableDates: readonly UnavailableDate[];
}

export interface BlockMeta {
  readonly blockName: string;
  readonly blockStartDate: string;
  readonly blockEndDate: string;
  readonly blockTotalWeeks: number;
}

export interface UseBlockPlanningReturn {
  readonly step: BlockPlanningStep;
  readonly season: SeasonRow | null;
  readonly block: RaceBlockRow | null;
  readonly workouts: readonly WorkoutRow[];
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly blockMeta: BlockMeta | null;
  readonly generateWorkouts: (setup: BlockSetupData) => Promise<boolean>;
  readonly lockIn: () => Promise<boolean>;
  readonly refresh: () => Promise<void>;
  readonly selectedWeek: number;
  readonly setSelectedWeek: (week: number) => void;
  readonly workoutsForWeek: readonly WorkoutRow[];
}

// ====================================================================
// Helpers
// ====================================================================

function parseSkeleton(raw: unknown): { phases: readonly SkeletonPhase[] } | null {
  if (typeof raw !== 'object' || raw == null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.phases) || obj.phases.length === 0) return null;
  return obj as { phases: readonly SkeletonPhase[] };
}

function collectBlockPhases(
  phases: readonly SkeletonPhase[],
  plannedEndDates: ReadonlySet<string>
): SkeletonPhase[] {
  const firstUnplanned = phases.find((p) => !plannedEndDates.has(p.endDate));
  if (firstUnplanned == null) {
    throw new Error('All phases are already planned');
  }

  const blockPhases: SkeletonPhase[] = [];
  let collecting = false;
  for (const phase of phases) {
    if (phase === firstUnplanned) collecting = true;
    if (collecting) {
      blockPhases.push(phase);
      if (phase.focus.toLowerCase().includes('race') || blockPhases.length >= 6) break;
    }
  }
  return blockPhases;
}

function phaseWeeks(phase: SkeletonPhase): number {
  const start = new Date(`${phase.startDate}T00:00:00`);
  const end = new Date(`${phase.endDate}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 86_400_000)));
}

function computeBlockMetaFromSkeleton(
  season: SeasonRow,
  existingBlocks: readonly { status: string; end_date: string }[]
): BlockMeta | null {
  const skeleton = parseSkeleton(season.skeleton);
  if (skeleton == null) return null;
  const plannedEndDates = new Set(
    existingBlocks
      .filter((b) => b.status === 'locked' || b.status === 'in_progress')
      .map((b) => b.end_date)
  );
  // collectBlockPhases throws when all phases are already planned
  const firstUnplanned = skeleton.phases.find((p) => !plannedEndDates.has(p.endDate));
  if (firstUnplanned == null) return null;

  const blockPhases = collectBlockPhases(skeleton.phases, plannedEndDates);
  if (blockPhases.length === 0) return null;

  const lastPhase = blockPhases.at(-1);
  if (lastPhase == null) return null;

  const totalWeeks = blockPhases.reduce((sum, p) => sum + phaseWeeks(p), 0);
  return {
    blockName: blockPhases[0].name,
    blockStartDate: blockPhases[0].startDate,
    blockEndDate: lastPhase.endDate,
    blockTotalWeeks: totalWeeks,
  };
}

function extractPreferences(
  season: SeasonRow,
  setup: BlockSetupData
): {
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  availableDays: number[];
  sportPriority: string[];
} {
  const prefs = season.preferences as { availableDays?: number[]; sportPriority?: string[] } | null;
  return {
    weeklyHoursMin: setup.weeklyHoursMin,
    weeklyHoursMax: setup.weeklyHoursMax,
    availableDays: prefs?.availableDays ?? [0, 1, 2, 3, 4, 5],
    sportPriority: prefs?.sportPriority ?? ['run', 'bike', 'swim'],
  };
}

// ====================================================================
// Hook
// ====================================================================

export function useBlockPlanning(): UseBlockPlanningReturn {
  const { user } = useAuth();
  const [step, setStep] = useState<BlockPlanningStep>('loading');
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [block, setBlock] = useState<RaceBlockRow | null>(null);
  const [allBlocks, setAllBlocks] = useState<readonly RaceBlockRow[]>([]);
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
      if (blocksResult.error) {
        setError('Could not load season blocks');
        setIsLoading(false);
        return;
      }
      const seasonBlocks = blocksResult.data ?? [];
      setAllBlocks(seasonBlocks);
      const existingBlock = seasonBlocks.find(
        (b) => b.status === 'draft' || b.status === 'locked' || b.status === 'in_progress'
      );

      if (existingBlock == null) {
        setBlock(null);
        setWorkouts([]);
        setStep('setup');
      } else {
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

  // Eagerly compute block metadata for display and downstream use
  const blockMeta = useMemo((): BlockMeta | null => {
    if (season == null) return null;
    // Prefer the existing block's stored dates (authoritative after creation)
    if (block != null) {
      return {
        blockName: block.name,
        blockStartDate: block.start_date,
        blockEndDate: block.end_date,
        blockTotalWeeks: block.total_weeks,
      };
    }
    // During setup (no block yet), compute from the season skeleton
    return computeBlockMetaFromSkeleton(season, allBlocks);
  }, [season, block, allBlocks]);

  const generateWorkouts = useCallback(
    async (setup: BlockSetupData): Promise<boolean> => {
      if (!supabase || !season) {
        setError('Missing configuration');
        return false;
      }

      setStep('generating');
      setError(null);

      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user?.id ?? '');
        if (athleteResult.error || !athleteResult.data) {
          throw new Error('Could not find athlete profile');
        }

        const skeleton = parseSkeleton(season.skeleton);
        if (skeleton == null) {
          throw new Error('Season skeleton not found. Please regenerate your season plan.');
        }

        const blocksResult = await getSeasonRaceBlocks(supabase, season.id);
        // Only count locked/in_progress blocks as planned; drafts may be incomplete/abandoned
        const plannedEndDates = new Set(
          (blocksResult.data ?? [])
            .filter((b) => b.status === 'locked' || b.status === 'in_progress')
            .map((b) => b.end_date)
        );
        const blockPhases = collectBlockPhases(skeleton.phases, plannedEndDates);

        const startDate = blockPhases[0].startDate;
        const lastPhase = blockPhases.at(-1);
        if (lastPhase == null) throw new Error('No phases collected');
        const endDate = lastPhase.endDate;
        const totalWeeks = blockPhases.reduce((sum, p) => sum + phaseWeeks(p), 0);

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
            weeks: phaseWeeks(p),
            focus: p.focus,
            weeklyHours: p.weeklyHours,
          })),
        });

        if (blockResult.error || !blockResult.data) {
          throw new Error(blockResult.error?.message ?? 'Failed to create block');
        }

        const createdBlock = blockResult.data;
        setBlock(createdBlock);

        const response = await supabase.functions.invoke('generate-block-workouts', {
          body: {
            block_id: createdBlock.id,
            season_id: season.id,
            athlete_id: athleteResult.data.id,
            start_date: startDate,
            end_date: endDate,
            phases: createdBlock.phases,
            preferences: extractPreferences(season, setup),
            unavailable_dates: setup.unavailableDates,
            generation_tier: 'template',
          },
        });

        if (response.error) {
          // Cancel the orphaned draft block before surfacing the error
          await cancelBlock(supabase, createdBlock.id);
          setBlock(null);
          throw new Error(response.error.message);
        }

        const workoutsResult = await getBlockWorkouts(supabase, blockResult.data.id);
        if (workoutsResult.data != null) {
          setWorkouts(workoutsResult.data);
        }

        setStep('review');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate workouts');
        setStep('setup');
        return false;
      }
    },
    [season, user?.id]
  );

  const lockIn = useCallback(async (): Promise<boolean> => {
    if (!supabase || !block) {
      setError('No block to lock');
      return false;
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock block');
      setStep('review');
      return false;
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
    blockMeta,
    generateWorkouts,
    lockIn,
    refresh,
    selectedWeek,
    setSelectedWeek,
    workoutsForWeek,
  };
}
