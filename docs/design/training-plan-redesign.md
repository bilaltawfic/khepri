# Training Plan Redesign: Season-Based Planning with Structured Workouts

**Status:** Approved
**Date:** 2026-04-04
**Author:** Bil Tawfic (founder), Claude (AI architect)
**Conversation log:** `claude-convos/2026-04-04/` (PM discussion session)

---

## Executive Summary

Replace the current generic periodization skeleton with a **season-based planning system** that generates specific daily workouts with structured sets, zones, and durations. Plans sync bidirectionally with Intervals.icu, enabling device execution (Garmin, Zwift) and automated compliance tracking.

**Key changes:**
- Season becomes the top-level organizing concept (calendar year by default)
- Goals (race, performance, fitness, health) are season-scoped
- Planning is a guided multi-step process: season skeleton → block detail → lock-in
- Two tiers: Claude-generated workouts (paid) and template-based (free)
- All workouts output Intervals.icu DSL format for device sync
- AI coach adapts the plan daily based on check-ins, with full audit trail
- Compliance tracking (green/amber/red) per workout, week, and block
- Onboarding simplified to 3 steps; season setup moves to dashboard

---

## 1. Season Model

### What is a Season?

A **season** is the top-level container for an athlete's training year. It holds all goals, race blocks, standalone blocks, preferences, and compliance data.

**Rules:**
- One active season per athlete at a time
- Default end date: December 31 of the current year
- Start date: when the athlete creates it (or January 1 if created early)
- Season contains all goal types (race, performance, fitness, health)
- When a season ends, it's archived — a new season starts fresh

### Season Data Model

```typescript
interface Season {
  id: string;                        // UUID
  athlete_id: string;
  name: string;                      // e.g., "2026 Triathlon Season"
  start_date: string;                // YYYY-MM-DD
  end_date: string;                  // YYYY-MM-DD, defaults to Dec 31
  status: 'active' | 'completed' | 'archived';

  // Athlete preferences for this season
  preferences: SeasonPreferences;

  // Populated during season setup
  skeleton?: SeasonSkeleton;         // High-level phase allocation

  created_at: string;
  updated_at: string;
}

interface SeasonPreferences {
  weekly_hours_target: { min: number; max: number };  // e.g., { min: 10, max: 12 }
  available_days: DayOfWeek[];        // Days the athlete can train
  sport_priority: Sport[];            // e.g., ['run', 'bike', 'swim']
  day_constraints: DayConstraint[];   // e.g., swim only Mon/Wed (pool schedule)
  key_sessions?: string[];            // e.g., "Long ride Saturday"
}

interface DayConstraint {
  sport: Sport;
  days: DayOfWeek[];
  type: 'preferred' | 'only';        // 'only' = hard constraint, 'preferred' = AI can move
}
```

### Goals Are Season-Scoped

All goals belong to a season:

```typescript
interface SeasonGoal {
  id: string;
  season_id: string;                 // FK to season
  athlete_id: string;
  goal_type: 'race' | 'performance' | 'fitness' | 'health';
  title: string;
  priority: 'A' | 'B' | 'C';
  target_date?: string;

  // Race-specific
  race_event_name?: string;
  race_distance?: string;            // e.g., "70.3", "Marathon", "Olympic"
  race_location?: string;
  race_target_time_seconds?: number;

  // Performance-specific
  perf_metric?: string;              // e.g., "FTP", "threshold_pace"
  perf_current_value?: number;
  perf_target_value?: number;

  status: 'active' | 'completed' | 'cancelled';
}
```

**Race goals** drive the planning flow — they anchor race blocks. **Performance goals** give the coach training targets. **Fitness and health goals** inform coaching decisions (e.g., "prioritize injury prevention" → conservative volume).

### Season Skeleton

The skeleton is the high-level phase allocation across the full calendar year, generated during season setup:

```typescript
interface SeasonSkeleton {
  total_weeks: number;
  phases: SeasonPhase[];
  feasibility_notes?: string[];       // AI warnings, e.g., "10h/week is below minimum for 70.3"
}

interface SeasonPhase {
  name: string;                       // e.g., "Base 1", "70.3 #1 Build", "Recovery"
  start_date: string;
  end_date: string;
  weeks: number;
  type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race_week' | 'off_season';
  race_block_id?: string;            // Links to a race block if this phase serves a race
  target_hours_per_week: number;
  focus: string;                     // e.g., "Aerobic endurance, technique work"
}
```

---

## 2. Race Blocks and Standalone Blocks

### What is a Race Block?

A **race block** is a training block anchored to a race (or standalone goal). It contains specific daily workouts for a defined period, and progresses through a lifecycle: `draft` → `locked` → `in_progress` → `completed`.

