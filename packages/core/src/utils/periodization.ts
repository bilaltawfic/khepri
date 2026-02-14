import type {
  IntensityDistribution,
  PeriodizationPhase,
  PeriodizationPhaseConfig,
  PeriodizationPlan,
  TrainingFocus,
  WeeklyVolume,
} from '../types/training.js';

/**
 * Get recommended intensity distribution for a training phase.
 * Based on classic periodization models (Lydiard, Coggan, Friel).
 */
export function getIntensityDistribution(phase: PeriodizationPhase): IntensityDistribution {
  switch (phase) {
    case 'base':
      return [80, 15, 5]; // Focus on aerobic base
    case 'build':
      return [70, 20, 10]; // Increase threshold work
    case 'peak':
      return [60, 25, 15]; // Add VO2max and race-specific intensity
    case 'taper':
      return [90, 5, 5]; // Reduce intensity, maintain sharpness
    case 'recovery':
      return [95, 5, 0]; // Active recovery only
    default: {
      // Exhaustiveness check: TypeScript should ensure all cases covered
      const _exhaustive: never = phase;
      return [80, 15, 5];
    }
  }
}

/**
 * Get recommended training focus for a phase.
 */
export function getTrainingFocus(phase: PeriodizationPhase): TrainingFocus {
  switch (phase) {
    case 'base':
      return 'aerobic_endurance';
    case 'build':
      return 'threshold_work';
    case 'peak':
      return 'race_specific';
    case 'taper':
      return 'recovery';
    case 'recovery':
      return 'recovery';
    default: {
      const _exhaustive: never = phase;
      return 'aerobic_endurance';
    }
  }
}

/**
 * Calculate phase breakdown for a training plan.
 * Returns recommended weeks for each phase based on total duration.
 *
 * @param totalWeeks - Total plan duration (4-52 weeks)
 * @returns Array of phase configurations
 */
export function calculatePhaseBreakdown(totalWeeks: number): PeriodizationPhaseConfig[] {
  if (totalWeeks < 4 || totalWeeks > 52) {
    throw new Error(`Total weeks must be between 4 and 52, got ${totalWeeks}`);
  }

  const phases: PeriodizationPhaseConfig[] = [];

  if (totalWeeks <= 8) {
    // Short plan: Base → Build → Taper
    const baseWeeks = Math.max(2, Math.floor(totalWeeks * 0.4));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.2));
    const buildWeeks = totalWeeks - baseWeeks - taperWeeks;

    phases.push(
      {
        phase: 'base',
        weeks: baseWeeks,
        focus: getTrainingFocus('base'),
        intensity_distribution: getIntensityDistribution('base'),
      },
      {
        phase: 'build',
        weeks: buildWeeks,
        focus: getTrainingFocus('build'),
        intensity_distribution: getIntensityDistribution('build'),
      },
      {
        phase: 'taper',
        weeks: taperWeeks,
        focus: getTrainingFocus('taper'),
        intensity_distribution: getIntensityDistribution('taper'),
      }
    );
  } else {
    // Standard plan: Base → Build → Peak → Taper
    const baseWeeks = Math.max(3, Math.floor(totalWeeks * 0.35));
    const taperWeeks = Math.min(2, Math.floor(totalWeeks * 0.15));
    const peakWeeks = Math.max(2, Math.floor(totalWeeks * 0.15));
    const buildWeeks = totalWeeks - baseWeeks - peakWeeks - taperWeeks;

    phases.push(
      {
        phase: 'base',
        weeks: baseWeeks,
        focus: getTrainingFocus('base'),
        intensity_distribution: getIntensityDistribution('base'),
      },
      {
        phase: 'build',
        weeks: buildWeeks,
        focus: getTrainingFocus('build'),
        intensity_distribution: getIntensityDistribution('build'),
      },
      {
        phase: 'peak',
        weeks: peakWeeks,
        focus: getTrainingFocus('peak'),
        intensity_distribution: getIntensityDistribution('peak'),
      }
    );

    if (taperWeeks > 0) {
      phases.push({
        phase: 'taper',
        weeks: taperWeeks,
        focus: getTrainingFocus('taper'),
        intensity_distribution: getIntensityDistribution('taper'),
      });
    }
  }

  // Filter out any phases with 0 weeks (shouldn't happen after fix, but defensive)
  return phases.filter((p) => p.weeks > 0);
}

/**
 * Calculate weekly volume progression for a training plan.
 * Uses a wave pattern with progressive overload and recovery weeks.
 *
 * @param phases - Phase configurations from calculatePhaseBreakdown
 * @returns Array of weekly volumes with multipliers
 */
export function calculateWeeklyVolumes(
  phases: readonly PeriodizationPhaseConfig[]
): WeeklyVolume[] {
  const volumes: WeeklyVolume[] = [];
  let currentWeek = 1;

  for (const phase of phases) {
    const phaseVolumes = generatePhaseVolumes(phase, currentWeek);
    volumes.push(...phaseVolumes);
    currentWeek += phase.weeks;
  }

  return volumes;
}

/**
 * Generate weekly volumes for a single phase using 3:1 progression
 * (3 weeks progressive overload, 1 recovery week).
 */
function generatePhaseVolumes(phase: PeriodizationPhaseConfig, startWeek: number): WeeklyVolume[] {
  const volumes: WeeklyVolume[] = [];

  // Base multipliers for each phase
  const phaseBaseMultiplier: Record<PeriodizationPhase, number> = {
    base: 0.8,
    build: 1,
    peak: 1.1,
    taper: 0.5,
    recovery: 0.6,
  };

  const baseMultiplier = phaseBaseMultiplier[phase.phase];

  for (let i = 0; i < phase.weeks; i++) {
    const weekInPhase = i + 1;
    const weekNumber = startWeek + i;

    let volumeMultiplier: number;

    if (phase.phase === 'taper') {
      // Taper: progressive reduction
      volumeMultiplier = baseMultiplier * (1 - (i / phase.weeks) * 0.4);
    } else {
      // 3:1 progression: weeks 1-3 increase, week 4 recovery
      const cyclePosition = weekInPhase % 4;
      if (cyclePosition === 1) {
        volumeMultiplier = baseMultiplier * 0.85;
      } else if (cyclePosition === 2) {
        volumeMultiplier = baseMultiplier * 0.95;
      } else if (cyclePosition === 3) {
        volumeMultiplier = baseMultiplier * 1.05;
      } else {
        // Recovery week
        volumeMultiplier = baseMultiplier * 0.7;
      }
    }

    volumes.push({
      week: weekNumber,
      volume_multiplier: Number(volumeMultiplier.toFixed(2)),
      phase: phase.phase,
    });
  }

  return volumes;
}

/**
 * Generate a complete periodization plan for a training cycle.
 *
 * @param totalWeeks - Total plan duration (4-52 weeks)
 * @returns Complete periodization plan with phases and weekly volumes
 */
export function generatePeriodizationPlan(totalWeeks: number): PeriodizationPlan {
  const phases = calculatePhaseBreakdown(totalWeeks);
  const weeklyVolumes = calculateWeeklyVolumes(phases);

  return {
    total_weeks: totalWeeks,
    phases,
    weekly_volumes: weeklyVolumes,
  };
}
