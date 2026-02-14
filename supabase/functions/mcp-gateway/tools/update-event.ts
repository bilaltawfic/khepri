import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, updateEvent } from '../utils/intervals-api.ts';
import {
  buildEventPayload,
  formatEventResponse,
  validateDateField,
  validateEventType,
  validateNonNegativeNumber,
  validatePriority,
} from './event-validation.ts';

/** Empty set — update has no required payload keys (event_id is separate). */
const NO_REQUIRED_KEYS: ReadonlySet<string> = new Set();

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
 * Validate the update-event input fields.
 * Returns an error result if invalid, null when validation passes.
 */
function validateInput(input: Record<string, unknown>): MCPToolResult | null {
  if (typeof input.event_id !== 'string' || input.event_id.trim().length === 0) {
    return {
      success: false,
      error: 'event_id is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    };
  }

  // Type is optional for updates
  if (input.type != null) {
    const typeError = validateEventType(input.type);
    if (typeError != null) return typeError;
  }

  if (input.name != null && (typeof input.name !== 'string' || input.name.trim().length === 0)) {
    return { success: false, error: 'name must be a non-empty string', code: 'INVALID_INPUT' };
  }

  return (
    validateDateField(input.start_date_local, 'start_date_local', false) ??
    validateDateField(input.end_date_local, 'end_date_local', false) ??
    validatePriority(input.event_priority) ??
    validateNonNegativeNumber(input.moving_time, 'moving_time', 'seconds') ??
    validateNonNegativeNumber(input.icu_training_load, 'icu_training_load') ??
    validateNonNegativeNumber(input.distance, 'distance', 'meters')
  );
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

  const updates = buildEventPayload(input, NO_REQUIRED_KEYS);
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
    return formatEventResponse(event, 'updated');
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
