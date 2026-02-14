# P2-D-04: Populate CTL/ATL/TSB on Dashboard

## Date
2026-02-14

## Goals
- Wire the dashboard's fitness metrics to display real CTL, ATL, and TSB values from the wellness data endpoint
- Replace hardcoded null values with data fetched via MCP gateway

## Key Decisions
- Added `getWellnessSummary()` to `intervals.ts` (not `ai.ts`) since all wellness/MCP gateway patterns already live there
- Used the existing `fetch` + `getMCPGatewayUrl()` pattern consistent with `getRecentActivities()` and `getTodayWellness()`
- Fetched wellness data in parallel with athlete data using `Promise.all` to avoid sequential loading
- Wellness fetch failures are caught silently (`.catch(() => null)`) for graceful degradation - dashboard still loads with null metrics

## Files Changed
- `apps/mobile/services/intervals.ts` - Added `getWellnessSummary()` function
- `apps/mobile/hooks/useDashboard.ts` - Imported wellness service, added parallel fetch, wired CTL/ATL/TSB
- `apps/mobile/hooks/__tests__/useDashboard.test.ts` - Added 4 new tests for wellness data scenarios, updated existing test

## Learnings
- The existing `intervals.ts` already had `WellnessResponse` type with `summary` field containing `current_ctl`, `current_atl`, `current_tsb` - just needed a function to expose the summary
- Keeping wellness fetch parallel with athlete fetch (not sequential) improves dashboard load time
- All pre-existing lint/typecheck issues are in unrelated files and not introduced by this change
