// generate-season-skeleton Edge Function
// Uses Claude API to generate a season training skeleton based on races, goals, and preferences.
//
// Environment variables:
// - ANTHROPIC_API_KEY: Claude API key for AI generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// =============================================================================
// TYPES
// =============================================================================

interface SeasonRaceInput {
  name: string;
  date: string;
  distance: string;
  priority: 'A' | 'B' | 'C';
  location?: string;
  targetTimeSeconds?: number;
}

interface SeasonGoalInput {
  goalType: 'performance' | 'fitness' | 'health';
  title: string;
  targetDate?: string;
}

interface PreferencesInput {
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  trainingDays: number[];
  sportPriority: string[];
}

interface GenerateRequest {
  races: SeasonRaceInput[];
  goals: SeasonGoalInput[];
  preferences: PreferencesInput;
  currentDate: string;
}

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

function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.races)) return 'races must be an array';
  if (!Array.isArray(obj.goals)) return 'goals must be an array';
  if (typeof obj.preferences !== 'object' || obj.preferences === null) {
    return 'preferences must be an object';
  }
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

function buildSystemPrompt(): string {
  return `You are an expert endurance sports coach specializing in triathlon, running, and cycling periodization.

Generate a season training skeleton based on the athlete's races, goals, and preferences.

Periodization principles:
- Base phases build aerobic capacity with lower intensity
- Build phases add sport-specific intensity progressively
- Peak phases reach maximum race-specific fitness
- Taper phases reduce volume 1-3 weeks before A-races (minimum 1 week)
- Recovery phases follow every race (minimum 1 week)
- Volume should progress gradually (no more than 10% weekly increase)

Phase duration guidelines:
- Base: 4-8 weeks
- Build: 3-6 weeks
- Peak: 1-3 weeks
- Taper: 1-3 weeks (longer for longer races)
- Recovery: 1-2 weeks
- Race week: 1 week

Constraints:
- All weeks must be covered (no gaps between phases)
- Weekly hours must respect the athlete's min/max budget
- A-races get full taper + recovery; B-races get shorter taper; C-races may not need taper
- If multiple races are close together, combine preparation phases

Return a valid JSON object with this exact structure:
{
  "totalWeeks": number,
  "phases": [
    {
      "name": "descriptive phase name",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "weeks": number,
      "type": "base|build|peak|taper|recovery|race_week|off_season",
      "targetHoursPerWeek": number,
      "focus": "brief description of training focus"
    }
  ],
  "feasibilityNotes": ["any warnings or suggestions for the athlete"]
}`;
}

function buildUserPrompt(req: GenerateRequest): string {
  const raceList =
    req.races.length > 0
      ? req.races
          .map(
            (r) =>
              `- ${r.name} (${r.distance}, priority ${r.priority}) on ${r.date}${r.location ? ` at ${r.location}` : ''}`
          )
          .join('\n')
      : 'No races scheduled — build a general fitness season.';

  const goalList =
    req.goals.length > 0
      ? req.goals.map((g) => `- [${g.goalType}] ${g.title}`).join('\n')
      : 'No specific goals set.';

  return `Current date: ${req.currentDate}
Season end: ${req.currentDate.slice(0, 4)}-12-31

Races:
${raceList}

Goals:
${goalList}

Preferences:
- Weekly hours: ${req.preferences.weeklyHoursMin}-${req.preferences.weeklyHoursMax}h
- Training days per week: ${req.preferences.trainingDays.length}
- Sport priority: ${req.preferences.sportPriority.join(' > ')}

Generate the season skeleton as JSON.`;
}

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
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          name: 'generate_skeleton',
          description: 'Generate the season training skeleton',
          input_schema: {
            type: 'object',
            properties: {
              totalWeeks: { type: 'number', description: 'Total weeks in the season' },
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    startDate: { type: 'string', description: 'YYYY-MM-DD' },
                    endDate: { type: 'string', description: 'YYYY-MM-DD' },
                    weeks: { type: 'number' },
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
                    targetHoursPerWeek: { type: 'number' },
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
                items: { type: 'string' },
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
    const errorBody = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errorBody}`);
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

  try {
    const body = await req.json();

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

    return jsonResponse(rawSkeleton);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
});
