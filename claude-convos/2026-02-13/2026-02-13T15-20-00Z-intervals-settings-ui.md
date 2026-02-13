# Intervals.icu Connection Settings UI

## Date
2026-02-13

## Goals
- Create a profile settings screen for Intervals.icu API credentials
- Implement input validation for Athlete ID and API Key
- Add comprehensive tests following existing patterns

## Key Decisions
- Used `secondary` Button variant for disconnect (not `destructive` which doesn't exist yet)
- Relaxed API key validation to length-only check (>=20 chars) instead of alphanumeric regex, since real API keys may contain special characters
- Used `toJSON()` + `JSON.stringify` + `toContain` pattern for text assertions (not `getByText`) per project convention
- Async `handleConnect` requires `waitFor` in tests for state update assertions
- Trim credentials before saving to avoid whitespace issues in API calls
- FormData type marked as `Readonly` per Copilot review pattern

## Files Changed
- `apps/mobile/app/profile/_layout.tsx` - Added intervals route
- `apps/mobile/app/profile/intervals.tsx` - New settings screen (326 lines)
- `apps/mobile/app/profile/__tests__/intervals.test.tsx` - 24 tests

## Learnings
- `getByText` doesn't work reliably in jest-expo/web preset; always use `toJSON()` string search
- Async button handlers need `waitFor` wrapping in tests even for synchronous state updates
- Copilot correctly flags: trim inputs before saving, relax overly strict validation, move spies to beforeEach
