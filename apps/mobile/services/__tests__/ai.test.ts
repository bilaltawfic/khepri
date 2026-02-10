import type { CheckinFormData } from '@/types/checkin';

import { type AIContext, type AIMessage, getCheckinRecommendation, sendChatMessage } from '../ai';

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
});
