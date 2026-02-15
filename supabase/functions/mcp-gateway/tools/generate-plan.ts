import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { MCPToolEntry, MCPToolResult } from '../types.ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;

/**
 * Tool definition for generate_plan.
 */
const definition = {
  name: 'generate_plan',
  description:
    'Generate a personalized training plan based on athlete goals, current fitness, and periodization science. Creates a structured multi-week plan with progressive overload and recovery cycles.',
  input_schema: {
    type: 'object' as const,
    properties: {
      goal_id: {
        type: 'string',
        description:
          'UUID of the goal to build the plan toward. If omitted, generates a general fitness plan.',
      },
      start_date: {
        type: 'string',
        description: 'Plan start date in YYYY-MM-DD format. Defaults to today if omitted.',
      },
      total_weeks: {
        type: 'number',
        description:
          'Plan duration in weeks (4-52). If omitted, derived from goal target date or defaults to 12 weeks.',
      },
    },
    required: [] as const,
  },
} as const;

/**
 * Validate that a string looks like a calendar date in YYYY-MM-DD format.
 * Round-trip check catches invalid dates like "2026-02-30".
 */
function isValidDate(dateStr: string): boolean {
  if (!ISO_DATE_PATTERN.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [roundTrip] = parsed.toISOString().split('T');
  return roundTrip === dateStr;
}

/**
 * Validate input parameters for generate_plan.
 * Returns an error result if invalid, null when validation passes.
 */
function validateInput(input: Record<string, unknown>): MCPToolResult | null {
  if (input.goal_id != null) {
    if (typeof input.goal_id !== 'string' || !UUID_PATTERN.test(input.goal_id)) {
      return {
        success: false,
        error: 'goal_id must be a valid UUID string',
        code: 'INVALID_INPUT',
      };
    }
  }

  if (input.start_date != null) {
    if (typeof input.start_date !== 'string' || !isValidDate(input.start_date)) {
      return {
        success: false,
        error: 'start_date must be a valid date in YYYY-MM-DD format',
        code: 'INVALID_INPUT',
      };
    }
  }

  if (input.total_weeks != null) {
    if (typeof input.total_weeks !== 'number' || !Number.isFinite(input.total_weeks)) {
      return {
        success: false,
        error: `total_weeks must be a number between ${MIN_WEEKS} and ${MAX_WEEKS}`,
        code: 'INVALID_INPUT',
      };
    }
    if (
      !Number.isInteger(input.total_weeks) ||
      input.total_weeks < MIN_WEEKS ||
      input.total_weeks > MAX_WEEKS
    ) {
      return {
        success: false,
        error: `total_weeks must be an integer between ${MIN_WEEKS} and ${MAX_WEEKS}`,
        code: 'INVALID_INPUT',
      };
    }
  }

  return null;
}

/** Fields extracted from the Edge Function response for the AI summary. */
interface PlanSummary {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly total_weeks: number;
  readonly status: string;
  readonly goal_id: string | null;
  readonly phases: ReadonlyArray<{ phase: string; weeks: number; focus: string }>;
}

/** Safely extract a string field, returning fallback for non-string values. */
function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Build a concise plan summary for the AI to describe to the athlete.
 * Only includes the fields the AI needs — not the full plan payload.
 */
function buildPlanSummary(plan: Record<string, unknown>): PlanSummary {
  const periodization = plan.periodization as
    | { phases?: Array<{ phase: string; weeks: number; focus: string }> }
    | undefined;

  return {
    id: asString(plan.id),
    name: asString(plan.name),
    start_date: asString(plan.start_date),
    end_date: asString(plan.end_date),
    total_weeks: typeof plan.total_weeks === 'number' ? plan.total_weeks : 0,
    status: asString(plan.status),
    goal_id: typeof plan.goal_id === 'string' ? plan.goal_id : null,
    phases: Array.isArray(periodization?.phases)
      ? periodization.phases.map((p) => ({
          phase: asString(p.phase),
          weeks: typeof p.weeks === 'number' ? p.weeks : 0,
          focus: asString(p.focus),
        }))
      : [],
  };
}

/**
 * Handler for generate_plan tool.
 * Calls the generate-plan Edge Function via Supabase client.
 */
async function handler(
  input: Record<string, unknown>,
  _athleteId: string,
  supabase: SupabaseClient
): Promise<MCPToolResult> {
  const validationError = validateInput(input);
  if (validationError != null) {
    return validationError;
  }

  const payload: Record<string, unknown> = {};
  if (input.goal_id != null) payload.goal_id = input.goal_id;
  if (input.start_date != null) payload.start_date = input.start_date;
  if (input.total_weeks != null) payload.total_weeks = input.total_weeks;

  const { data, error } = await supabase.functions.invoke('generate-plan', {
    body: payload,
  });

  if (error != null) {
    return {
      success: false,
      error: `Plan generation failed: ${error.message}`,
      code: 'GENERATE_PLAN_ERROR',
    };
  }

  if (data == null || typeof data !== 'object' || data.success !== true || data.plan == null) {
    return {
      success: false,
      error: 'Plan generation returned an unexpected response',
      code: 'GENERATE_PLAN_ERROR',
    };
  }

  const summary = buildPlanSummary(data.plan as Record<string, unknown>);

  return {
    success: true,
    data: {
      message: `Training plan "${summary.name}" created successfully`,
      plan: summary,
    },
  };
}

/**
 * MCP tool entry for generate_plan.
 */
export const generatePlanTool: MCPToolEntry = { definition, handler };
