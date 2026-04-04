// generate-block-workouts Edge Function
// Generates workouts for an entire training block using the week assembler and templates.
//
// Environment variables:
// - SUPABASE_URL, SUPABASE_ANON_KEY: Auto-provided by Supabase for JWT verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// =============================================================================
// TYPES
// =============================================================================

interface BlockPhase {
  name: string;
  weeks: number;
  focus: string;
  weeklyHours: number;
}

interface Preferences {
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  availableDays: number[];
  sportPriority: string[];
}

interface GenerateRequest {
  block_id: string;
  season_id: string;
  athlete_id: string;
  start_date: string;
  end_date: string;
  phases: BlockPhase[];
  preferences: Preferences;
  unavailable_dates: string[];
  focus_areas: string[];
  generation_tier: 'template' | 'claude';
}

interface WorkoutInsert {
  block_id: string;
  athlete_id: string;
  date: string;
  week_number: number;
  name: string;
  sport: string;
  workout_type: string | null;
  planned_duration_minutes: number;
  structure: Record<string, unknown>;
  description_dsl: string;
  intervals_target: string;
  sync_status: string;
  external_id: string;
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const obj = body as Record<string, unknown>;

  if (typeof obj.block_id !== 'string') return 'block_id must be a string';
  if (typeof obj.season_id !== 'string') return 'season_id must be a string';
  if (typeof obj.athlete_id !== 'string') return 'athlete_id must be a string';
  if (typeof obj.start_date !== 'string') return 'start_date must be a string';
  if (typeof obj.end_date !== 'string') return 'end_date must be a string';
  if (!ISO_DATE_RE.test(obj.start_date as string)) return 'start_date must be YYYY-MM-DD format';
  if (!ISO_DATE_RE.test(obj.end_date as string)) return 'end_date must be YYYY-MM-DD format';
  if (!Array.isArray(obj.phases) || obj.phases.length === 0)
    return 'phases must be a non-empty array';
  if (typeof obj.preferences !== 'object' || obj.preferences === null) {
    return 'preferences must be an object';
  }
  if (!Array.isArray(obj.unavailable_dates)) return 'unavailable_dates must be an array';
  if (!Array.isArray(obj.focus_areas)) return 'focus_areas must be an array';

  return null;
}

// =============================================================================
// WORKOUT GENERATION
// =============================================================================

const SPORT_CYCLE = ['swim', 'bike', 'run'] as const;

const PHASE_TYPE_MAP: Record<string, string> = {
  base: 'base',
  build: 'build',
  peak: 'peak',
  taper: 'taper',
  recovery: 'recovery',
};

/** Map a phase focus string to a periodization phase type. */
function mapPhaseType(focus: string): string {
  const lower = focus.toLowerCase();
  for (const [keyword, type] of Object.entries(PHASE_TYPE_MAP)) {
    if (lower.includes(keyword)) return type;
  }
  return 'base';
}

/** Calculate target hours for a week applying 3:1 load/recovery pattern. */
function weekTargetHours(baseHours: number, weekInPhase: number): number {
  // 3:1 pattern: 3 hard weeks, 1 recovery
  const isRecoveryWeek = weekInPhase > 0 && weekInPhase % 4 === 3;
  return isRecoveryWeek ? baseHours * 0.7 : baseHours;
}

/** Generate a simple workout name. */
function workoutName(sport: string, phaseType: string, isHard: boolean): string {
  const sportCap = sport.charAt(0).toUpperCase() + sport.slice(1);
  if (sport === 'rest') return 'Rest Day';
  if (sport === 'strength') return 'Strength Maintenance';

  switch (phaseType) {
    case 'base':
      return isHard
        ? `${sportCap} - Aerobic Endurance`
        : `${sportCap} - Easy ${sportCap === 'Swim' ? 'Technique' : 'Spin'}`;
    case 'build':
      return isHard ? `${sportCap} - Threshold Intervals` : `${sportCap} - Endurance`;
    case 'peak':
      return isHard ? `${sportCap} - Race Pace` : `${sportCap} - Tempo`;
    case 'taper':
      return `${sportCap} - Easy Recovery`;
    case 'recovery':
      return `${sportCap} - Recovery ${sportCap === 'Swim' ? 'Drill' : 'Spin'}`;
    default:
      return `${sportCap} - General`;
  }
}

