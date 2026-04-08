# Fix Pre-existing Mobile Typecheck Errors

## Goal
`pnpm typecheck` was failing on `main` with three pre-existing errors that
nobody had noticed because typecheck isn't part of the CI lint job. Clean
them up so the working tree is green again.

## Files Changed
- `apps/mobile/styles/form-styles.ts` — `formInput` had `fontSize` but was
  typed `satisfies ViewStyle`. Changed to `TextStyle` (and imported it).
- `apps/mobile/app/season/__tests__/races.test.tsx` — `selectDate` null-checked
  `mockDateChangeCallback` but the narrowing was lost across the `act()`
  closure. Hoisted to a local `const callback` after the check.
- `apps/mobile/hooks/useTrainingPlan.ts` — `periodization` was a
  `PeriodizationPlan` being passed where `Json | undefined` was expected.
  Imported `Json` from `@khepri/supabase-client` and added an
  `as unknown as Json` cast at the boundary.
- `.claude/settings.json` — bundled local harness config tweak (schema URL +
  flat `model` field) since it was sitting in the working tree.

## Learnings
- These weren't introduced by recent work; they're long-standing because CI
  only runs lint, not typecheck. Worth wiring `pnpm typecheck` into the lint
  workflow so this doesn't happen again.
