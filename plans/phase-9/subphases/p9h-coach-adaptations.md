# P9H: Coach Adaptations

## Goal

Build the AI coach's ability to suggest daily workout modifications based on check-in data and wellness, manage the acceptance/rejection flow, maintain a full audit trail with rollback support, and sync all accepted changes to Intervals.icu.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 7
**ADR (audit trail):** [docs/adr/001-intervals-icu-sync-architecture.md](../../../docs/adr/001-intervals-icu-sync-architecture.md) — Adaptation Audit Trail
**Wave:** 4 (parallel with 9G)
**Depends on:** 9E, 9F
**Blocks:** 9I

## Context

Once a block is locked in and in progress, the AI coach evaluates the athlete's daily check-in and wellness data to suggest modifications to today's (or this week's) workouts. All suggestions require athlete acceptance. Accepted changes are synced to Intervals.icu and logged with full before/after snapshots for rollback support.

### Three coaching modes
1. **Daily session adjustment** — modify today's workout based on check-in
2. **Weekly review** — end-of-week compliance summary + recommendations
3. **Block transition review** — post-block analysis + next block prompt

## Dependencies

- **P9-E** (block planning) — workouts exist and block is in_progress
- **P9-F** (sync engine) — push accepted changes to Intervals.icu
- **P9-G** (compliance) — weekly review needs compliance scores

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-H-01 | Daily adaptation suggestion logic | ⬜ |
| P9-H-02 | Adaptation acceptance flow (UI + backend) | ⬜ |
| P9-H-03 | Swap days logic (updates both workouts) | ⬜ |
| P9-H-04 | Rollback support (restore before snapshot) | ⬜ |
| P9-H-05 | Weekly review summary | ⬜ |
| P9-H-06 | Block transition review + next block prompt | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/suggest-adaptation/index.ts` | Edge Function: AI evaluates check-in → suggests modification |
| `apps/mobile/components/adaptation/AdaptationCard.tsx` | UI card showing suggestion + accept/reject |
| `apps/mobile/components/adaptation/SwapPreview.tsx` | UI showing before/after for day swaps |
| `apps/mobile/hooks/useAdaptations.ts` | Hook for managing adaptation state |
| `packages/core/src/utils/adaptation-engine.ts` | Logic for building adaptation proposals |
| `apps/mobile/app/plan/block-review-complete.tsx` | Block transition review screen |

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/ai-orchestrator/index.ts` | Integrate adaptation suggestion after check-in |
| `apps/mobile/app/(tabs)/index.tsx` | Show adaptation banner on dashboard |
| `apps/mobile/app/(tabs)/plan.tsx` | Show pending adaptations in week view |

## Implementation Details

### Daily Adaptation Suggestion (P9-H-01)

**Trigger:** After daily check-in submission, if athlete has an active block with today's planned workout.

**Input to AI:**
```typescript
interface AdaptationContext {
  // Today's planned workout
  planned_workout: Workout;

  // Check-in data
  check_in: {
    sleep_quality: number;      // 1-10
    sleep_hours: number;
    energy: number;             // 1-10
    stress: number;             // 1-10
    soreness: number;           // 1-10
    available_time_minutes?: number;
  };

  // Wellness from Intervals.icu
  wellness?: {
    ctl: number;                // Chronic Training Load (fitness)
    atl: number;                // Acute Training Load (fatigue)
    tsb: number;                // Training Stress Balance (form)
    hrv?: number;
    resting_hr?: number;
  };

  // This week's context
  week_workouts: Workout[];     // All workouts this week (planned + completed)
  week_compliance: WeeklyCompliance;

  // Block context
  block_phase: BlockPhase;      // Current phase (build, taper, etc.)
}
```

**AI decision outputs:**
```typescript
type AdaptationType =
  | 'no_change'                  // Keep planned workout
  | 'reduce_intensity'           // Lower targets (e.g., threshold → endurance)
  | 'reduce_duration'            // Shorter session
  | 'increase_intensity'         // Harder than planned (athlete fresh)
  | 'swap_days'                  // Move today's hard workout to another day
  | 'add_rest'                   // Cancel today, rest instead
  | 'substitute';                // Different workout entirely
```

**The AI returns:**
```typescript
interface AdaptationSuggestion {
  type: AdaptationType;
  reason: string;                // Human-readable explanation
  original_workout: WorkoutSnapshot;
  modified_workout: WorkoutSnapshot | null;  // null when type is 'no_change'
  swap_target_date?: string;     // If type is 'swap_days'
  confidence: 'high' | 'medium' | 'low';
}
```

**Decision guidelines (encoded in prompt):**
- Sleep < 6 or quality < 4 → suggest reduce or swap
- TSB < -20 → suggest reduce intensity
- TSB > 10 → consider increase intensity
- Energy < 4 → suggest easy/rest
- Soreness > 7 → suggest different sport or rest
- Available time < planned duration → suggest reduce duration
- Taper phase → never increase intensity

### Adaptation Acceptance Flow (P9-H-02)

**UI: AdaptationCard** (shown on dashboard and plan tab)

```
┌──────────────────────────────────────────────┐
│ Coach Suggestion                             │
│                                              │
│ "Your sleep was poor (4/10) and fatigue is   │
│ elevated (TSB: -18). I'd swap today's        │
│ threshold run with Friday's easy spin."       │
│                                              │
│ Today: Run - Threshold Tempo (50m)           │
│   →  Bike - Easy Spin (45m)                  │
│                                              │
│ Friday: Bike - Easy Spin (45m)               │
│   →  Run - Threshold Tempo (50m)             │
│                                              │
│ [Accept Swap]  [Keep Original]               │
└──────────────────────────────────────────────┘
```

**On Accept:**
1. Create `plan_adaptations` record:
   - `trigger: 'coach_suggestion'`
   - `status: 'accepted'`
   - `affected_workouts`: array with before/after snapshots for each modified workout
   - `reason`: coach's explanation
   - `context`: check-in data, wellness data, coach reasoning
2. Update workout record(s) in Khepri DB
3. If Intervals.icu connected: upsert affected events
4. Update sync_status on modified workouts
5. Dismiss the adaptation card

**On Reject:**
1. Create `plan_adaptations` record with `status: 'rejected'`
2. No changes to workouts
3. Dismiss the card

### Swap Days Logic (P9-H-03)

When coach suggests swapping two days:

```typescript
export async function executeSwap(
  client: KhepriSupabaseClient,
  workoutA: Workout,   // Today's workout
  workoutB: Workout,   // Target day's workout
): Promise<void>;
```

**Steps:**
1. Snapshot both workouts (before state)
2. Treat `external_id` as a stable per-workout-row identifier used for Intervals.icu upsert/idempotency; do **not** derive it from `{date}-{sport}` and do **not** regenerate it during a day swap
3. Keep row identity fields unchanged on each record: `id`, `date`, `week_number`, and `external_id`
4. Swap only the workout content fields: `name`, `sport`, `workout_type`, `planned_duration`, `planned_tss`, `planned_distance`, `structure`, `description_dsl`, `intervals_target`
5. Update both existing records in DB in place, preserving their original `external_id` values
6. Push both updated records to Intervals.icu using the unchanged `external_id` values so the remote events are updated idempotently rather than duplicated
7. Log adaptation with both workouts in `affected_workouts`

### Rollback Support (P9-H-04)

Support agents (or future: athlete self-service) can revert any adaptation:

```typescript
export async function rollbackAdaptation(
  client: KhepriSupabaseClient,
  adaptationId: string,
  rolledBackBy: 'support' | 'athlete',
): Promise<void>;
```

**Steps:**
1. Fetch the adaptation record
2. For each affected_workout, restore the `before` snapshot:
   - Update workout record with before values
   - Regenerate DSL from before.structure
3. Push restored workouts to Intervals.icu (upsert)
4. Mark original adaptation as `status: 'rolled_back'`, set `rolled_back_at` and `rolled_back_by`
5. Create a new adaptation record linking back via `rollback_adaptation_id`

### Weekly Review Summary (P9-H-05)

Generated at end of each training week:

**Content:**
- Compliance breakdown: X green, Y amber, Z red, W missed
- Planned vs actual hours and TSS
- Key sessions: which threshold/hard sessions were hit vs missed
- Fatigue trend: TSB direction over the week
- Recommendations: "Consider reducing next week's long run" etc.

**Implementation:** AI generates summary from:
- Week's workout compliance data
- Wellness trend (CTL/ATL/TSB over the week)
- Upcoming week's planned workouts

Display as a card on dashboard at end of week (Sunday/Monday).

### Block Transition Review (P9-H-06)

When a race block completes (race day passes or athlete marks block complete):

**Screen content:**
```
Block Complete: 70.3 #1 Prep (20 weeks)

Overall Compliance: 87% 🟢
Weeks: 🟢🟢🟢🟡🟢🟢🟢🟡🟢🟢🟢🟢🟡🟢🟢🟢🟢🟢🟢🟢

Key Metrics:
- Planned: 210h | Actual: 195h (93%)
- Key sessions hit: 85%
- Average weekly compliance: 87%

AI Analysis:
"Strong block with consistent training. Two amber weeks
 coincided with travel. FTP likely improved based on
 training load progression. Recommend 1 week recovery
 before starting 70.3 #2 prep."

[Plan Next Block →]  [Back to Dashboard]
```

"Plan Next Block" navigates to P9-E-01 (block setup) for the next race block.

## Testing Requirements

### Unit Tests
- ADAPT-04: Adaptation records full before/after snapshots
- ADAPT-07: Adaptation context includes fatigue/wellness data
- Swap logic: both workouts correctly swapped
- Rollback: before snapshot correctly restored
- Compliance context passed to AI correctly

### Integration Tests
- ADAPT-01: Coach suggestion creates adaptation with 'suggested' status
- ADAPT-02: Accepting adaptation updates workout + pushes to Intervals.icu
- ADAPT-03: Rejecting adaptation keeps original workout unchanged
- ADAPT-05: Rollback restores before snapshot and re-syncs
- ADAPT-06: Swap days updates both affected workouts
- ADAPT-08: External sync adaptation logged with trigger='external_sync'

### Component Tests
- AdaptationCard renders suggestion with accept/reject
- SwapPreview shows before/after for both days
- Weekly review card shows compliance summary
- Block review screen shows full analysis

## Verification Checklist

- [ ] Check-in triggers adaptation suggestion when block is active
- [ ] Adaptation card shows on dashboard with accept/reject
- [ ] Accepting updates workout and syncs to Intervals.icu
- [ ] Rejecting preserves original and logs rejection
- [ ] Swap days modifies both workouts correctly
- [ ] Full before/after snapshots stored in adaptation record
- [ ] Rollback restores workouts to pre-adaptation state
- [ ] Weekly review generates at end of week
- [ ] Block transition review shows compliance summary
- [ ] "Plan Next Block" navigates to block setup
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
