# P9I: Dashboard Redesign

## Goal

Redesign the dashboard to show today's workout with full structured detail, upcoming sessions, weekly compliance, season progress, and coach adaptation suggestions. Handle three states: no season, active season without block, active block.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 8
**Wave:** 5 (must go last)
**Depends on:** 9G, 9H
**Blocks:** Nothing — final subphase

## Context

The current dashboard shows a check-in prompt, recent activities, and training metrics. The redesign makes the dashboard the command center: what to do today, how you're tracking this week, and where you are in your season.

### Dashboard States

1. **No season** → "Set Up Season" CTA (P9-B-07, built in P9B)
2. **Season exists, no active block** → "Plan First Block" CTA
3. **Active block** → Full dashboard with workout, compliance, progress

## Dependencies

- **P9-G** (compliance) — compliance dots, weekly scores, block score
- **P9-H** (coach adaptations) — adaptation banner above today's workout

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-I-01 | Today's workout card (full structured detail) | ⬜ |
| P9-I-02 | Coach adaptation banner (above today's workout) | ⬜ |
| P9-I-03 | Upcoming 3 days (headlines) | ⬜ |
| P9-I-04 | Weekly compliance summary | ⬜ |
| P9-I-05 | Season progress bar | ⬜ |
| P9-I-06 | Integrate new dashboard components | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/mobile/components/dashboard/TodayWorkout.tsx` | Full workout structure card |
| `apps/mobile/components/dashboard/AdaptationBanner.tsx` | Coach suggestion with accept/reject |
| `apps/mobile/components/dashboard/Upcoming.tsx` | Next 3 days workout headlines |
| `apps/mobile/components/dashboard/WeekSummary.tsx` | Weekly compliance + hours |
| `apps/mobile/components/dashboard/SeasonProgress.tsx` | Progress bar to next race |
| `apps/mobile/components/dashboard/PlanBlockCTA.tsx` | "Plan First Block" card |
| `apps/mobile/hooks/useDashboardV2.ts` | Hook fetching all dashboard data |

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/app/(tabs)/index.tsx` | Replace current dashboard with new layout |
| `apps/mobile/hooks/useDashboard.ts` | May deprecate in favor of useDashboardV2 or extend |

## Implementation Details

### Dashboard Layout (Active Block)

```
┌──────────────────────────────────────────────┐
│ [AdaptationBanner - if pending suggestion]   │
│                                              │
│ [TodayWorkout - full structured detail]      │
│                                              │
│ [Upcoming - next 3 days headlines]           │
│                                              │
│ [WeekSummary - compliance + hours]           │
│                                              │
│ [SeasonProgress - block name + race bar]     │
│                                              │
│ [Existing: Check-in prompt if not done]      │
│ [Existing: Recent activities from I.icu]     │
└──────────────────────────────────────────────┘
```

### TodayWorkout Card (P9-I-01)

Shows today's planned workout with full structure:

```tsx
interface TodayWorkoutProps {
  workout: Workout | null;
  isRestDay: boolean;
}
```

**Layout:**
```
┌────────────────────────────────────────────┐
│ TODAY · Tuesday, April 7                   │
│                                            │
│ Bike - Threshold Intervals (60m)           │
│ 🟢 Synced to Intervals.icu                │
│                                            │
│ Warmup                                     │
│   10m ramp 50-75% FTP                      │
│                                            │
│ Main Set 4x                                │
│   8m @ 95-105% FTP                         │
│   4m @ 55% FTP                             │
│                                            │
│ Cooldown                                   │
│   10m @ 50% FTP                            │
└────────────────────────────────────────────┘
```

- Renders from `workout.structure` (WorkoutStructure JSON), NOT from DSL
- Shows sync status badge (synced/pending/not connected)
- If workout completed: show compliance dot + actual vs planned comparison
- If rest day: "Rest Day — Recovery and adaptation"
- If no workout today: "No workout planned for today"

### AdaptationBanner (P9-I-02)

Shown above TodayWorkout when a pending adaptation exists:

```tsx
interface AdaptationBannerProps {
  adaptation: PlanAdaptation;    // status === 'suggested'
  onAccept: () => void;
  onReject: () => void;
}
```

Re-uses `AdaptationCard` from P9-H-02 but in a banner/compact format suitable for the dashboard. Full detail available via expand or tap.

### Upcoming 3 Days (P9-I-03)

```tsx
interface UpcomingProps {
  workouts: Workout[];           // Next 3 days of planned workouts
}
```

**Layout:**
```
UPCOMING
Wed  🏊  Swim - Aerobic Endurance    45m
Thu  🏃  Run - Tempo Intervals        50m
Fri  💤  Rest
```

- Sport emoji/icon + name + duration
- Compliance dot if already completed (for past days visible in range)
- Tap navigates to workout detail on plan tab

### Weekly Compliance Summary (P9-I-04)

```tsx
interface WeekSummaryProps {
  compliance: WeeklyCompliance;
  currentDay: number;            // 1-7 within the week
}
```

**Layout:**
```
THIS WEEK
4 completed · 3 remaining · 8.5h planned
🟢🟢🟢🟡 · · ·     87%
```

- Uses ComplianceDot from P9-G-04 for each day
- Empty dots for future days
- Compliance percentage with color
- Planned vs actual hours

### Season Progress Bar (P9-I-05)

```tsx
interface SeasonProgressProps {
  season: Season;
  currentBlock: RaceBlock;
  nextRace?: { name: string; date: string; daysUntil: number };
}
```

**Layout:**
```
70.3 #1 Prep · Week 12 of 20 · Block: 🟢 91%
━━━━━━━━━━━━━━━━━━■━━━━━━  Race Jun 7 (62 days)
```

- Block name and week
- Progress bar showing position within block
- Race marker at end (if race block)
- Days until next race
- Block compliance percentage

### PlanBlockCTA (state: season exists, no active block)

```
┌──────────────────────────────────────────────┐
│ Your 2026 season is set up!                  │
│                                              │
│ Next: Plan your first training block.        │
│                                              │
│ Next race: Ironman 70.3 #1 (Jun 7)          │
│                                              │
│ [Plan First Block →]                         │
└──────────────────────────────────────────────┘
```

### useDashboardV2 Hook

Fetches all data needed for the dashboard:

```typescript
interface DashboardV2Data {
  // Season state
  season: Season | null;
  activeBlock: RaceBlock | null;

  // Today
  todayWorkout: Workout | null;
  pendingAdaptation: PlanAdaptation | null;

  // Upcoming
  upcomingWorkouts: Workout[];         // Next 3 days

  // Compliance
  weeklyCompliance: WeeklyCompliance | null;

  // Progress
  nextRace: { name: string; date: string; daysUntil: number } | null;
  blockWeek: number;

  // Existing (preserve from current dashboard)
  checkInDone: boolean;
  recentActivities: Activity[];
}

export function useDashboardV2(): {
  data: DashboardV2Data;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};
```

**Data sources:**
- `getActiveSeason()` — from P9-A-08
- `getActiveBlock()` — race_blocks where status = 'in_progress' or 'locked'
- `getWorkoutsForDate()` — today's workouts
- `getWorkoutsForDateRange()` — next 3 days
- `getPendingAdaptation()` — plan_adaptations where status = 'suggested'
- `getWeeklyCompliance()` — computed from this week's workouts
- Existing: check-in status, recent activities

### Preserving Existing Dashboard Features

The redesign adds new components but should preserve:
- Daily check-in prompt (if not done today)
- Recent activities from Intervals.icu
- Training metrics summary

These move below the new components. The check-in prompt could be integrated: if check-in not done, show it prominently above TodayWorkout ("Complete your check-in for personalized coaching").

## Testing Requirements

### Component Tests
- DASH-NEW-01: No season: shows setup CTA (from P9-B)
- DASH-NEW-02: Season but no block: shows "Plan First Block" CTA
- DASH-NEW-03: Active block: shows today's workout with full structure
- DASH-NEW-04: Upcoming 3 days shown as headlines
- DASH-NEW-05: Weekly compliance dots render correctly
- DASH-NEW-06: Block progress bar and compliance percentage shown
- DASH-NEW-07: Coach adaptation suggestion shown above today's workout
- DASH-NEW-08: Season progress shows weeks to next race
- Rest day display: correct message and styling
- No workout day: correct empty state
- Completed workout: shows compliance dot with actual vs planned

### Hook Tests
- useDashboardV2 returns correct state for each dashboard state
- Loading state while fetching
- Error state on fetch failure
- Refresh refetches all data

### Integration Tests
- Full dashboard renders with real data flow
- Check-in prompt appears when not done
- Adaptation accept/reject updates dashboard

## Verification Checklist

- [ ] Three dashboard states render correctly (no season, no block, active block)
- [ ] Today's workout shows full structured detail
- [ ] Adaptation banner shows with accept/reject when pending
- [ ] Upcoming 3 days shows sport + name + duration
- [ ] Weekly compliance dots are accurate
- [ ] Season progress bar shows block position + days to race
- [ ] Existing features preserved (check-in, activities)
- [ ] Pull-to-refresh works
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
