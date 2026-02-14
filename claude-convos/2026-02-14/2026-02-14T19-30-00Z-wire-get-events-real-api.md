# Wire get_events to Real Intervals.icu API

**Date:** 2026-02-14
**Task:** P3-A-06 — Replace mock data in `get_events` MCP tool with real Intervals.icu API calls

## Goals
- Wire the `get_events` handler to fetch real calendar events from Intervals.icu
- Maintain backwards compatibility with mock data fallback when no credentials configured
- Follow the same pattern as `get_activities` (credential check → real API → transform)

## Key Decisions
1. **Transform functions**: Created `normalizeEventType()`, `normalizeEventPriority()`, and `transformIntervalsEvent()` to map Intervals.icu API shapes to CalendarEvent
2. **Error handling**: All IntervalsApiError types (including INVALID_CREDENTIALS) return error responses; mock data is only used when no credentials are configured; unexpected errors bubble up to catch-all
3. **Source tracking**: Added `source` field to response (`'mock'` or `'intervals.icu'`) matching get_activities pattern
4. **Test approach**: Used `jest.unstable_mockModule` for ESM mocking with local IntervalsApiError class copy to avoid Deno URL import issues in Jest
5. **Runtime validation**: Priority values validated against allowed set ('A', 'B', 'C') before casting

## Files Changed
- `supabase/functions/mcp-gateway/tools/get-events.ts` — Added imports, transform functions, updated handler to use real API with mock fallback
- `supabase/functions/mcp-gateway/tools/__tests__/get-events.test.ts` — New test file with 26 tests covering all paths
- `supabase/jest.config.js` — Added get-events.ts to coverage collection

## Learnings
- Deno-style URL imports (`https://esm.sh/...`) are type-only in this codebase and get stripped by ts-jest with `verbatimModuleSyntax: false`
- No need to explicitly mock URL imports — they disappear at compile time
- Creating a local copy of error classes for tests avoids circular mock dependency issues with `jest.unstable_mockModule`
