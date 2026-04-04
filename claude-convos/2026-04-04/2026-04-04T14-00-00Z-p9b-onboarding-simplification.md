# P9B: Onboarding Simplification

## Date
2026-04-04

## Goals
- Reduce onboarding from 6 steps to 3 (Welcome, Connect, Fitness)
- Remove goals, events, and plan steps from onboarding
- Persist Intervals.icu credentials during onboarding connect step
- Add "Set Up Season" CTA to dashboard for post-onboarding users
- Simplify onboarding save service to only save fitness numbers

## Key Decisions
1. **OnboardingContext simplified**: Removed `goals`, `events`, `planDurationWeeks` state and all related methods (`setGoals`, `addGoal`, `removeGoal`, `updateGoal`, `setEvents`, `addEvent`, `removeEvent`, `setPlanDuration`). Also removed `OnboardingGoal`, `OnboardingEvent` types and `MAX_GOALS`, `MAX_EVENTS` constants.
2. **Onboarding service simplified**: Removed goal creation, event-to-goal conversion, and training plan creation from `saveOnboardingData()`. The function now only saves fitness numbers via `updateAthlete()`.
3. **Fitness screen now finishes onboarding**: Changed navigation from `/onboarding/goals` to `/(tabs)` (dashboard). The fitness screen now calls `saveOnboardingData()` and `reset()` before navigating.
4. **Connect screen already persists credentials**: The `useIntervalsConnection.connect()` hook already saves credentials to the server via the `saveCredentials` service. No changes needed.
5. **Season CTA uses `as never` cast**: The `/season/races` route doesn't exist yet (P9C), so the router.push call uses a type assertion. This will be resolved when P9C adds the route.
6. **New `useActiveSeason` hook**: Created to check if an active season exists for the dashboard CTA.

## Files Changed
- `apps/mobile/contexts/OnboardingContext.tsx` - Removed goals/events/plan state and methods
- `apps/mobile/contexts/index.ts` - Updated exports
- `apps/mobile/services/onboarding.ts` - Simplified to only save fitness numbers
- `apps/mobile/app/onboarding/_layout.tsx` - Removed goals/events/plan screen entries
- `apps/mobile/app/onboarding/fitness.tsx` - Navigate to dashboard, save data
- `apps/mobile/app/(tabs)/index.tsx` - Added SeasonSetupCard CTA
- `apps/mobile/hooks/useActiveSeason.ts` - New hook for season check
- `apps/mobile/hooks/index.ts` - Export new hook

### Deleted Files
- `apps/mobile/app/onboarding/goals.tsx`
- `apps/mobile/app/onboarding/events.tsx`
- `apps/mobile/app/onboarding/plan.tsx`
- `apps/mobile/app/onboarding/__tests__/goals.test.tsx`
- `apps/mobile/app/onboarding/__tests__/events.test.tsx`
- `apps/mobile/app/onboarding/__tests__/plan.test.tsx`

### Updated Tests
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx`
- `apps/mobile/services/__tests__/onboarding.test.ts`
- `apps/mobile/app/onboarding/__tests__/fitness.test.tsx`
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx`
- `apps/mobile/hooks/__tests__/useActiveSeason.test.ts` (new)

## Learnings
- The connect screen already persisted Intervals.icu credentials via `useIntervalsConnection.connect()` which calls `saveCredentials`. The onboarding context values were only used as a boolean gate for fitness auto-sync.
- The `expo-router` type system requires routes to be registered; used `as never` cast for the future `/season/races` route.
