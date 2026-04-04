# P9-A-12: Season, Workout, Adaptation Core Types

## Goals
- Add TypeScript types, const arrays, and type guards for the season-based planning data model to `@khepri/core`
- These types support the mobile app, supabase-client queries, and Edge Functions

## Key Decisions
- Followed existing pattern from `wellness.ts`: const arrays -> derived types -> type guards accepting `unknown`
- Added `isComplianceColor` type guard (not in plan) since `COMPLIANCE_COLORS` const array was defined
- Placed test files in `src/__tests__/` following existing test location convention
- Used `import type` for cross-module type references (workout.ts imports ComplianceResult from adaptation.ts)

## Files Created
- `packages/core/src/types/season.ts` - Season, RaceBlock, SeasonPreferences, SeasonSkeleton, BlockPhase types
- `packages/core/src/types/workout.ts` - Workout, WorkoutStructure, WorkoutSection, WorkoutStep, Sport types
- `packages/core/src/types/adaptation.ts` - PlanAdaptation, WorkoutSnapshot, ComplianceResult types
- `packages/core/src/__tests__/season.test.ts` - Type guard tests for season types
- `packages/core/src/__tests__/workout.test.ts` - Type guard tests for workout types
- `packages/core/src/__tests__/adaptation.test.ts` - Type guard tests for adaptation types

## Files Modified
- `packages/core/src/types/index.ts` - Added barrel exports for season, workout, adaptation modules
- `packages/core/src/index.ts` - Added barrel exports for new types and type guards

## Learnings
- Biome enforces spaces (not tabs) for indentation in this project
- All type guards follow the same pattern: `typeof value === 'string' && (CONST as readonly string[]).includes(value)`
- All interfaces use `readonly` properties consistently
