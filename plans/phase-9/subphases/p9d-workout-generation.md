# P9D: Workout Generation

## Goal

Build the workout generation pipeline: a DSL serializer that converts structured workout data to Intervals.icu format, a DSL validator, a template engine for the free tier, Claude-powered generation for the paid tier, and a week assembler that allocates sessions across training days.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 3
**DSL reference:** [docs/adr/001-intervals-icu-sync-architecture.md](../../../docs/adr/001-intervals-icu-sync-architecture.md) — Appendix A
**Wave:** 2 (parallel with 9B, 9C, 9F)
**Depends on:** 9A (core types)
**Blocks:** 9E, 9F (DSL validator used by sync push)

## Context

All workouts must output valid Intervals.icu DSL format — this is what enables structured workout display on the Intervals.icu calendar, and push to Garmin/Zwift/smart trainers. The DSL is text-based with specific syntax rules (see ADR Appendix A).

**Architecture decision:** WorkoutStructure (JSON) is the single source of truth. The DSL serializer converts it to text. This is more reliable than parsing DSL because we control serialization, while Intervals.icu's parser has undocumented edge cases.

### Two Tiers
- **Paid (Claude-generated):** Custom workouts per athlete context. Claude outputs WorkoutStructure JSON, serialized to DSL.
- **Free (template-based):** Pre-built workout patterns parameterized with athlete's zones. Templates stored as code, produce valid DSL deterministically.

## Dependencies

- **P9-A-12** (core types) — WorkoutStructure, WorkoutSection, WorkoutStep types

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-D-01 | WorkoutStructure → DSL serializer | ⬜ |
| P9-D-02 | DSL validation function | ⬜ |
| P9-D-03 | Workout template engine (free tier) | ⬜ |
| P9-D-04 | Template library: swim workouts | ⬜ |
| P9-D-05 | Template library: bike workouts | ⬜ |
| P9-D-06 | Template library: run workouts | ⬜ |
| P9-D-07 | Claude workout generation prompt + output validation | ⬜ |
| P9-D-08 | Week assembly logic (template selector + day allocation) | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/utils/dsl-serializer.ts` | WorkoutStructure → Intervals.icu DSL string |
| `packages/core/src/utils/dsl-validator.ts` | Validate DSL syntax before push |
| `packages/core/src/utils/week-assembler.ts` | Allocate workouts across a training week |
| `packages/core/src/templates/workout-templates.ts` | Template engine: select, parameterize, output |
| `packages/core/src/templates/swim/index.ts` | Swim workout templates by phase/focus |
| `packages/core/src/templates/bike/index.ts` | Bike workout templates by phase/focus |
| `packages/core/src/templates/run/index.ts` | Run workout templates by phase/focus |
| `packages/ai-client/src/prompts/workout-generation.ts` | System prompt + output schema for Claude |

## Implementation Details

### DSL Serializer

Converts `WorkoutStructure` to a valid Intervals.icu DSL string.

```typescript
export function workoutStructureToDSL(
  structure: WorkoutStructure,
  target: 'POWER' | 'PACE' | 'HR',
): string;
```

**Key rules:**
- Distances use `mtr` (NOT `m` which means minutes): `400mtr`, `2km`
- Durations use `m` for minutes: `10m`, `30s`
- Power targets as `%` of FTP: `75%`, `95-105%`
- Pace targets with `Pace` suffix: `60% Pace`, `5:00/km Pace`
- HR targets with `HR` suffix: `70% HR`, `150bpm HR`
- Repeats: `{N}x` as section header, steps indented with `- `
- Sections: `Warmup`, `Main Set`, `Cooldown` (or custom name)
- Ramps: `10m ramp 50-75%`
- Freeride: `20m freeride`
- Rest: `30s rest`

**Example output for a bike workout (target: POWER):**
```
Warmup
- 10m ramp 50-75%

Main Set 4x
- 8m 95-105%
- 4m 55%

Cooldown
- 10m 50%
```

**Example for a run workout (target: PACE):**
```
Warmup
- 10m 65% Pace

Main Set 4x
- 400mtr 90-95% Pace
- 200mtr freeride

Cooldown
- 10m 55% Pace
```

**Example for a swim workout (target: PACE):**
```
Warmup
- 300mtr 60% Pace

Main Set 6x
- 100mtr 85-90% Pace
- 30s rest

Cooldown
- 200mtr 55% Pace
```

### DSL Validator

Validates a DSL string without calling the Intervals.icu API:

```typescript
interface DSLValidationResult {
  readonly valid: boolean;
  readonly errors: readonly DSLValidationError[];
  readonly parsed_duration_seconds?: number;
  readonly parsed_distance_meters?: number;
}

