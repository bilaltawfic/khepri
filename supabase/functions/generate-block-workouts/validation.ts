// generate-block-workouts request validation.
// Extracted from index.ts so the validators can be unit-tested without
// importing the Deno-only `serve` runtime.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate YYYY-MM-DD with round-trip check to reject invalid calendar dates like 2026-02-30. */
export function isValidCalendarDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Validate optional sport_requirements field. Returns null if valid or absent. */
export function validateSportRequirements(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return 'sport_requirements must be an array';
  for (const entry of value) {
    if (typeof entry !== 'object' || entry == null || Array.isArray(entry)) {
      return 'each sport_requirements entry must be an object';
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.sport !== 'string' || e.sport.length === 0) {
      return 'each sport_requirements entry must have a non-empty sport string';
    }
    if (typeof e.minWeeklySessions !== 'number' || !Number.isFinite(e.minWeeklySessions)) {
      return 'each sport_requirements entry must have a numeric minWeeklySessions';
    }
    if (e.minWeeklySessions < 0) {
      return 'sport_requirements minWeeklySessions must be >= 0';
    }
    if (e.label !== undefined && typeof e.label !== 'string') {
      return 'sport_requirements label must be a string if provided';
    }
  }
  return null;
}

/** Validate optional day_preferences field. Returns null if valid or absent. */
export function validateDayPreferences(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return 'day_preferences must be an array';
  for (const entry of value) {
    if (typeof entry !== 'object' || entry == null || Array.isArray(entry)) {
      return 'each day_preferences entry must be an object';
    }
    const e = entry as Record<string, unknown>;
    if (
      typeof e.dayOfWeek !== 'number' ||
      !Number.isInteger(e.dayOfWeek) ||
      e.dayOfWeek < 0 ||
      e.dayOfWeek > 6
    ) {
      return 'day_preferences dayOfWeek must be an integer 0..6';
    }
    if (typeof e.sport !== 'string' || e.sport.length === 0) {
      return 'each day_preferences entry must have a non-empty sport string';
    }
    if (e.workoutLabel !== undefined && typeof e.workoutLabel !== 'string') {
      return 'day_preferences workoutLabel must be a string if provided';
    }
  }
  return null;
}

function validateUnavailableDates(value: unknown): string | null {
  if (!Array.isArray(value)) return 'unavailable_dates must be an array';
  for (const entry of value as unknown[]) {
    if (typeof entry === 'string') {
      if (!isValidCalendarDate(entry))
        return 'each unavailable_dates string must be a valid YYYY-MM-DD date';
      continue;
    }
    if (typeof entry !== 'object' || entry == null || Array.isArray(entry)) {
      return 'each unavailable_dates entry must be a date string or object with a date string';
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.date !== 'string') return 'each unavailable_dates entry must have a date string';
    if (!isValidCalendarDate(e.date)) {
      return 'each unavailable_dates date must be a valid YYYY-MM-DD date';
    }
    if (e.reason !== undefined && typeof e.reason !== 'string') {
      return 'unavailable_dates reason must be a string if provided';
    }
  }
  return null;
}

function validateCoreFields(obj: Record<string, unknown>): string | null {
  if (typeof obj.block_id !== 'string') return 'block_id must be a string';
  if (typeof obj.season_id !== 'string') return 'season_id must be a string';
  if (typeof obj.athlete_id !== 'string') return 'athlete_id must be a string';
  if (typeof obj.start_date !== 'string') return 'start_date must be a string';
  if (typeof obj.end_date !== 'string') return 'end_date must be a string';
  if (!isValidCalendarDate(obj.start_date)) return 'start_date must be a valid YYYY-MM-DD date';
  if (!isValidCalendarDate(obj.end_date)) return 'end_date must be a valid YYYY-MM-DD date';
  if (!Array.isArray(obj.phases) || obj.phases.length === 0)
    return 'phases must be a non-empty array';
  if (typeof obj.preferences !== 'object' || obj.preferences === null) {
    return 'preferences must be an object';
  }
  const prefs = obj.preferences as Record<string, unknown>;
  if (!Array.isArray(prefs.availableDays)) return 'preferences.availableDays must be an array';
  if (!Array.isArray(prefs.sportPriority)) return 'preferences.sportPriority must be an array';
  return null;
}

export function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  const coreError = validateCoreFields(obj);
  if (coreError != null) return coreError;

  const unavailableError = validateUnavailableDates(obj.unavailable_dates);
  if (unavailableError != null) return unavailableError;

  const sportReqError = validateSportRequirements(obj.sport_requirements);
  if (sportReqError != null) return sportReqError;

  const dayPrefError = validateDayPreferences(obj.day_preferences);
  if (dayPrefError != null) return dayPrefError;

  return null;
}
