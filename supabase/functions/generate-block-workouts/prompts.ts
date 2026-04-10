// Prompt builders for Claude-powered block workout generation.
// Mirrors the pattern in generate-season-skeleton/index.ts.

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

interface SportRequirementInput {
  sport: string;
  minWeeklySessions: number;
  label?: string;
}

interface DayPreferenceInput {
  dayOfWeek: number;
  sport: string;
  workoutLabel?: string;
}

interface UnavailableDateEntry {
  date: string;
  reason?: string;
}

export interface PromptRequest {
  block_id: string;
  start_date: string;
  end_date: string;
  phases: BlockPhase[];
  preferences: Preferences;
  unavailable_dates: Array<string | UnavailableDateEntry>;
  sport_requirements?: SportRequirementInput[] | null;
  day_preferences?: DayPreferenceInput[] | null;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function buildSystemPrompt(): string {
  return `You are an elite endurance coach generating a structured training block.

You MUST return your answer by calling the \`generate_block_workouts\` tool exactly once. Do not include any conversational text.

Rules:
- Return one entry per week between start_date and end_date.
- Each week's workouts MUST sum (planned_duration_minutes) to within +/-10% of the week's target hours.
- Apply a 3:1 load/recovery pattern: every 4th week is a recovery week at ~70% of base hours and contains no threshold/vo2 work.
- Honor min_sessions_per_sport from sport_requirements: each sport MUST appear at least that many times in every non-recovery week.
- Honor day_preferences when present: if a day specifies a sport (and optionally a workout label), the workout for that day MUST match.
- Skip or replace with \`rest\` any date listed in unavailable_dates.
- Only train on available_days from preferences. Other days have no workout entry.
- Phase type drives intensity: base = mostly Z2 endurance, build = threshold/tempo, peak = race-pace, taper = short and easy, recovery = Z1/Z2 only.
- Use the sport enum exactly. No free-form sports. No motivational text in \`name\`.`;
}

export function buildUserPrompt(request: PromptRequest): string {
  const totalWeeks = request.phases.reduce((sum, p) => sum + p.weeks, 0);

  const phaseLines = request.phases
    .map((p) => `- ${p.name} (${p.weeks}w, focus=${p.focus}, target=${p.weeklyHours}h/wk)`)
    .join('\n');

  const sportReqLines =
    request.sport_requirements != null && request.sport_requirements.length > 0
      ? request.sport_requirements.map((r) => `- ${r.sport}: ${r.minWeeklySessions}`).join('\n')
      : '- (none)';

  const dayPrefLines =
    request.day_preferences != null && request.day_preferences.length > 0
      ? request.day_preferences
          .map((d) => {
            const dayName = DAY_NAMES[d.dayOfWeek] ?? `Day${d.dayOfWeek}`;
            const label = d.workoutLabel == null ? '' : ` ${d.workoutLabel}`;
            return `- ${dayName}: ${d.sport}${label}`;
          })
          .join('\n')
      : '- (none)';

  const unavailableLines =
    request.unavailable_dates.length > 0
      ? request.unavailable_dates
          .map((entry) => {
            if (typeof entry === 'string') return `- ${entry}`;
            const reason = entry.reason == null ? '' : ` ${entry.reason}`;
            return `- ${entry.date}${reason}`;
          })
          .join('\n')
      : '- (none)';

  return `Block: ${request.block_id}
Dates: ${request.start_date} -> ${request.end_date} (${totalWeeks} weeks)

Phases:
${phaseLines}

Athlete preferences:
- Weekly hours: ${request.preferences.weeklyHoursMin}-${request.preferences.weeklyHoursMax}
- Available days (0=Sun..6=Sat): ${request.preferences.availableDays.join(', ')}
- Sport priority: ${request.preferences.sportPriority.join(', ')}

Sport requirements (min sessions/week):
${sportReqLines}

Day preferences:
${dayPrefLines}

Unavailable dates:
${unavailableLines}

Generate the block as JSON via the tool.`;
}
