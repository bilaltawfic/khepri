/**
 * Tests for CoachingClient
 *
 * These tests cover the client constructor, API methods, and helper functions.
 */

import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CoachingContext } from '../types.js';

// Mock functions - must be declared before jest.unstable_mockModule
const mockCreate = jest.fn();
const mockStream = jest.fn();

// ESM-compatible mocking - must use unstable_mockModule for ESM
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  })),
}));

// Import after mocking - must use dynamic import for ESM
const { CoachingClient, createCoachingClient, isConfigured } = await import('../client.js');

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockContext: CoachingContext = {
  athlete: {
    id: 'athlete-1',
    displayName: 'Test Athlete',
    preferredUnits: 'metric',
    timezone: 'UTC',
    intervalsIcuConnected: false,
    ftpWatts: 250,
    restingHeartRate: 50,
    maxHeartRate: 185,
  },
  goals: [
    {
      id: 'goal-1',
      athleteId: 'athlete-1',
      goalType: 'race',
      title: 'Olympic Triathlon',
      priority: 'A',
      status: 'active',
      targetDate: '2024-09-15',
      raceEventName: 'City Olympic',
      raceDistance: 'Olympic',
    },
  ],
  constraints: [],
  recentActivities: [],
  wellnessHistory: [],
};

const mockApiResponse = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'Today I recommend an easy run.\n\nSport: run\nDuration: 45 minutes\nIntensity: easy\n\nWorkout Title: Easy Recovery Run',
    },
  ],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 100, output_tokens: 50 },
};

describe('CoachingClient', () => {
  describe('constructor', () => {
    it('creates client with default config', () => {
      const client = new CoachingClient();
      expect(client).toBeDefined();
    });

    it('creates client with custom config', () => {
      const client = new CoachingClient({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 8192,
        timeout: 30000,
        maxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('creates client with custom baseURL', () => {
      const client = new CoachingClient({
        baseURL: 'https://custom.api.com',
      });
      expect(client).toBeDefined();
    });

    it('creates client with partial config', () => {
      const client = new CoachingClient({
        apiKey: 'test-key',
      });
      expect(client).toBeDefined();
    });

    it('creates client with only timeout', () => {
      const client = new CoachingClient({
        timeout: 45000,
      });
      expect(client).toBeDefined();
    });

    it('creates client with only maxRetries', () => {
      const client = new CoachingClient({
        maxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('creates client with only model', () => {
      const client = new CoachingClient({
        model: 'claude-3-haiku-20240307',
      });
      expect(client).toBeDefined();
    });

    it('creates client with only maxTokens', () => {
      const client = new CoachingClient({
        maxTokens: 2048,
      });
      expect(client).toBeDefined();
    });
  });
});

describe('createCoachingClient', () => {
  it('creates a new CoachingClient instance', () => {
    const client = createCoachingClient();
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('creates client with no config', () => {
    const client = createCoachingClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('passes config to CoachingClient', () => {
    const client = createCoachingClient({ apiKey: 'test-key', model: 'custom-model' });
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('creates client with all config options', () => {
    const client = createCoachingClient({
      apiKey: 'test-key',
      model: 'claude-3-opus-20240229',
      maxTokens: 8192,
      baseURL: 'https://custom.api.com',
      timeout: 30000,
      maxRetries: 5,
    });
    expect(client).toBeInstanceOf(CoachingClient);
  });
});

describe('isConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(isConfigured()).toBe(true);
  });

  it('returns false when ANTHROPIC_API_KEY is not set', () => {
    process.env.ANTHROPIC_API_KEY = undefined;
    expect(isConfigured()).toBe(false);
  });

  it('returns false when ANTHROPIC_API_KEY is empty string', () => {
    process.env.ANTHROPIC_API_KEY = '';
    expect(isConfigured()).toBe(false);
  });

  it('returns true when ANTHROPIC_API_KEY has whitespace', () => {
    // A key with whitespace is still truthy
    process.env.ANTHROPIC_API_KEY = '  test-key  ';
    expect(isConfigured()).toBe(true);
  });
});

// =============================================================================
// getCoachingResponse TESTS
// =============================================================================

describe('getCoachingResponse', () => {
  let client: CoachingClient;

  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue(mockApiResponse);
    client = new CoachingClient({ apiKey: 'test-key' });
  });

  it('calls API with correct parameters for daily-checkin scenario', async () => {
    await client.getCoachingResponse({
      scenario: 'daily-checkin',
      context: mockContext,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: expect.stringContaining('Test Athlete'),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('returns parsed response with message', async () => {
    const response = await client.getCoachingResponse({
      scenario: 'daily-checkin',
      context: mockContext,
    });

    expect(response.message).toContain('Today I recommend an easy run');
  });

  it('extracts workout recommendation from response', async () => {
    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation).toBeDefined();
    expect(response.recommendation?.sport).toBe('run');
    expect(response.recommendation?.durationMinutes).toBe(45);
    expect(response.recommendation?.intensity).toBe('easy');
    expect(response.recommendation?.title).toBe('Easy Recovery Run');
  });

  it('handles workout-recommendation scenario', async () => {
    await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('workout'),
          }),
        ]),
      })
    );
  });

  it('handles plan-adjustment scenario with userMessage', async () => {
    await client.getCoachingResponse({
      scenario: 'plan-adjustment',
      context: mockContext,
      userMessage: 'I need to reduce my training volume this week',
    });

    expect(mockCreate).toHaveBeenCalled();
  });

  it('handles general-coaching scenario with userMessage', async () => {
    await client.getCoachingResponse({
      scenario: 'general-coaching',
      context: mockContext,
      userMessage: 'How should I pace my upcoming race?',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('How should I pace'),
          }),
        ]),
      })
    );
  });

  it('handles general-coaching scenario without userMessage', async () => {
    await client.getCoachingResponse({
      scenario: 'general-coaching',
      context: mockContext,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Please provide coaching guidance'),
          }),
        ]),
      })
    );
  });

  it('handles response with no workout pattern', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Take a rest day today.' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'daily-checkin',
      context: mockContext,
    });

    expect(response.recommendation).toBeUndefined();
    expect(response.message).toBe('Take a rest day today.');
  });

  it('handles response with multiple content blocks', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [
        { type: 'text', text: 'First part. ' },
        { type: 'text', text: 'Second part.' },
      ],
    });

    const response = await client.getCoachingResponse({
      scenario: 'daily-checkin',
      context: mockContext,
    });

    expect(response.message).toBe('First part. Second part.');
  });
});

