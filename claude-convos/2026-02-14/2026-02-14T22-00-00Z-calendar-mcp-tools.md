# Calendar MCP Tools (Create/Update Events)

**Date:** 2026-02-14
**Task:** P6-A-01 - Calendar MCP Tools
**Branch:** feat/p6-a-01-calendar-mcp-tools

## Goals

- Add MCP tools to create and update calendar events in Intervals.icu
- Enable the AI coach to schedule and modify workouts on the athlete's calendar
- Follow existing patterns from get-events.ts tool

## Key Decisions

1. **Refactored `intervalsRequest` helper**: Extracted `authHeader()`, `handleErrorResponse()`, and `parseJsonResponse()` from the existing `intervalsRequest()` function to enable code reuse with the new `intervalsRequestWithBody()` for POST/PUT requests
2. **No mock fallback for write operations**: Unlike get-events which falls back to mock data, create/update tools require real Intervals.icu credentials (returns `NO_CREDENTIALS` error without them)
3. **Runtime validation before API calls**: Validate event types against `VALID_EVENT_TYPES` set, priorities against `VALID_PRIORITIES` set, and dates against ISO 8601 pattern before sending to the API
4. **Partial updates for update-event**: Only sends fields that are actually provided in the input, requires at least one field to update

## Files Changed

- `supabase/functions/mcp-gateway/utils/intervals-api.ts` - Refactored request helpers, added `createEvent()`, `updateEvent()`, `CreateEventInput`, `UpdateEventInput`
- `supabase/functions/mcp-gateway/tools/create-event.ts` - New MCP tool for creating calendar events
- `supabase/functions/mcp-gateway/tools/update-event.ts` - New MCP tool for updating calendar events
- `supabase/functions/mcp-gateway/tools/index.ts` - Registered new tools
- `supabase/functions/mcp-gateway/tools/__tests__/create-event.test.ts` - 30 unit tests for create-event
- `supabase/functions/mcp-gateway/tools/__tests__/update-event.test.ts` - 30 unit tests for update-event
- `supabase/jest.config.js` - Added new files to coverage collection

## Learnings

- The existing `intervalsRequest()` only supported GET requests; needed a new `intervalsRequestWithBody()` for POST/PUT that includes `Content-Type: application/json` and a request body
- Biome auto-formats long lines differently than Prettier; running `biome check --write` before committing ensures consistent formatting
- The test pattern with `jest.unstable_mockModule()` + dynamic `await import()` works well for ESM module mocking in the supabase package