```typescript
interface RaceBlock {
  id: string;
  season_id: string;
  athlete_id: string;

  name: string;                       // e.g., "Ironman 70.3 #1 Prep"
  goal_id?: string;                   // FK to the race/goal this block targets (null for standalone)
  start_date: string;
  end_date: string;
  total_weeks: number;

  status: 'draft' | 'locked' | 'in_progress' | 'completed' | 'cancelled';
  locked_at?: string;                 // When the athlete approved the block
  pushed_to_intervals_at?: string;    // When workouts were synced

  // Phase breakdown within this block
  phases: BlockPhase[];

  // Weekly compliance scores (computed, updated as activities come in)
  weekly_compliance: WeeklyCompliance[];

  // Block-level compliance (computed from weekly scores)
  overall_compliance?: ComplianceScore;

  created_at: string;
  updated_at: string;
}

interface BlockPhase {
  name: string;                       // e.g., "Build 2", "Taper"
  type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race_week';
  start_week: number;                 // 1-indexed within the block
  end_week: number;
  focus: string;
  target_hours_per_week: number;
  intensity_distribution: [number, number, number]; // [Z1-2%, Z3-4%, Z5+%]
}
```

**Standalone blocks** (no race target) use the same model with `goal_id = null`. They're for scenarios like "8-week base building" or off-season maintenance.

### Block Lifecycle

```
draft ──→ locked ──→ in_progress ──→ completed
  │          │            │
  │          │            └─→ (adaptations happen here)
  │          │
  │          └─→ pushed to Intervals.icu
  │
  └─→ athlete reviewing, making tweaks before locking
```

1. **Draft**: AI generates workouts for the block. Athlete reviews, asks for changes.
2. **Locked**: Athlete approves. Workouts pushed to Intervals.icu. Plan is the "plan of record."
3. **In Progress**: Block start date has passed. Coach can suggest daily adaptations. Compliance tracking active.
4. **Completed**: Block end date has passed (or athlete marks it). Block review triggered.

---

## 3. Workouts

### Workout Data Model

Each day has zero or more workouts. Workouts store both Khepri's structured representation (for in-app display) and the Intervals.icu DSL string (for sync).

```typescript
interface Workout {
  id: string;
  block_id: string;
  athlete_id: string;

  // Scheduling
  date: string;                       // YYYY-MM-DD
  day_of_week: DayOfWeek;
  week_number: number;                // Within the block

  // Identity
  name: string;                       // e.g., "Bike - Threshold Intervals"
  sport: 'swim' | 'bike' | 'run' | 'strength' | 'rest';
  workout_type: string;               // e.g., "intervals", "endurance", "tempo", "recovery"

  // Planned metrics
  planned_duration_minutes: number;
  planned_tss?: number;
  planned_distance_meters?: number;

  // Workout structure (for Khepri app display)
  structure: WorkoutStructure;

  // Intervals.icu DSL (for sync — source of truth for device execution)
  description_dsl: string;
  intervals_target: 'POWER' | 'PACE' | 'HR' | 'AUTO';

  // Sync state
  sync_status: 'pending' | 'synced' | 'conflict' | 'not_connected';
  external_id: string;                // Stable ID: "khepri-{block_id}-{date}-{sport}"
  intervals_event_id?: string;        // Intervals.icu's event ID after push

  // Actual results (populated from Intervals.icu after completion)
  actual_duration_minutes?: number;
  actual_tss?: number;
  actual_distance_meters?: number;
  actual_avg_power?: number;
  actual_avg_pace_sec_per_km?: number;
  actual_avg_hr?: number;
  completed_at?: string;
  intervals_activity_id?: string;

  // Compliance (computed after activity match)
  compliance?: ComplianceResult;

  created_at: string;
  updated_at: string;
}

interface WorkoutStructure {
  sections: WorkoutSection[];
}

interface WorkoutSection {
  name: string;                       // "Warmup", "Main Set", "Cooldown"
  sets: WorkoutSet[];
}

interface WorkoutSet {
  repeats?: number;                   // For interval blocks, e.g., 4
  steps: WorkoutStep[];
}

interface WorkoutStep {
  description: string;                // Human-readable, e.g., "400m at threshold pace"
  duration_minutes?: number;
  distance_meters?: number;
  intensity: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'hard' | 'max';
  target_power_pct?: [number, number];     // e.g., [95, 105] = 95-105% FTP
  target_pace_pct?: [number, number];      // e.g., [85, 90] = 85-90% threshold pace
  target_hr_pct?: [number, number];
  rest_seconds?: number;
  cadence_rpm?: number;
}
```

### Two-Tier Workout Generation

#### Paid Tier: Claude-Generated Workouts

Claude generates custom workouts using:
- Athlete profile (FTP, threshold pace, CSS, HR zones)
- Season phase context (base/build/peak/taper)
- Weekly hour budget
- Day constraints and sport priority
- Recent training load (CTL/ATL/TSB from Intervals.icu)
- Fatigue state from check-ins