// =============================================================================
// getCoachingResponseStream TESTS
// =============================================================================

describe('getCoachingResponseStream', () => {
  let client: CoachingClient;

  beforeEach(() => {
    mockStream.mockReset();
    client = new CoachingClient({ apiKey: 'test-key' });
  });

  it('yields text chunks from stream', async () => {
    const mockStreamEvents = [
      { type: 'content_block_delta', delta: { text: 'Hello' } },
      { type: 'content_block_delta', delta: { text: ' world' } },
    ];

    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });

    const chunks: Array<{ type: string; content?: string }> = [];
    for await (const chunk of client.getCoachingResponseStream({
      scenario: 'daily-checkin',
      context: mockContext,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ]);
  });

  it('ignores non-text delta events', async () => {
    const mockStreamEvents = [
      { type: 'content_block_delta', delta: { text: 'Hello' } },
      { type: 'content_block_delta', delta: { other: 'ignored' } },
      { type: 'message_start', message: {} },
      { type: 'content_block_delta', delta: { text: ' world' } },
    ];

    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of mockStreamEvents) {
          yield event;
        }
      },
    });

    const chunks: Array<{ type: string; content?: string }> = [];
    for await (const chunk of client.getCoachingResponseStream({
      scenario: 'daily-checkin',
      context: mockContext,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
      { type: 'done' },
    ]);
  });

  it('yields done at the end', async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'content_block_delta', delta: { text: 'Test' } };
      },
    });

    const chunks: Array<{ type: string }> = [];
    for await (const chunk of client.getCoachingResponseStream({
      scenario: 'daily-checkin',
      context: mockContext,
    })) {
      chunks.push(chunk);
    }

    expect(chunks[chunks.length - 1]).toEqual({ type: 'done' });
  });

  it('handles empty stream', async () => {
    mockStream.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        // Empty generator
      },
    });

    const chunks: Array<{ type: string }> = [];
    for await (const chunk of client.getCoachingResponseStream({
      scenario: 'daily-checkin',
      context: mockContext,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: 'done' }]);
  });
});

