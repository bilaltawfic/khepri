# P9G: Compliance Tracking

## Goal

Build per-workout, weekly, and block-level compliance scoring that compares planned vs actual training. Display compliance as green/amber/red indicators throughout the app.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 4
**Wave:** 4 (parallel with 9H)
**Depends on:** 9E, 9F
**Blocks:** 9I

## Context

Inspired by TrainingPeaks' color-coded compliance system, but with computed scores (their gap = our opportunity). TrainingPeaks shows colors per workout but has no aggregated weekly/plan score — we compute those.

### Compliance Colors

| Color | Range | Meaning |
|-------|-------|---------|
| Green | 80-120% of planned | On target |
| Amber | 50-79% or 121-150% | Moderate deviation |
| Red | <50% or >150% | Major deviation |
| Missed | 0% | Workout not completed |
| Unplanned | N/A | Completed session with no plan |

**Metric priority:** TSS > Duration > Distance (use first available in both planned + actual)

### Data flow
1. Activity comes in from Intervals.icu (via webhook or cron poll — P9F)
2. Matched to planned workout by date + sport
3. Compliance computed and stored on the workout record
4. Weekly compliance aggregated from individual workouts
5. Block compliance aggregated from weekly scores

## Dependencies

- **P9-E** (block planning) — workouts exist with planned metrics
- **P9-F** (sync engine) — activities pulled from Intervals.icu with actual metrics

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-G-01 | Per-workout compliance computation | ⬜ |
| P9-G-02 | Weekly compliance aggregation | ⬜ |
| P9-G-03 | Block compliance aggregation | ⬜ |
| P9-G-04 | Compliance UI components (dots, bars, percentages) | ⬜ |
| P9-G-05 | Week compliance timeline on plan screen | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/utils/compliance.ts` | All compliance computation logic |
| `apps/mobile/components/compliance/ComplianceDot.tsx` | Single colored dot (green/amber/red/grey) |
| `apps/mobile/components/compliance/ComplianceBar.tsx` | Horizontal bar with colored segments |
| `apps/mobile/components/compliance/WeekTimeline.tsx` | Week-by-week color-coded timeline |
| `apps/mobile/components/compliance/ComplianceScore.tsx` | Percentage with color |

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/plan.tsx` | Add week compliance timeline |
| `packages/core/src/index.ts` | Export compliance utils |

## Implementation Details

### Per-Workout Compliance (P9-G-01)

```typescript
export function computeWorkoutCompliance(
  planned: {
    duration_minutes: number;
    tss?: number | null;
    distance_meters?: number | null;
  },
  actual: {
    duration_minutes: number;
    tss?: number | null;
    distance_meters?: number | null;
  },
): ComplianceResult;

interface ComplianceResult {
  readonly score: 'green' | 'amber' | 'red' | 'missed' | 'unplanned';
  readonly metric_used: 'tss' | 'duration' | 'distance';
  readonly planned_value: number;
  readonly actual_value: number;
  readonly ratio: number;         // actual / planned
  readonly direction: 'under' | 'over' | 'on_target';
}
```

**Logic:**
1. Select metric: if both planned.tss and actual.tss are non-null, use TSS. Else try duration. Else try distance.
2. Compute ratio: `actual / planned`
3. Determine score:
   - `0.8 <= ratio <= 1.2` → green, direction = on_target
   - `0.5 <= ratio < 0.8` → amber, direction = under
   - `1.2 < ratio <= 1.5` → amber, direction = over
   - `ratio < 0.5` → red, direction = under
   - `ratio > 1.5` → red, direction = over

**Edge cases:**
- Planned duration = 0 (rest day with activity) → unplanned
- Division by zero: if planned = 0, return unplanned
- Null actual: if no activity matched, status = missed (not computed here — handled by caller)

### Weekly Compliance (P9-G-02)