**Output constraint**: Claude must output both the `WorkoutStructure` JSON and a valid Intervals.icu DSL string. A DSL validation step checks the output before it's stored or pushed.

**Prompt strategy**: System prompt includes the full Intervals.icu DSL syntax reference, athlete's current fitness numbers, and examples of valid workout descriptions. The prompt constrains Claude to generate structured JSON that can be deterministically converted to DSL.

#### Free Tier: Template-Based Workouts

Pre-built workout templates organized by:
- Sport (swim, bike, run)
- Phase (base, build, peak, taper, recovery)
- Focus (endurance, threshold, VO2max, technique, race-specific)
- Duration bucket (30min, 45min, 60min, 90min, 120min)

Templates are **parameterized** with athlete's fitness numbers:
```
Template: "Bike Threshold Intervals (60min)"
Parameters: athlete.ftp = 220W

Output DSL:
Warmup
- 10m ramp 50-75%

Main Set 4x
- 8m 95-105%
- 4m 55%

Cooldown
- 10m 50%
```

Templates are stored as code (TypeScript) in `packages/core/src/templates/`, pre-validated as correct DSL. The template engine selects appropriate templates based on the phase, fills in athlete-specific values, and assembles a week.

### DSL ↔ Structure Mapping

We need reliable conversion between the Khepri `WorkoutStructure` (for app display) and the Intervals.icu DSL string (for sync). Two approaches:

**Option A — Single source of truth is DSL**: Generate DSL, parse it into `WorkoutStructure` for display. Requires a DSL parser.

**Option B — Single source of truth is Structure**: Generate `WorkoutStructure`, serialize it to DSL for push. Requires a DSL serializer.

