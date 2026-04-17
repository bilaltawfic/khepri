import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { callClaudeForBlock } from '../claude-client.ts';

// ============================================================================
// Mocks
// ============================================================================

// Mock Deno.env
const originalDeno = globalThis.Deno;
beforeAll(() => {
  (globalThis as Record<string, unknown>).Deno = {
    env: {
      get: (key: string) => (key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined),
    },
  };
});
afterAll(() => {
  (globalThis as Record<string, unknown>).Deno = originalDeno;
});

// Mock fetch
const mockFetch = jest.fn<typeof globalThis.fetch>();
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const validToolResponse = {
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      name: 'generate_block_workouts',
      input: {
        weeks: [
          {
            weekNumber: 1,
            weekStartDate: '2026-01-05',
            isRecoveryWeek: false,
            workouts: [],
          },
        ],
      },
    },
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('callClaudeForBlock', () => {
  it('returns parsed tool input on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(validToolResponse));

    const result = await callClaudeForBlock('system prompt', 'user prompt');

    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].weekNumber).toBe(1);
  });

  it('throws on non-ok HTTP status', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'bad' }, 500));

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('upstream 500');
  });

  it('throws on truncated response (stop_reason=max_tokens)', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        stop_reason: 'max_tokens',
        content: [],
      })
    );

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('truncated');
  });

  it('throws when no tool_use block in response', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Some text response' }],
      })
    );

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('No tool_use');
  });

  it('throws on unexpected tool name', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            name: 'wrong_tool',
            input: {},
          },
        ],
      })
    );

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('Unexpected tool');
  });

  it('throws when tool input is missing', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            name: 'generate_block_workouts',
          },
        ],
      })
    );

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('No input');
  });

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    // Temporarily override Deno.env to return undefined for the key
    const savedDeno = globalThis.Deno;
    (globalThis as Record<string, unknown>).Deno = {
      env: { get: () => undefined },
    };

    await expect(callClaudeForBlock('sys', 'usr')).rejects.toThrow('ANTHROPIC_API_KEY');

    (globalThis as Record<string, unknown>).Deno = savedDeno;
  });

  it('sends correct request body to Claude API', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(validToolResponse));

    await callClaudeForBlock('my system prompt', 'my user prompt');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.max_tokens).toBe(16384);
    expect(body.temperature).toBe(0);
    expect(body.system).toBe('my system prompt');
    expect(body.messages[0].content).toBe('my user prompt');
    expect(body.tool_choice.name).toBe('generate_block_workouts');
  });
});
