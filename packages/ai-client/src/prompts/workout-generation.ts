/**
 * Workout Generation Prompt (Paid Tier)
 *
 * System prompt and output validation for Claude-generated workouts
 * that produce WorkoutStructure JSON, serializable to Intervals.icu DSL.
 */

import { serializeContextForPrompt } from '../context-builder.js';
import type { CoachingContext } from '../types.js';

/**
 * The system prompt instructing Claude to generate structured workouts.
 */
export const WORKOUT_GENERATION_SYSTEM_PROMPT = `## Structured Workout Generation

You are generating a structured workout for a triathlete. Your output must be a valid WorkoutStructure JSON object that can be serialized to Intervals.icu DSL.

### WorkoutStructure Schema

\`\`\`json
{
  "name": "string — descriptive workout name",
  "sport": "swim | bike | run",
  "workout_type": "intervals | endurance | tempo | threshold | recovery | race | test",
  "planned_duration_minutes": "number",
  "intervals_target": "POWER | PACE | HR",
  "structure": {
    "totalDurationMinutes": "number",
    "sections": [
      {
        "name": "string — section name (Warmup, Main Set, Cooldown, or custom)",
        "durationMinutes": "number",
        "steps": [
          {
            "description": "string — coaching cue or step name",
            "durationMinutes": "number (optional — use for time-based steps)",
            "durationMeters": "number (optional — use for distance-based steps)",
            "repeat": "number (optional — if set, the section repeats this many times)",
            "target": "string — intensity target in DSL format"
          }
        ]
      }
    ]
  }
}
\`\`\`

### Intervals.icu DSL Target Formats

**Power targets (for bike):**
- Percentage of FTP: \`75%\`, \`95-105%\`
- Absolute watts: \`220w\`
- Ramps: \`ramp 50-75%\`

**Pace targets (for run/swim):**
- Percentage: \`60% Pace\`, \`90-95% Pace\`
- Zone: \`Z2 Pace\`
- Specific: \`5:00/km Pace\`

**HR targets:**
- Percentage: \`70% HR\`
- Zone: \`Z2 HR\`
- Absolute: \`150bpm HR\`

**Special:**
- Freeride: \`freeride\` (ERG mode off)
- Rest: \`rest\`

### Critical Rules

1. **Distances use \`mtr\` not \`m\`** — \`m\` means minutes in DSL.
   Distances go in \`durationMeters\`, durations in \`durationMinutes\`.
2. **Every step must have either \`durationMinutes\` or \`durationMeters\`** (not neither).
3. **Target type must match sport:**
   - Bike → Power (\`%\`, \`w\`, ramp)
   - Run/Swim → Pace (\`% Pace\`, zone Pace, /km Pace)
4. **\`repeat\` is section-level** — set it on the first step, and all steps in that section are repeated.
5. **Sections:** Use Warmup, Main Set, Cooldown as standard names. Custom names are allowed.
6. **Duration accuracy:** Total workout duration must be within ±10% of requested duration.

### Example: Bike Threshold Intervals (60min, target: POWER)

\`\`\`json
{
  "name": "Bike - Threshold Intervals",
  "sport": "bike",
  "workout_type": "threshold",
  "planned_duration_minutes": 60,
  "intervals_target": "POWER",
  "structure": {
    "totalDurationMinutes": 60,
    "sections": [
      {
        "name": "Warmup",
        "durationMinutes": 10,
        "steps": [{"description": "Ramp warm-up", "durationMinutes": 10, "target": "ramp 50-75%"}]
      },
      {
        "name": "Main Set",
        "durationMinutes": 40,
        "steps": [
          {"description": "Threshold effort", "durationMinutes": 8, "target": "95-105%", "repeat": 4},
          {"description": "Recovery spin", "durationMinutes": 4, "target": "55%"}
        ]
      },
      {
        "name": "Cooldown",
        "durationMinutes": 10,
        "steps": [{"description": "Easy spin", "durationMinutes": 10, "target": "50%"}]
      }
    ]
  }
}
\`\`\``;

