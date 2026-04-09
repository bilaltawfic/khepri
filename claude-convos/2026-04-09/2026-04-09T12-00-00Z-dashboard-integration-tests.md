# P7.5-03: Dashboard Integration Tests

## Goals

Add integration-level tests for V2 dashboard states (DASH-02 through DASH-11) to the DashboardScreen test file, providing regression coverage for all manual test scenarios.

## Key Decisions

- Added integration tests at the DashboardScreen level, not just component-level (component tests already existed)
- Used JSON.stringify(toJSON()) pattern consistent with existing tests
- Handled React text node splitting (template literals with embedded expressions become separate JSON children)
- Provided realistic mock data for adaptation banner (required `affected_workouts` with `before`/`after` objects)

## Files Changed

- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` — Added 14 new integration tests covering:
  - DASH-02: Plan Block CTA (3 tests)
  - DASH-03: Active block full view (1 test)
  - DASH-04/05/06: Today's workout states (3 tests)
  - DASH-07: Upcoming workouts (1 test)
  - DASH-08: Week summary (1 test)
  - DASH-09: Season progress (1 test)
  - DASH-10: CTA dismiss (2 tests)
  - DASH-11: Check-in prompt (2 tests)
  - Adaptation banner (1 test)

## Learnings

- React splits JSX template literals like `{value}%` into separate text nodes `["83","%"]` in the serialized JSON, so `toContain('83%')` won't match. Use `toContain('"83"')` instead.
- `AdaptationCardFromRow` returns null when `affected_workouts` is empty — need realistic `before`/`after` objects.
- The `expo-env.d.ts` lint error is pre-existing (auto-generated file missing trailing newline).
