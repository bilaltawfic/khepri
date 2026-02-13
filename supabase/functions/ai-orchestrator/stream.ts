// SSE (Server-Sent Events) stream utilities for the AI Orchestrator.
// Provides formatting and response creation for streaming responses.

import type { StreamEvent, ToolCallResult } from './types.ts';

/**
 * Format a StreamEvent as an SSE message.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 */
export function formatSSE(event: StreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Create an SSE Response from the already-buffered final response text.
 *
 * This emits the text from the agentic loop's final `messages.create()` call
 * as SSE events, avoiding a second API call. The agentic loop already resolved
 * all tool calls and produced the final text — we just reformat it as SSE so
 * the client receives a consistent `text/event-stream` response.
 *
 * @param textContent - Final response text from the agentic loop
 * @param toolCalls - Tool call results from the agentic loop
 * @param totalInputTokens - Accumulated input tokens across all iterations
 * @param totalOutputTokens - Accumulated output tokens across all iterations
 * @param corsHeaders - CORS headers for the response
 */
export function createSSEResponse(
  textContent: string,
  toolCalls: readonly ToolCallResult[],
  totalInputTokens: number,
  totalOutputTokens: number,
  corsHeaders: Record<string, string>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Emit tool calls from the agentic loop, if any
      if (toolCalls.length > 0) {
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: 'tool_calls',
              data: { type: 'tool_calls', tool_calls: [...toolCalls] },
            })
          )
        );
      }

      // Emit the final text content
      if (textContent.length > 0) {
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: 'content_delta',
              data: { type: 'content_delta', text: textContent },
            })
          )
        );
      }

      // Emit usage totals
      controller.enqueue(
        encoder.encode(
          formatSSE({
            event: 'usage',
            data: {
              type: 'usage',
              input_tokens: totalInputTokens,
              output_tokens: totalOutputTokens,
            },
          })
        )
      );

      // Signal completion
      controller.enqueue(encoder.encode(formatSSE({ event: 'done', data: { type: 'done' } })));

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
