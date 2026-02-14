import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';
import { getIntervalsCredentials } from '../utils/credentials.ts';
import { IntervalsApiError, updateEvent } from '../utils/intervals-api.ts';
import {
  EVENT_SCHEMA_PROPERTIES,
  buildEventPayload,
  formatEventResponse,
  normalizeInputFieldNames,
  validateCommonEventFields,
  validateEventType,
} from './event-validation.ts';

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
      event_id: { type: 'string' as const, description: 'The ID of the event to update' },
      ...EVENT_SCHEMA_PROPERTIES,
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

  if (!/^\d+$/.test(input.event_id.trim())) {
    return {
      success: false,
      error: 'event_id must be a numeric value',
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

  return validateCommonEventFields(input);
}

/**
 * Handler for update_event tool.
 * Requires Intervals.icu credentials — no mock fallback for write operations.
 */
async function handler(
  rawInput: Record<string, unknown>,
  athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  const input = normalizeInputFieldNames(rawInput);

  const validationError = validateInput(input);
  if (validationError != null) {
    return validationError;
  }

  const updates = buildEventPayload(input);
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
