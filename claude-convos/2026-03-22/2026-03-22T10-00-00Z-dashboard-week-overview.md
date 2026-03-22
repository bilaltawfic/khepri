# Dashboard Weekly Training Plan Overview

## Date
2026-03-22

## Goals
- Add a "This Week" training plan overview card to the dashboard
- Show current week number, phase info, and daily workout summary
- Position above Training Load card (below Today's Workout)

## Key Decisions
1. **Core utility in `@khepri/core`**: Created `getCurrentWeekInfo()` in `packages/core/src/utils/week-overview.ts` to extract current week info from training plan data. This keeps the logic testable and reusable across packages.
2. **Validated JSON parsing**: Since `periodization` and `weekly_template` are stored as JSONB (typed as `Json`), we validate the structure at runtime before using it, following existing codebase patterns.
3. **Compact day display**: Each day shows a single-letter label (M/T/W/T/F/S/S) with a category abbreviation (Run, Bike, Swim, Gym, Rest). Today's slot is highlighted with the primary color.
4. **Progress bar**: Added a simple progress bar showing week X of Y progress through the plan.
5. **Conditional rendering**: Card only appears when there's an active plan with a valid current week (not before start, not after end).

## Files Changed
- `packages/core/src/utils/week-overview.ts` — New utility with `getCurrentWeekInfo`, `calculateCurrentWeek`, `getCurrentPhase`, `getTodayDayIndex`, formatting helpers
- `packages/core/src/utils/week-overview.test.ts` — Unit tests for all utility functions
- `packages/core/src/utils/index.ts` — Barrel export for week-overview
- `packages/core/src/index.ts` — Re-export from package root
- `apps/mobile/components/WeekOverviewCard.tsx` — New dashboard card component
- `apps/mobile/components/__tests__/WeekOverviewCard.test.tsx` — Component tests
- `apps/mobile/hooks/useWeekOverview.ts` — Hook combining `useTrainingPlan` with `getCurrentWeekInfo`
- `apps/mobile/hooks/__tests__/useWeekOverview.test.ts` — Hook tests
- `apps/mobile/hooks/index.ts` — Export new hook
- `apps/mobile/app/(tabs)/index.tsx` — Added WeekOverviewCard between Today's Workout and Training Load
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` — Updated mock to include `useWeekOverview`

## Learnings
- React Native's `ThemedText` with template literals (`Week {n} of {m}`) renders as separate text nodes in test JSON output. Tests need to check for individual parts rather than the full concatenated string.
- Following the existing pattern of `toJSON()` + `JSON.stringify()` for component tests works well for this project.