```typescript
export function computeWeeklyCompliance(
  workouts: Array<{
    compliance: ComplianceResult | null;
    sport: string;
    planned_duration_minutes: number;
    actual_duration_minutes?: number | null;
    planned_tss?: number | null;
    actual_tss?: number | null;
  }>,
): WeeklyCompliance;

interface WeeklyCompliance {
  readonly planned_sessions: number;
  readonly completed_sessions: number;
  readonly missed_sessions: number;
  readonly unplanned_sessions: number;
  readonly green_count: number;
  readonly amber_count: number;
  readonly red_count: number;
  readonly compliance_score: number;     // 0.0 to 1.0
  readonly compliance_color: 'green' | 'amber' | 'red';
  readonly planned_hours: number;
  readonly actual_hours: number;
  readonly planned_tss: number;
  readonly actual_tss: number;
}
```

**Score formula:**
```
score = sum(weight per workout) / planned_sessions
where: green = 1.0, amber = 0.5, red = 0.0, missed = 0.0
```

Rest days are excluded from planned_sessions count.

**Color thresholds:**
- `score >= 0.8` → green
- `score >= 0.5` → amber
- `score < 0.5` → red

### Block Compliance (P9-G-03)

Aggregates weekly compliance across the block:

```typescript
export function computeBlockCompliance(
  weeks: readonly WeeklyCompliance[],
): BlockCompliance;

interface BlockCompliance {
  readonly total_weeks: number;
  readonly weeks_completed: number;
  readonly overall_score: number;         // average of weekly scores
  readonly overall_color: 'green' | 'amber' | 'red';
  readonly trend: 'improving' | 'declining' | 'stable';
}
```

**Trend:** Compare last 3 weeks' scores. If increasing → improving, decreasing → declining, else stable.

### UI Components (P9-G-04)

**ComplianceDot:** Small colored circle (8-12px) used inline next to workout names.
```tsx
<ComplianceDot score="green" />  // → filled green circle
<ComplianceDot score="missed" /> // → filled red circle with X
<ComplianceDot score={null} />   // → grey outline (not yet completed)
```

**ComplianceBar:** Horizontal segmented bar showing green/amber/red proportions.
```tsx
<ComplianceBar green={5} amber={1} red={0} missed={1} total={7} />
```

**WeekTimeline:** Row of weekly compliance squares (like a GitHub contribution graph).
```tsx
<WeekTimeline weeks={weeklyCompliance} currentWeek={12} />
// Renders: [🟢][🟢][🟡][🟢][🟢][🟢][🟡][🟢][🟢][🟢][🔴][🟢][ ][ ]...
```

**ComplianceScore:** Percentage with colored text.
```tsx
<ComplianceScore value={0.91} />  // → "91%" in green
<ComplianceScore value={0.65} />  // → "65%" in amber
```

### Plan Screen Integration (P9-G-05)

Add to the plan tab (P9-E-05):
- Week compliance timeline at the top (below block name)
- Per-workout compliance dots in the week view
- Block overall compliance percentage

## Testing Requirements

### Unit Tests (packages/core)
- COMPLY-01: Green threshold (80-120%)
- COMPLY-02: Amber threshold (50-79%, 121-150%)
- COMPLY-03: Red threshold (<50%, >150%)
- COMPLY-04: Missed workout (no actual data)
- COMPLY-05: Unplanned activity (no planned workout)
- COMPLY-06: Metric priority (TSS used when available, falls back to duration)
- COMPLY-07: Weekly score computed correctly from individual workouts
- COMPLY-08: Weekly color thresholds (>=0.8 green, >=0.5 amber, <0.5 red)
- COMPLY-09: Block compliance aggregates weekly scores
- Edge: planned = 0 returns unplanned, not division by zero
- Edge: all workouts missed → score = 0, color = red
- Edge: no workouts in week → exclude from block average

### Component Tests
- ComplianceDot renders correct color for each score
- ComplianceBar renders proportional segments
- WeekTimeline highlights current week
- ComplianceScore shows correct percentage and color

## Verification Checklist

- [ ] Compliance computation handles all threshold boundaries
- [ ] Metric priority (TSS > Duration > Distance) works correctly
- [ ] Weekly aggregation produces correct scores
- [ ] Block aggregation produces correct scores and trend
- [ ] UI components render correct colors
- [ ] Week timeline shows on plan screen
- [ ] Plan tab shows block compliance percentage
- [ ] No division by zero or null reference errors
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
