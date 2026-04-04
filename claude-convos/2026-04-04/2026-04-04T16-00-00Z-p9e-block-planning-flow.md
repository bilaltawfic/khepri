# P9E: Block Planning Flow

## Date
2026-04-04

## Goals
Build the UI and backend for planning a race block: setting block-specific constraints, generating workouts for the full block, reviewing week-by-week, and locking in.

## Key Decisions
- Created a `useBlockPlanning` hook as a state machine managing the full block planning lifecycle (setup -> generating -> review -> locking -> done)
- Edge Function `generate-block-workouts` uses template-based generation with sport cycling, hard/easy alternation, and 3:1 load/recovery patterns
- Plan tab updated to show active block view with week navigation when a locked/in-progress block exists, falling back to legacy plan view
- Block planning flow uses Expo Router stack navigation with 3 screens: setup, review, lock-in

## Files Created
- `apps/mobile/hooks/useBlockPlanning.ts` - Block planning state machine hook
- `apps/mobile/app/plan/_layout.tsx` - Stack navigator for block planning flow
- `apps/mobile/app/plan/block-setup.tsx` - Block constraints and preferences screen
- `apps/mobile/app/plan/block-review.tsx` - Week-by-week workout review screen
- `apps/mobile/app/plan/block-lock.tsx` - Lock-in confirmation and sync screen
- `supabase/functions/generate-block-workouts/index.ts` - Edge Function for workout generation
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` - Hook tests
- `apps/mobile/app/plan/__tests__/block-setup.test.tsx` - Setup screen tests
- `apps/mobile/app/plan/__tests__/block-review.test.tsx` - Review screen tests
- `apps/mobile/app/plan/__tests__/block-lock.test.tsx` - Lock screen tests

## Files Modified
- `apps/mobile/app/(tabs)/plan.tsx` - Added active block view with week navigation, "Start Block Setup" CTA
- `apps/mobile/app/(tabs)/__tests__/plan.test.tsx` - Updated tests for new plan screen dependencies
- `apps/mobile/hooks/index.ts` - Added useBlockPlanning export

## Learnings
- React Native Web's `ThemedText` renders numbers as separate text nodes in JSON tree, requiring `toContain` to match fragments
- `fireEvent.press` on Button components with `variant="text"` doesn't always trigger in jest-expo/web test environment
- Biome auto-formatter handles shadow style deprecation warnings but they don't cause test failures
