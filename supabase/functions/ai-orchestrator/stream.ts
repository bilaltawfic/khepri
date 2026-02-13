// SSE (Server-Sent Events) stream utilities for the AI Orchestrator.
// Provides formatting and response creation for streaming Claude responses.

import type Anthropic from 'npm:@anthropic-ai/sdk@0.36';

import type { StreamEvent, ToolCallResult } from './types.ts';

/**
 * Format a StreamEvent as an SSE message.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 */
export function formatSSE(event: StreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Parameters for the final streaming Claude call.
 */
export interface StreamParams {
  model: string;
  max_tokens: number;
  system: string;
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
}

/**
 * Create a ReadableStream that emits SSE events from a Claude streaming response.
 * Handles the final text response only — tool use iterations are pre-resolved.
 *
 * @param anthropic - Anthropic SDK client
 * @param params - Parameters for the Claude API call
 * @param toolCalls - Tool call results from the agentic loop (emitted before streaming)
 * @param priorInputTokens - Input tokens accumulated during the agentic loop
 * @param priorOutputTokens - Output tokens accumulated during the agentic loop
 * @param corsHeaders - CORS headers for the response
 */
export function createStreamingResponse(
  anthropic: Anthropic,
  params: StreamParams,
  toolCalls: readonly ToolCallResult[],
  priorInputTokens: number,
  priorOutputTokens: number,
  corsHeaders: Record<string, string>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
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

        // Stream the final Claude response
        const response = anthropic.messages.stream(params);

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(
                formatSSE({
                  event: 'content_delta',
                  data: { type: 'content_delta', text: event.delta.text },
                })
              )
            );
          }
        }

        // Emit accumulated usage (agentic loop + final stream)
        const finalMessage = await response.finalMessage();
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: 'usage',
              data: {
                type: 'usage',
                input_tokens: priorInputTokens + finalMessage.usage.input_tokens,
                output_tokens: priorOutputTokens + finalMessage.usage.output_tokens,
              },
            })
          )
        );

        controller.enqueue(encoder.encode(formatSSE({ event: 'done', data: { type: 'done' } })));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: 'error',
              data: {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            })
          )
        );
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
      Connection: 'keep-alive',
    },
  });
}
