# Mobile SSE Streaming Implementation

**Date:** 2026-02-14
**Task:** P4-A-05 - Consume Streaming Responses in Mobile App

## Goals

- Wire mobile chat to consume SSE streaming from the AI orchestrator
- Users see AI response appear progressively (word-by-word) instead of waiting for full response
- Add comprehensive tests for SSE parsing and streaming behavior

## Key Decisions

1. **SSE Parser**: Implemented `parseSSELine` that validates event types against `VALID_SSE_EVENT_TYPES` const array, rejecting unknown types at parse time (runtime validation pattern)
2. **Streaming Function**: `sendChatMessageStream` uses direct `fetch` to `/functions/v1/ai-orchestrator` with `stream: true`, rather than `supabase.functions.invoke` which doesn't support streaming
3. **Callback Pattern**: Used `StreamCallbacks` object (`onDelta`, `onDone`, `onError`) instead of return values for cleaner streaming API
4. **Placeholder Messages**: Hook uses incrementing `streaming-N` IDs for placeholder messages, replaced with DB-assigned IDs on completion
5. **Mock Fallback**: When Supabase is not configured, streaming mock immediately calls `onDelta` + `onDone` with mock content
6. **TextEncoder Polyfill**: Added `node:util` TextEncoder/TextDecoder polyfill in jest.setup.ts for streaming tests

## Files Changed

- `apps/mobile/services/ai.ts` - Added `parseSSELine`, `sendChatMessageStream`, SSE types
- `apps/mobile/hooks/useConversation.ts` - Updated `sendMessage` to use streaming with placeholder pattern
- `apps/mobile/services/__tests__/ai.test.ts` - Added 22 tests for SSE parsing and streaming
- `apps/mobile/hooks/__tests__/useConversation.test.ts` - Updated existing tests, added 6 streaming-specific tests
- `apps/mobile/jest.setup.ts` - Added TextEncoder/TextDecoder polyfill

## Learnings

- React Native Jest environment lacks TextEncoder/TextDecoder - need polyfill from `node:util`
- TypeScript doesn't narrow `supabase` across closure boundaries - need explicit guard in async callbacks
- Biome requires `node:` protocol for Node.js module imports
- `pnpm test` uses turbo - pass extra args after `--`