interface DSLValidationError {
  readonly line: number;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export function validateDSL(dsl: string): DSLValidationResult;
```

**Checks:**
1. Steps start with `-` after section headers
2. Duration/distance values use valid units (`m`/`s`/`h` for time, `mtr`/`km`/`mi` for distance)
3. Targets use valid format (%, w, /km, bpm, Z1-Z7, Pace, HR)
4. Repeat blocks (`Nx`) have child steps
5. No bare `m` used ambiguously for meters (must be `mtr`)
6. Non-empty — at least one section with one step

### Template Engine

```typescript
interface AthleteZones {
  ftp?: number;              // watts
  threshold_pace_sec_km?: number;
  css_sec_100m?: number;
  lthr?: number;
  max_hr?: number;
}

interface TemplateSelection {
  sport: Sport;
  phase: PhaseType;
  focus: WorkoutFocus;
  duration_minutes: number;
}

export function selectTemplate(selection: TemplateSelection): WorkoutTemplate;
export function renderTemplate(template: WorkoutTemplate, zones: AthleteZones): WorkoutStructure;
```

Each template is a function that takes zones and produces a `WorkoutStructure`:

```typescript
// Example: packages/core/src/templates/bike/threshold-intervals.ts
export const bikeThresholdIntervals: WorkoutTemplate = {
  name: 'Bike - Threshold Intervals',
  sport: 'bike',
  phase: ['build', 'peak'],
  focus: 'threshold_work',
  duration_range: [50, 70],       // minutes
  render: (zones, duration) => ({
    sections: [
      {
        name: 'Warmup',
        sets: [{ steps: [{ duration_minutes: 10, target_power_pct: [50, 75], description: 'Ramp warm-up' }] }]
      },
      {
        name: 'Main Set',
        sets: [{
          repeats: 4,
          steps: [
            { duration_minutes: 8, target_power_pct: [95, 105], description: 'Threshold effort' },
            { duration_minutes: 4, target_power_pct: [50, 55], description: 'Recovery spin' },
          ]
        }]
      },
      {
        name: 'Cooldown',
        sets: [{ steps: [{ duration_minutes: 10, target_power_pct: [45, 50], description: 'Easy spin' }] }]
      }
    ]
  })
};
```

### Template Library (minimum viable set)

Each sport needs templates for key phase/focus combinations:

**Swim (6+ templates):**
- Base: Easy Technique, Aerobic Endurance
- Build: Threshold Intervals, CSS Development
- Peak: Race Pace, Open Water Simulation
- Recovery: Easy Swim

**Bike (8+ templates):**
- Base: Endurance, Sweet Spot
- Build: Threshold Intervals, VO2max Intervals, Over-Unders
- Peak: Race Simulation, Brick Prep
- Recovery: Easy Spin
- Taper: Openers

**Run (8+ templates):**
- Base: Easy Aerobic, Long Run, Tempo Introduction
- Build: Threshold Tempo, Track Intervals, Hill Repeats
- Peak: Race Pace, Long Run with Pace Work
- Recovery: Easy Shakeout
- Taper: Openers

### Claude Workout Generation Prompt

For paid tier, Claude generates `WorkoutStructure` JSON:

**System prompt includes:**
- Full Intervals.icu DSL syntax reference
- Athlete's current fitness numbers (FTP, threshold pace, CSS, HR zones)
- Phase context (what type of training block, focus areas)
- Weekly hour budget and remaining budget for this session
- Recent training load context (CTL/ATL/TSB if available)

**Output schema** (via tool_use or structured output):
```json
{
  "name": "Bike - Threshold Intervals",
  "sport": "bike",
  "workout_type": "intervals",
  "planned_duration_minutes": 60,
  "intervals_target": "POWER",
  "structure": { /* WorkoutStructure */ }
}
```

**Validation after generation:**
1. Structure serializes to valid DSL (run through serializer + validator)
2. Duration within ±10% of requested duration
3. Targets use correct zones for the sport (no power targets in swim)
4. All steps have either duration or distance (not neither)

### Week Assembler

Allocates workouts across a training week respecting constraints:

```typescript
interface WeekAssemblyInput {
  phase: PhaseType;
  week_number: number;               // Within the block
  target_hours: number;
  available_days: DayOfWeek[];
  sport_priority: Sport[];
  day_constraints: DayConstraint[];
  athlete_zones: AthleteZones;
  generation_tier: 'template' | 'claude';
}

export function assembleWeek(input: WeekAssemblyInput): Workout[];
```

**Logic:**
1. Determine session count from target hours (rough: hours / avg_session_length)
2. Allocate sessions per sport based on priority and phase
3. Place hard constraints first (swim days, long ride day)
4. Fill remaining days respecting hard/easy alternation
5. Ensure at least 1 rest day
6. Assign workout templates or Claude generation requests per session
7. Validate total duration within ±10% of target hours

## Testing Requirements

### DSL Serializer Tests (WKGEN-02)
- Bike workout → valid POWER DSL
- Run workout → valid PACE DSL
- Swim workout → valid PACE DSL
- Repeats serialize correctly (4x with child steps)
- Ramps serialize correctly
- Distances use `mtr` not `m`
- Empty sections omitted

### DSL Validator Tests (WKGEN-03, WKGEN-04)
- Valid DSL passes (bike, run, swim examples)
- Invalid: bare `m` for meters flagged
- Invalid: missing step after section header
- Invalid: repeat block with no children
- Invalid: unrecognized target format
- Warning: duration seems unrealistic (>300min step)

### Template Tests (WKGEN-05, WKGEN-06)
- Each template produces valid WorkoutStructure
- Serialized DSL passes validation
- Parameterization: FTP value appears in power targets
- Parameterization: threshold pace appears in pace targets
- All phase/focus combinations have at least one template per sport

### Week Assembly Tests (WKGEN-07, WKGEN-08, WKGEN-09)
- Weekly hours respected within ±10% tolerance
- Day constraints respected (swim only on specified days)
- Sport priority reflected (higher priority sport gets more sessions)
- At least 1 rest day per week
- No hard sessions on consecutive days

## Verification Checklist

- [ ] DSL serializer produces valid output for all sports
- [ ] DSL validator catches known invalid patterns
- [ ] Template library covers all phase/focus combinations
- [ ] Templates parameterize with real athlete zones
- [ ] Claude generation prompt produces valid WorkoutStructure
- [ ] Generated DSL validates before push
- [ ] Week assembler respects hours, constraints, priority
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
