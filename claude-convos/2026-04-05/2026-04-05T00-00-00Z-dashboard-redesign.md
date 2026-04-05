# P9-I: Dashboard Redesign

## Date
2026-04-05

## Goals
- Redesign the dashboard to show today's workout with full structured detail
- Add upcoming sessions, weekly compliance, season progress, and coach adaptation suggestions
- Handle three dashboard states: no season, active season without block, active block
- Preserve existing dashboard features (check-in, activities, training load)

## Key Decisions
- Created `useDashboardV2` hook alongside existing `useDashboard` to avoid breaking changes
- Used existing `AdaptationCardFromRow` in `AdaptationBanner` to avoid duplication
- Computed weekly compliance client-side using `computeWeeklyCompliance` from core
- Fetched next race from block's `goal_id` using `getGoalById`
- Kept existing dashboard cards (Training Load, Recent Activities, Upcoming Events) below new components
- Legacy Today's Workout card (from check-in) only shown when no active block

## Files Created
- `apps/mobile/hooks/useDashboardV2.ts` - Hook fetching all dashboard v2 data
- `apps/mobile/components/dashboard/TodayWorkout.tsx` - Full workout structure card
- `apps/mobile/components/dashboard/AdaptationBanner.tsx` - Coach suggestion wrapper
- `apps/mobile/components/dashboard/Upcoming.tsx` - Next 3 days workout headlines
- `apps/mobile/components/dashboard/WeekSummary.tsx` - Weekly compliance + hours
- `apps/mobile/components/dashboard/SeasonProgress.tsx` - Progress bar to next race
- `apps/mobile/components/dashboard/PlanBlockCTA.tsx` - "Plan First Block" card
- `apps/mobile/components/dashboard/__tests__/TodayWorkout.test.tsx`
- `apps/mobile/components/dashboard/__tests__/AdaptationBanner.test.tsx`
- `apps/mobile/components/dashboard/__tests__/Upcoming.test.tsx`
- `apps/mobile/components/dashboard/__tests__/WeekSummary.test.tsx`
- `apps/mobile/components/dashboard/__tests__/SeasonProgress.test.tsx`
- `apps/mobile/components/dashboard/__tests__/PlanBlockCTA.test.tsx`
- `apps/mobile/hooks/__tests__/useDashboardV2.test.ts`

## Files Modified
- `apps/mobile/app/(tabs)/index.tsx` - Integrated new dashboard components
- `apps/mobile/hooks/index.ts` - Added useDashboardV2 export
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` - Updated to mock useDashboardV2

## Learnings
- React Native text template literals are split into separate children in JSON serialization, requiring individual substring assertions in tests
- `as const` creates readonly arrays incompatible with `Json[]` type - use explicit type annotations for test fixtures instead
- Existing pre-existing type errors in `useTrainingPlan.ts`, `form-styles.ts`, `block-setup.test.tsx` are unrelated to this change
