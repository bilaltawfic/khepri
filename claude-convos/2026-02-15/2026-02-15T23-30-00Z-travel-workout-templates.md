# Travel Workout Templates (P7-C-02)

## Date
2026-02-15

## Goals
- Add 6 travel-friendly workout templates to `@khepri/core`
- Mirror the existing gym template system from P7-C-01
- Bodyweight-focused workouts for athletes traveling without gym access

## Key Decisions
- Created 6 templates covering different categories: core, strength, mobility, plyometric
- Templates span all difficulty levels: beginner, intermediate, advanced
- Followed exact same patterns as `gym.ts` for consistency
- Used valid `MuscleGroup` values from the shared types system

## Templates Created
1. `hotel-room-circuit` - Bodyweight circuit for small spaces (core, beginner, 20min)
2. `park-strength` - Outdoor workout with benches/bars (strength, intermediate, 35min)
3. `band-resistance-travel` - Resistance band workout (strength, intermediate, 30min)
4. `airport-mobility` - Standing mobility routine (mobility, beginner, 15min)
5. `bodyweight-hiit` - High-intensity bodyweight intervals (plyometric, advanced, 25min)
6. `yoga-for-cyclists` - Yoga flexibility routine (mobility, beginner, 30min)

## Files Changed
- `packages/core/src/templates/travel.ts` (new) - Travel template data + lookup functions
- `packages/core/src/__tests__/travel-templates.test.ts` (new) - Template validation tests
- `packages/core/src/templates/index.ts` (modified) - Added travel exports
- `packages/core/src/index.ts` (modified) - Added travel re-exports

## Learnings
- Biome auto-formats long arrays to single lines when they fit
- Need to be careful about unused imports when mirroring test files (isMuscleGroup not needed since MUSCLE_GROUPS is used directly)
