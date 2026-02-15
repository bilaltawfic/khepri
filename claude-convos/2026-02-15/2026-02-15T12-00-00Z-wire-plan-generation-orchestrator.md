# Wire Plan Generation into AI Orchestrator

## Date
2026-02-15

## Goals
- Wire the `generate-plan` Edge Function into the AI orchestrator's tool pipeline
- Enable the AI coach to generate personalized training plans during conversations
- Complete Phase 6 of the project

## Key Decisions
1. **Followed `search-knowledge` pattern**: The generate-plan tool calls a Supabase Edge Function via `supabase.functions.invoke()`, preserving JWT auth context — same pattern as the existing search-knowledge tool
2. **Input validation at MCP layer**: Validate `goal_id` (string), `start_date` (YYYY-MM-DD with round-trip check), and `total_weeks` (integer 4-52, finite) before forwarding to Edge Function
3. **Concise plan summary for AI**: Extract only essential fields (name, dates, phases) rather than full plan payload to keep context window manageable
4. **System prompt guidelines**: Added training plan generation guidelines covering when to generate, parameter confirmation, and handling existing plans

## Files Changed
- `supabase/functions/mcp-gateway/tools/generate-plan.ts` — New MCP tool handler
- `supabase/functions/mcp-gateway/tools/index.ts` — Register generate_plan tool
- `supabase/functions/ai-orchestrator/prompts.ts` — Add tool definition + system prompt updates
- `supabase/functions/mcp-gateway/tools/__tests__/generate-plan.test.ts` — MCP handler tests
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` — Updated tests for new tool
- `supabase/jest.config.js` — Add coverage for generate-plan.ts

## Learnings
- The MCP gateway uses `MCPToolEntry` pattern with `{ definition, handler }` exports
- Edge Function invocation via `supabase.functions.invoke()` returns `{ data, error }` — error is null on success
- Biome formatting is strict about line-length-based wrapping decisions
