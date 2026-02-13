# P4-A-03: Add Streaming Response Support

## Date
2026-02-13

## Goals
- Add SSE streaming to the ai-orchestrator Edge Function
- Allow mobile app to display AI responses token-by-token
- Maintain backwards compatibility with non-streaming requests

## Key Decisions

1. **Stream only the final response**: Tool use iterations happen server-side (non-streaming). Only the final text response is streamed via SSE. This simplifies the client.

2. **SSE over WebSockets**: SSE is simpler, works over HTTP/1.1, and fits the one-directional (server to client) use case. Deno Edge Functions support ReadableStream natively.

3. **Tool calls sent before streaming**: A `tool_calls` event is emitted upfront so the client can show "Fetching your data..." before text starts flowing.

4. **Accumulated token counts**: The `usage` event includes tokens from ALL agentic loop iterations plus the final stream, giving accurate cost tracking.

5. **Type-safe event system**: Defined `StreamEventType` as a const array with derived union type, and discriminated union `StreamEventData` for type-safe event handling.

## Files Changed

### Created
- `supabase/functions/ai-orchestrator/stream.ts` - SSE formatting and streaming response creation
- `supabase/functions/ai-orchestrator/__tests__/stream.test.ts` - Deno tests for formatSSE

### Modified
- `supabase/functions/ai-orchestrator/types.ts` - Added streaming event types (StreamEvent, StreamEventType, etc.)
- `supabase/functions/ai-orchestrator/index.ts` - Integrated streaming branch after agentic loop completes

## Learnings
- Biome correctly identifies `import Anthropic` as type-only when only used in parameter type annotations (not runtime calls)
- Supabase Deno functions need Deno test runner (not Jest) for tests
- The `anthropic.messages.stream()` method returns an async iterable that emits events including `content_block_delta`
