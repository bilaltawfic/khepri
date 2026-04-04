# P9G: Compliance Tracking

**Date:** 2026-04-04  
**Branch:** feat/p9-g-compliance-tracking  
**Model:** Claude Sonnet 4.6

## Goals

Implement per-workout, weekly, and block-level compliance scoring that compares planned vs actual training. Display compliance as green/amber/red indicators throughout the plan screen.

## Key Decisions

### Type Naming Conflict
The existing `packages/core/src/types/adaptation.ts` already exports a `ComplianceResult` type (for plan adaptation tracking with different semantics). The new workout comparison result was named `WorkoutComplianceResult` to avoid the export collision.

### Metric Priority
TSS > Duration > Distance, per the plan spec. If both planned and actual TSS are non-null, TSS is used; otherwise distance if both have it; otherwise duration.

### Color Helper in Core
The `complianceColor()` helper was placed in `packages/core/src/utils/compliance.ts` (not in the mobile app) so it can be shared with any future non-mobile consumers (e.g., future web dashboard in P9I).

### noArrayIndexKey — Fixed by Named Segments
`ComplianceBar` originally used `segments.map((seg, i) => <View key={i} ...>)`. Biome's `noArrayIndexKey` lint rule rejected this. Fixed by using explicit named JSX elements (`{green > 0 && <View .../>}`) instead of a mapped array.

### Pre-existing Typecheck Errors
Three pre-existing TypeScript errors exist in the mobile package (unrelated to this work):
- `app/plan/__tests__/block-setup.test.tsx:174` — null type mismatch in test
- `hooks/useTrainingPlan.ts:154` — PeriodizationPlan not assignable to Json
- `styles/form-styles.ts:33` — fontSize in ViewStyle

These were present on the branch before this PR and are not introduced by this change.

### WeekTimeline in Plan Screen
Only shown when at least one week has past workouts (otherwise the timeline is empty and adds no value). Block compliance score shown in the header only when there is scored data.

## Files Changed

### New Files
- `packages/core/src/utils/compliance.ts` — All computation logic (workout, weekly, block)
- `packages/core/src/utils/compliance.test.ts` — 40+ unit tests covering all thresholds and edge cases
- `apps/mobile/components/compliance/ComplianceDot.tsx` — Coloured dot (green/amber/red/grey)
- `apps/mobile/components/compliance/ComplianceBar.tsx` — Horizontal segmented bar
- `apps/mobile/components/compliance/WeekTimeline.tsx` — Week-by-week colour-coded timeline
- `apps/mobile/components/compliance/ComplianceScore.tsx` — Percentage with colour
- `apps/mobile/components/compliance/__tests__/ComplianceDot.test.tsx`
- `apps/mobile/components/compliance/__tests__/ComplianceBar.test.tsx`
- `apps/mobile/components/compliance/__tests__/WeekTimeline.test.tsx`
- `apps/mobile/components/compliance/__tests__/ComplianceScore.test.tsx`

### Modified Files
- `packages/core/src/utils/index.ts` — Export compliance utils
- `packages/core/src/index.ts` — Re-export compliance utils
- `apps/mobile/app/(tabs)/plan.tsx` — Integrate ComplianceDot, WeekTimeline, ComplianceScore

## Test Results

- Core: 763 tests passed (16 suites)
- Mobile: 1668 tests passed (90 suites)
- Lint: clean (no errors, 15 pre-existing warnings)
- Build: success

## Learnings

- The turbo typecheck cache can mask newly-introduced errors; always force-run `pnpm --filter <pkg> typecheck` for changed packages.
- When a core package uses compiled output (`dist/`), `pnpm build` must be run before mobile typechecking will pick up new exports.
- Biome's `noArrayIndexKey` rule is stricter than ESLint's equivalent — even in cases where the array order is stable (like fixed-colour segments), it flags the pattern. Solution: use explicit named JSX conditional rendering.
