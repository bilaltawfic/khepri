# Phase 1 Workstream A: Core Package Setup

**Date**: 2026-02-08
**Branches**: feat/p1-a-01 through feat/p1-a-04
**PRs**: #21 onwards

## Goals

Create `@khepri/core` shared package with common types, utilities, and constants used across the monorepo. Implementation follows the plan in `plans/phase-1/p1-a-core-package.md`.

## Key Decisions

1. **Follow supabase-client pattern**: Package structure, tsconfig, jest config all mirror the established pattern
2. **ESM with .js extensions**: Consistent with existing packages
3. **Keep domain types in their packages**: Core provides shared enums, type guards, and utilities only
4. **Type guards for runtime validation**: All shared types include type guard functions with tests
5. **Enhanced formatters**: Core formatters fix edge cases (e.g., `formatDuration(0)` returns `'0:00'` instead of `''`)

## PRs

### P1-A-01: Core package structure (#21)
- Created package.json, tsconfig.json, jest.config.js, src/index.ts
- Copilot feedback: Added `export {}` to make index.ts a valid module

### P1-A-02: Extract shared types (#26)
- wellness.ts (BodyArea, SorenessAreas, TravelStatus)
- time.ts (AvailableTimeMinutes)
- constraints.ts (DailyConstraintType)
- Type guard tests with unknown input support
- Copilot feedback: Derive types from const arrays, accept unknown in guards, test via barrel exports

### P1-A-03: Utility functions (#28)
- formatters.ts (formatDate, formatDateRange, formatDuration, formatMinutes, getToday)
- validators.ts (isInRange, isValidWellnessMetric, isValidISODate)
- Enhanced formatDuration: returns '0:00' for 0 (mobile returned '')
- 28 formatter + validator tests covering edge cases

### P1-A-04: Mobile app integration (#29)
- Add @khepri/core workspace dependency to mobile
- Update types/checkin.ts to re-export shared types from @khepri/core
- Update utils/formatters.ts to re-export from @khepri/core
- Add jest moduleNameMapper for @khepri/core source resolution
- Update formatDuration test for new 0→'0:00' behavior
- All 620 mobile tests passing

## Learnings

1. **Module marker required**: TypeScript treats comment-only files as scripts, not modules. Always include `export {}` in initially empty barrel files.
2. **AI Conversation Logging CI**: PRs require a claude-convos log entry to pass CI checks.
3. **Single source of truth for types**: Derive union types from const arrays (`typeof CONST[number]`) to prevent drift.
4. **Type guards accept unknown**: For runtime validation, type guards should accept `unknown` with `typeof` checks.
5. **SonarCloud coverage**: New packages need coverage added to `sonar-project.properties` and workflow.
