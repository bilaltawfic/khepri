# Copilot Review Feedback: Season Setup

**Date:** 2026-04-05
**PR:** #151
**Branch:** fix/onboarding-athlete-record-before-connect

## Goals
Address 4 Copilot review comments on PR #151 related to season setup context and races screen.

## Key Decisions

### 1. Tighten `isValidData` validation
- `typeof obj.preferences === 'object'` was accepting `null` and arrays
- Added explicit `!= null` check, `Array.isArray` rejection, and required field type checks for `weeklyHoursMin`, `weeklyHoursMax`, `trainingDays`, and `sportPriority`

### 2. Fix DatePicker visibility on Android
- `setShowDatePicker(Platform.OS === 'android')` was backwards (kept picker open on Android, closed on iOS)
- Changed to conditional: only dismiss on Android after selection

### 3. Preserve optional fields during import merge
- Re-import was replacing existing race entirely, losing `location` and `targetTimeSeconds`
- Now filters imported values to only defined entries and merges over existing race

### 4. Add AsyncStorage hydration migration
- Added `migrateDraft()` function called during hydration
- Maps legacy distance strings (`70.3` -> `Ironman 70.3`, `Half Ironman` -> `Ironman 70.3`, etc.)
- Appends missing `DEFAULT_SPORT_PRIORITY` entries (e.g., `Strength`) to existing sportPriority

## Files Changed
- `apps/mobile/contexts/SeasonSetupContext.tsx` - Fixes 1 and 4
- `apps/mobile/app/season/races.tsx` - Fixes 2 and 3
- `apps/mobile/__tests__/contexts/SeasonSetupContext.test.tsx` - Tests for validation and migration

## Testing
- All 1781 tests pass
- Biome lint clean on changed files
