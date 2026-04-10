// generate-block-workouts Edge Function
// Generates workouts for an entire training block using Claude Sonnet 4.6.
//
// Environment variables:
// - ANTHROPIC_API_KEY: Claude API key for AI generation
// - SUPABASE_URL, SUPABASE_ANON_KEY: Auto-provided by Supabase for JWT verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { ClaudeBlockResponse } from './claude-client.ts';
import { callClaudeForBlock } from './claude-client.ts';
import { buildSystemPrompt, buildUserPrompt } from './prompts.ts';
import { mapClaudeWorkoutsToInserts, validateClaudeResponse } from './response-mapper.ts';
import { validateRequest } from './validation.ts';

// =============================================================================
// TYPES
// =============================================================================

interface GenerateRequest {
  block_id: string;
  season_id: string;
  athlete_id: string;
  start_date: string;
  end_date: string;
  phases: Array<{ name: string; weeks: number; focus: string; weeklyHours: number }>;
  preferences: {
    weeklyHoursMin: number;
    weeklyHoursMax: number;
    availableDays: number[];
    sportPriority: string[];
  };
  unavailable_dates: Array<string | { date: string; reason?: string }>;
  sport_requirements?: Array<{ sport: string; minWeeklySessions: number; label?: string }> | null;
  day_preferences?: Array<{ dayOfWeek: number; sport: string; workoutLabel?: string }> | null;
}

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
// HANDLER
// =============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

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

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const validationError = validateRequest(body);
    if (validationError != null) {
      return errorResponse(validationError, 400);
    }

    const request = body as GenerateRequest;

    // Verify the athlete matches the authenticated user
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError) {
      return errorResponse('Failed to look up athlete profile', 500);
    }
    if (!athlete || athlete.id !== request.athlete_id) {
      return errorResponse('Unauthorized: athlete mismatch', 403);
    }

    // Generate workouts via Claude
    let claudeResponse: ClaudeBlockResponse;
    try {
      claudeResponse = await callClaudeForBlock(buildSystemPrompt(), buildUserPrompt(request));
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown';
      console.error('Claude API error:', detail);
      return errorResponse('Workout generation is temporarily unavailable. Please try again.', 502);
    }

    // Validate Claude's response at the boundary
    const responseError = validateClaudeResponse(
      claudeResponse,
      request.start_date,
      request.end_date
    );
    if (responseError != null) {
      console.error('Claude response validation failed:', responseError);
      return errorResponse('Workout generation is temporarily unavailable. Please try again.', 502);
    }

    const workouts = mapClaudeWorkoutsToInserts(request, claudeResponse);

    if (workouts.length === 0) {
      return errorResponse('No workouts generated — check block dates and preferences', 400);
    }

    // Upsert workouts — safe to retry: conflicts on external_id replace existing rows
    const { error: insertError } = await supabase
      .from('workouts')
      .upsert(workouts, { onConflict: 'external_id' });

    if (insertError) {
      return errorResponse(`Failed to insert workouts: ${insertError.message}`, 500);
    }

    return jsonResponse({
      success: true,
      workout_count: workouts.length,
      block_id: request.block_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
});
