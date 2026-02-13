# P3-A-02: Add get_activities MCP Tool Handler

## Date
2026-02-13

## Goals
- Implement the `get_activities` MCP tool for the gateway
- Return mock data matching Intervals.icu API shape
- Register the tool in the tool registry

## Key Decisions
- Used `readonly Activity[]` for mock data to prevent mutation
- Used optional chaining (`?.`) instead of non-null assertion (`!`) per Biome lint rules
- Kept `Activity` interface local to the tool file rather than adding to `types.ts` (plan said optional)
- Applied input validation: limit clamped to 1-50 range, type checks for all params
- Case-insensitive activity type filtering

## Files Changed
- `supabase/functions/mcp-gateway/tools/get-activities.ts` - NEW: Tool implementation with definition, input parsing, mock handler
- `supabase/functions/mcp-gateway/tools/index.ts` - Updated: Import and register the new tool

## Patterns Followed
- Matched existing `MCPToolEntry` interface (definition + handler)
- Used `Record<string, unknown>` for input with manual type narrowing
- Error handling returns `MCPToolError` with error code

## Learnings
- Biome flags non-null assertions even when guarded by a null check in outer scope (use optional chaining instead)
- Biome formatter preferences: keep ternaries on one line when they fit
