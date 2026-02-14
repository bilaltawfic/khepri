import type { CheckinFormData } from '@/types/checkin';

import {
  type AIContext,
  type AIMessage,
  type StreamCallbacks,
  getCheckinRecommendation,
  parseSSELine,
  sendChatMessage,
  sendChatMessageStream,
} from '../ai';

const mockInvoke = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

function createMockSupabase() {
  return {
    functions: {
      invoke: mockInvoke,
    },
  };
}

const baseFormData: CheckinFormData = {
  sleepQuality: 7,
  sleepHours: 7.5,
  energyLevel: 6,
  stressLevel: 4,
  overallSoreness: 3,
  sorenessAreas: {},
  availableTimeMinutes: 60,
  constraints: [],
  travelStatus: 'home',
  notes: '',
};

describe('ai service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe('getCheckinRecommendation', () => {
    it('calls supabase function with correct parameters', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Great day for a moderate workout!' },
        error: null,
      });

      await getCheckinRecommendation(baseFormData);

      expect(mockInvoke).toHaveBeenCalledWith('ai-coach', {
        body: {
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining("Here's my check-in for today"),
            }),
          ]),
          context: expect.objectContaining({
            recentCheckin: expect.objectContaining({
              sleepQuality: 7,
              sleepHours: 7.5,
              energyLevel: 6,
              stressLevel: 4,
              overallSoreness: 3,
              availableTimeMinutes: 60,
            }),
          }),
        },
      });
    });

    it('returns structured recommendation on success', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Today is a great day for a moderate endurance workout session.' },
        error: null,
      });

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.summary).toContain('moderate endurance workout session');
      expect(data?.intensityLevel).toBe('moderate');
      expect(data?.duration).toBeLessThanOrEqual(60);
    });

    it('parses recovery intensity from response', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'You should focus on recovery today with some light stretching.' },
        error: null,
      });

      const { data } = await getCheckinRecommendation(baseFormData);

      expect(data?.intensityLevel).toBe('recovery');
    });

    it('parses easy intensity from response', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Take it easy today with a light jog.' },
        error: null,
      });

      const { data } = await getCheckinRecommendation(baseFormData);

      expect(data?.intensityLevel).toBe('easy');
    });

    it('parses hard intensity from response', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Great day for a hard interval session!' },
        error: null,
      });

      const { data } = await getCheckinRecommendation(baseFormData);

      expect(data?.intensityLevel).toBe('hard');
    });

    it('includes constraints in notes', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Moderate workout recommended.' },
        error: null,
      });

      const formWithConstraints: CheckinFormData = {
        ...baseFormData,
        constraints: ['traveling', 'limited_equipment'],
      };

      const { data } = await getCheckinRecommendation(formWithConstraints);

      expect(data?.notes).toContain('traveling');
      expect(data?.notes).toContain('limited equipment');
    });

    it('passes additional context to AI', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Workout recommendation.' },
        error: null,
      });

      const context: AIContext = {
        name: 'Test Athlete',
        ctl: 50,
        atl: 60,
        tsb: -10,
      };

      await getCheckinRecommendation(baseFormData, context);

      expect(mockInvoke).toHaveBeenCalledWith('ai-coach', {
        body: expect.objectContaining({
          context: expect.objectContaining({
            name: 'Test Athlete',
            ctl: 50,
            atl: 60,
            tsb: -10,
          }),
        }),
      });
    });

    it('returns error on function invoke failure', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function invocation failed' },
      });

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Function invocation failed'));
    });

    it('returns error when no content in response', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: '' },
        error: null,
      });

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('No response from AI'));
    });

    it('handles thrown Error exceptions', async () => {
      mockInvoke.mockRejectedValue(new Error('Network failure'));

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Network failure'));
    });

    it('handles thrown string exceptions', async () => {
      mockInvoke.mockRejectedValue('string error');

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('string error'));
    });

    it('uses fallback message for non-Error, non-string exceptions', async () => {
      mockInvoke.mockRejectedValue(42);

      const { data, error } = await getCheckinRecommendation(baseFormData);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Unknown error getting recommendation'));
    });

    describe('when supabase is not configured', () => {
      beforeEach(() => {
        mockSupabase = undefined;
      });

      it('returns mock recommendation', async () => {
        const { data, error } = await getCheckinRecommendation(baseFormData);

        expect(mockInvoke).not.toHaveBeenCalled();
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.summary).toBeTruthy();
        expect(data?.workoutSuggestion).toBeTruthy();
        expect(data?.intensityLevel).toBeTruthy();
        expect(data?.duration).toBeGreaterThan(0);
      });

      it('returns recovery recommendation when feeling unwell', async () => {
        const formData: CheckinFormData = {
          ...baseFormData,
          constraints: ['feeling_unwell'],
        };

        const { data } = await getCheckinRecommendation(formData);

        expect(data?.intensityLevel).toBe('recovery');
        expect(data?.summary).toContain('not feeling well');
      });

      it('returns recovery recommendation for low wellness scores', async () => {
        const formData: CheckinFormData = {
          ...baseFormData,
          sleepQuality: 2,
          energyLevel: 2,
          stressLevel: 9,
          overallSoreness: 8,
        };

        const { data } = await getCheckinRecommendation(formData);

        expect(data?.intensityLevel).toBe('recovery');
      });

      it('returns hard recommendation for high wellness scores', async () => {
        const formData: CheckinFormData = {
          ...baseFormData,
          sleepQuality: 9,
          energyLevel: 9,
          stressLevel: 2,
          overallSoreness: 1,
        };

        const { data } = await getCheckinRecommendation(formData);

        expect(data?.intensityLevel).toBe('hard');
      });

      it('limits duration to available time', async () => {
        const formData: CheckinFormData = {
          ...baseFormData,
          availableTimeMinutes: 15,
        };

        const { data } = await getCheckinRecommendation(formData);

        expect(data?.duration).toBeLessThanOrEqual(15);
      });
    });
  });

  describe('sendChatMessage', () => {
    const messages: AIMessage[] = [{ role: 'user', content: 'What should I do today?' }];

    it('calls supabase function with messages', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'AI response here' },
        error: null,
      });

      await sendChatMessage(messages);

      expect(mockInvoke).toHaveBeenCalledWith('ai-coach', {
        body: {
          messages,
          context: undefined,
        },
      });
    });

    it('passes context to supabase function', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'AI response here' },
        error: null,
      });

      const context: AIContext = {
        name: 'Test Athlete',
        ctl: 50,
      };

      await sendChatMessage(messages, context);

      expect(mockInvoke).toHaveBeenCalledWith('ai-coach', {
        body: {
          messages,
          context,
        },
      });
    });

    it('returns content on success', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: 'Here is your coaching advice.' },
        error: null,
      });

      const { data, error } = await sendChatMessage(messages);

      expect(error).toBeNull();
      expect(data).toBe('Here is your coaching advice.');
    });

    it('returns error on function invoke failure', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function invocation failed' },
      });

      const { data, error } = await sendChatMessage(messages);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Function invocation failed'));
    });

    it('returns error when no content in response', async () => {
      mockInvoke.mockResolvedValue({
        data: { content: '' },
        error: null,
      });

      const { data, error } = await sendChatMessage(messages);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('No response from AI'));
    });

    it('handles thrown Error exceptions', async () => {
      mockInvoke.mockRejectedValue(new Error('Network failure'));

      const { data, error } = await sendChatMessage(messages);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Network failure'));
    });

    it('handles thrown string exceptions', async () => {
      mockInvoke.mockRejectedValue('string error');

      const { data, error } = await sendChatMessage(messages);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('string error'));
    });

    it('uses fallback message for non-Error, non-string exceptions', async () => {
      mockInvoke.mockRejectedValue(42);

      const { data, error } = await sendChatMessage(messages);

      expect(data).toBeNull();
      expect(error).toEqual(new Error('Unknown error sending message'));
    });

    describe('when supabase is not configured', () => {
      beforeEach(() => {
        mockSupabase = undefined;
      });

      it('returns mock response', async () => {
        const { data, error } = await sendChatMessage(messages);

        expect(mockInvoke).not.toHaveBeenCalled();
        expect(error).toBeNull();
        expect(data).toContain('Mock response');
      });
    });
  });

  describe('parseSSELine', () => {
    it('parses a valid content_delta event', () => {
      const result = parseSSELine('data: {"type":"content_delta","text":"Hello"}');

      expect(result).toEqual({ type: 'content_delta', text: 'Hello' });
    });

    it('parses a valid done event', () => {
      const result = parseSSELine('data: {"type":"done"}');

      expect(result).toEqual({ type: 'done' });
    });

    it('parses a valid usage event', () => {
      const result = parseSSELine('data: {"type":"usage","input_tokens":10,"output_tokens":20}');

      expect(result).toEqual({ type: 'usage', input_tokens: 10, output_tokens: 20 });
    });

    it('parses a valid tool_calls event', () => {
      const result = parseSSELine(
        'data: {"type":"tool_calls","tool_calls":[{"tool_name":"get_weather","success":true}]}'
      );

      expect(result).toEqual({
        type: 'tool_calls',
        tool_calls: [{ tool_name: 'get_weather', success: true }],
      });
    });

    it('parses a valid error event', () => {
      const result = parseSSELine('data: {"type":"error","error":"Something failed"}');

      expect(result).toEqual({ type: 'error', error: 'Something failed' });
    });

    it('returns null for non-data lines', () => {
      expect(parseSSELine('event: content_delta')).toBeNull();
      expect(parseSSELine('')).toBeNull();
      expect(parseSSELine('id: 123')).toBeNull();
      expect(parseSSELine(': comment')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      expect(parseSSELine('data: not-json')).toBeNull();
      expect(parseSSELine('data: {invalid')).toBeNull();
    });

    it('returns null for JSON without valid type', () => {
      expect(parseSSELine('data: {"type":"unknown_event"}')).toBeNull();
      expect(parseSSELine('data: {"foo":"bar"}')).toBeNull();
    });

    it('returns null for non-object JSON values', () => {
      expect(parseSSELine('data: "hello"')).toBeNull();
      expect(parseSSELine('data: 42')).toBeNull();
      expect(parseSSELine('data: null')).toBeNull();
      expect(parseSSELine('data: true')).toBeNull();
    });
  });

  describe('sendChatMessageStream', () => {
    const messages: AIMessage[] = [{ role: 'user', content: 'What should I do today?' }];
    const mockGetSession = jest.fn();
    const originalFetch = global.fetch;
    const originalEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;

    function createMockStreamSupabase() {
      return {
        functions: { invoke: mockInvoke },
        auth: { getSession: mockGetSession },
      };
    }

    function createMockCallbacks(): StreamCallbacks & {
      deltaCalls: string[];
      doneCalls: string[];
      errorCalls: Error[];
    } {
      const deltaCalls: string[] = [];
      const doneCalls: string[] = [];
      const errorCalls: Error[] = [];
      return {
        onDelta: (text: string) => deltaCalls.push(text),
        onDone: (text: string) => doneCalls.push(text),
        onError: (err: Error) => errorCalls.push(err),
        deltaCalls,
        doneCalls,
        errorCalls,
      };
    }

    function createSSEChunk(...events: Array<Record<string, unknown>>): Uint8Array {
      const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
      return new TextEncoder().encode(text);
    }

    function createMockReader(chunks: Uint8Array[]) {
      let index = 0;
      return {
        read: jest.fn().mockImplementation(() => {
          if (index < chunks.length) {
            const chunk = chunks[index];
            index += 1;
            return Promise.resolve({ done: false, value: chunk });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      };
    }

    beforeEach(() => {
      mockSupabase = createMockStreamSupabase();
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      });
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });

    afterEach(() => {
      global.fetch = originalFetch;
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv;
    });

    it('calls onDelta with accumulated content and onDone with final content', async () => {
      const callbacks = createMockCallbacks();
      const chunks = [
        createSSEChunk({ type: 'content_delta', text: 'Hello' }),
        createSSEChunk({ type: 'content_delta', text: ' world' }),
        createSSEChunk({ type: 'done' }),
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => createMockReader(chunks) },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.deltaCalls).toEqual(['Hello', 'Hello world']);
      expect(callbacks.doneCalls).toEqual(['Hello world']);
      expect(callbacks.errorCalls).toHaveLength(0);
    });

    it('calls onError when fetch response is not ok', async () => {
      const callbacks = createMockCallbacks();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Stream request failed: 500');
      expect(callbacks.doneCalls).toHaveLength(0);
    });

    it('calls onError when response body is null', async () => {
      const callbacks = createMockCallbacks();

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: null,
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Response body is not readable');
    });

    it('calls onError when not authenticated', async () => {
      const callbacks = createMockCallbacks();
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Not authenticated');
    });

    it('calls onError when supabase URL is not configured', async () => {
      const callbacks = createMockCallbacks();
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Supabase URL not configured');
    });

    it('calls onError when stream sends an error event', async () => {
      const callbacks = createMockCallbacks();
      const chunks = [
        createSSEChunk({ type: 'content_delta', text: 'Partial' }),
        createSSEChunk({ type: 'error', error: 'Rate limit exceeded' }),
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => createMockReader(chunks) },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.deltaCalls).toEqual(['Partial']);
      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Rate limit exceeded');
    });

    it('delivers content when stream ends without done event', async () => {
      const callbacks = createMockCallbacks();
      const chunks = [createSSEChunk({ type: 'content_delta', text: 'Hello' })];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => createMockReader(chunks) },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.doneCalls).toEqual(['Hello']);
    });

    it('calls onError when fetch throws a network error', async () => {
      const callbacks = createMockCallbacks();

      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.errorCalls).toHaveLength(1);
      expect(callbacks.errorCalls[0].message).toBe('Network failure');
    });

    it('sends correct headers and body', async () => {
      const callbacks = createMockCallbacks();
      const chunks = [createSSEChunk({ type: 'done' })];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => createMockReader(chunks) },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/ai-orchestrator',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({
            messages,
            athlete_context: undefined,
            stream: true,
          }),
        }
      );
    });

    it('skips malformed SSE lines gracefully', async () => {
      const callbacks = createMockCallbacks();
      // Manually build a chunk with a mix of valid and invalid lines
      const text =
        'event: content_delta\ndata: {"type":"content_delta","text":"ok"}\n\ndata: bad-json\n\nevent: done\ndata: {"type":"done"}\n\n';
      const chunks = [new TextEncoder().encode(text)];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => createMockReader(chunks) },
      });

      await sendChatMessageStream(messages, undefined, callbacks);

      expect(callbacks.deltaCalls).toEqual(['ok']);
      expect(callbacks.doneCalls).toEqual(['ok']);
    });

    describe('when supabase is not configured', () => {
      beforeEach(() => {
        mockSupabase = undefined;
      });

      it('calls onDelta and onDone with mock response', async () => {
        const callbacks = createMockCallbacks();

        await sendChatMessageStream(messages, undefined, callbacks);

        expect(callbacks.doneCalls).toHaveLength(1);
        expect(callbacks.doneCalls[0]).toContain('Mock response');
        expect(callbacks.deltaCalls).toHaveLength(1);
        expect(callbacks.deltaCalls[0]).toContain('Mock response');
        expect(callbacks.errorCalls).toHaveLength(0);
      });
    });
  });
});