/** Create a basic workout structure for template tier. */
function buildTemplateStructure(
  sport: string,
  durationMinutes: number,
  phaseType: string,
  isHard: boolean
): Record<string, unknown> {
  if (sport === 'rest') {
    return {
      sections: [
        {
          name: 'Rest',
          steps: [{ description: 'Full rest day', durationMinutes }],
          durationMinutes,
        },
      ],
      totalDurationMinutes: durationMinutes,
    };
  }

  const warmupMinutes = Math.min(10, Math.round(durationMinutes * 0.15));
  const cooldownMinutes = Math.min(10, Math.round(durationMinutes * 0.15));
  const mainMinutes = durationMinutes - warmupMinutes - cooldownMinutes;

  const sections = [
    {
      name: 'Warmup',
      steps: [{ description: `Easy ramp ${warmupMinutes}m`, durationMinutes: warmupMinutes }],
      durationMinutes: warmupMinutes,
    },
    {
      name: 'Main Set',
      steps: buildMainSteps(sport, mainMinutes, phaseType, isHard),
      durationMinutes: mainMinutes,
    },
    {
      name: 'Cooldown',
      steps: [
        { description: `Easy cooldown ${cooldownMinutes}m`, durationMinutes: cooldownMinutes },
      ],
      durationMinutes: cooldownMinutes,
    },
  ];

  return { sections, totalDurationMinutes: durationMinutes };
}

function buildMainSteps(
  sport: string,
  minutes: number,
  phaseType: string,
  isHard: boolean
): Array<{ description: string; durationMinutes: number }> {
  if (!isHard || phaseType === 'recovery' || phaseType === 'taper') {
    return [{ description: `Steady ${sport} at easy effort`, durationMinutes: minutes }];
  }

  if (phaseType === 'build' || phaseType === 'peak') {
    const intervalDuration = sport === 'swim' ? 3 : sport === 'run' ? 5 : 8;
    const restDuration = Math.round(intervalDuration * 0.5);
    const repeats = Math.max(2, Math.floor(minutes / (intervalDuration + restDuration)));
    const totalInterval = repeats * (intervalDuration + restDuration);
    const remainingEasy = Math.max(0, minutes - totalInterval);

    const steps = [
      {
        description: `${repeats}x ${intervalDuration}m at ${phaseType === 'peak' ? 'race pace' : 'threshold'}, ${restDuration}m recovery`,
        durationMinutes: totalInterval,
      },
    ];

    if (remainingEasy > 0) {
      steps.push({ description: `Easy ${sport} to fill`, durationMinutes: remainingEasy });
    }

    return steps;
  }

  // Base phase
  return [{ description: `Steady aerobic ${sport}`, durationMinutes: minutes }];
}

/** Generate a simple DSL string for the workout. */
function buildDsl(
  sport: string,
  durationMinutes: number,
  phaseType: string,
  isHard: boolean
): string {
  if (sport === 'rest') return `- ${durationMinutes}m rest`;
  if (!isHard || phaseType === 'taper' || phaseType === 'recovery') {
    return `- ${durationMinutes}m Z2`;
  }
  const warmup = Math.min(10, Math.round(durationMinutes * 0.15));
  const cooldown = Math.min(10, Math.round(durationMinutes * 0.15));
  const main = durationMinutes - warmup - cooldown;
  return `- ${warmup}m ramp 50-75%\n- ${main}m Z3-Z4\n- ${cooldown}m Z1`;
}

