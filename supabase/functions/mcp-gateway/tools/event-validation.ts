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

/** ISO 8601 date or datetime pattern. */
export const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/**
 * Validate an event type string against allowed values.
 * Returns an error result if invalid, null if valid.
 */
export function validateEventType(type: unknown): MCPToolResult | null {
  if (typeof type !== 'string' || !VALID_EVENT_TYPES.has(type)) {
    return {
      success: false,
      error: `Invalid event type: ${String(type)}. Must be one of: WORKOUT, RACE, NOTE, REST_DAY, TRAVEL`,
      code: 'INVALID_EVENT_TYPE',
    };
  }
  return null;
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

  if (typeof value !== 'string' || !ISO_DATETIME_PATTERN.test(value)) {
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

  if (typeof priority !== 'string' || !VALID_PRIORITIES.has(priority)) {
    return {
      success: false,
      error: `Invalid event priority: ${String(priority)}. Must be A, B, or C`,
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

  if (typeof value !== 'number' || value < 0) {
    const suffix = unit != null ? ` (${unit})` : '';
    return {
      success: false,
      error: `${fieldName} must be a non-negative number${suffix}`,
      code: 'INVALID_INPUT',
    };
  }
  return null;
}

/**
 * Build a clean event payload from input, including only fields that are present.
 * The `requiredFields` set determines which fields are always included (from required keys).
 */
export function buildEventPayload(
  input: Record<string, unknown>,
  requiredKeys: ReadonlySet<string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const stringFields = [
    'name',
    'type',
    'start_date_local',
    'end_date_local',
    'description',
    'category',
    'event_priority',
  ];
  const numberFields = ['moving_time', 'icu_training_load', 'distance'];
  const booleanFields = ['indoor'];

  for (const key of stringFields) {
    if (requiredKeys.has(key) || typeof input[key] === 'string') {
      if (typeof input[key] === 'string') payload[key] = input[key];
    }
  }
  for (const key of numberFields) {
    if (typeof input[key] === 'number') payload[key] = input[key];
  }
  for (const key of booleanFields) {
    if (typeof input[key] === 'boolean') payload[key] = input[key];
  }

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