**Decision: Option B** — Generate structure first, serialize to DSL. This is more reliable because:
- We control the serialization (deterministic)
- Parsing DSL is fragile (undocumented edge cases in Intervals.icu's parser)
- Claude generates structured data more reliably than raw text in a specific syntax
- Template system naturally produces structured data

The serializer is a well-tested function: `workoutStructureToDSL(structure: WorkoutStructure, target: 'POWER' | 'PACE'): string`

---

## 4. Compliance Tracking

### Per-Workout Compliance

Inspired by TrainingPeaks, adapted for Khepri:

```typescript
interface ComplianceResult {
  score: 'green' | 'amber' | 'red' | 'missed' | 'unplanned';
  metric_used: 'tss' | 'duration' | 'distance';   // Which metric drove the score
  planned_value: number;
  actual_value: number;
  ratio: number;                      // actual / planned (e.g., 0.95 = 95%)
  direction: 'under' | 'over' | 'on_target';
}
```

**Thresholds** (using first available metric in priority order: TSS → Duration → Distance):

| Score | Range | Meaning |
|-------|-------|---------|
| Green | 80-120% of planned | On target |
| Amber | 50-79% or 121-150% | Moderate deviation |
| Red | <50% or >150% | Major deviation |
| Missed | 0% | Workout not completed |
| Unplanned | N/A | Completed session with no planned workout |

### Weekly Compliance

```typescript
interface WeeklyCompliance {
  week_number: number;
  start_date: string;
  end_date: string;

  // Session counts
  planned_sessions: number;
  completed_sessions: number;
  missed_sessions: number;
  unplanned_sessions: number;

  // Compliance breakdown
  green_count: number;
  amber_count: number;
  red_count: number;

  // Weighted score: green=1.0, amber=0.5, red=0.0
  // Formula: sum(weights) / planned_sessions
  compliance_score: number;           // 0.0 to 1.0
  compliance_color: 'green' | 'amber' | 'red';  // Derived from score

  // Volume comparison
  planned_hours: number;
  actual_hours: number;
  planned_tss: number;
  actual_tss: number;
}
```

**Weekly compliance color thresholds:**
- Green: score >= 0.8
- Amber: score >= 0.5
- Red: score < 0.5

### Block / Plan Compliance

Same model as weekly, aggregated across all weeks in the block. Displayed as a color-coded week-by-week timeline on the plan screen.

---

## 5. Onboarding Redesign

### Current Flow (6 steps)

1. Welcome
2. Connect Intervals.icu
3. Fitness Numbers
4. Goals
5. Events
6. Training Plan

### New Flow (3 steps)

| Step | Screen | Purpose | Data Collected |
|------|--------|---------|----------------|
| 1 | Welcome | Value proposition | Nothing |
| 2 | Connect Intervals.icu | Integration setup | Athlete ID + API key (persisted!) |
| 3 | Fitness Numbers | Baseline for zones | FTP, LTHR, threshold pace, CSS, HR (auto-sync if connected) |

**What's removed:**
- ~~Goals step~~ → moves to season setup (dashboard)
- ~~Events step~~ → moves to season setup (races) and planning flow (availability)
- ~~Plan step~~ → moves entirely to Plan tab

**Why:**
- Onboarding should be fast — get the user to the dashboard ASAP
- Planning a season is too complex for a step in a setup wizard
- Goals are season-scoped now, so they belong in season setup
- Non-race events (travel, camps) were silently discarded after onboarding anyway

### Post-Onboarding: Dashboard CTA

After onboarding, the dashboard shows a prominent season setup prompt:

```
┌──────────────────────────────────────────────┐
│                                              │
│  Welcome to Khepri!                          │
│  Let's set up your 2026 season.              │
│                                              │
│  [Set Up Season →]                           │
│                                              │
│  or explore the app first                    │
│                                              │
└──────────────────────────────────────────────┘
```

### Connect Intervals.icu: Push Harder

During onboarding (step 2), explain the value clearly:

> **Why connect?**
> - Structured workouts pushed to your Garmin, Zwift, and smart trainers
> - Automatic training compliance tracking
> - Real fitness data (CTL, ATL, TSB) powers smarter coaching
> - Import your race calendar automatically

If skipped, the planning flow should prompt again:

> *"Connecting Intervals.icu unlocks device sync and auto-compliance. Want to connect before we generate your workouts?"*

Planning works without Intervals.icu — workouts are generated and shown in-app. But device sync, auto-compliance, and wellness-informed coaching require the connection.

---

## 6. Season Setup Flow (Dashboard)

The guided multi-step process for creating a season, accessible from the dashboard:

### Step 1: Race Calendar

```
┌──────────────────────────────────────────────┐
│  Your 2026 Race Calendar                     │
│                                              │
│  Add your target races for the season.       │
│  [Import from Intervals.icu]                 │
│                                              │
│  + Add Race                                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Ironman 70.3 #1 · Jun 7 · Priority A  │  │
│  │ Ironman 70.3 #2 · Aug 9 · Priority A  │  │
│  │ Marathon · Oct 11 · Priority A         │  │
│  │ Olympic Tri · Nov 1 · Priority B       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Next: Other Goals →]                       │
└──────────────────────────────────────────────┘
```

### Step 2: Other Goals

```
┌──────────────────────────────────────────────┐
│  Season Goals                                │
│                                              │
│  Beyond your races, what else are you        │
│  working toward this season?                 │
│                                              │
│  + Add Goal                                  │
│                                              │
│  Performance: FTP from 190W to 220W          │
│  Performance: Marathon sub-3:30              │
│  Health: Stay injury-free                    │
│                                              │
│  [Next: Preferences →]                       │
└──────────────────────────────────────────────┘
```

### Step 3: Preferences

```
┌──────────────────────────────────────────────┐
│  Training Preferences                        │
│                                              │
│  Weekly hours:  [10] - [12]                  │
│                                              │
│  Training days:                              │
│  [x] Mon [x] Tue [x] Wed [x] Thu            │
│  [ ] Fri [x] Sat [x] Sun                    │
│                                              │
│  Sport priority: Run > Bike > Swim           │
│                                              │
│  Day constraints:                            │
│  Swim: Mon, Wed (pool schedule)              │
│  Long ride: Saturday                         │
│                                              │
│  [Generate Season Overview →]                │
└──────────────────────────────────────────────┘
```

### Step 4: Season Overview (AI-Generated)

```
┌──────────────────────────────────────────────┐
│  Your 2026 Season Overview                   │
│                                              │
│  Jan ████████ Base 1 (6-8h/wk)              │
│  Feb ████████ Base 2 (8-10h/wk)             │
│  Mar ████████ Base 2 → Build 1              │
│  Apr ████████ Build 1 (10-12h/wk)           │
│  May ████████ Build 2 + Taper               │
│  Jun ██ RACE: 70.3 #1 ██ Recovery           │
│  Jul ████████ Rebuild + Build               │
│  Aug █ RACE: 70.3 #2 ██ Recovery            │
│  Sep ████████ Marathon Specific              │
│  Oct █ RACE: Marathon ██ Recovery            │
│  Nov █ RACE: Olympic ██ Off-season          │
│  Dec ████████ Off-season                     │
│                                              │
│  ⚠ Note: 10h/week is at the lower end for  │
│  70.3 racing. Consider 12h for better       │
│  results.                                    │
│                                              │
│  [Looks Good — Plan First Block →]           │
│  [Adjust...]                                 │
└──────────────────────────────────────────────┘
```

### Step 5+: Block Detail (Repeats Per Block)

After approving the season skeleton, the athlete plans the first race block:

```
┌──────────────────────────────────────────────┐
│  Plan: 70.3 #1 Prep (Weeks 1-20)            │
│                                              │
│  Before I generate your workouts:            │
│                                              │
│  Confirm hours for this block: [10-12]       │
│                                              │
│  Any unavailable days?                       │
│  + Add travel / unavailability               │
│  Feb 14-21: Vacation (no training)           │
│                                              │
│  Any focus areas?                            │
│  [ ] More threshold work                     │
│  [ ] Swim technique emphasis                 │
│  [x] Build run volume gradually (injury hx)  │
│                                              │
│  [Generate Workouts →]                       │
└──────────────────────────────────────────────┘
```

After generation, the athlete reviews week-by-week:

```
┌──────────────────────────────────────────────┐
│  Week 1: Return to Training (6h)             │
│                                              │
│  Mon: Swim - Easy Technique (45m)            │
│  Tue: Bike - Easy Spin (45m)                 │
│  Wed: Swim - Aerobic + Run Shakeout (70m)    │
│  Thu: Bike - Endurance (60m)                 │
│  Fri: Rest                                   │
│  Sat: Bike - Long Easy (75m)                 │
│  Sun: Run - Long Easy (50m)                  │
│                                              │
│  [Expand workout detail]                     │
│  [Request changes to this week]              │
│                                              │
│  ────────────────────────────────            │
│  Week 2: Return to Training (7h)             │
│  ...                                         │
│                                              │
│  [Lock In Block — Push to Intervals.icu →]   │
└──────────────────────────────────────────────┘
```

---

## 7. AI Coach: Post-Plan Adaptations

### Three Coaching Modes

#### 1. Daily Session Adjustment

**Trigger:** Athlete completes daily check-in.

**Process:**
1. Evaluate check-in data (sleep, energy, soreness, stress)
2. Pull latest wellness from Intervals.icu (CTL, ATL, TSB, HRV)
3. Compare against today's planned workout intensity
4. If adjustment warranted, suggest modification

**Coach can suggest:**
- Reduce intensity (swap threshold → endurance)
- Reduce duration (shorten the session)
- Swap days (move hard session to tomorrow, easy session to today)
- Add rest day (cancel today's session)
- Increase intensity (athlete feeling fresh, bump up planned easy to moderate)

**All suggestions require athlete acceptance.** On acceptance:
1. Update workout record in Khepri DB
2. Upsert affected Intervals.icu events
3. Log adaptation with full audit trail (trigger: 'coach_suggestion')

#### 2. Weekly Review

**Trigger:** End of each training week (or athlete-initiated).

**Content:**
- Compliance summary (green/amber/red breakdown)
- Planned vs actual hours and TSS
- Key sessions hit or missed
- Fatigue trend (TSB trajectory)
- Recommendations for next week

#### 3. Block Transition Review

**Trigger:** Race block completion (after race, or block end date).

**Content:**
- Block compliance summary
- Performance trend analysis
- Race result review (if applicable)
- Recommendations for next block
- Prompt to plan next block with adjusted targets

### Coach Guardrails: Reasonable Hours Validation

During season setup, the coach validates the weekly hour budget against race targets:

| Race Type | Minimum Hours/Week | Recommended |
|-----------|-------------------|-------------|
| Sprint Tri | 4-5h | 5-7h |
| Olympic Tri | 6-8h | 8-10h |
| 70.3 | 8-10h | 10-14h |
| Ironman | 12-14h | 14-20h |
| Marathon | 5-7h | 7-10h |
| Half Marathon | 4-5h | 5-7h |

If the budget is below minimum, the coach warns:
> *"10h/week for an Ironman 70.3 is below the recommended minimum of 10h. You can proceed, but expect performance compromises. Suggested: increase to 12h/week or adjust your race target."*

---

## 8. Dashboard Redesign

### New User (No Season)

```
┌──────────────────────────────────────────────┐
│  Welcome to Khepri!                          │
│  Let's set up your 2026 season.              │
│  [Set Up Season →]                           │
└──────────────────────────────────────────────┘
```

### Active Season, Active Block

```
┌──────────────────────────────────────────────┐
│  TODAY: Tuesday, April 7                     │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Bike - Threshold Intervals (60m)      │  │
│  │  🟢 Synced to Garmin                   │  │
│  │                                        │  │
│  │  Warmup                                │  │
│  │  - 10m ramp 50-75% FTP                 │  │
│  │                                        │  │
│  │  Main Set 4x                           │  │
│  │  - 8m @ 95-105% FTP                    │  │
│  │  - 4m @ 55% FTP                        │  │
│  │                                        │  │
│  │  Cooldown                              │  │
│  │  - 10m @ 50% FTP                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  UPCOMING                                    │
│  Wed: Swim - Aerobic Endurance (45m)         │
│  Thu: Run - Tempo (50m)                      │
│  Fri: Rest                                   │
│                                              │
│  THIS WEEK                                   │
│  4/7 completed · 3 remaining · 8.5h planned  │
│  Compliance: 🟢🟢🟢🟡 (87%)                │
│                                              │
│  SEASON: 70.3 #1 Prep · Week 12 of 20       │
│  Block compliance: 🟢 91%                    │
│  ──────────────────────────■──── Race Jun 7  │
└──────────────────────────────────────────────┘
```

### Dashboard Elements

| Element | Content | Detail Level |
|---------|---------|-------------|
| **Today's Workout** | Full structured breakdown (warmup/main/cooldown with zones) | Full detail |
| **Coach Adaptation** | If check-in suggests a change, shown above today's workout | Action required |
| **Upcoming (3 days)** | Sport icon + name + duration | Headlines only |
| **This Week Summary** | Sessions completed/remaining, hours, compliance dots | Aggregated |
| **Season Progress** | Current block, week number, progress bar to next race | Context |
| **Block Compliance** | Overall block compliance percentage with color | Aggregated |

---

## 9. Intervals.icu Sync

Full technical architecture is documented in [ADR-001: Intervals.icu Sync Architecture](../adr/001-intervals-icu-sync-architecture.md).

**Key decisions referenced here:**
- Sync strategy: Webhooks + polling (every 30 min)
- Conflict resolution: Last-write-wins with full audit trail
- Workout format: Intervals.icu DSL (parsed by server into structured workouts for devices)
- All changes logged in adaptation audit trail for rollback support
- DSL validated before push (fallback to simplified description on validation failure)

**What gets synced:**

| Direction | Data | Trigger |
|-----------|------|---------|
| Khepri → Intervals | Planned workouts (DSL) | Block lock-in, coach adaptation accepted |
| Khepri → Intervals | Races (RACE_A/B/C) | Season setup |
| Khepri → Intervals | Availability (HOLIDAY, SICK, INJURED) | Athlete marks unavailable |
| Intervals → Khepri | Completed activities | Webhook + poll |
| Intervals → Khepri | Wellness (CTL/ATL/TSB/HRV) | Webhook + poll |
| Intervals → Khepri | External event edits | Webhook + poll |

---

## 10. Data Model Changes Summary

### New Tables

| Table | Purpose |
|-------|---------|
| `seasons` | Top-level container for annual training |
| `race_blocks` | Training blocks within a season |
| `workouts` | Individual daily workout sessions |
| `plan_adaptations` | Full audit trail for every plan change |
| `sync_log` | Debug log for Intervals.icu sync operations |

### Modified Tables

| Table | Changes |
|-------|---------|
| `goals` | Add `season_id` FK, keep existing fields |
| `athletes` | Add Intervals.icu sync state columns |
| `training_plans` | Deprecated — replaced by seasons + race_blocks + workouts |

### Deprecated Tables/Fields

| Entity | Reason |
|--------|--------|
| `training_plans.periodization` | Replaced by `season_skeleton` + `block_phases` |
| `training_plans.weekly_template` | Replaced by actual `workouts` table |
| Onboarding goals step | Moved to season setup |
| Onboarding events step | Moved to season setup (races) and planning flow (availability) |
| Onboarding plan step | Moved entirely to Plan tab |

---

## 11. Test Plan

### New Test Cases Required

#### Season Management (SEASON)

| ID | Test Case | Type |
|----|-----------|------|
| SEASON-01 | Create season with default end date (Dec 31) | Unit + Integration |
| SEASON-02 | One active season constraint enforced | Unit |
| SEASON-03 | Add race goals to season | Integration |
| SEASON-04 | Add performance/fitness/health goals | Integration |
| SEASON-05 | Season preferences save and load correctly | Unit |
| SEASON-06 | Season skeleton generation produces valid phases | Unit |
| SEASON-07 | Coach validates weekly hours against race targets | Unit |
| SEASON-08 | Season archive on completion | Integration |
| SEASON-09 | Cannot create new season while one is active | Integration |

#### Race Block Planning (BLOCK)

| ID | Test Case | Type |
|----|-----------|------|
| BLOCK-01 | Create race block linked to goal | Integration |
| BLOCK-02 | Create standalone block (no goal) | Integration |
| BLOCK-03 | Block lifecycle: draft → locked → in_progress → completed | Integration |
| BLOCK-04 | Lock block triggers Intervals.icu push | Integration |
| BLOCK-05 | Block phases have valid date ranges within block | Unit |
| BLOCK-06 | Availability (travel) blocks workout generation for those dates | Unit |
| BLOCK-07 | Block review triggers at completion | Integration |

#### Workout Generation (WKGEN)

| ID | Test Case | Type |
|----|-----------|------|
| WKGEN-01 | Claude generates valid WorkoutStructure JSON | Unit |
| WKGEN-02 | WorkoutStructure serializes to valid Intervals.icu DSL | Unit |
| WKGEN-03 | DSL validation catches invalid syntax | Unit |
| WKGEN-04 | DSL validation passes for all valid constructs | Unit |
| WKGEN-05 | Template-based generation produces correct DSL for each sport | Unit |
| WKGEN-06 | Templates parameterize with athlete FTP/pace/CSS | Unit |
| WKGEN-07 | Weekly hour budget respected (within 10% tolerance) | Unit |
| WKGEN-08 | Day constraints respected (swim on correct days) | Unit |
| WKGEN-09 | Sport priority reflected in session allocation | Unit |
| WKGEN-10 | Bike workouts use POWER target, run/swim use PACE | Unit |
| WKGEN-11 | Rest days generated appropriately | Unit |

#### Intervals.icu Sync (SYNC)

| ID | Test Case | Type |
|----|-----------|------|
| SYNC-01 | Push workouts creates events with correct external_id | Integration |
| SYNC-02 | Push uses upsert — re-push doesn't create duplicates | Integration |
| SYNC-03 | Push races with correct category (RACE_A/B/C) | Integration |
| SYNC-04 | Push availability as HOLIDAY/SICK/INJURED | Integration |
| SYNC-05 | Webhook receives activity.create and matches to workout | Integration |
| SYNC-06 | Webhook receives event.update and applies last-write-wins | Integration |
| SYNC-07 | Cron poll catches activities missed by webhook | Integration |
| SYNC-08 | Activity matches to planned workout by date + sport | Unit |
| SYNC-09 | Multiple same-sport workouts on same day match by duration | Unit |
| SYNC-10 | Unplanned activity recorded as grey/unplanned | Unit |
| SYNC-11 | Sync works gracefully when Intervals.icu not connected | Unit |
| SYNC-12 | DSL validation failure falls back to simplified description | Unit |
| SYNC-13 | Rate limiting respected (batched requests) | Unit |

#### Compliance Tracking (COMPLY)

| ID | Test Case | Type |
|----|-----------|------|
| COMPLY-01 | Green: actual 80-120% of planned | Unit |
| COMPLY-02 | Amber: actual 50-79% or 121-150% of planned | Unit |
| COMPLY-03 | Red: actual <50% or >150% of planned | Unit |
| COMPLY-04 | Missed: no activity for planned workout | Unit |
| COMPLY-05 | Unplanned: activity with no planned workout | Unit |
| COMPLY-06 | Metric priority: TSS > Duration > Distance | Unit |
| COMPLY-07 | Weekly compliance score computed correctly | Unit |
| COMPLY-08 | Weekly compliance color thresholds (>=0.8 green, >=0.5 amber) | Unit |
| COMPLY-09 | Block compliance aggregates weekly scores | Unit |

#### Coach Adaptations (ADAPT)

| ID | Test Case | Type |
|----|-----------|------|
| ADAPT-01 | Coach suggestion creates adaptation with 'suggested' status | Integration |
| ADAPT-02 | Accepting adaptation updates workout + pushes to Intervals.icu | Integration |
| ADAPT-03 | Rejecting adaptation keeps original workout unchanged | Integration |
| ADAPT-04 | Adaptation records full before/after snapshots | Unit |
| ADAPT-05 | Rollback restores before snapshot and re-syncs | Integration |
| ADAPT-06 | Swap days updates both affected workouts | Integration |
| ADAPT-07 | Adaptation context includes fatigue/wellness data | Unit |
| ADAPT-08 | External sync adaptation logged with trigger='external_sync' | Integration |

#### Onboarding Redesign (OB-NEW)

| ID | Test Case | Type |
|----|-----------|------|
| OB-NEW-01 | Onboarding has exactly 3 steps (welcome, connect, fitness) | Unit |
| OB-NEW-02 | No goals step in onboarding | Unit |
| OB-NEW-03 | No events step in onboarding | Unit |
| OB-NEW-04 | No plan step in onboarding | Unit |
| OB-NEW-05 | Intervals.icu credentials persisted on connect | Integration |
| OB-NEW-06 | Fitness auto-sync works after connect | Integration |
| OB-NEW-07 | Post-onboarding dashboard shows season setup CTA | Integration |
| OB-NEW-08 | Skipping connect still allows completing onboarding | Unit |

#### Dashboard Redesign (DASH-NEW)

| ID | Test Case | Type |
|----|-----------|------|
| DASH-NEW-01 | No season: shows setup CTA | Unit |
| DASH-NEW-02 | Active season, no block: shows plan first block CTA | Unit |
| DASH-NEW-03 | Active block: shows today's workout with full structure | Integration |
| DASH-NEW-04 | Upcoming 3 days shown as headlines | Unit |
| DASH-NEW-05 | Weekly compliance dots render correctly | Unit |
| DASH-NEW-06 | Block progress bar and compliance percentage shown | Unit |
| DASH-NEW-07 | Coach adaptation suggestion shown above today's workout | Integration |
| DASH-NEW-08 | Season progress shows weeks to next race | Unit |

### Existing Test Cases to Update

| Category | Test IDs | Change Required |
|----------|----------|-----------------|
| OB (Onboarding) | OB-01 through OB-18 | Rewrite for 3-step flow. Remove goals, events, plan test cases. |
| PLAN | PLAN-01 through PLAN-08 | Replace with SEASON + BLOCK test cases. Current periodization-only tests are obsolete. |
| DASH | DASH-01 through DASH-09 | Update for new dashboard layout (today's workout, compliance, season progress). |
| PROF (Profile) | Goals section | Update to reflect season-scoped goals instead of standalone goals. |

---

## 12. Implementation Phases

This redesign is implemented as **Phase 9** in the Khepri plan, broken into sub-phases:

| Sub-Phase | Scope | Depends On |
|-----------|-------|------------|
| **9A: Data Model** | Season, blocks, workouts, adaptations, sync state tables. New migrations. | Phase 7.5 (testing complete) |
| **9B: Onboarding Simplification** | Remove goals/events/plan steps. Persist Intervals.icu credentials. Dashboard season CTA. | 9A |
| **9C: Season Setup Flow** | Guided multi-step: races → goals → preferences → skeleton generation | 9A |
| **9D: Workout Generation** | DSL serializer, template engine (free tier), Claude generation (paid tier), DSL validation | 9A |
| **9E: Block Planning Flow** | Block detail generation, review UI, lock-in, push to Intervals.icu | 9C, 9D |
| **9F: Sync Engine** | Webhook endpoint, cron reconciliation, inbound activity/wellness processing | 9A |
| **9G: Compliance Tracking** | Activity matching, per-workout/week/block scores, compliance UI | 9E, 9F |
| **9H: Coach Adaptations** | Daily suggestions, acceptance flow, audit trail, rollback, Intervals.icu re-sync | 9E, 9F |
| **9I: Dashboard Redesign** | Today's workout, upcoming, weekly compliance, season progress, coach adaptation UI | 9G, 9H |

**Parallelization opportunities:**
- 9C and 9D can run in parallel (season setup vs workout generation are independent)
- 9F can start as soon as 9A is done (independent of planning UI)
- 9G and 9H can run in parallel once 9E and 9F are done

```
9A ──→ 9B
  │
  ├──→ 9C ──┐
  │         ├──→ 9E ──┐
  ├──→ 9D ──┘         ├──→ 9G ──┐
  │                    │         ├──→ 9I
  └──→ 9F ────────────┤         │
                       └──→ 9H ──┘
```

---

## Appendix A: Intervals.icu DSL Quick Reference

Source: [Forum — Workout Builder Syntax Quick Guide](https://forum.intervals.icu/t/workout-builder-syntax-quick-guide/123701)

### Durations
- `5m` = 5 minutes
- `30s` = 30 seconds
- `1h2m30s` = 1 hour 2 minutes 30 seconds
- `5'30"` = 5 minutes 30 seconds

### Distances
- `500mtr` = 500 meters (NOT `500m` — that's minutes!)
- `2km` = 2 kilometers
- `1mi` = 1 mile

### Power Targets (Cycling)
- `75%` = 75% of FTP
- `95-105%` = range 95-105% FTP
- `220w` = absolute 220 watts
- `Z2` = power zone 2
- `CZ1` = custom zone 1

### Pace Targets (Running/Swimming)
- `60% Pace` = 60% of threshold pace
- `Z2 Pace` = pace zone 2
- `5:00/km Pace` = specific pace
- `5:00-4:30/km Pace` = pace range

### Heart Rate Targets
- `70% HR` = 70% of LTHR
- `Z2 HR` = HR zone 2
- `150bpm HR` = absolute HR

### Structure
- Section names: `Warmup`, `Main Set`, `Cooldown`, or any text
- Steps: lines starting with `-`
- Repeats: `4x` as section header, child steps indented
- Ramps: `10m ramp 50-75%`
- Freeride: `20m freeride` (no target, ERG mode off)
- Rest: `30s rest`
- Cadence: append `90rpm` to any step

### Event `target` Field
- `POWER` — bike workouts (targets interpreted as % FTP)
- `PACE` — run/swim workouts (targets interpreted as % threshold pace)
- `HR` — heart rate based
- `AUTO` — server infers from sport type

---

## Appendix B: Compliance Tracking Reference

Inspired by TrainingPeaks, with computed scores (their gap = our opportunity).

### TrainingPeaks Model
- Green: 80-120% of planned
- Yellow: 50-79% or 121-150%
- Orange: <50% or >150%
- Red: Missed
- Grey: Unplanned
- Metric priority: TSS > Duration > Distance
- No computed weekly/plan score (visual only)

### Khepri Enhancement
- Same per-workout thresholds (simplified to 3 colors: green/amber/red)
- **Computed weekly compliance score** (weighted average)
- **Computed block compliance score** (aggregated)
- **Color-coded week timeline** on plan screen
- **Compliance history** for trend analysis
