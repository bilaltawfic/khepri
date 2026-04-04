# P9B: Onboarding Simplification

## Goal

Reduce onboarding from 6 steps to 3 (Welcome → Connect Intervals.icu → Fitness Numbers). Remove goals, events, and plan steps. Persist Intervals.icu credentials during onboarding. Add a "Set Up Season" CTA to the dashboard for post-onboarding users.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 5
**Wave:** 2 (parallel with 9C, 9D, 9F)
**Depends on:** 9A
**Blocks:** 9E (indirectly, via dashboard CTA)

## Context

The current onboarding tries to do too much: collect setup data AND goals AND events AND create a training plan. The new season-based planning system handles goals and planning as a dedicated flow from the dashboard. Onboarding should just get the athlete's account set up and into the app fast.

**Current flow:** Welcome → Connect → Fitness → Goals → Events → Plan
**New flow:** Welcome → Connect → Fitness → Dashboard (with Season CTA)

### Key issues to fix
1. Intervals.icu credentials are validated but NOT persisted during onboarding (noted as "Phase 3 work pending")
2. Non-race events added during onboarding are silently discarded
3. Plan step generates a generic periodization that the redesign replaces

## Dependencies

- **P9-A-08** (seasons queries) — needed for dashboard CTA to check if season exists

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-B-01 | Remove goals step from onboarding | ⬜ |
| P9-B-02 | Remove events step from onboarding | ⬜ |
| P9-B-03 | Remove plan step from onboarding | ⬜ |
| P9-B-04 | Persist Intervals.icu credentials during onboarding | ⬜ |
| P9-B-05 | Update onboarding context (remove goals, events, planDuration) | ⬜ |
| P9-B-06 | Update onboarding save service | ⬜ |
| P9-B-07 | Add season setup CTA to dashboard | ⬜ |

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/app/onboarding/_layout.tsx` | Remove routes for goals, events, plan screens |
| `apps/mobile/app/onboarding/fitness.tsx` | Change "Next" to navigate to dashboard (was goals) |
| `apps/mobile/app/onboarding/connect.tsx` | Persist credentials to DB on successful connect |
| `apps/mobile/contexts/OnboardingContext.tsx` | Remove `goals`, `events`, `planDurationWeeks` from state. Remove `addGoal`, `removeGoal`, `updateGoal`, `setEvents`, `addEvent`, `removeEvent`, `setPlanDuration` methods. |
| `apps/mobile/services/onboarding.ts` | Remove goal creation, event-to-goal conversion, training plan creation from `saveOnboardingData`. Only save fitness numbers. |
| `apps/mobile/app/(tabs)/index.tsx` | Add Season CTA card when no active season exists |

## Files to Delete

| File | Reason |
|------|--------|
| `apps/mobile/app/onboarding/goals.tsx` | Step removed |
| `apps/mobile/app/onboarding/events.tsx` | Step removed |
| `apps/mobile/app/onboarding/plan.tsx` | Step removed |

## Implementation Steps

### 1. Update OnboardingContext

Remove from `OnboardingData`:
- `goals: OnboardingGoal[]`
- `events: OnboardingEvent[]`
- `planDurationWeeks?: number`

Remove context methods:
- `setGoals`, `addGoal`, `removeGoal`, `updateGoal`
- `setEvents`, `addEvent`, `removeEvent`
- `setPlanDuration`

Remove `OnboardingGoal` and `OnboardingEvent` types (or keep if used elsewhere — check first).

### 2. Update onboarding save service

In `saveOnboardingData()`:
- Keep: athlete profile creation/update with fitness numbers
- Remove: goal creation loop, race-event-to-goal conversion, training plan creation via `generatePeriodizationPlan`
- The function should only call `updateAthlete()` with fitness fields

### 3. Update fitness screen navigation

Change `fitness.tsx` finish handler:
```typescript
// Before: router.push('/onboarding/goals')
// After: save data and go to dashboard
await saveOnboardingData(user.id, onboardingData);
context.reset();
router.replace('/(tabs)');
```

### 4. Persist Intervals.icu credentials

In `connect.tsx`, on successful validation:
- Save credentials via the existing `credentials` Edge Function (or `useIntervalsConnection` hook's save method)
- This is already wired for the profile settings flow — reuse the same service call
- On success, auto-advance to fitness screen as before

### 5. Dashboard Season CTA

Add a card component at the top of the dashboard when:
- Athlete exists (onboarding complete)
- No active season (`getActiveSeason` returns null)

```tsx
<SeasonSetupCard onPress={() => router.push('/season/races')} />
```

The card shows:
- "Welcome to Khepri! Let's set up your {currentYear} season."
- "Set Up Season" button
- "or explore the app first" text link

### 6. Clean up layout

In `_layout.tsx`, remove Stack.Screen entries for goals, events, plan.

## Testing Requirements

### Unit Tests

| Test | What to verify |
|------|---------------|
| OB-NEW-01 | Onboarding has exactly 3 steps (welcome, connect, fitness) |
| OB-NEW-02 | No goals step in onboarding navigation |
| OB-NEW-03 | No events step in onboarding navigation |
| OB-NEW-04 | No plan step in onboarding navigation |
| OB-NEW-05 | Intervals.icu credentials persisted on connect |
| OB-NEW-06 | Fitness auto-sync works after connect |
| OB-NEW-07 | Post-onboarding dashboard shows season setup CTA |
| OB-NEW-08 | Skipping connect still allows completing onboarding |

### Existing Tests to Update

- `apps/mobile/app/onboarding/__tests__/` — Remove tests for goals, events, plan screens
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx` — Remove tests for goal/event/plan methods
- `apps/mobile/services/__tests__/onboarding.test.ts` — Remove tests for goal/plan saving
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` — Add test for Season CTA

## Verification Checklist

- [ ] Onboarding flow: Welcome → Connect → Fitness → Dashboard (3 steps)
- [ ] Goals, events, plan screens removed from navigation
- [ ] OnboardingContext has no goal/event/plan state
- [ ] `saveOnboardingData` only saves fitness numbers
- [ ] Intervals.icu credentials saved during onboarding connect step
- [ ] Dashboard shows "Set Up Season" CTA when no active season
- [ ] Existing onboarding tests updated (no test failures from removed screens)
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
