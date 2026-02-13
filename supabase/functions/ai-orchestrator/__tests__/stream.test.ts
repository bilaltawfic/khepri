// Tests for SSE stream utilities
// Run with: deno test supabase/functions/ai-orchestrator/__tests__/stream.test.ts

import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { formatSSE } from '../stream.ts';
import type { StreamEvent } from '../types.ts';

Deno.test('formatSSE - content_delta event', () => {
  const event: StreamEvent = {
    event: 'content_delta',
    data: { type: 'content_delta', text: 'Hello' },
  };

  const result = formatSSE(event);

  assertEquals(result, 'event: content_delta\ndata: {"type":"content_delta","text":"Hello"}\n\n');
});

Deno.test('formatSSE - tool_calls event with results', () => {
  const event: StreamEvent = {
    event: 'tool_calls',
    data: {
      type: 'tool_calls',
      tool_calls: [
        { tool_name: 'get_activities', success: true, result: { items: [] } },
        { tool_name: 'get_wellness_data', success: false, error: 'Not connected' },
      ],
    },
  };

  const result = formatSSE(event);
  const parsed = parseSSE(result);

  assertEquals(parsed.event, 'tool_calls');
  assertEquals(parsed.data.type, 'tool_calls');
  assertEquals(parsed.data.tool_calls.length, 2);
  assertEquals(parsed.data.tool_calls[0].tool_name, 'get_activities');
  assertEquals(parsed.data.tool_calls[0].success, true);
  assertEquals(parsed.data.tool_calls[1].success, false);
  assertEquals(parsed.data.tool_calls[1].error, 'Not connected');
});

Deno.test('formatSSE - usage event', () => {
  const event: StreamEvent = {
    event: 'usage',
    data: { type: 'usage', input_tokens: 150, output_tokens: 300 },
  };

  const result = formatSSE(event);
  const parsed = parseSSE(result);

  assertEquals(parsed.event, 'usage');
  assertEquals(parsed.data.input_tokens, 150);
  assertEquals(parsed.data.output_tokens, 300);
});

Deno.test('formatSSE - done event', () => {
  const event: StreamEvent = {
    event: 'done',
    data: { type: 'done' },
  };

  const result = formatSSE(event);

  assertEquals(result, 'event: done\ndata: {"type":"done"}\n\n');
});

Deno.test('formatSSE - error event', () => {
  const event: StreamEvent = {
    event: 'error',
    data: { type: 'error', error: 'Rate limit exceeded' },
  };

  const result = formatSSE(event);
  const parsed = parseSSE(result);

  assertEquals(parsed.event, 'error');
  assertEquals(parsed.data.error, 'Rate limit exceeded');
});

Deno.test('formatSSE - output ends with double newline', () => {
  const events: StreamEvent[] = [
    { event: 'content_delta', data: { type: 'content_delta', text: 'a' } },
    { event: 'done', data: { type: 'done' } },
    { event: 'error', data: { type: 'error', error: 'fail' } },
    { event: 'usage', data: { type: 'usage', input_tokens: 0, output_tokens: 0 } },
  ];

  for (const event of events) {
    const result = formatSSE(event);
    assertStringIncludes(result, '\n\n');
    assertEquals(result.endsWith('\n\n'), true, `${event.event} should end with double newline`);
  }
});

Deno.test('formatSSE - content_delta with special characters', () => {
  const event: StreamEvent = {
    event: 'content_delta',
    data: { type: 'content_delta', text: 'Line 1\nLine 2\t"quoted"' },
  };

  const result = formatSSE(event);
  const parsed = parseSSE(result);

  assertEquals(parsed.data.text, 'Line 1\nLine 2\t"quoted"');
});

Deno.test('formatSSE - usage with zero tokens', () => {
  const event: StreamEvent = {
    event: 'usage',
    data: { type: 'usage', input_tokens: 0, output_tokens: 0 },
  };

  const result = formatSSE(event);
  const parsed = parseSSE(result);

  assertEquals(parsed.data.input_tokens, 0);
  assertEquals(parsed.data.output_tokens, 0);
});

// =============================================================================
// Test helper
// =============================================================================

/**
 * Parse an SSE message back into its parts for assertion.
 */
// deno-lint-ignore no-explicit-any
function parseSSE(raw: string): { event: string; data: any } {
  const lines = raw.split('\n');
  const eventLine = lines.find((l) => l.startsWith('event: '));
  const dataLine = lines.find((l) => l.startsWith('data: '));

  if (!eventLine || !dataLine) {
    throw new Error(`Invalid SSE format: ${raw}`);
  }

  return {
    event: eventLine.replace('event: ', ''),
    data: JSON.parse(dataLine.replace('data: ', '')),
  };
}
