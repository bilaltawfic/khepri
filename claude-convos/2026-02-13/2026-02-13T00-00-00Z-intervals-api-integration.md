# P3-A-05: Wire MCP Gateway to Real Intervals.icu API

## Date
2026-02-13

## Goals
Connect MCP gateway tool handlers to the real Intervals.icu API, replacing mock data with live athlete data when credentials are configured.

## Key Decisions

1. **Graceful fallback pattern**: When no credentials are found, handlers return mock data with `source: 'mock'`. When real data is fetched, responses include `source: 'intervals.icu'`.

2. **Credential flow**: Credentials are fetched from `intervals_credentials` table via Supabase client, then decrypted using the existing `decrypt()` function from the credentials edge function.

3. **Error handling**: Created `IntervalsApiError` class with structured codes (`INVALID_CREDENTIALS`, `RATE_LIMITED`, `API_ERROR`) for clear upstream error handling.

4. **MCPToolHandler signature change**: Added `SupabaseClient` as third parameter to allow tool handlers to access the database for credential lookups.

5. **Events API support**: Included `fetchEvents` in the API client for future use (P3-A-04 get-events handler not yet implemented).

## Files Created
- `supabase/functions/mcp-gateway/utils/credentials.ts` - Credential fetching and decryption utility
- `supabase/functions/mcp-gateway/utils/intervals-api.ts` - Typed Intervals.icu API client

## Files Modified
- `supabase/functions/mcp-gateway/types.ts` - Added SupabaseClient import and parameter
- `supabase/functions/mcp-gateway/index.ts` - Passes supabase client to tool handlers
- `supabase/functions/mcp-gateway/tools/get-activities.ts` - Real API integration with mock fallback
- `supabase/functions/mcp-gateway/tools/get-wellness.ts` - Real API integration with mock fallback

## Learnings
- The existing `credentials/index.ts` exports `encrypt` and `decrypt` functions via `import.meta.main` guard, making them reusable by other edge functions
- Intervals.icu uses Basic auth with `API_KEY:{api_key}` format
- Intervals.icu wellness data uses date string as the `id` field
- Sleep data comes as `sleepSecs` from API, needs conversion to hours
