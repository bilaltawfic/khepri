// generate-season-skeleton Edge Function
// Uses Claude API to generate a season training skeleton based on races, goals, and preferences.
//
// Environment variables:
// - ANTHROPIC_API_KEY: Claude API key for AI generation
// - SUPABASE_URL, SUPABASE_ANON_KEY: Auto-provided by Supabase for JWT verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { type GenerateRequest, buildSystemPrompt, buildUserPrompt } from './prompts.ts';
import { validateSkeletonResponse } from './validation.ts';

interface SeasonPhase {
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
  type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race_week' | 'off_season';
  raceId?: string;
  targetHoursPerWeek: number;
  focus: string;
}

interface SeasonSkeleton {
  totalWeeks: number;
  phases: SeasonPhase[];
  feasibilityNotes: string[];
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

const VALID_PHASE_TYPES = ['base', 'build', 'peak', 'taper', 'recovery', 'race_week', 'off_season'];
const VALID_RACE_PRIORITIES = ['A', 'B', 'C'];

function validateRace(raw: unknown, i: number): string | null {
  if (raw == null || typeof raw !== 'object') return `races[${i}] must be an object`;
  const race = raw as Record<string, unknown>;
  if (typeof race.name !== 'string') return `races[${i}].name must be a string`;
  if (typeof race.date !== 'string') return `races[${i}].date must be a string`;
  if (typeof race.discipline !== 'string') return `races[${i}].discipline must be a string`;
  if (typeof race.distance !== 'string') return `races[${i}].distance must be a string`;
  if (typeof race.priority !== 'string' || !VALID_RACE_PRIORITIES.includes(race.priority)) {
    return `races[${i}].priority must be one of 'A', 'B', 'C'`;
  }
  if (race.location !== undefined && typeof race.location !== 'string') {
    return `races[${i}].location must be a string`;
  }
  if (race.targetTimeSeconds !== undefined && typeof race.targetTimeSeconds !== 'number') {
    return `races[${i}].targetTimeSeconds must be a number`;
  }
  return null;
}

function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.races)) return 'races must be an array';
  for (let i = 0; i < obj.races.length; i++) {
    const raceError = validateRace(obj.races[i], i);
    if (raceError != null) return raceError;
  }
  if (!Array.isArray(obj.goals)) return 'goals must be an array';
  if (typeof obj.preferences !== 'object' || obj.preferences === null) {
    return 'preferences must be an object';
  }
  const prefs = obj.preferences as Record<string, unknown>;
  if (!Array.isArray(prefs.trainingDays)) return 'preferences.trainingDays must be an array';
  if (!Array.isArray(prefs.sportPriority)) return 'preferences.sportPriority must be an array';
  if (typeof prefs.weeklyHoursMin !== 'number')
    return 'preferences.weeklyHoursMin must be a number';
  if (typeof prefs.weeklyHoursMax !== 'number')
    return 'preferences.weeklyHoursMax must be a number';
  if (typeof obj.currentDate !== 'string') return 'currentDate must be a string';

  return null;
}

function validateSkeleton(skeleton: unknown): skeleton is SeasonSkeleton {
  if (typeof skeleton !== 'object' || skeleton === null) return false;
  const s = skeleton as Record<string, unknown>;
  if (typeof s.totalWeeks !== 'number' || s.totalWeeks < 1) return false;
  if (!Array.isArray(s.phases) || s.phases.length === 0) return false;
  if (!Array.isArray(s.feasibilityNotes)) return false;

  for (const phase of s.phases) {
    if (typeof phase !== 'object' || phase === null) return false;
    const p = phase as Record<string, unknown>;
    if (typeof p.name !== 'string') return false;
    if (typeof p.startDate !== 'string') return false;
    if (typeof p.endDate !== 'string') return false;
    if (typeof p.weeks !== 'number' || p.weeks < 1) return false;
    if (typeof p.type !== 'string' || !VALID_PHASE_TYPES.includes(p.type)) return false;
    if (typeof p.targetHoursPerWeek !== 'number' || p.targetHoursPerWeek < 0) return false;
    if (typeof p.focus !== 'string') return false;
  }

  return true;
}

// =============================================================================
// AI GENERATION
// =============================================================================

async function callClaudeAPI(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      // Determinism: same input → same skeleton. Do not change without a paired test update.
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: 'generate_skeleton',
          description: 'Generate the season training skeleton',
          input_schema: {
            type: 'object',
            properties: {
              totalWeeks: {
                type: 'number',
                minimum: 1,
                description: 'Total weeks in the season',
              },
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    startDate: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                      description: 'YYYY-MM-DD',
                    },
                    endDate: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                      description: 'YYYY-MM-DD',
                    },
                    weeks: { type: 'number', minimum: 1 },
                    type: {
                      type: 'string',
                      enum: [
                        'base',
                        'build',
                        'peak',
                        'taper',
                        'recovery',
                        'race_week',
                        'off_season',
                      ],
                    },
                    targetHoursPerWeek: { type: 'number', minimum: 1 },
                    focus: { type: 'string' },
                  },
                  required: [
                    'name',
                    'startDate',
                    'endDate',
                    'weeks',
                    'type',
                    'targetHoursPerWeek',
                    'focus',
                  ],
                },
              },
              feasibilityNotes: {
                type: 'array',
                items: { type: 'string', maxLength: 200 },
              },
            },
            required: ['totalWeeks', 'phases', 'feasibilityNotes'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_skeleton' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Season skeleton generation failed (upstream ${response.status})`);
  }

  const result = await response.json();
  const toolBlock = result.content?.find((c: { type: string }) => c.type === 'tool_use');

  if (!toolBlock?.input) {
    throw new Error('No tool_use response from Claude API');
  }

  return toolBlock.input;
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
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(request);

    const rawSkeleton = await callClaudeAPI(systemPrompt, userPrompt);

    if (!validateSkeleton(rawSkeleton)) {
      return errorResponse('AI generated invalid skeleton structure', 500);
    }

    const skeleton = rawSkeleton as SeasonSkeleton;
    const validationErrors = validateSkeletonResponse(
      { currentDate: request.currentDate, preferences: request.preferences },
      skeleton
    );
    if (validationErrors.length > 0) {
      console.error(
        'Skeleton validation failed:',
        JSON.stringify({ errors: validationErrors, rawSkeleton })
      );
      return errorResponse('Season generation produced an invalid plan. Please try again.', 502);
    }

    return jsonResponse(skeleton);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
});
