# P9E: Block Planning Flow

## Goal

Build the UI and backend for planning a race block: setting block-specific constraints, generating workouts for the full block, reviewing week-by-week, and locking in (which pushes to Intervals.icu).

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 6 (Steps 5+)
**Wave:** 3 (convergence point — needs all of Wave 2)
**Depends on:** 9C, 9D, 9F
**Blocks:** 9G, 9H

## Context

After approving the season skeleton (P9C), the athlete plans their first race block. This is the "staged planning" approach — plan one block at a time, lock it in, then plan the next after reviewing performance.

A block is a contiguous period (4-20 weeks) targeting a race or standalone goal. It contains specific daily workouts that get pushed to Intervals.icu on lock-in.

### Flow
1. **Block Setup** — Confirm hours, add unavailable days, select focus areas
2. **Generate Workouts** — Edge Function generates workouts for every day in the block
3. **Block Review** — Athlete reviews week-by-week, can request changes
4. **Lock-In** — Athlete approves, workouts pushed to Intervals.icu
5. **Plan Tab** — Shows active block with week navigation

## Dependencies

- **P9-C** (season setup) — season exists with skeleton phases
- **P9-D** (workout generation) — DSL serializer, templates, Claude generation, week assembler
- **P9-F-03** (push module) — for lock-in sync to Intervals.icu

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-E-01 | Block planning screen: constraints + preferences | ⬜ |
| P9-E-02 | Block workout generation Edge Function | ⬜ |
| P9-E-03 | Block review screen (week-by-week) | ⬜ |
| P9-E-04 | Lock-in flow: push workouts to Intervals.icu | ⬜ |
| P9-E-05 | Plan tab: active block view with week navigation | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/mobile/app/plan/block-setup.tsx` | Block constraints and preferences |
| `apps/mobile/app/plan/block-review.tsx` | Week-by-week workout review |
| `apps/mobile/app/plan/block-lock.tsx` | Lock-in confirmation + sync progress |
| `apps/mobile/hooks/useBlockPlanning.ts` | Hook managing block planning state |
| `supabase/functions/generate-block-workouts/index.ts` | Edge Function: full block workout generation |

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/plan.tsx` | Replace current periodization view with active block view |
| `apps/mobile/app/(tabs)/_layout.tsx` | Ensure plan tab routes correctly |

## Implementation Details

### Block Setup Screen (P9-E-01)

Pre-populated from season preferences, adjustable per-block:

```
Plan: 70.3 #1 Prep (Jan 19 - Jun 7, 20 weeks)

Confirm hours for this block: [10] - [12] h/week

Unavailable days:
+ Add travel / unavailability
[Feb 14-21: Vacation]

Focus areas for this block:
[ ] More threshold work
[ ] Swim technique emphasis
[x] Build run volume gradually
[ ] Strength maintenance
[ ] Race-specific brick sessions

[Generate Workouts →]
```

On "Generate Workouts":
1. Create `race_block` record in DB (status: 'draft')
2. Call `generate-block-workouts` Edge Function
3. Show loading state (generation takes 10-30s)
4. Navigate to review screen on completion

### Block Workout Generation Edge Function (P9-E-02)

**Input:**
```typescript
interface GenerateBlockInput {
  block_id: string;
  season_id: string;
  athlete_id: string;
  start_date: string;
  end_date: string;
  phases: BlockPhase[];           // From season skeleton for this block
  preferences: SeasonPreferences; // Adjusted per-block
  unavailable_dates: string[];    // YYYY-MM-DD dates to skip
  generation_tier: 'template' | 'claude';
  athlete_zones: AthleteZones;
}
```

**Process:**
1. For each week in the block:
   a. Determine phase context (base/build/peak/taper)
   b. Calculate target hours for this week (apply 3:1 load/recovery pattern)
   c. Mark unavailable dates as rest days
   d. Call week assembler (P9-D-08) to allocate sessions
   e. For each session, generate workout (template or Claude)
   f. Serialize each WorkoutStructure to DSL
   g. Validate DSL
2. Bulk insert all workouts into `workouts` table (status: pending sync)
3. Return success with workout count

**Error handling:**
- If Claude generation fails for a session, fall back to template
- If DSL validation fails, store simplified description (name + duration)
- Log failures to sync_log for debugging

### Block Review Screen (P9-E-03)

Week-by-week expandable view:

```
Week 1: Return to Training (6.5h)
├── Mon: Swim - Easy Technique (45m) [expand for detail]
├── Tue: Bike - Easy Spin (45m)
├── Wed: Swim - Aerobic (45m)
├── Wed: Run - Shakeout (25m)
├── Thu: Bike - Endurance (60m)
├── Fri: Rest
├── Sat: Bike - Long Easy (75m)
└── Sun: Run - Long Easy (50m)

[Request changes to this week]

────────────────────────────
Week 2: Return to Training (7h)
...
```

**Expanded workout detail:**
```
Bike - Threshold Intervals (60m)
┌─────────────────────────────┐
│ Warmup                      │
│   10m ramp 50-75% FTP       │
│                             │
│ Main Set 4x                 │
│   8m @ 95-105% FTP          │
│   4m @ 55% FTP              │
│                             │
│ Cooldown                    │
│   10m @ 50% FTP             │
└─────────────────────────────┘
```

**"Request changes"** opens a chat-like interface where the athlete can ask for modifications:
- "Make Wednesday's swim shorter"
- "Swap Thursday and Friday"
- "Add a brick session on Saturday"

Changes regenerate affected workouts and refresh the review.

### Lock-In Flow (P9-E-04)

Confirmation screen:

```
Ready to lock in your plan?

70.3 #1 Prep: 20 weeks, 140 workouts

This will:
✓ Push all workouts to Intervals.icu
✓ Sync race events to your calendar
✓ Enable compliance tracking
✓ Allow the AI coach to suggest daily adjustments

[Lock In →]  [Go Back]
```

**On lock-in:**
1. Update block status: 'draft' → 'locked'
2. Set `locked_at` timestamp
3. If Intervals.icu connected:
   a. Build events array from workouts (using DSL descriptions)
   b. Add race event (RACE_A/B/C category)
   c. Add rest days as NOTE events
   d. Bulk POST to `/api/v1/athlete/{id}/events/bulk?upsert=true`
   e. Store `intervals_event_id` on each workout
   f. Update `sync_status` to 'synced'
   g. Set `pushed_to_intervals_at` on block
4. Show progress bar during sync
5. On completion, navigate to plan tab

**If not connected to Intervals.icu:**
- Still lock in (workouts visible in Khepri)
- Show prompt: "Connect Intervals.icu to sync workouts to your devices"
- Set `sync_status` to 'not_connected'

### Plan Tab: Active Block View (P9-E-05)

Replace current periodization display with:

```
70.3 #1 Prep · Week 12 of 20
Build 1 Phase · 10-12h/week

[Week navigation: < Week 12 >]

Mon Apr 6    Swim - Threshold Intervals (45m)  🟢
Tue Apr 7    Bike - Sweet Spot (60m)           ← TODAY
Wed Apr 8    Swim + Run Tempo (70m)
Thu Apr 9    Bike - Endurance (75m)
Fri Apr 10   Rest
Sat Apr 11   Bike - Long Ride (120m)
Sun Apr 12   Run - Long Run (80m)

Weekly hours: 7.5h planned
```

- Tap a workout to see full structured detail
- Compliance colors (🟢🟡🔴) shown for completed workouts
- Current day highlighted
- Week navigation (left/right arrows or swipe)

## Testing Requirements

### Unit Tests
- BLOCK-01: Create race block linked to goal
- BLOCK-02: Create standalone block (no goal)
- BLOCK-03: Block lifecycle: draft → locked → in_progress → completed
- BLOCK-05: Block phases have valid date ranges

### Integration Tests
- BLOCK-04: Lock block triggers Intervals.icu push (mock API)
- BLOCK-06: Unavailable dates result in rest day workouts
- Full flow: setup → generate → review → lock-in → sync
- Block with no Intervals.icu connection: locks in without sync

### Component Tests
- Block setup: hours, unavailable dates, focus areas
- Block review: weeks render, expand detail, navigate weeks
- Lock-in: progress bar, success state, error handling
- Plan tab: week navigation, today highlight, workout tap

## Verification Checklist

- [ ] Block setup collects preferences and creates draft block
- [ ] Workout generation produces workouts for every training day
- [ ] Unavailable dates become rest days
- [ ] Review shows week-by-week with expandable workout detail
- [ ] Lock-in changes block status and pushes to Intervals.icu
- [ ] External IDs set correctly for upsert support
- [ ] Plan tab shows active block with week navigation
- [ ] Works without Intervals.icu connection (shows in-app only)
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
