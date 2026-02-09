# P2-A-02: Onboarding Context Implementation

**Date:** 2026-02-09
**Task:** Create onboarding context for multi-step data persistence
**PR:** #36

## Goals

Implement a React Context to persist onboarding data across multiple screens, enabling the multi-step onboarding flow to share state.

## Key Decisions

1. **Factory Function for Initial State**: Used `getInitialData()` factory function instead of a shared constant to prevent mutable shared state across test runs and component instances.

2. **Context Structure**: Created `OnboardingContext` with:
   - `data`: OnboardingData object containing goals, fitnessProfile, and optional intervalsCredentials
   - `setGoals()`: Set training goals
   - `setFitnessProfile()`: Set fitness profile data
   - `setIntervalsCredentials()` / `clearIntervalsCredentials()`: Manage Intervals.icu API credentials
   - `reset()`: Clear all onboarding data

3. **Integration with Connect Screen**: Wired the connect screen to persist credentials to context on successful connection, and clear credentials when skipping.

4. **Strict Validation**: Credentials are trimmed before persisting to avoid whitespace issues.

## Files Changed

- `apps/mobile/contexts/OnboardingContext.tsx` - New context provider
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx` - 23 comprehensive tests
- `apps/mobile/app/onboarding/connect.tsx` - Wired to use context
- `apps/mobile/app/onboarding/__tests__/connect.test.tsx` - Added context persistence tests

## Learnings

1. **Factory Functions Prevent Test Pollution**: Using `getInitialData()` instead of a shared object constant prevents tests from affecting each other through shared mutable state.

2. **Test Context Persistence**: When testing context integration, use a `ContextObserver` component with a ref to capture context values for assertion.

3. **Clear State on Skip Flow**: Important to clear context state when user skips a step, not just when they explicitly clear data.

## Copilot Review Feedback Addressed

- Used factory function for initial state to prevent mutable shared state
- Added comprehensive tests for context persistence
- Clear credentials when skipping connection setup
