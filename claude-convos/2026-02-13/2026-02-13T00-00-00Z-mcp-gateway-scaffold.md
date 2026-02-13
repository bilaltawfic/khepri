# MCP Gateway Edge Function Scaffold

## Date
2026-02-13

## Goal
Create the MCP gateway Edge Function scaffold (P3-A-01) that enables Intervals.icu tool integration via a tool registry pattern.

## Key Decisions
- Followed the existing `ai-coach` Edge Function patterns for consistency (CORS headers, Supabase auth, error handling)
- Used a `Map`-based tool registry with `registerTool()` for extensibility
- Runtime validation of request body (not just TypeScript types) for safety
- Extracted `VALID_ACTIONS` into a `Set` for clean validation
- Used `jsonResponse` and `errorResponse` helpers to avoid repetitive CORS header boilerplate

## Files Created
- `supabase/functions/mcp-gateway/types.ts` - MCP protocol interfaces (tool definitions, requests, responses, handlers)
- `supabase/functions/mcp-gateway/tools/index.ts` - Tool registry with register/get/list functions
- `supabase/functions/mcp-gateway/index.ts` - Main entry point with auth, routing, and tool execution

## Architecture
The gateway supports two actions:
1. `list_tools` - Returns all registered tool definitions
2. `execute_tool` - Runs a named tool with input, passing the authenticated athlete ID

Tools will be registered in `tools/index.ts` by subsequent PRs (P3-A-02 through P3-A-04).

## Learnings
- Biome requires sorted imports - `getTool` before `getToolDefinitions`, `MCPToolDefinition` before `MCPToolEntry`
- Long conditional expressions need to be broken across lines for Biome formatting
