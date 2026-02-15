import type {
  ActivityRecord,
  FitnessDataPoint,
  FormStatus,
  FormTrend,
  RaceReadiness,
  RecoveryAssessment,
  WeeklyLoadSummary,
} from '../types/analysis.js';
import { formatDateLocal, getToday } from './formatters.js';

/** Categorize TSB into a form status */
export function getFormStatus(tsb: number): FormStatus {
  if (tsb > 15) return 'race_ready';
  if (tsb > 5) return 'fresh';
  if (tsb >= -10) return 'optimal';
  if (tsb >= -25) return 'tired';
  return 'overtrained';
}

/** Analyze form direction over a window of fitness data points */
export function calculateFormTrend(data: readonly FitnessDataPoint[]): FormTrend | null {
  if (data.length < 2) return null;

  const first = data.at(0);
  const last = data.at(-1);
  if (first == null || last == null) return null;

  const tsbChange = last.tsb - first.tsb;
  const ctlChange = last.ctl - first.ctl;
  const atlChange = last.atl - first.atl;

  const averageTsb = data.reduce((sum, d) => sum + d.tsb, 0) / data.length;

  let direction: FormTrend['direction'];
  if (tsbChange > 3) direction = 'improving';
  else if (tsbChange < -3) direction = 'declining';
  else direction = 'stable';

  return {
    direction,
    tsbChange,
    ctlChange,
    atlChange,
    currentTsb: last.tsb,
    averageTsb,
  };
}

/** Get the ISO week start (Monday) for a given date string */
function getISOWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  date.setDate(date.getDate() + diff);
  return formatDateLocal(date);
}

/** Calculate days between two YYYY-MM-DD date strings */
function daysBetween(from: string, to: string): number {
  const msPerDay = 86_400_000;
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

/** Group activities by ISO week and calculate weekly aggregates */
export function calculateWeeklyLoads(activities: readonly ActivityRecord[]): WeeklyLoadSummary[] {
  if (activities.length === 0) return [];

  const weekMap = new Map<string, ActivityRecord[]>();

  for (const activity of activities) {
    const weekStart = getISOWeekStart(activity.date);
    const existing = weekMap.get(weekStart) ?? [];
    existing.push(activity);
    weekMap.set(weekStart, existing);
  }

  const summaries: WeeklyLoadSummary[] = [];
  for (const [weekStart, weekActivities] of weekMap) {
    const totalTss = weekActivities.reduce((sum, a) => sum + a.tss, 0);
    const totalDuration = weekActivities.reduce((sum, a) => sum + a.duration, 0);
    const activityCount = weekActivities.length;

    summaries.push({
      weekStart,
      totalTss,
      activityCount,
      averageTssPerActivity: activityCount > 0 ? totalTss / activityCount : 0,
      totalDuration,
    });
  }

  return summaries.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Assess current recovery state and make recommendations */
export function assessRecovery(data: readonly FitnessDataPoint[]): RecoveryAssessment | null {
  if (data.length < 7) return null;

  const latest = data.at(-1);
  const weekAgo = data.at(-7);
  if (latest == null || weekAgo == null) return null;

  const rampRate = latest.ctl - weekAgo.ctl;
  const isOverreaching = rampRate > 7;

  let fatigueLevel: RecoveryAssessment['fatigueLevel'];
  let suggestedRecoveryDays: number;

  if (latest.atl > 90) {
    fatigueLevel = 'very_high';
    suggestedRecoveryDays = 3;
  } else if (latest.atl > 70) {
    fatigueLevel = 'high';
    suggestedRecoveryDays = 2;
  } else if (latest.atl > 40) {
    fatigueLevel = 'moderate';
    suggestedRecoveryDays = 1;
  } else {
    fatigueLevel = 'low';
    suggestedRecoveryDays = 0;
  }

  return { fatigueLevel, suggestedRecoveryDays, rampRate, isOverreaching };
}

/** Project form for race day and assess readiness */
export function calculateRaceReadiness(
  data: readonly FitnessDataPoint[],
  raceDateStr: string,
  today?: string
): RaceReadiness | null {
  if (data.length < 7) return null;

  const currentDate = today ?? getToday();
  const daysUntilRace = daysBetween(currentDate, raceDateStr);

  if (daysUntilRace < 0) return null;

  const latest = data.at(-1);
  if (latest == null) return null;
  const trend = calculateFormTrend(data.slice(-7));
  const dailyTsbChange = trend == null ? 0 : trend.tsbChange / 7;

  const projectedTsb = latest.tsb + dailyTsbChange * daysUntilRace;
  const currentForm = getFormStatus(latest.tsb);

  let recommendation: string;
  if (daysUntilRace <= 2) {
    recommendation = 'Race week - rest and stay fresh.';
  } else if (daysUntilRace <= 14) {
    recommendation = 'Taper phase - reduce volume, maintain intensity.';
  } else if (daysUntilRace <= 28) {
    recommendation = 'Final build - key workouts then begin taper.';
  } else {
    recommendation = 'Continue building fitness with progressive overload.';
  }

  let confidence: RaceReadiness['confidence'];
  if (daysUntilRace <= 7 && data.length >= 14) confidence = 'high';
  else if (daysUntilRace <= 21) confidence = 'medium';
  else confidence = 'low';

  return { daysUntilRace, currentForm, projectedTsb, recommendation, confidence };
}
