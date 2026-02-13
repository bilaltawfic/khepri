# P3-A-03: Add get_wellness_data MCP Tool Handler

## Date
2026-02-13

## Goal
Add a `get_wellness_data` MCP tool to the gateway that returns daily wellness metrics (CTL/ATL/TSB, resting HR, HRV, sleep, weight, subjective metrics). Returns mock data for now; real Intervals.icu API integration follows in P3-A-05.

## Key Decisions
- **UTC date handling**: All date operations use UTC timestamps (`Date.UTC`, `toISOString`) to avoid timezone-related off-by-one errors in edge function runtimes
- **Date validation**: Input dates are validated with regex + round-trip check (parse then format back) to catch invalid calendar dates like `2026-02-30`
- **Default range**: Defaults to 7 days inclusive (today - 6 days through today), matching the "last 7 days" user expectation
- **Max range cap**: Enforced 90-day maximum to prevent memory issues from unbounded date ranges
- **Swapped dates**: Silently corrected (oldest/newest swapped) rather than returning an error, for better UX

## Files Changed
- `supabase/functions/mcp-gateway/tools/get-wellness.ts` - NEW: Tool implementation with mock data generation
- `supabase/functions/mcp-gateway/tools/index.ts` - Register the new tool in the registry
- `plans/phase-3/subphases/p3-a-03-get-wellness-tool.md` - Updated plan to match actual implementation (later deleted after PR merge)

## Copilot Review Feedback Addressed
1. Off-by-one in default date range (8 days instead of 7) - fixed by subtracting 6 days instead of 7
2. Invalid calendar dates passing regex validation - added round-trip validation
3. Mixed UTC/local date handling in iteration - switched to pure UTC millisecond arithmetic
4. No cap on date range - added 90-day maximum
5. Plan file snippets out of sync with implementation - updated plan

## Learnings
- `new Date('YYYY-MM-DD')` parses as UTC midnight, but `setDate()`/`getDate()` operate in local time - always use consistent UTC or local throughout
- Subtracting N days and iterating inclusively gives N+1 data points, not N
- Round-trip date validation (parse -> format -> compare) is a reliable way to catch invalid calendar dates
