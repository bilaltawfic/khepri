// Prompt builders for generate-season-skeleton.
// Extracted so they can be unit-tested and snapshotted without importing
// the Deno-only `serve` runtime from index.ts.

interface SeasonRaceInput {
  name: string;
  date: string;
  discipline: string;
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

/** Locale-independent string comparison using lexicographic UTF-16 code unit order. */
function codePointCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export interface GenerateRequest {
  races: SeasonRaceInput[];
  goals: SeasonGoalInput[];
  preferences: PreferencesInput;
  currentDate: string;
}

export function buildSystemPrompt(): string {
  return `You MUST return your answer by calling the generate_skeleton tool exactly once. Do not include any conversational text.

You are an expert endurance sports coach specializing in triathlon, running, and cycling periodization.

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
- Phases must be date-contiguous: each phase starts the day after the previous phase ends
- The sum of all phase weeks must equal totalWeeks`;
}

export function buildUserPrompt(req: GenerateRequest): string {
  // Sort races by (date ASC, name ASC) for deterministic prompt ordering.
  // Use lexicographic UTF-16 comparison instead of localeCompare to avoid locale-dependent collation.
  const sortedRaces = [...req.races].sort(
    (a, b) => codePointCompare(a.date, b.date) || codePointCompare(a.name, b.name)
  );
  const raceList =
    sortedRaces.length > 0
      ? sortedRaces
          .map((r) => {
            const locationSuffix = r.location ? ` at ${r.location}` : '';
            return `- ${r.name} (${r.discipline} / ${r.distance}, priority ${r.priority}) on ${r.date}${locationSuffix}`;
          })
          .join('\n')
      : 'No races scheduled — build a general fitness season.';

  // Sort goals by (goalType ASC, title ASC) for deterministic prompt ordering.
  // Use lexicographic UTF-16 comparison instead of localeCompare to avoid locale-dependent collation.
  const sortedGoals = [...req.goals].sort(
    (a, b) => codePointCompare(a.goalType, b.goalType) || codePointCompare(a.title, b.title)
  );
  const goalList =
    sortedGoals.length > 0
      ? sortedGoals.map((g) => `- [${g.goalType}] ${g.title}`).join('\n')
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

Use the generate_skeleton tool exactly once to produce the season skeleton.`;
}