// =============================================================================
// sendFollowUp TESTS
// =============================================================================

describe('sendFollowUp', () => {
  let client: CoachingClient;

  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue(mockApiResponse);
    client = new CoachingClient({ apiKey: 'test-key' });
  });

  it('sends follow-up message with conversation history', async () => {
    const previousMessages = [
      { role: 'user' as const, content: 'What workout should I do today?' },
      { role: 'assistant' as const, content: 'I recommend an easy run.' },
    ];

    await client.sendFollowUp(previousMessages, 'Can you make it shorter?', mockContext);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [...previousMessages, { role: 'user', content: 'Can you make it shorter?' }],
      })
    );
  });

  it('returns parsed response', async () => {
    const response = await client.sendFollowUp([], 'Follow up question', mockContext);

    expect(response.message).toContain('Today I recommend an easy run');
  });

  it('includes system prompt with athlete context', async () => {
    await client.sendFollowUp([], 'Question', mockContext);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Test Athlete'),
      })
    );
  });
});

// =============================================================================
// extractWorkoutRecommendation TESTS (via getCoachingResponse)
// =============================================================================

describe('extractWorkoutRecommendation', () => {
  let client: CoachingClient;

  beforeEach(() => {
    mockCreate.mockReset();
    client = new CoachingClient({ apiKey: 'test-key' });
  });

  it('extracts swim workout', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: swim\nDuration: 60 minutes\nIntensity: moderate' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.sport).toBe('swim');
    expect(response.recommendation?.durationMinutes).toBe(60);
    expect(response.recommendation?.intensity).toBe('moderate');
  });

  it('extracts bike workout', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: bike\nDuration: 90 minutes\nIntensity: threshold' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.sport).toBe('bike');
    expect(response.recommendation?.durationMinutes).toBe(90);
    expect(response.recommendation?.intensity).toBe('threshold');
  });

  it('extracts strength workout', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: strength\nDuration: 30 minutes' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.sport).toBe('strength');
  });

  it('extracts rest day', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: rest' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.sport).toBe('rest');
  });

  it('defaults duration to 60 when not specified', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run\nIntensity: easy' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.durationMinutes).toBe(60);
  });

  it('defaults intensity to moderate when not specified', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run\nDuration: 30 minutes' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.intensity).toBe('moderate');
  });

  it('extracts VO2max intensity', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run\nIntensity: vo2max' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.intensity).toBe('vo2max');
  });

  it('extracts recovery intensity', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run\nIntensity: recovery' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.intensity).toBe('recovery');
  });

  it('extracts title from Workout Title pattern', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run\nWorkout Title: Tempo Run with Hills' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.title).toBe('Tempo Run with Hills');
  });

  it("extracts title from Today's Recommendation pattern", async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: "Sport: bike\nToday's Recommendation: Easy Spin" }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.title).toBe('Easy Spin');
  });

  it('generates default title when not specified', async () => {
    mockCreate.mockResolvedValueOnce({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: swim' }],
    });

    const response = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response.recommendation?.title).toBe('swim workout');
  });

  it('generates unique IDs for recommendations', async () => {
    mockCreate.mockResolvedValue({
      ...mockApiResponse,
      content: [{ type: 'text', text: 'Sport: run' }],
    });

    const response1 = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });
    const response2 = await client.getCoachingResponse({
      scenario: 'workout-recommendation',
      context: mockContext,
    });

    expect(response1.recommendation?.id).toBeDefined();
    expect(response2.recommendation?.id).toBeDefined();
    expect(response1.recommendation?.id).not.toBe(response2.recommendation?.id);
  });
});
