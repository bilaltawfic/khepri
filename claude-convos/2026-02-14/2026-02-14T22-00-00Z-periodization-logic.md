# Periodization Logic Implementation

**Date:** 2026-02-14
**Branch:** feat/p6-b-03-periodization-logic
**Task:** P6-B-03 - Implement training periodization utilities in core package

## Goals

Implement training periodization utilities in the core package that calculate training phases, intensity distributions, and weekly progressions for structured training plans.

## Key Decisions

### 1. Type-Safe Periodization Phases
- Defined periodization phases as const array (`PERIODIZATION_PHASES`) and derived type from it
- Ensures single source of truth for valid phase values
- Five phases: base, build, peak, taper, recovery

### 2. Evidence-Based Intensity Distributions
- Based on proven periodization models (Lydiard, Coggan, Friel)
- Each phase has recommended intensity distribution across 3 zones
- All distributions sum to exactly 100%

### 3. Classic 3:1 Progression Pattern
- 3 weeks of progressive overload followed by 1 recovery week
- Industry-standard approach for sustainable training load
- Taper phase uses progressive volume reduction instead

### 4. Flexible Phase Breakdown
- Short plans (≤8 weeks): Base → Build → Taper
- Standard plans (>8 weeks): Base → Build → Peak → Taper
- Automatic week allocation based on total plan duration (4-52 weeks)

### 5. Pure, Composable Functions
- All functions are pure (no side effects)
- Can be used individually or combined
- Easy to test and reason about

## Files Changed

### Created
- `packages/core/src/types/training.ts` - Training plan type definitions
  - PERIODIZATION_PHASES, TRAINING_FOCUS constants
  - PeriodizationPhase, TrainingFocus, IntensityDistribution types
  - PeriodizationPhaseConfig, WeeklyVolume, PeriodizationPlan interfaces

- `packages/core/src/utils/periodization.ts` - Periodization calculation functions
  - getIntensityDistribution() - Get intensity zones for each phase
  - getTrainingFocus() - Get training focus for each phase
  - calculatePhaseBreakdown() - Break down plan into phases
  - calculateWeeklyVolumes() - Generate weekly volume progression
  - generatePeriodizationPlan() - Complete plan generation

- `packages/core/src/utils/periodization.test.ts` - Comprehensive unit tests
  - 17 test cases covering all functions
  - Edge cases: invalid inputs, boundary conditions
  - Assertions: totals match, progressions work, distributions sum to 100

### Modified
- `packages/core/src/types/index.ts` - Export training types
- `packages/core/src/utils/index.ts` - Export periodization functions

## Testing

All tests passing (81 total in core package):
- ✅ Intensity distributions sum to 100
- ✅ Phase breakdown totals match input weeks
- ✅ Invalid week counts throw errors (< 4 or > 52)
- ✅ Weekly volumes generated for all weeks
- ✅ Week numbers are sequential
- ✅ Taper phase has progressively reduced volume
- ✅ Build phase follows 3:1 progression
- ✅ Complete plan includes phases and weekly volumes

## Learnings

### TypeScript Patterns
- Using `readonly` for immutable interfaces prevents accidental mutations
- Deriving types from const arrays (`typeof CONST[number]`) ensures type safety
- Exhaustiveness checks in switch statements catch missing cases at compile time

### Testing Strategy
- Testing each function independently before testing the composed function
- Using property-based assertions (e.g., "sum equals input") catch more bugs than example-based tests alone
- Boundary testing (4 weeks, 52 weeks) ensures edge cases work

### Code Organization
- Keeping internal helpers (validateIntensityDistribution, generatePhaseVolumes) private
- Exporting only the public API through index files
- Using JSDoc comments for function documentation

## Next Steps

This implementation blocks P6-B-04 (Plan generation Edge Function), which will consume these utilities to generate personalized training plans based on athlete constraints and goals.

The utilities are ready to be used in:
- Edge Function plan generation
- Mobile app plan visualization
- Future enhancements (block periodization, reverse periodization)

## Code Quality

- ✅ All tests pass (pnpm test)
- ✅ TypeScript compiles without errors (pnpm typecheck)
- ✅ Build successful (pnpm build)
- ✅ Biome formatting applied (pnpm lint:fix)
- ✅ Follows project conventions (readonly props, type derivation, exhaustiveness checks)
