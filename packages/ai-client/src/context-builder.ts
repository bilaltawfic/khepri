/**
 * Context Builder
 *
 * Builds the coaching context that gets sent to Claude for AI coaching decisions.
 * This module aggregates athlete data, goals, constraints, activities, and wellness
 * data into a comprehensive context object.
 */

import type {
  Activity,
  AthleteProfile,
  CoachingContext,
  Constraint,
  DailyCheckIn,
  FitnessMetrics,
  Goal,
  RaceGoal,
  TrainingPhase,
  TrainingPlan,
  WellnessData,
} from './types.js';

// =============================================================================
// CONTEXT BUILDER PARAMS
// =============================================================================

/**
 * Parameters for building a coaching context
 */
export interface BuildCoachingContextParams {
  /** Athlete profile data */
  athlete: AthleteProfile;

  /** Active goals for the athlete */
  goals?: Goal[];

  /** Active constraints (injuries, travel, availability) */
  constraints?: Constraint[];

  /** Today's daily check-in data */
  checkIn?: DailyCheckIn;

  /** Recent activities from Intervals.icu */
  recentActivities?: Activity[];

  /** Wellness history from Intervals.icu */
  wellnessData?: WellnessData[];

  /** Current fitness metrics (CTL/ATL/TSB) */
  fitnessMetrics?: FitnessMetrics;

