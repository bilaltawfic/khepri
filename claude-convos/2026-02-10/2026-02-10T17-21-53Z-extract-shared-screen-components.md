# Extract Shared Screen State Components

**Date:** 2026-02-10
**Prompt:** SonarCloud failing PR #45 with 9.6% duplication (threshold 3%). User asked to investigate the duplication, then extract shared components instead of adding CPD exclusions. User also asked to check all screens for the same patterns.

## Decision

Extracted 4 shared components from duplicated patterns found across 7 screen files:

1. **LoadingState** - ActivityIndicator + message (used in 6 files)
2. **ErrorState** - Icon + optional title + message + optional action button (used in 6 files)
3. **EmptyState** - Themed card with icon + optional title + message (used in 3 files)
4. **TipCard** - Bordered card with icon + tip message (used in 4 files)

## Files Modified

- Created: `LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `TipCard.tsx` + tests for each
- Refactored: `constraints.tsx`, `chat.tsx`, `fitness-numbers.tsx`, `constraint-form.tsx`, `personal-info.tsx`, `onboarding/goals.tsx`
- Updated: `components/index.ts` with 4 new exports

## Two-PR Strategy

- **PR 1** (this work): Extract shared components + refactor all screens except `goals.tsx` (profile)
- **PR 2** (existing PR #45): After PR 1 merges, rebase and refactor `goals.tsx` to use shared components, fixing SonarCloud duplication

## Impact

- ~250 lines of duplicated StyleSheet + JSX removed across 6 files
- ~200 lines added (4 components + 4 test files)
- 18 new component tests, all 893 existing tests continue to pass
