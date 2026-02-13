// Tests for SSE stream utilities
// Converted from Deno test runner to Jest for CI compatibility

import { formatSSE } from '../stream.ts';
import type { StreamEvent } from '../types.ts';

describe('formatSSE', () => {
  it('formats content_delta event', () => {
    const event: StreamEvent = {
      event: 'content_delta',
      data: { type: 'content_delta', text: 'Hello' },
    };

    const result = formatSSE(event);

    expect(result).toBe('event: content_delta\ndata: {"type":"content_delta","text":"Hello"}\n\n');
  });

  it('formats tool_calls event with results', () => {
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

    expect(parsed.event).toBe('tool_calls');
    expect(parsed.data.type).toBe('tool_calls');
    expect(parsed.data.tool_calls).toHaveLength(2);
    expect(parsed.data.tool_calls[0].tool_name).toBe('get_activities');
    expect(parsed.data.tool_calls[0].success).toBe(true);
    expect(parsed.data.tool_calls[1].success).toBe(false);
    expect(parsed.data.tool_calls[1].error).toBe('Not connected');
  });

  it('formats usage event', () => {
    const event: StreamEvent = {
      event: 'usage',
      data: { type: 'usage', input_tokens: 150, output_tokens: 300 },
    };

    const result = formatSSE(event);
    const parsed = parseSSE(result);

    expect(parsed.event).toBe('usage');
    expect(parsed.data.input_tokens).toBe(150);
    expect(parsed.data.output_tokens).toBe(300);
  });

  it('formats done event', () => {
    const event: StreamEvent = {
      event: 'done',
      data: { type: 'done' },
    };

    const result = formatSSE(event);

    expect(result).toBe('event: done\ndata: {"type":"done"}\n\n');
  });

  it('formats error event', () => {
    const event: StreamEvent = {
      event: 'error',
      data: { type: 'error', error: 'Rate limit exceeded' },
    };

    const result = formatSSE(event);
    const parsed = parseSSE(result);

    expect(parsed.event).toBe('error');
    expect(parsed.data.error).toBe('Rate limit exceeded');
  });

  it('output ends with double newline for all event types', () => {
    const events: StreamEvent[] = [
      { event: 'content_delta', data: { type: 'content_delta', text: 'a' } },
      { event: 'done', data: { type: 'done' } },
      { event: 'error', data: { type: 'error', error: 'fail' } },
      { event: 'usage', data: { type: 'usage', input_tokens: 0, output_tokens: 0 } },
    ];

    for (const event of events) {
      const result = formatSSE(event);
      expect(result).toContain('\n\n');
      expect(result.endsWith('\n\n')).toBe(true);
    }
  });

  it('handles content_delta with special characters', () => {
    const event: StreamEvent = {
      event: 'content_delta',
      data: { type: 'content_delta', text: 'Line 1\nLine 2\t"quoted"' },
    };

    const result = formatSSE(event);
    const parsed = parseSSE(result);

    expect(parsed.data.text).toBe('Line 1\nLine 2\t"quoted"');
  });

  it('handles usage with zero tokens', () => {
    const event: StreamEvent = {
      event: 'usage',
      data: { type: 'usage', input_tokens: 0, output_tokens: 0 },
    };

    const result = formatSSE(event);
    const parsed = parseSSE(result);

    expect(parsed.data.input_tokens).toBe(0);
    expect(parsed.data.output_tokens).toBe(0);
  });
});

// =============================================================================
// Test helper
// =============================================================================

/**
 * Parse an SSE message back into its parts for assertion.
 */
// biome-ignore lint/suspicious/noExplicitAny: test helper parsing arbitrary JSON
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