function generateBlockWorkouts(request: GenerateRequest): WorkoutInsert[] {
  const workouts: WorkoutInsert[] = [];
  const unavailableSet = new Set(request.unavailable_dates);
  const availableDays = new Set(request.preferences.availableDays);
  const sportPriority =
    request.preferences.sportPriority.length > 0
      ? request.preferences.sportPriority
      : [...SPORT_CYCLE];

  let globalWeekNumber = 0;
  let sportIndex = 0;

  // Scale phase.weeklyHours to fit within the athlete's preferred min/max range
  const { weeklyHoursMin, weeklyHoursMax } = request.preferences;

  for (const phase of request.phases) {
    const phaseType = mapPhaseType(phase.focus);
    // Clamp the skeleton's weeklyHours into the athlete's preferred range
    const baseHours = Math.max(weeklyHoursMin, Math.min(weeklyHoursMax, phase.weeklyHours));

    for (let weekInPhase = 0; weekInPhase < phase.weeks; weekInPhase++) {
      globalWeekNumber++;
      const targetHours = weekTargetHours(baseHours, weekInPhase);
      const targetMinutes = targetHours * 60;

      // Calculate week start date
      const weekStart = new Date(`${request.start_date}T00:00:00`);
      weekStart.setDate(weekStart.getDate() + (globalWeekNumber - 1) * 7);

      let allocatedMinutes = 0;
      let hardDayUsed = false;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayOffset);
        const dateStr = dayDate.toISOString().slice(0, 10);

        // Guard: don't generate workouts past the block end date
        if (dateStr > request.end_date) break;

        // dayOfWeek aligns with availableDays from preferences.
        // Assumption: availableDays uses 0=Monday offset (matching week start on Monday).
        const dayOfWeek = dayOffset;

        // Check unavailable
        if (unavailableSet.has(dateStr)) {
          workouts.push({
            block_id: request.block_id,
            athlete_id: request.athlete_id,
            date: dateStr,
            week_number: globalWeekNumber,
            name: 'Rest Day (unavailable)',
            sport: 'rest',
            workout_type: null,
            planned_duration_minutes: 0,
            structure: { sections: [], totalDurationMinutes: 0 },
            description_dsl: '',
            intervals_target: 'AUTO',
            sync_status: 'pending',
            external_id: `khepri-${request.block_id}-w${globalWeekNumber}-d${dayOffset}`,
          });
          continue;
        }

        // Rest day if not available or budget met
        if (!availableDays.has(dayOfWeek) || allocatedMinutes >= targetMinutes) {
          continue; // Skip non-training days (don't create rest day workouts for them)
        }

        // Determine sport for this session
        const sport = sportPriority[sportIndex % sportPriority.length] as string;
        sportIndex++;

        // Determine if hard day (alternate hard/easy)
        const isHard = !hardDayUsed && phaseType !== 'recovery' && phaseType !== 'taper';
        if (isHard) hardDayUsed = true;
        else hardDayUsed = false;

        // Calculate duration (remaining budget, capped per session)
        const remainingMinutes = targetMinutes - allocatedMinutes;
        const avgDuration =
          sport === 'bike' ? 75 : sport === 'swim' ? 45 : sport === 'run' ? 50 : 40;
        const duration = Math.min(remainingMinutes, Math.round(avgDuration * (isHard ? 1.2 : 0.9)));

        if (duration < 15) continue; // Too short to be useful

        const name = workoutName(sport, phaseType, isHard);
        const structure = buildTemplateStructure(sport, duration, phaseType, isHard);
        const dsl = buildDsl(sport, duration, phaseType, isHard);

        workouts.push({
          block_id: request.block_id,
          athlete_id: request.athlete_id,
          date: dateStr,
          week_number: globalWeekNumber,
          name,
          sport,
          workout_type: isHard ? 'threshold' : 'endurance',
          planned_duration_minutes: duration,
          structure,
          description_dsl: dsl,
          intervals_target: sport === 'bike' ? 'POWER' : sport === 'run' ? 'PACE' : 'AUTO',
          sync_status: 'pending',
          external_id: `khepri-${request.block_id}-w${globalWeekNumber}-d${dayOffset}`,
        });

        allocatedMinutes += duration;
      }
    }
  }

  return workouts;
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

    if (athleteError || !athlete || athlete.id !== request.athlete_id) {
      return errorResponse('Unauthorized: athlete mismatch', 403);
    }

    // TODO: use request.focus_areas to bias sport/workout selection toward athlete preferences
    // TODO: use request.generation_tier to switch between template and Claude-powered generation
    const workouts = generateBlockWorkouts(request);

    if (workouts.length === 0) {
      return errorResponse('No workouts generated — check block dates and preferences', 400);
    }

    // Bulk insert workouts
    const { error: insertError } = await supabase.from('workouts').insert(workouts);

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
