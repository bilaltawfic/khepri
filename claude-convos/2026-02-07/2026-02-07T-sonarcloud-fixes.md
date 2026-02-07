# SonarCloud Issue Resolution for PR #9

**Date:** 2026-02-07
**Branch:** feat/phase-2-core-coaching

## Goals

Resolve all SonarCloud code quality issues on PR #9, excluding TODO-related issues (S1135).

## Issues Fixed

### S3863 - Consolidate duplicate react-native imports
Fixed in 14 files by merging multiple `import { ... } from 'react-native'` statements into single consolidated imports.

### S6759 - Mark props as read-only
Added `Readonly<>` wrapper to component prop types across 13 components:
- TimeAvailableInput, SorenessInput, ScaleInput, HoursInput, ConstraintToggles
- HistoryItem, MetricBadge, CheckboxList
- ConstraintCard, AddConstraintCard, GoalCard, AddGoalCard, MenuItem

### S7735 - Unexpected negated conditions
Fixed negated ternary condition in goal-form.tsx validation:
- Changed `!data.targetDate ? A : B` to `data.targetDate ? B : A`

### S7781 - Use String#replaceAll()
Replaced `replace(/_/g, ' ')` with `replaceAll('_', ' ')` in:
- constraints.tsx (line 59)
- useCheckin.ts (line 241)

### S2933 - Make class members readonly
Added `readonly` modifier to CoachingClient private members:
- `private readonly client: Anthropic`
- `private readonly config: Required<...>`

### S6594 - Use RegExp.exec() instead of String.match()
Converted pattern matching in client.ts extractWorkoutRecommendation:
- `message.match(/pattern/)` → `/pattern/.exec(message)`

### S4043 - Use spread to avoid mutating array
Changed `raceGoals.sort()` to `[...raceGoals].sort()` in context-builder.ts to avoid mutating the original array.

### S7776 - Use Set.has() instead of Array.includes()
Changed HIGH_INTENSITY_LEVELS from array to Set in safety-tools.ts:
- `const HIGH_INTENSITY_LEVELS = new Set(['threshold', 'vo2max', 'sprint'])`
- Used `.has()` instead of `.includes()`

## Files Changed

19 files modified across:
- apps/mobile/app/(tabs)/ - 2 files
- apps/mobile/app/checkin/ - 1 file
- apps/mobile/app/profile/ - 5 files
- apps/mobile/components/ - 2 files
- apps/mobile/components/wellness/ - 5 files
- apps/mobile/hooks/ - 1 file
- packages/ai-client/src/ - 2 files
- packages/ai-client/src/tools/ - 1 file

## Learnings

1. Biome linter enforces alphabetical import ordering within import statements
2. Biome disallows non-null assertions (`!`) - use type assertions (`as`) instead
3. When consolidating imports, run `pnpm lint --fix` to ensure proper sorting
4. SonarCloud PR issues use `pullRequestId` parameter, not branch name

## Commands Used

```bash
# Fetch SonarCloud issues for PR
mcp__sonarqube__search_sonar_issues_in_projects with pullRequestId: 9

# Apply linter fixes
pnpm lint --fix

# Verify changes
pnpm lint
pnpm typecheck
pnpm test
```
