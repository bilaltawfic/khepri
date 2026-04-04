// suggest-adaptation Edge Function
// Evaluates daily check-in and wellness data to suggest a workout modification.
//
// Environment variables:
// - ANTHROPIC_API_KEY: Claude API key
// - SUPABASE_URL, SUPABASE_ANON_KEY: Auto-provided by Supabase

import Anthropic from 'npm:@anthropic-ai/sdk@0.80';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// =============================================================================
// TYPES (inlined — no npm package imports in edge functions)
// =============================================================================

interface CheckInData {
  sleepQuality: number;
  sleepHours: number;
  energy: number;
  stress: number;
  soreness: number;
  availableTimeMinutes?: number | null;
}

interface WellnessData {
  ctl: number;
  atl: number;
  tsb: number;
  hrv?: number | null;
  restingHr?: number | null;
}

interface WeeklyCompliance {
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
}

interface BlockPhase {
  name: string;
  focus: string;
  weeks: number;
  weeklyHours: number;
}

interface WorkoutRow {
  id: string;
  name: string;
  sport: string;
  workout_type: string | null;
  planned_duration_minutes: number;
  planned_tss: number | null;
  external_id: string;
}

interface SuggestAdaptationRequest {
  athlete_id: string;
  workout_id: string;
  check_in: CheckInData;
  wellness?: WellnessData | null;
  week_workouts?: WorkoutRow[];
  week_compliance?: WeeklyCompliance;
  block_phase: BlockPhase;
}

const ADAPTATION_TYPES = [
  'no_change',
  'reduce_intensity',
  'reduce_duration',
  'increase_intensity',
  'swap_days',
  'add_rest',
  'substitute',
] as const;
type AdaptationType = (typeof ADAPTATION_TYPES)[number];

function isAdaptationType(value: unknown): value is AdaptationType {
  return typeof value === 'string' && (ADAPTATION_TYPES as readonly string[]).includes(value);
}

const CONFIDENCES = ['high', 'medium', 'low'] as const;
type Confidence = (typeof CONFIDENCES)[number];

function isConfidence(value: unknown): value is Confidence {
  return typeof value === 'string' && (CONFIDENCES as readonly string[]).includes(value);
}

interface AdaptationSuggestion {
  type: AdaptationType;
  reason: string;
  workoutId: string;
  originalDurationMinutes: number;
  swapTargetDate: string | null;
  modifiedFields: Record<string, unknown> | null;
  confidence: Confidence;
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
// VALIDATION
// =============================================================================

function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (typeof obj.athlete_id !== 'string' || obj.athlete_id.trim() === '') {
    return 'athlete_id is required';
  }
  if (typeof obj.workout_id !== 'string' || obj.workout_id.trim() === '') {
    return 'workout_id is required';
  }
  if (typeof obj.check_in !== 'object' || obj.check_in === null) {
    return 'check_in data is required';
  }
  if (typeof obj.block_phase !== 'object' || obj.block_phase === null) {
    return 'block_phase is required';
  }

  const ci = obj.check_in as Record<string, unknown>;
  if (
    typeof ci.sleepQuality !== 'number' ||
    typeof ci.sleepHours !== 'number' ||
    typeof ci.energy !== 'number' ||
    typeof ci.stress !== 'number' ||
    typeof ci.soreness !== 'number'
  ) {
    return 'check_in must include sleepQuality, sleepHours, energy, stress, soreness';
  }

  return null;
}

// =============================================================================
// SCREENING LOGIC (mirrored from adaptation-engine.ts)
// =============================================================================

