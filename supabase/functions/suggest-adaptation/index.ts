// suggest-adaptation Edge Function
// Evaluates daily check-in and wellness data to suggest a workout modification.
//
// Environment variables:
// - ANTHROPIC_API_KEY: Claude API key
// - SUPABASE_URL, SUPABASE_ANON_KEY: Auto-provided by Supabase

import Anthropic from 'npm:@anthropic-ai/sdk@0.80';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { buildPrompt, parseResponse, validateRequest } from './helpers.ts';
import type { SuggestAdaptationRequest, WorkoutRow } from './helpers.ts';

// =============================================================================
// CORS & HELPERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify authorization
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

    // Parse and validate request
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

    const request = requestBody as SuggestAdaptationRequest;

    // Fetch the workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select(
        'id, block_id, name, sport, workout_type, planned_duration_minutes, planned_tss, external_id'
      )
      .eq('id', request.workout_id)
      .eq('athlete_id', request.athlete_id)
      .single();

    if (workoutError || !workout) {
      return errorResponse('Workout not found', 404);
    }

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return errorResponse('AI service not configured', 503);
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const prompt = buildPrompt(workout as WorkoutRow, request);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const suggestion = parseResponse(rawText);
    if (suggestion == null) {
      return errorResponse('Failed to parse AI response', 502);
    }

    // No-change suggestions don't create a persistent record — return immediately.
    if (suggestion.type === 'no_change') {
      return jsonResponse({ adaptation_id: null, suggestion });
    }

    // Create adaptation record with 'suggested' status
    const typedWorkout = workout as WorkoutRow;
    const { data: adaptation, error: insertError } = await supabase
      .from('plan_adaptations')
      .insert({
        athlete_id: request.athlete_id,
        block_id: typedWorkout.block_id,
        trigger: 'coach_suggestion',
        status: 'suggested',
        reason: suggestion.reason,
        affected_workouts: [
          {
            workoutId: suggestion.workoutId,
            before: {
              name: typedWorkout.name,
              sport: typedWorkout.sport,
              workoutType: typedWorkout.workout_type,
              plannedDurationMinutes: typedWorkout.planned_duration_minutes,
              plannedTss: typedWorkout.planned_tss,
            },
            after: suggestion.modifiedFields ?? {},
            changeType: suggestion.type === 'swap_days' ? 'swapped' : 'modified',
          },
        ],
        context: {
          checkIn: request.check_in,
          wellness: request.wellness ?? null,
          adaptationType: suggestion.type,
          confidence: suggestion.confidence,
          swapTargetDate: suggestion.swapTargetDate,
        },
      } as never)
      .select()
      .single();

    if (insertError || !adaptation) {
      console.error('Failed to create adaptation record:', insertError);
      return errorResponse('Failed to save adaptation', 500);
    }

    return jsonResponse({
      adaptation_id: (adaptation as { id: string }).id,
      suggestion,
    });
  } catch (error) {
    console.error('suggest-adaptation error:', error);
    if (error instanceof Anthropic.APIError) {
      return errorResponse('AI service error', error.status ?? 500);
    }
    return errorResponse('Internal server error', 500);
  }
});