/**
 * Input for generating a structured workout via Claude.
 */
export interface WorkoutGenerationInput {
  readonly sport: 'swim' | 'bike' | 'run';
  readonly durationMinutes: number;
  readonly phase: string;
  readonly focus: string;
  readonly weeklyHourBudget?: number;
  readonly remainingBudgetMinutes?: number;
}

/**
 * The expected output shape from Claude for workout generation.
 */
export interface WorkoutGenerationOutput {
  readonly name: string;
  readonly sport: 'swim' | 'bike' | 'run';
  readonly workout_type: string;
  readonly planned_duration_minutes: number;
  readonly intervals_target: 'POWER' | 'PACE' | 'HR';
  readonly structure: {
    readonly totalDurationMinutes: number;
    readonly sections: readonly {
      readonly name: string;
      readonly durationMinutes: number;
      readonly steps: readonly {
        readonly description: string;
        readonly durationMinutes?: number;
        readonly durationMeters?: number;
        readonly repeat?: number;
        readonly target: string;
      }[];
    }[];
  };
}

/**
 * Validation error from checking Claude's workout output.
 */
export interface GenerationValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * Validate Claude's workout generation output.
 * Returns an array of errors (empty = valid).
 */
export function validateGenerationOutput(
  output: WorkoutGenerationOutput,
  input: WorkoutGenerationInput
): readonly GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];

  // Check duration within ±10%
  const tolerance = input.durationMinutes * 0.1;
  if (
    output.planned_duration_minutes < input.durationMinutes - tolerance ||
    output.planned_duration_minutes > input.durationMinutes + tolerance
  ) {
    errors.push({
      field: 'planned_duration_minutes',
      message: `Duration ${output.planned_duration_minutes}min is outside ±10% of requested ${input.durationMinutes}min`,
    });
  }

  // Check sport matches
  if (output.sport !== input.sport) {
    errors.push({
      field: 'sport',
      message: `Output sport "${output.sport}" does not match requested "${input.sport}"`,
    });
  }

  // Check target matches sport
  const expectedTarget = input.sport === 'bike' ? 'POWER' : 'PACE';
  if (output.intervals_target !== expectedTarget && output.intervals_target !== 'HR') {
    errors.push({
      field: 'intervals_target',
      message: `Target "${output.intervals_target}" unusual for ${input.sport} — expected ${expectedTarget}`,
    });
  }

  // Check sections exist
  if (output.structure.sections.length === 0) {
    errors.push({
      field: 'structure.sections',
      message: 'No sections in workout structure',
    });
  }

  // Check every step has duration or distance
  for (const section of output.structure.sections) {
    for (const step of section.steps) {
      if (step.durationMinutes == null && step.durationMeters == null) {
        errors.push({
          field: `structure.sections[${section.name}].steps`,
          message: `Step "${step.description}" has neither durationMinutes nor durationMeters`,
        });
      }
    }
  }

  return errors;
}

/**
 * Build the full prompt for Claude workout generation.
 */
export function buildWorkoutGenerationPrompt(
  context: CoachingContext,
  input: WorkoutGenerationInput
): string {
  const contextString = serializeContextForPrompt(context);

  const params = [
    `- Sport: ${input.sport}`,
    `- Duration: ${input.durationMinutes} minutes`,
    `- Training Phase: ${input.phase}`,
    `- Focus: ${input.focus}`,
    input.weeklyHourBudget != null ? `- Weekly Hour Budget: ${input.weeklyHourBudget}h` : undefined,
    input.remainingBudgetMinutes != null
      ? `- Remaining Budget This Week: ${input.remainingBudgetMinutes} minutes`
      : undefined,
  ].filter((line): line is string => line != null);

  return `${WORKOUT_GENERATION_SYSTEM_PROMPT}

---

# Athlete Context

${contextString}

---

## Workout Request

${params.join('\n')}

---

Generate a single structured workout as a JSON object matching the WorkoutStructure schema above. Output ONLY the JSON — no markdown fences, no explanation.`;
}