function screenAdaptation(
  checkIn: CheckInData,
  wellness: WellnessData | null | undefined,
  blockPhase: BlockPhase,
  plannedDurationMinutes?: number
): AdaptationType[] {
  const suggestions: AdaptationType[] = [];

  if (checkIn.sleepHours < 6 || checkIn.sleepQuality < 4) {
    suggestions.push('reduce_intensity', 'swap_days');
  }
  if (wellness != null && wellness.tsb < -20) {
    suggestions.push('reduce_intensity');
  }
  if (
    wellness != null &&
    wellness.tsb > 10 &&
    blockPhase.focus !== 'taper' &&
    blockPhase.focus !== 'recovery'
  ) {
    suggestions.push('increase_intensity');
  }
  if (checkIn.energy < 4) {
    suggestions.push('add_rest', 'reduce_intensity');
  }
  if (checkIn.soreness > 7) {
    suggestions.push('substitute', 'add_rest');
  }
  if (checkIn.availableTimeMinutes != null && checkIn.availableTimeMinutes > 0) {
    const isTimeConstrained =
      plannedDurationMinutes == null || checkIn.availableTimeMinutes < plannedDurationMinutes;
    if (isTimeConstrained) {
      suggestions.push('reduce_duration');
    }
  }
  if (suggestions.length === 0) {
    suggestions.push('no_change');
  }
  return [...new Set(suggestions)];
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function buildPrompt(workout: WorkoutRow, req: SuggestAdaptationRequest): string {
  const plannedDuration = workout.planned_duration_minutes;
  const screened = screenAdaptation(req.check_in, req.wellness, req.block_phase, plannedDuration);
  const availTime = req.check_in.availableTimeMinutes ?? null;
  const timeConstraint =
    availTime != null && availTime > 0 && availTime < plannedDuration
      ? `Available time (${availTime} min) is less than planned duration (${plannedDuration} min).`
      : null;

  const wellnessSummary =
    req.wellness != null
      ? `CTL: ${req.wellness.ctl}, ATL: ${req.wellness.atl}, TSB: ${req.wellness.tsb}${req.wellness.hrv != null ? `, HRV: ${req.wellness.hrv}` : ''}`
      : 'No wellness data available.';

  const compliance = req.week_compliance;
  const weekSummary =
    compliance != null
      ? `Week compliance: ${Math.round(compliance.completionRate * 100)}% (${compliance.completedMinutes}/${compliance.plannedMinutes} min completed).`
      : 'No weekly compliance data available.';

  return `You are an AI triathlon coach evaluating whether to modify today's planned workout.

## Today's Planned Workout
Name: ${workout.name}
Sport: ${workout.sport}
Type: ${workout.workout_type ?? 'general'}
Planned Duration: ${plannedDuration} min
${workout.planned_tss != null ? `Planned TSS: ${workout.planned_tss}` : ''}

## Check-in Data
Sleep Quality: ${req.check_in.sleepQuality}/10
Sleep Hours: ${req.check_in.sleepHours}h
Energy: ${req.check_in.energy}/10
Stress: ${req.check_in.stress}/10
Overall Soreness: ${req.check_in.soreness}/10
${timeConstraint != null ? timeConstraint : ''}

## Wellness / Fitness Metrics
${wellnessSummary}

## Week Context
Phase: ${req.block_phase.focus} (${req.block_phase.name})
${weekSummary}

## Decision Guidelines
- Sleep < 6h or quality < 4 → suggest reduce_intensity or swap_days
- TSB < -20 → suggest reduce_intensity
- TSB > 10 (non-taper/recovery phase) → consider increase_intensity
- Energy < 4 → suggest add_rest or reduce_intensity
- Soreness > 7 → suggest substitute or add_rest
- Available time < planned duration → suggest reduce_duration
- Taper/recovery phase → NEVER suggest increase_intensity
- Pre-screened signals: ${screened.join(', ')}

## Response Format
Return ONLY valid JSON (no markdown, no extra text):
{
  "type": "<no_change | reduce_intensity | reduce_duration | increase_intensity | swap_days | add_rest | substitute>",
  "reason": "<1-2 sentence human-readable explanation>",
  "workoutId": "${workout.id}",
  "originalDurationMinutes": ${plannedDuration},
  "swapTargetDate": null,
  "modifiedFields": null,
  "confidence": "<high | medium | low>"
}

If type is NOT "no_change", populate modifiedFields with changed values (e.g. {"plannedDurationMinutes": 30, "workoutType": "recovery"}).
If type is "swap_days", also set swapTargetDate to an ISO date string (e.g. "2025-04-07").`;
}

// =============================================================================
// RESPONSE PARSER
// =============================================================================

function parseResponse(raw: string): AdaptationSuggestion | null {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (!isAdaptationType(obj.type)) return null;
  if (typeof obj.reason !== 'string' || obj.reason.trim() === '') return null;
  if (typeof obj.workoutId !== 'string') return null;
  if (typeof obj.originalDurationMinutes !== 'number') return null;
  if (!isConfidence(obj.confidence)) return null;

  return {
    type: obj.type,
    reason: obj.reason,
    workoutId: obj.workoutId,
    originalDurationMinutes: obj.originalDurationMinutes,
    swapTargetDate: typeof obj.swapTargetDate === 'string' ? obj.swapTargetDate : null,
    modifiedFields:
      typeof obj.modifiedFields === 'object' && obj.modifiedFields !== null
        ? (obj.modifiedFields as Record<string, unknown>)
        : null,
    confidence: obj.confidence,
  };
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
      .select('id, name, sport, workout_type, planned_duration_minutes, planned_tss, external_id')
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

    // Create adaptation record with 'suggested' status
    const { data: adaptation, error: insertError } = await supabase
      .from('plan_adaptations')
      .insert({
        athlete_id: request.athlete_id,
        block_id: (workout as WorkoutRow & { block_id?: string }).block_id ?? '',
        trigger: 'coach_suggestion',
        status: 'suggested',
        reason: suggestion.reason,
        affected_workouts: [
          {
            workoutId: suggestion.workoutId,
            before: {
              name: workout.name,
              sport: workout.sport,
              workoutType: workout.workout_type,
              plannedDurationMinutes: workout.planned_duration_minutes,
              plannedTss: workout.planned_tss,
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
