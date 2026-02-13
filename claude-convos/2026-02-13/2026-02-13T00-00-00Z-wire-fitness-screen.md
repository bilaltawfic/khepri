# Wire Onboarding Fitness Screen to Context

**Date:** 2026-02-13
**PR:** #48
**Branch:** `feat/p2-a-03-fitness-screen-wire`

## Goals
- Wire the onboarding fitness screen to use OnboardingContext for state management
- Make all inputs editable (remove `editable={false}`)
- Add form validation with error display
- Write comprehensive tests

## Key Decisions
- Used `Readonly<>` wrapper on FitnessInputProps for Copilot compliance
- Separated `handleContinue` (validates + saves) from `handleSkip` (just navigates)
- All fields optional - empty values pass validation
- Validation only on numeric fields with known ranges (FTP, LTHR, resting HR, max HR)
- Threshold pace and CSS have no validation since they use time format (mm:ss)
- Initialize form from context data for back-navigation support
- Used `ContextObserver` pattern from goals test for testing context integration

## Files Changed
- `apps/mobile/app/onboarding/fitness.tsx` - Main implementation
- `apps/mobile/app/onboarding/__tests__/fitness.test.tsx` - Tests (10 -> 29)

## Learnings
- Biome enforces line-breaking for long template literal assignments
- turbo test passthrough needs double `--` separator
- The goals test file provides a good pattern for testing context-wired screens
