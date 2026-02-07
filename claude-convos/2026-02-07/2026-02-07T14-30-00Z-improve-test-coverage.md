# Improve Test Coverage for SonarCloud Quality Gate

**Date:** 2026-02-07
**Goal:** Improve test coverage from 56.4% to above 80% for SonarCloud quality gate on new code

## Context

SonarCloud was reporting 56.4% coverage on new code, well below the 80% quality gate threshold. The user requested meaningful tests that verify functionality, not just tests for coverage sake.

## Key Decisions

1. **Focus on testable code**: React Native Modal components (FormDatePicker, FormSelect) can't be reliably tested with jest-expo/web due to Modal rendering issues. Added comment noting E2E tests should cover this.

2. **Test pure functions thoroughly**: Added comprehensive tests for `getGoalSubtitle`, `getConstraintSubtitle`, and all prompt builder functions since these are pure functions that can be tested reliably.

3. **Use ESM-compatible test patterns**: The ai-client package uses ESM, so tests import from `@jest/globals` instead of using global Jest functions.

4. **Skip navigation tests**: Nested Pressable navigation tests are unreliable in React Native Testing Library. Added comments noting E2E tests should verify navigation.

## Files Changed

### New Test Files
- `packages/ai-client/src/__tests__/client.test.ts` - 16 tests for CoachingClient constructor, createCoachingClient, and isConfigured
- `packages/ai-client/src/__tests__/prompts.test.ts` - 54 tests for all prompt builder functions

### Updated Test Files
- `apps/mobile/app/profile/__tests__/goals.test.tsx` - Added 21 tests for edge cases and GoalCard variants
- `apps/mobile/app/profile/__tests__/constraints.test.tsx` - Added 17 tests for edge cases and ConstraintCard variants
- `apps/mobile/components/__tests__/FormDatePicker.test.tsx` - Added note about Modal testing limitations

## Coverage Results

| Package | Before | After |
|---------|--------|-------|
| Mobile (goals.tsx) | 67.39% | 73.91% |
| Mobile (constraints.tsx) | 68.42% | 71.05% |
| AI-Client (All files) | 70.3% | 83.6% |
| AI-Client (prompts) | 0% | 96.82% |

## Learnings

1. **React Native Modal testing is problematic**: The Modal component doesn't render properly in jest-expo/web test environment. Tests that open modals and interact with modal content fail with cryptic removeChild errors.

2. **ESM mocking is complex**: Jest's `jest.mock()` doesn't work with ESM modules. Would need `jest.unstable_mockModule` for API mocking, but simpler to test what can be tested without mocking.

3. **Pure functions are test-friendly**: The prompt builders, subtitle generators, and helper functions were easy to test comprehensively since they have no side effects.

4. **Branch coverage matters**: SonarCloud looks at branch coverage too. Tests need to cover edge cases (null values, fallback conditions) to improve branch coverage.

---

## Session 2: Fixing SonarCloud Configuration

**Date:** 2026-02-07 (continued)
**Goal:** Investigate and fix why local coverage numbers don't match SonarCloud's 55.9%

### Root Cause Found

The discrepancy between local coverage (~80%) and SonarCloud (55.9%) had two causes:

1. **SonarCloud only received mobile coverage** - `sonar-project.properties` only included `apps/mobile/coverage/lcov.info`
2. **CI only ran mobile tests** - `.github/workflows/sonarcloud.yml` only ran `cd apps/mobile && pnpm jest --coverage`
3. **Large untested files in new code** - `notifications.ts` (234 lines, 0% coverage) was easily testable

### Files Changed

#### Configuration Files
- `sonar-project.properties` - Added ai-client coverage path
- `.github/workflows/sonarcloud.yml` - Added step to run ai-client tests with coverage

#### New Test Files
- `apps/mobile/services/__tests__/notifications.test.ts` - 20 tests covering all notification service functions (95.83% coverage)

#### Lint Fixes
- `eslint.config.js` - Fixed import order
- `apps/mobile/app/profile/__tests__/constraints.test.tsx` - Fixed `as any` to `as Constraint['constraintType']`
- `apps/mobile/app/profile/__tests__/goals.test.tsx` - Fixed `as any` to `as Goal['goalType']`

### Key Learnings

1. **SonarCloud reports what you send it**: If coverage reports aren't uploaded, SonarCloud won't show that coverage. Always verify the CI workflow uploads all coverage reports.

2. **Placeholder functions are testable**: Even stub functions (like notifications.ts before expo-notifications is installed) can be tested to verify their return values and behavior.

3. **The coverage gap was NOT about writing more tests, but about CI configuration**: The existing ai-client tests weren't being run in CI, so their coverage wasn't reported to SonarCloud.
