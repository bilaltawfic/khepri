# Training Analysis Utilities

**Date:** 2026-02-15
**Task:** P7-B-01 - Add Training Analysis Utility Functions

## Goals

Create pure utility functions in `@khepri/core` that analyze training data (CTL/ATL/TSB trends, weekly load, recovery, race readiness) to power race countdown and training review screens.

## Key Decisions

- All 5 analysis functions are pure (no side effects, no API calls)
- Functions return `null` for insufficient data rather than throwing
- Used `readonly` arrays to prevent mutation
- Race readiness accepts optional `today` param for deterministic testing
- Reused existing `getToday()` from formatters for date handling
- Created private `getISOWeekStart` and `daysBetween` helpers (not exported)

## Files Changed

- `packages/core/src/types/analysis.ts` - New analysis type definitions (7 types)
- `packages/core/src/utils/analysis.ts` - 5 analysis functions + 3 private helpers
- `packages/core/src/types/index.ts` - Export analysis types
- `packages/core/src/utils/index.ts` - Export analysis functions
- `packages/core/src/index.ts` - Re-export from barrel
- `packages/core/src/__tests__/analysis.test.ts` - 39 comprehensive tests

## Functions Implemented

1. `getFormStatus(tsb)` - Categorize TSB into form status
2. `calculateFormTrend(data)` - Analyze form direction over a window
3. `calculateWeeklyLoads(activities)` - Group activities by ISO week
4. `assessRecovery(data)` - Assess recovery state and recommendations
5. `calculateRaceReadiness(data, raceDate, today?)` - Project race day form

## Learnings

- ISO week start calculation needs special handling for Sunday (day 0 maps to -6 offset)
- Using `formatDateAsYMD` with local time avoids timezone-related date shifts in week grouping
- Boundary value testing is essential for threshold-based categorization functions
