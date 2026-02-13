# P4-A-03: Add Streaming Response Support

## Goal

Add Server-Sent Events (SSE) streaming to the `ai-orchestrator` Edge Function so the mobile app can display AI responses token-by-token. This improves perceived latency — athletes see text appearing immediately instead of waiting for the full response.

## Background

The `ai-orchestrator` currently buffers the entire Claude response before returning it as JSON. The `stream` field already exists in `OrchestratorRequest` (types.ts:11) but is not wired up. The Anthropic SDK supports streaming via `anthropic.messages.stream()`.

### Key Constraints

- Must maintain backwards compatibility — non-streaming (`stream: false` or omitted) requests should work exactly as before
- The agentic loop (tool use → tool result → call Claude again) happens **server-side before streaming begins** — we only stream the **final** text response
- Deno Edge Functions support `ReadableStream` for SSE responses

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/ai-orchestrator/index.ts` | Modify | Add streaming branch after agentic loop completes |
| `supabase/functions/ai-orchestrator/types.ts` | Modify | Add streaming event types |
| `supabase/functions/ai-orchestrator/stream.ts` | Create | SSE stream helper utilities |
| `supabase/functions/ai-orchestrator/__tests__/stream.test.ts` | Create | Unit tests for stream utilities |

## Implementation Steps

### Step 1: Define streaming event types (types.ts)

Add SSE event type definitions:

```typescript
// SSE event types for streaming responses
export type StreamEventType = 'content_delta' | 'tool_calls' | 'usage' | 'done' | 'error';

export interface StreamEvent {
  event: StreamEventType;
  data: StreamContentDelta | StreamToolCalls | StreamUsage | StreamDone | StreamError;
}

export interface StreamContentDelta {
  type: 'content_delta';
  text: string;
}

export interface StreamToolCalls {
  type: 'tool_calls';
  tool_calls: ToolCallResult[];
}

export interface StreamUsage {
  type: 'usage';
  input_tokens: number;
  output_tokens: number;
}

export interface StreamDone {
  type: 'done';
}

export interface StreamError {
  type: 'error';
  error: string;
}
```

### Step 2: Create SSE stream helper (stream.ts)

Create a helper module for Server-Sent Events formatting:

```typescript
import type { StreamEvent } from './types.ts';

/**
 * Format a StreamEvent as an SSE message.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 */
export function formatSSE(event: StreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Create a ReadableStream that emits SSE events from a Claude streaming response.
 * Handles the final text response only — tool use iterations are pre-resolved.
 */
export function createStreamingResponse(
  anthropic: Anthropic,
  params: {
    model: string;
    max_tokens: number;
    system: string;
    tools: Anthropic.Tool[];
    messages: Anthropic.MessageParam[];
  },
  toolCalls: ToolCallResult[],
  corsHeaders: Record<string, string>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit tool calls if any occurred during agentic loop
        if (toolCalls.length > 0) {
          controller.enqueue(encoder.encode(formatSSE({
            event: 'tool_calls',
            data: { type: 'tool_calls', tool_calls: toolCalls },
          })));
        }

        // Stream the final Claude response
        const response = await anthropic.messages.stream(params);

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(formatSSE({
              event: 'content_delta',
              data: { type: 'content_delta', text: event.delta.text },
            })));
          }
        }

        // Emit usage and done
        const finalMessage = await response.finalMessage();
        controller.enqueue(encoder.encode(formatSSE({
          event: 'usage',
          data: {
            type: 'usage',
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens,
          },
        })));

        controller.enqueue(encoder.encode(formatSSE({
          event: 'done',
          data: { type: 'done' },
        })));
      } catch (error) {
        controller.enqueue(encoder.encode(formatSSE({
          event: 'error',
          data: { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
        })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Step 3: Integrate streaming into the orchestrator (index.ts)

Modify the agentic loop to support streaming on the **final** Claude call:

1. Run the agentic loop as-is (non-streaming) for all tool-use iterations
2. On the final iteration (when Claude has no more tool calls), check if `request.stream === true`
3. If streaming: re-issue the final call using `anthropic.messages.stream()` via the stream helper
4. If not streaming: return the buffered JSON response as before

Key changes:
- After detecting the final response (no tool use blocks), check `request.stream`
- If streaming, pass the accumulated `anthropicMessages` + system prompt to `createStreamingResponse()`
- Include accumulated `totalInputTokens`/`totalOutputTokens` from tool iterations in the usage event

### Step 4: Write tests (stream.test.ts)

Test the `formatSSE` helper and stream event formatting:

```typescript
// Test cases:
// 1. formatSSE produces correct SSE format with event name and JSON data
// 2. formatSSE handles content_delta events
// 3. formatSSE handles tool_calls events with results
// 4. formatSSE handles usage events
// 5. formatSSE handles done events
// 6. formatSSE handles error events
// 7. SSE output ends with double newline
```

## Testing Requirements

- Unit tests for `formatSSE()` — correct SSE wire format
- Unit tests for each stream event type serialization
- Verify non-streaming path is unchanged (regression)
- Manual test: `curl` with `Accept: text/event-stream` against local Supabase

## Verification

- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] Non-streaming requests return JSON as before (backwards compatible)
- [ ] Streaming requests return `Content-Type: text/event-stream`
- [ ] Each SSE event follows format: `event: <type>\ndata: <json>\n\n`
- [ ] Tool use iterations are NOT streamed — only final text response
- [ ] Usage totals include tokens from all agentic loop iterations
- [ ] Error events are emitted on failure, stream closes gracefully

## Design Decisions

1. **Stream only the final response**: Tool use iterations happen server-side because the client doesn't need to see intermediate tool calls in real-time. This simplifies the client and keeps the agentic loop internal.

2. **SSE over WebSockets**: SSE is simpler, works over HTTP/1.1, and is one-directional (server → client) which fits our use case. Deno Edge Functions support `ReadableStream` natively.

3. **Tool calls sent as a single event before streaming**: The client receives all tool call results upfront, then the streaming text. This lets the UI show "Fetching your data..." before text starts flowing.

4. **Accumulated token counts**: Usage event includes tokens from ALL iterations, not just the final stream, giving accurate cost tracking.
