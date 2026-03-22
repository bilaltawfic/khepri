/**
 * Utilities for extracting current-week training plan information
 * for the dashboard week overview card.
 */

import { parseDateOnly } from './formatters.js';

/** Day names used in the weekly_template JSON column. */
export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

/** A single day slot from the weekly_template JSON. */
export interface DaySlot {
  readonly type: 'rest' | 'workout';
  readonly category?: string;
  readonly focus?: string;
  readonly target_tss?: number;
}

/** A phase entry from the periodization JSON. */
export interface PeriodizationPhaseEntry {
  readonly phase: string;
  readonly weeks: number;
  readonly focus: string;
  readonly intensity_distribution?: readonly [number, number, number];
}

/** Structured periodization data from the JSONB column. */
export interface PeriodizationJson {
  readonly total_weeks: number;
  readonly phases: readonly PeriodizationPhaseEntry[];
  readonly weekly_volumes?: readonly {
    readonly week: number;
    readonly volume_multiplier: number;
    readonly phase: string;
  }[];
}

/** Weekly template is a record of day name → day slot. */
export type WeeklyTemplateJson = Partial<Record<WeekDay, DaySlot>>;

/** Result of getCurrentWeekInfo. */
export interface WeekOverviewInfo {
  readonly currentWeek: number;
  readonly totalWeeks: number;
  readonly phaseName: string;
  readonly phaseFocus: string;
  readonly dailySlots: readonly (DaySlot & { readonly day: WeekDay })[];
  readonly todayIndex: number; // 0-6 (Mon-Sun), -1 if can't determine
}

/**
 * Calculate the current week number from plan start_date and today's date.
 * Week 1 starts on start_date. Returns 0 if today is before start_date.
 * For dates on or after start_date, returns the week index based on full
 * weeks elapsed since start_date (which may exceed the plan's total weeks).
 */
export function calculateCurrentWeek(startDate: string, today: string): number {
  const start = parseDateOnly(startDate);
  const now = parseDateOnly(today);
  // Compute difference in calendar days using UTC to avoid DST-related off-by-one errors.
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nowUtc - startUtc) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Get the current phase from periodization data given the current week number.
 */
export function getCurrentPhase(
  periodization: PeriodizationJson,
  currentWeek: number
): { name: string; focus: string } | null {
  let weekCounter = 0;
  for (const phase of periodization.phases) {
    weekCounter += phase.weeks;
    if (currentWeek <= weekCounter) {
      return { name: phase.phase, focus: phase.focus };
    }
  }
  return null;
}

/**
 * Get the day-of-week index (0=Monday, 6=Sunday) for a given date string.
 * Returns -1 if the date is invalid.
 */
export function getTodayDayIndex(today: string): number {
  const date = parseDateOnly(today);
  if (Number.isNaN(date.getTime())) return -1;
  // JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  const jsDay = date.getDay();
  // Convert to 0=Monday, 6=Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Format a phase name for display (capitalize first letter).
 */
export function formatPhaseName(phase: string): string {
  if (phase.length === 0) return phase;
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

/**
 * Format a focus string for display (replace underscores with spaces, title case).
 */
export function formatFocusName(focus: string): string {
  return focus
    .split('_')
    .map((word) => (word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Extract current week overview info from a training plan's data.
 *
 * @param startDate - Plan start date in YYYY-MM-DD format
 * @param totalWeeks - Total plan duration
 * @param periodization - Periodization JSON from the training_plans table
 * @param weeklyTemplate - Weekly template JSON (nullable)
 * @param today - Today's date in YYYY-MM-DD format
 * @returns WeekOverviewInfo or null if the plan is not in an active week
 */
export function getCurrentWeekInfo(
  startDate: string,
  totalWeeks: number,
  periodization: unknown,
  weeklyTemplate: unknown,
  today: string
): WeekOverviewInfo | null {
  const currentWeek = calculateCurrentWeek(startDate, today);

  // Plan hasn't started or has ended
  if (currentWeek < 1 || currentWeek > totalWeeks) {
    return null;
  }

  const periodizationData = parsePeriodization(periodization);
  const phase = periodizationData == null ? null : getCurrentPhase(periodizationData, currentWeek);
  const template = parseWeeklyTemplate(weeklyTemplate);

  const dailySlots: (DaySlot & { day: WeekDay })[] = WEEK_DAYS.map((day) => {
    const slot = template?.[day];
    return {
      day,
      type: slot?.type ?? 'rest',
      category: slot?.category,
      focus: slot?.focus,
      target_tss: slot?.target_tss,
    };
  });

  return {
    currentWeek,
    totalWeeks,
    phaseName: phase == null ? 'Training' : formatPhaseName(phase.name),
    phaseFocus: phase == null ? '' : formatFocusName(phase.focus),
    dailySlots,
    todayIndex: getTodayDayIndex(today),
  };
}

/**
 * Validate and parse periodization JSON.
 */
function parsePeriodization(data: unknown): PeriodizationJson | null {
  if (data == null || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.total_weeks !== 'number' || !Array.isArray(obj.phases)) return null;

  const phases: PeriodizationPhaseEntry[] = [];
  for (const p of obj.phases) {
    if (p == null || typeof p !== 'object') continue;
    const entry = p as Record<string, unknown>;
    if (
      typeof entry.phase !== 'string' ||
      typeof entry.weeks !== 'number' ||
      typeof entry.focus !== 'string'
    ) {
      continue;
    }
    phases.push({
      phase: entry.phase,
      weeks: entry.weeks,
      focus: entry.focus,
    });
  }

  return { total_weeks: obj.total_weeks, phases };
}

/**
 * Validate and parse weekly template JSON.
 */
function parseWeeklyTemplate(data: unknown): WeeklyTemplateJson | null {
  if (data == null || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const result: Partial<Record<WeekDay, DaySlot>> = {};

  for (const day of WEEK_DAYS) {
    const slot = obj[day];
    if (slot == null || typeof slot !== 'object') continue;
    const s = slot as Record<string, unknown>;
    const type = s.type === 'workout' ? 'workout' : 'rest';
    result[day] = {
      type,
      category: typeof s.category === 'string' ? s.category : undefined,
      focus: typeof s.focus === 'string' ? s.focus : undefined,
      target_tss: typeof s.target_tss === 'number' ? s.target_tss : undefined,
    };
  }

  return result;
}
