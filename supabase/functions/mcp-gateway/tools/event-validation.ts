import type { MCPToolResult } from '../types.ts';
import type { IntervalsEvent } from '../utils/intervals-api.ts';

/** Allowed event type values for runtime validation. */
export const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'WORKOUT',
  'RACE',
  'NOTE',
  'REST_DAY',
  'TRAVEL',
]);

/** Allowed race priority values. */
export const VALID_PRIORITIES: ReadonlySet<string> = new Set(['A', 'B', 'C']);

/** Date-only pattern: YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Core datetime: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS */
const DATETIME_CORE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/;
/** Valid suffix after core datetime: optional fractional seconds + optional timezone */
const DATETIME_SUFFIX = /^(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

/** Check whether a string matches ISO 8601 date or datetime format. */
export function isIso8601(value: string): boolean {
  if (DATE_PATTERN.test(value)) return true;
  const match = DATETIME_CORE.exec(value);
  if (match == null) return false;
  return DATETIME_SUFFIX.test(value.slice(match[0].length));
}

/**
 * Validate an event type string against allowed values.
 * Accepts both uppercase and lowercase (e.g., "workout" or "WORKOUT").
 * Returns an error result if invalid, null if valid.
 */
export function validateEventType(type: unknown): MCPToolResult | null {
  if (typeof type !== 'string' || !VALID_EVENT_TYPES.has(type.toUpperCase())) {
    return {
      success: false,
      error: `Invalid event type: ${String(type)}. Must be one of: WORKOUT, RACE, NOTE, REST_DAY, TRAVEL`,
      code: 'INVALID_EVENT_TYPE',
    };
  }
  return null;
}

/**
 * Normalize an event type to uppercase for the Intervals.icu API.
 */
export function normalizeEventType(type: string): string {
  return type.toUpperCase();
}

/**
 * Validate a date string against ISO 8601 format.
 * Returns an error result if invalid, null if valid.
 */
export function validateDateField(
  value: unknown,
  fieldName: string,
  required: boolean
): MCPToolResult | null {
  if (value == null) {
    if (required) {
      return {
        success: false,
        error: `${fieldName} is required in ISO 8601 format (e.g., "2026-02-20" or "2026-02-20T07:00:00")`,
        code: 'INVALID_DATE',
      };
    }
    return null;
  }

  if (typeof value !== 'string' || !isIso8601(value)) {
    return {
      success: false,
      error: `${fieldName} must be in ISO 8601 format (e.g., "2026-02-20" or "2026-02-20T07:00:00")`,
      code: 'INVALID_DATE',
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { success: false, error: `Invalid date: ${value}`, code: 'INVALID_DATE' };
  }

  return null;
}

/**
 * Validate an event priority string against allowed values.
 * Returns an error result if invalid, null if valid.
 */
export function validatePriority(priority: unknown): MCPToolResult | null {
  if (priority == null) return null;

  if (typeof priority !== 'string') {
    return {
      success: false,
      error: 'Invalid event priority: expected a string. Must be A, B, or C',
      code: 'INVALID_PRIORITY',
    };
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return {
      success: false,
      error: `Invalid event priority: "${priority}". Must be A, B, or C`,
      code: 'INVALID_PRIORITY',
    };
  }
  return null;
}

/**
 * Validate a numeric field is non-negative.
 * Returns an error result if invalid, null if valid.
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string,
  unit?: string
): MCPToolResult | null {
  if (value == null) return null;

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return null;
  }
  const suffix = unit == null ? '' : ` (${unit})`;
  return {
    success: false,
    error: `${fieldName} must be a non-negative number${suffix}`,
    code: 'INVALID_INPUT',
  };
}

/** String fields that can appear in an event payload. */
const STRING_FIELDS = [
  'name',
  'type',
  'start_date_local',
  'end_date_local',
  'description',
  'category',
  'event_priority',
] as const;

/** Numeric fields that can appear in an event payload. */
const NUMBER_FIELDS = ['moving_time', 'icu_training_load', 'distance'] as const;

/**
 * Build a clean event payload from input, including only fields that are present.
 */
export function buildEventPayload(
  input: Record<string, unknown>,
  _requiredKeys: ReadonlySet<string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const key of STRING_FIELDS) {
    if (typeof input[key] !== 'string') continue;
    payload[key] = key === 'type' ? normalizeEventType(input[key]) : input[key];
  }
  for (const key of NUMBER_FIELDS) {
    if (typeof input[key] === 'number') payload[key] = input[key];
  }
  if (typeof input.indoor === 'boolean') payload.indoor = input.indoor;

  return payload;
}

/**
 * Format a successful event response with consistent shape.
 */
export function formatEventResponse(event: IntervalsEvent, action: 'created' | 'updated') {
  return {
    success: true as const,
    data: {
      event: {
        id: String(event.id),
        name: event.name,
        type: event.type,
        start_date_local: event.start_date_local,
        end_date_local: event.end_date_local,
        description: event.description,
        category: event.category,
        moving_time: event.moving_time,
        icu_training_load: event.icu_training_load,
        distance: event.distance,
        indoor: event.indoor,
        event_priority: event.event_priority,
      },
      message: `Event "${event.name}" ${action} successfully`,
    },
  };
}

// ====================================================================
// Shared schema properties for tool definitions
// ====================================================================

/** Schema property definitions shared between create and update event tools. */
export const EVENT_SCHEMA_PROPERTIES = {
  name: { type: 'string' as const, description: 'Event name' },
  type: {
    type: 'string' as const,
    enum: ['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'],
    description: 'Event type (case-insensitive, e.g., "workout" or "WORKOUT")',
  },
  start_date_local: {
    type: 'string' as const,
    description: 'Start date/time in ISO 8601 format (e.g., "2026-02-20" or "2026-02-20T07:00:00")',
  },
  end_date_local: { type: 'string' as const, description: 'End date/time (ISO 8601)' },
  description: { type: 'string' as const, description: 'Workout description or notes' },
  category: { type: 'string' as const, description: 'Activity category (Ride, Run, Swim, etc.)' },
  moving_time: { type: 'number' as const, description: 'Planned duration in seconds' },
  icu_training_load: {
    type: 'number' as const,
    description: 'Planned TSS (Training Stress Score)',
  },
  distance: { type: 'number' as const, description: 'Planned distance in meters' },
  indoor: { type: 'boolean' as const, description: 'Whether this is an indoor workout' },
  event_priority: {
    type: 'string' as const,
    enum: ['A', 'B', 'C'],
    description: 'Race priority (A = goal race, B = important, C = training race)',
  },
} as const;
