# AI Orchestrator Edge Function Scaffold

**Date:** 2026-02-13
**Task:** P4-A-01 - Create AI Orchestrator Edge Function Scaffold

## Goals

Create the foundational `ai-orchestrator` Edge Function that coordinates AI interactions with tool use via the MCP gateway. This is the agentic evolution of the existing `ai-coach` function.

## Key Decisions

1. **Aligned tool executor with actual MCP gateway response format**: The plan used `{ isError, content }` but the actual gateway returns `{ success: boolean, data/error }`. Updated tool-executor.ts to match.

2. **Added runtime validation for MCP gateway responses**: Used a type guard (`isMCPGatewayResponse`) instead of blind type assertions, following the project's Copilot review pattern for runtime validation of external data.

3. **Tool definitions mirror actual MCP gateway tools exactly**: Included all parameters (limit, activity_type, types, category) not just the subset in the plan, ensuring Claude can use the full tool capabilities.

4. **Added comprehensive request validation**: Runtime validation of the request body with descriptive error messages, following the pattern established in the mcp-gateway function.

5. **Max iterations returns a user-friendly message**: Instead of a 500 error, returns a 200 with an explanation message, since partial data was gathered successfully.

6. **Removed unused SupabaseClient parameter from tool executor**: The tool executor only needs the auth header to pass through to the MCP gateway, not a full Supabase client instance.

## Files Created

- `supabase/functions/ai-orchestrator/types.ts` - Request/response types, Claude API types
- `supabase/functions/ai-orchestrator/tool-executor.ts` - MCP gateway tool execution with response validation
- `supabase/functions/ai-orchestrator/prompts.ts` - System prompts and tool definitions
- `supabase/functions/ai-orchestrator/index.ts` - Main orchestrator with agentic tool-use loop

## Architecture

```
Client Request
    ↓
ai-orchestrator/index.ts (auth, validation, agentic loop)
    ↓
Claude API (with tool definitions from prompts.ts)
    ↓ (if tool_use blocks in response)
tool-executor.ts → MCP Gateway → Intervals.icu
    ↓ (tool results fed back to Claude)
Claude API (incorporates data into response)
    ↓
Client Response (with content + tool call metadata)
```

## Learnings

- The MCP gateway returns `MCPToolResult = MCPToolSuccess | MCPToolError` with `success: boolean` discriminant, not `isError` as initially planned.
- Biome enforces sorted imports (TOOL_DEFINITIONS before buildSystemPrompt alphabetically).
- Biome prefers double quotes for strings containing apostrophes over escaped single quotes.
