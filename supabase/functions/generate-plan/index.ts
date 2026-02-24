// generate-plan Edge Function
// Generates structured training plans with periodization and persists to database.
//
// Environment variables (auto-provided by Supabase):
// - SUPABASE_URL: Supabase project URL
// - SUPABASE_ANON_KEY: Supabase publishable key for JWT verification (auto-provided as SUPABASE_ANON_KEY)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { buildTrainingPlan, calculatePeriodization, resolveTotalWeeks } from './plan-builder.ts';
import type { AthleteData, GeneratePlanRequest, GeneratePlanResponse, GoalData } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

/**
 * Validate that a string is a valid calendar date in YYYY-MM-DD format.
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
 * Runtime validation of the request body.
 * Returns an error message, or null if valid.
 */
function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (obj.goal_id != null && typeof obj.goal_id !== 'string') {
    return 'goal_id must be a string';
  }
  if (obj.start_date != null) {
    if (typeof obj.start_date !== 'string' || !isValidDate(obj.start_date)) {
      return 'start_date must be a valid date in YYYY-MM-DD format';
    }
  }
  if (obj.total_weeks != null) {
    if (typeof obj.total_weeks !== 'number' || !Number.isInteger(obj.total_weeks)) {
      return 'total_weeks must be an integer';
    }
    if (obj.total_weeks < MIN_WEEKS || obj.total_weeks > MAX_WEEKS) {
      return `total_weeks must be between ${MIN_WEEKS} and ${MAX_WEEKS}`;
    }
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // 1. Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // 2. Parse and validate request
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const validationError = validateRequest(requestBody);
    if (validationError != null) {
      return errorResponse(validationError, 400);
    }

    const request = requestBody as GeneratePlanRequest;

    // 3. Fetch athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return errorResponse('Athlete profile not found', 404);
    }

    // 4. Fetch goal (if requested)
    let goal: GoalData | null = null;
    if (request.goal_id != null) {
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('id, title, goal_type, target_date, race_event_name, race_distance, priority')
        .eq('id', request.goal_id)
        .eq('athlete_id', athlete.id) // Ensure goal belongs to this athlete
        .single();

      if (goalError || !goalData) {
        return errorResponse('Goal not found or does not belong to this athlete', 404);
      }
      goal = goalData as GoalData;
    }

    // 5. Resolve plan parameters
    const [today] = new Date().toISOString().split('T');
    const startDate = request.start_date ?? today;
    const totalWeeks = resolveTotalWeeks(request.total_weeks, startDate, goal);

    // 6. Calculate periodization
    const periodization = calculatePeriodization(totalWeeks);

    // 7. Build plan payload
    const plan = buildTrainingPlan(
      athlete as AthleteData,
      goal,
      startDate,
      totalWeeks,
      periodization
    );

    // 8. Insert into database
    const { data: createdPlan, error: insertError } = await supabase
      .from('training_plans')
      .insert(plan)
      .select()
      .single();

    if (insertError) {
      return errorResponse(`Failed to save plan: ${insertError.message}`, 500);
    }

    return jsonResponse({ success: true, plan: createdPlan } satisfies GeneratePlanResponse);
  } catch (error) {
    console.error('Generate Plan Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
