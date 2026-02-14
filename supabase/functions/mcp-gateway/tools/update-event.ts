import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, updateEvent } from '../utils/intervals-api.ts';

/** Allowed event type values for runtime validation. */
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'WORKOUT',
  'RACE',
  'NOTE',
  'REST_DAY',
  'TRAVEL',
]);

/** Allowed race priority values. */
const VALID_PRIORITIES: ReadonlySet<string> = new Set(['A', 'B', 'C']);

/** ISO 8601 date or datetime pattern. */
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/**
 * Tool definition for update_event.
 */
const definition = {
  name: 'update_event',
  description:
    "Update an existing event on the athlete's Intervals.icu calendar. Use this to modify scheduled workouts, change dates, or update descriptions.",
  input_schema: {
    type: 'object' as const,
    properties: {
      event_id: {
        type: 'string',
        description: 'The ID of the event to update',
      },
      name: {
        type: 'string',
        description: 'Updated event name',
      },
      type: {
        type: 'string',
        enum: ['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'],
        description: 'Updated event type',
      },
      start_date_local: {
        type: 'string',
        description: 'Updated start date/time in ISO 8601 format',
      },
      end_date_local: {
        type: 'string',
        description: 'Updated end date/time (ISO 8601)',
      },
      description: {
        type: 'string',
        description: 'Updated workout description or notes',
      },
      category: {
        type: 'string',
        description: 'Updated activity category (Ride, Run, Swim, etc.)',
      },
      moving_time: {
        type: 'number',
        description: 'Updated planned duration in seconds',
      },
      icu_training_load: {
        type: 'number',
        description: 'Updated planned TSS',
      },
      distance: {
        type: 'number',
        description: 'Updated planned distance in meters',
      },
      indoor: {
        type: 'boolean',
        description: 'Whether this is an indoor workout',
      },
      event_priority: {
        type: 'string',
        enum: ['A', 'B', 'C'],
        description: 'Updated race priority',
      },
    },
    required: ['event_id'] as const,
  },
} as const;

/**
 * Validate the input fields and return an error result if invalid.
 * Returns null when validation passes.
 */
function validateInput(input: Record<string, unknown>): MCPToolResult | null {
  if (typeof input.event_id !== 'string' || input.event_id.trim().length === 0) {
    return {
      success: false,
      error: 'event_id is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    };
  }

  if (input.type != null) {
    if (typeof input.type !== 'string' || !VALID_EVENT_TYPES.has(input.type)) {
      return {
        success: false,
        error: `Invalid event type: ${String(input.type)}. Must be one of: WORKOUT, RACE, NOTE, REST_DAY, TRAVEL`,
        code: 'INVALID_EVENT_TYPE',
      };
    }
  }

  if (input.start_date_local != null) {
    if (
      typeof input.start_date_local !== 'string' ||
      !ISO_DATETIME_PATTERN.test(input.start_date_local)
    ) {
      return {
        success: false,
        error:
          'start_date_local must be in ISO 8601 format (e.g., "2026-02-20" or "2026-02-20T07:00:00")',
        code: 'INVALID_DATE',
      };
    }
    const parsed = new Date(input.start_date_local);
    if (Number.isNaN(parsed.getTime())) {
      return {
        success: false,
        error: `Invalid date: ${input.start_date_local}`,
        code: 'INVALID_DATE',
      };
    }
  }

  if (input.end_date_local != null) {
    if (
      typeof input.end_date_local !== 'string' ||
      !ISO_DATETIME_PATTERN.test(input.end_date_local)
    ) {
      return {
        success: false,
        error: 'end_date_local must be in ISO 8601 format',
        code: 'INVALID_DATE',
      };
    }
  }

  if (input.event_priority != null) {
    if (typeof input.event_priority !== 'string' || !VALID_PRIORITIES.has(input.event_priority)) {
      return {
        success: false,
        error: `Invalid event priority: ${String(input.event_priority)}. Must be A, B, or C`,
        code: 'INVALID_PRIORITY',
      };
    }
  }

  if (input.name != null && (typeof input.name !== 'string' || input.name.trim().length === 0)) {
    return { success: false, error: 'name must be a non-empty string', code: 'INVALID_INPUT' };
  }

  if (
    input.moving_time != null &&
    (typeof input.moving_time !== 'number' || input.moving_time < 0)
  ) {
    return {
      success: false,
      error: 'moving_time must be a non-negative number (seconds)',
      code: 'INVALID_INPUT',
    };
  }

  if (
    input.icu_training_load != null &&
    (typeof input.icu_training_load !== 'number' || input.icu_training_load < 0)
  ) {
    return {
      success: false,
      error: 'icu_training_load must be a non-negative number',
      code: 'INVALID_INPUT',
    };
  }

  if (input.distance != null && (typeof input.distance !== 'number' || input.distance < 0)) {
    return {
      success: false,
      error: 'distance must be a non-negative number (meters)',
      code: 'INVALID_INPUT',
    };
  }

  return null;
}

/**
 * Build a clean update payload from the validated input.
 * Only includes fields that were actually provided.
 */
function buildUpdatePayload(input: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (typeof input.name === 'string') payload.name = input.name;
  if (typeof input.type === 'string') payload.type = input.type;
  if (typeof input.start_date_local === 'string') payload.start_date_local = input.start_date_local;
  if (typeof input.end_date_local === 'string') payload.end_date_local = input.end_date_local;
  if (typeof input.description === 'string') payload.description = input.description;
  if (typeof input.category === 'string') payload.category = input.category;
  if (typeof input.moving_time === 'number') payload.moving_time = input.moving_time;
  if (typeof input.icu_training_load === 'number')
    payload.icu_training_load = input.icu_training_load;
  if (typeof input.distance === 'number') payload.distance = input.distance;
  if (typeof input.indoor === 'boolean') payload.indoor = input.indoor;
  if (typeof input.event_priority === 'string') payload.event_priority = input.event_priority;

  return payload;
}

/**
 * Handler for update_event tool.
 * Requires Intervals.icu credentials — no mock fallback for write operations.
 */
async function handler(
  input: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  const validationError = validateInput(input);
  if (validationError != null) {
    return validationError;
  }

  const updates = buildUpdatePayload(input);
  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      error: 'At least one field must be provided to update',
      code: 'INVALID_INPUT',
    };
  }

  try {
    const credentials = await getIntervalsCredentials(supabase, athleteId);
    if (credentials == null) {
      return {
        success: false,
        error: 'Intervals.icu credentials not configured. Cannot update events without API access.',
        code: 'NO_CREDENTIALS',
      };
    }

    const eventId = input.event_id as string;
    const event = await updateEvent(
      credentials,
      eventId,
      updates as Parameters<typeof updateEvent>[2]
    );

    return {
      success: true,
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
        message: `Event "${event.name}" updated successfully`,
      },
    };
  } catch (error) {
    if (error instanceof IntervalsApiError) {
      return { success: false, error: error.message, code: error.code };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update event',
      code: 'UPDATE_EVENT_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const updateEventTool: MCPToolEntry = {
  definition,
  handler,
};
