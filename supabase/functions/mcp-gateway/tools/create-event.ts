import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, createEvent } from '../utils/intervals-api.ts';
import {
  EVENT_SCHEMA_PROPERTIES,
  buildEventPayload,
  formatEventResponse,
  validateDateField,
  validateEventType,
  validateNonNegativeNumber,
  validatePriority,
} from './event-validation.ts';

/** Required field keys for create-event payload. */
const REQUIRED_KEYS: ReadonlySet<string> = new Set(['name', 'type', 'start_date_local']);

/**
 * Tool definition for create_event.
 */
const definition = {
  name: 'create_event',
  description:
    "Create a new event on the athlete's Intervals.icu calendar. Use this to schedule workouts, races, rest days, or notes.",
  input_schema: {
    type: 'object' as const,
    properties: EVENT_SCHEMA_PROPERTIES,
    required: ['name', 'type', 'start_date_local'] as const,
  },
} as const;

/**
 * Validate the create-event input fields.
 * Returns an error result if invalid, null when validation passes.
 */
function validateInput(input: Record<string, unknown>): MCPToolResult | null {
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    return {
      success: false,
      error: 'name is required and must be a non-empty string',
      code: 'INVALID_INPUT',
    };
  }

  return (
    validateEventType(input.type) ??
    validateDateField(input.start_date_local, 'start_date_local', true) ??
    validateDateField(input.end_date_local, 'end_date_local', false) ??
    validatePriority(input.event_priority) ??
    validateNonNegativeNumber(input.moving_time, 'moving_time', 'seconds') ??
    validateNonNegativeNumber(input.icu_training_load, 'icu_training_load') ??
    validateNonNegativeNumber(input.distance, 'distance', 'meters')
  );
}

/**
 * Handler for create_event tool.
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

  try {
    const credentials = await getIntervalsCredentials(supabase, athleteId);
    if (credentials == null) {
      return {
        success: false,
        error: 'Intervals.icu credentials not configured. Cannot create events without API access.',
        code: 'NO_CREDENTIALS',
      };
    }

    const payload = buildEventPayload(input, REQUIRED_KEYS);
    const event = await createEvent(credentials, payload as Parameters<typeof createEvent>[1]);
    return formatEventResponse(event, 'created');
  } catch (error) {
    if (error instanceof IntervalsApiError) {
      return { success: false, error: error.message, code: error.code };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create event',
      code: 'CREATE_EVENT_ERROR',
    };
  }
}

/**
 * Exported tool entry for registration.
 */
export const createEventTool: MCPToolEntry = {
  definition,
  handler,
};
