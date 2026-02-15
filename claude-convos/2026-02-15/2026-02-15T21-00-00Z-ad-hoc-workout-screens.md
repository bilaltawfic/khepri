# Ad-Hoc Workout Screens Implementation

## Date
2026-02-15

## Goals
- Build mobile screens for browsing and viewing gym and travel workout templates
- Create useWorkoutTemplates hook with source/category/difficulty filtering
- Implement list screen with filter chips and template cards
- Implement detail screen with exercise breakdown
- Wire navigation in root layout

## Key Decisions
- Used plain functions instead of `jest.fn()` for `getTemplateById` mock to avoid `clearAllMocks()` clearing implementations
- Used template literals for text rendering to ensure proper JSON serialization in tests (React Native renders `{value}text` as separate children)
- Used `useLocalSearchParams` from the global jest.setup mock with `mockReturnValue()` instead of re-mocking `expo-router` (avoids losing Stack/Tabs setup)
- Merged main into feature branch to get P7-C-02 travel templates before starting

## Files Created
- `apps/mobile/hooks/useWorkoutTemplates.ts` - Hook with source/category/difficulty filters
- `apps/mobile/hooks/__tests__/useWorkoutTemplates.test.ts` - Hook unit tests
- `apps/mobile/app/workouts/_layout.tsx` - Stack layout for workout screens
- `apps/mobile/app/workouts/index.tsx` - Template list/browse screen with filter chips
- `apps/mobile/app/workouts/[id].tsx` - Template detail screen with exercise breakdown
- `apps/mobile/app/workouts/__tests__/index.test.tsx` - List screen tests
- `apps/mobile/app/workouts/__tests__/[id].test.tsx` - Detail screen tests

## Files Modified
- `apps/mobile/hooks/index.ts` - Added useWorkoutTemplates export
- `apps/mobile/app/_layout.tsx` - Added workouts Stack.Screen entry

## Learnings
- `jest.clearAllMocks()` may clear `jest.fn()` implementations in certain configurations; use plain functions for mocks that don't need call tracking
- Template literal strings `{`${value}min`}` render as single text nodes in React Native, while `{value}min` renders as separate children
- When jest.setup.ts already mocks a module (expo-router), use `mockReturnValue()` on the existing mock instead of re-mocking to preserve other properties like Stack.Screen