  /** Active training plan */
  trainingPlan?: TrainingPlan;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find the next upcoming race goal
 */
function findNextRaceGoal(goals: Goal[]): RaceGoal | undefined {
  const now = new Date();
  const raceGoals = goals.filter(
    (goal): goal is RaceGoal =>
      goal.goalType === 'race' && goal.status === 'active' && goal.targetDate !== undefined
  );

  if (raceGoals.length === 0) {
    return undefined;
  }

  // Sort by target date and return the nearest
  // Note: targetDate is guaranteed to exist from the filter above
  const sortedRaces = [...raceGoals].sort((a, b) => {
    const dateA = new Date(a.targetDate as string);
    const dateB = new Date(b.targetDate as string);
    return dateA.getTime() - dateB.getTime();
  });

  // Find the first race that hasn't passed
  return sortedRaces.find((race) => new Date(race.targetDate as string) >= now);
}

/**
 * Calculate days until next race
 */
function calculateDaysToRace(raceGoal: RaceGoal): number {
  if (!raceGoal.targetDate) {
    return -1;
  }

  const now = new Date();
  const raceDate = new Date(raceGoal.targetDate);
  const diffTime = raceDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determine current training phase based on plan and date
 */
function getCurrentPhase(
  plan: TrainingPlan
): { phase: TrainingPhase; weekInPlan: number } | undefined {
  const now = new Date();
  const planStart = new Date(plan.startDate);
  const planEnd = new Date(plan.endDate);

  // Check if we're within the plan dates
  if (now < planStart || now > planEnd) {
    return undefined;
  }

  // Calculate current week in plan (1-indexed)
  const diffTime = now.getTime() - planStart.getTime();
  const weekInPlan = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

  // Find the current phase
  const currentPhase = plan.periodization.find(
    (phase) => weekInPlan >= phase.startWeek && weekInPlan <= phase.endWeek
  );

  if (!currentPhase) {
    return undefined;
  }

  return { phase: currentPhase, weekInPlan };
}

/**
 * Filter to only active constraints
 */
function filterActiveConstraints(constraints: Constraint[]): Constraint[] {
  const now = new Date();

  return constraints.filter((constraint) => {
    // Must be active status
    if (constraint.status !== 'active') {
      return false;
    }

    // Check date range
    const startDate = new Date(constraint.startDate);
    if (now < startDate) {
      return false; // Not started yet
    }

    if (constraint.endDate) {
      const endDate = new Date(constraint.endDate);
      if (now > endDate) {
        return false; // Already ended
      }
    }

    return true;
  });
}

/**
 * Filter to only active goals
 */
function filterActiveGoals(goals: Goal[]): Goal[] {
  return goals.filter((goal) => goal.status === 'active');
}

/**
 * Sort activities by date (most recent first)
 */
function sortActivitiesByDate(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Sort wellness data by date (most recent first)
 */
function sortWellnessDataByDate(wellnessData: WellnessData[]): WellnessData[] {
  return [...wellnessData].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

// =============================================================================
// MAIN CONTEXT BUILDER
// =============================================================================

/**
 * Build a complete coaching context for AI coaching decisions
 *
 * @param params - The input data for building the context
 * @returns A complete CoachingContext object
 *
 * @example
 * ```typescript
 * const context = await buildCoachingContext({
 *   athlete: athleteProfile,
 *   goals: athleteGoals,
 *   constraints: athleteConstraints,
 *   checkIn: todaysCheckIn,
 *   recentActivities: last14DaysActivities,
 *   wellnessData: last7DaysWellness,
 *   fitnessMetrics: currentFitnessMetrics,
 *   trainingPlan: activePlan,
 * });
 * ```
 */
export function buildCoachingContext(params: BuildCoachingContextParams): CoachingContext {
  const {
    athlete,
    goals = [],
    constraints = [],
    checkIn,
    recentActivities = [],
    wellnessData = [],
    fitnessMetrics,
    trainingPlan,
  } = params;

  // Filter and process data
  const activeGoals = filterActiveGoals(goals);
  const activeConstraints = filterActiveConstraints(constraints);
  const sortedActivities = sortActivitiesByDate(recentActivities);
  const sortedWellness = sortWellnessDataByDate(wellnessData);

  // Find next race and calculate days
  const nextRaceGoal = findNextRaceGoal(activeGoals);
  const daysToNextRace = nextRaceGoal ? calculateDaysToRace(nextRaceGoal) : undefined;

  // Get current plan phase
  let currentPhase: TrainingPhase | undefined;
  let weekInPlan: number | undefined;

  if (trainingPlan?.status === 'active') {
    const phaseInfo = getCurrentPhase(trainingPlan);
    if (phaseInfo) {
      currentPhase = phaseInfo.phase;
      weekInPlan = phaseInfo.weekInPlan;
    }
  }

  return {
    athlete,
    goals: activeGoals,
    constraints: activeConstraints,
    checkIn,
    recentActivities: sortedActivities,
    wellnessHistory: sortedWellness,
    fitnessMetrics,
    trainingPlan,
    currentPhase,
    weekInPlan,
    daysToNextRace,
    nextRaceGoal,
  };
}

// =============================================================================
// CONTEXT SERIALIZATION
// =============================================================================

/**
 * Format the coaching context as a structured string for the AI prompt
 *
 * @param context - The coaching context to serialize
 * @returns A formatted string representation of the context
 */
export function serializeContextForPrompt(context: CoachingContext): string {
  const sections: string[] = [];

  // Athlete Profile Section
  sections.push(formatAthleteSection(context.athlete));

  // Goals Section
  if (context.goals.length > 0) {
    sections.push(formatGoalsSection(context.goals, context.nextRaceGoal));
  }

  // Constraints Section
  if (context.constraints.length > 0) {
    sections.push(formatConstraintsSection(context.constraints));
  }

  // Training Plan Section
  if (context.trainingPlan) {
    sections.push(
      formatTrainingPlanSection(context.trainingPlan, context.currentPhase, context.weekInPlan)
    );
  }

  // Fitness Metrics Section
  if (context.fitnessMetrics) {
    sections.push(formatFitnessMetricsSection(context.fitnessMetrics));
  }

  // Recent Activities Section
  if (context.recentActivities.length > 0) {
    sections.push(formatActivitiesSection(context.recentActivities));
  }

  // Wellness Section
  if (context.wellnessHistory.length > 0) {
    sections.push(formatWellnessSection(context.wellnessHistory));
  }

  // Today's Check-in Section
  if (context.checkIn) {
    sections.push(formatCheckInSection(context.checkIn));
  }

  return sections.join('\n\n');
}

// =============================================================================
// SECTION FORMATTERS
// =============================================================================

function formatAthleteSection(athlete: AthleteProfile): string {
  const lines: string[] = ['## Athlete Profile'];

  if (athlete.displayName) {
    lines.push(`- Name: ${athlete.displayName}`);
  }

  if (athlete.weightKg) {
    lines.push(`- Weight: ${athlete.weightKg} kg`);
  }

  if (athlete.ftpWatts) {
    lines.push(`- FTP: ${athlete.ftpWatts} watts`);
  }

  if (athlete.runningThresholdPaceSecPerKm) {
    const pace = formatPace(athlete.runningThresholdPaceSecPerKm);
    lines.push(`- Running Threshold Pace: ${pace}/km`);
  }

  if (athlete.cssSecPer100m) {
    const css = formatSwimPace(athlete.cssSecPer100m);
    lines.push(`- CSS (swim): ${css}/100m`);
  }

  if (athlete.maxHeartRate) {
    lines.push(`- Max HR: ${athlete.maxHeartRate} bpm`);
  }

  if (athlete.lthr) {
    lines.push(`- LTHR: ${athlete.lthr} bpm`);
  }

  return lines.join('\n');
}

function formatGoalsSection(goals: Goal[], nextRace?: RaceGoal): string {
  const lines: string[] = ['## Goals'];

  // Priority A goals first
  const priorityA = goals.filter((g) => g.priority === 'A');
  const priorityB = goals.filter((g) => g.priority === 'B');
  const priorityC = goals.filter((g) => g.priority === 'C');

  for (const goal of [...priorityA, ...priorityB, ...priorityC]) {
    let goalLine = `- [${goal.priority}] ${goal.title}`;

    if (goal.targetDate) {
      goalLine += ` (Target: ${goal.targetDate})`;
    }

    if (goal.goalType === 'race' && goal === nextRace) {
      const raceGoal = goal;
      if (raceGoal.raceDistance) {
        goalLine += ` - ${raceGoal.raceDistance}`;
      }
      if (raceGoal.raceTargetTimeSeconds) {
        goalLine += ` - Target: ${formatDuration(raceGoal.raceTargetTimeSeconds)}`;
      }
    }

    lines.push(goalLine);
  }

  return lines.join('\n');
}

function formatConstraintsSection(constraints: Constraint[]): string {
  const lines: string[] = ['## Active Constraints'];

  for (const constraint of constraints) {
    let constraintLine = `- [${constraint.constraintType.toUpperCase()}] ${constraint.title}`;

    if (constraint.constraintType === 'injury') {
      const injury = constraint;
      if (injury.injurySeverity) {
        constraintLine += ` (${injury.injurySeverity})`;
      }
      if (injury.injuryRestrictions?.length) {
        constraintLine += ` - Avoid: ${injury.injuryRestrictions.join(', ')}`;
      }
    }

    if (constraint.constraintType === 'availability') {
      const avail = constraint;
      if (avail.availabilityHoursPerWeek) {
        constraintLine += ` - ${avail.availabilityHoursPerWeek} hrs/week available`;
      }
    }

    lines.push(constraintLine);
  }

  return lines.join('\n');
}

function formatTrainingPlanSection(
  plan: TrainingPlan,
  currentPhase?: TrainingPhase,
  weekInPlan?: number
): string {
  const lines: string[] = ['## Training Plan'];

  lines.push(
    `- Plan: ${plan.name}`,
    `- Duration: ${plan.totalWeeks} weeks`,
    `- Dates: ${plan.startDate} to ${plan.endDate}`
  );

  if (weekInPlan) {
    lines.push(`- Current Week: ${weekInPlan} of ${plan.totalWeeks}`);
  }

  if (currentPhase) {
    lines.push(`- Current Phase: ${currentPhase.name} (${currentPhase.focus})`);
    if (currentPhase.description) {
      lines.push(`  ${currentPhase.description}`);
    }
  }

  return lines.join('\n');
}

function formatFitnessMetricsSection(metrics: FitnessMetrics): string {
  const lines: string[] = [`## Fitness Metrics (as of ${metrics.date})`];

  lines.push(
    `- CTL (Fitness): ${metrics.ctl.toFixed(1)}`,
    `- ATL (Fatigue): ${metrics.atl.toFixed(1)}`,
    `- TSB (Form): ${metrics.tsb.toFixed(1)}`
  );

  if (metrics.rampRate !== undefined) {
    lines.push(`- Ramp Rate: ${metrics.rampRate.toFixed(1)} TSS/week`);
  }

  // Add interpretation
  if (metrics.tsb < -20) {
    lines.push('- Status: HIGH FATIGUE - recovery recommended');
  } else if (metrics.tsb < -10) {
    lines.push('- Status: Moderately fatigued - building fitness');
  } else if (metrics.tsb >= -10 && metrics.tsb <= 10) {
    lines.push('- Status: Fresh - good form for quality work');
  } else {
    lines.push('- Status: Very fresh - may be losing fitness');
  }

  return lines.join('\n');
}

function formatActivitiesSection(activities: Activity[]): string {
  const lines: string[] = ['## Recent Activities (last 14 days)'];

  // Show last 10 activities max
  const recentActivities = activities.slice(0, 10);

  for (const activity of recentActivities) {
    let actLine = `- ${activity.startDate.split('T')[0]}: ${activity.type} - ${activity.name}`;

    if (activity.movingTime) {
      actLine += ` (${formatDuration(activity.movingTime)})`;
    }

    if (activity.trainingLoad || activity.icu_training_load) {
      const load = activity.trainingLoad ?? activity.icu_training_load;
      actLine += ` TSS: ${load?.toFixed(0)}`;
    }

    lines.push(actLine);
  }

  // Summary statistics
  const totalDuration = activities.reduce((sum, a) => sum + a.movingTime, 0);
  const totalLoad = activities.reduce(
    (sum, a) => sum + (a.trainingLoad ?? a.icu_training_load ?? 0),
    0
  );

  lines.push(
    `\nPeriod Summary: ${formatDuration(totalDuration)} total, ${totalLoad.toFixed(0)} TSS`
  );

  return lines.join('\n');
}

function formatWellnessSection(wellnessData: WellnessData[]): string {
  const lines: string[] = ['## Wellness Trends (last 7 days)'];

  // Show last 7 days max
  const recentWellness = wellnessData.slice(0, 7);

  for (const day of recentWellness) {
    const parts: string[] = [day.date];

    if (day.sleepHours !== undefined) {
      parts.push(`Sleep: ${day.sleepHours}h`);
    }
    if (day.hrv !== undefined) {
      parts.push(`HRV: ${day.hrv}`);
    }
    if (day.fatigue !== undefined) {
      parts.push(`Fatigue: ${day.fatigue}/10`);
    }
    if (day.soreness !== undefined) {
      parts.push(`Soreness: ${day.soreness}/10`);
    }

    lines.push(`- ${parts.join(' | ')}`);
  }

  return lines.join('\n');
}

function formatCheckInSection(checkIn: DailyCheckIn): string {
  const lines: string[] = ["## Today's Check-in"];

  if (checkIn.sleepQuality !== undefined) {
    lines.push(`- Sleep Quality: ${checkIn.sleepQuality}/10`);
  }
  if (checkIn.sleepHours !== undefined) {
    lines.push(`- Sleep Duration: ${checkIn.sleepHours} hours`);
  }
  if (checkIn.energyLevel !== undefined) {
    lines.push(`- Energy Level: ${checkIn.energyLevel}/10`);
  }
  if (checkIn.stressLevel !== undefined) {
    lines.push(`- Stress Level: ${checkIn.stressLevel}/10`);
  }
  if (checkIn.overallSoreness !== undefined) {
    lines.push(`- Overall Soreness: ${checkIn.overallSoreness}/10`);
  }
  if (checkIn.restingHr !== undefined) {
    lines.push(`- Resting HR: ${checkIn.restingHr} bpm`);
  }
  if (checkIn.hrvMs !== undefined) {
    lines.push(`- HRV: ${checkIn.hrvMs} ms`);
  }
  if (checkIn.availableTimeMinutes !== undefined) {
    lines.push(`- Available Time: ${checkIn.availableTimeMinutes} minutes`);
  }
  if (checkIn.equipmentAccess?.length) {
    lines.push(`- Equipment Access: ${checkIn.equipmentAccess.join(', ')}`);
  }
  if (checkIn.travelStatus) {
    lines.push(`- Travel Status: ${checkIn.travelStatus}`);
  }
  if (checkIn.notes) {
    lines.push(`- Notes: ${checkIn.notes}`);
  }

  return lines.join('\n');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format seconds to MM:SS pace
 */
function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to MM:SS swim pace
 */
function formatSwimPace(secondsPer100m: number): string {
  const minutes = Math.floor(secondsPer100m / 60);
  const seconds = Math.round(secondsPer100m % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to HH:MM:SS duration
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
