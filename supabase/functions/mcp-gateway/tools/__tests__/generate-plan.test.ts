import { jest } from '@jest/globals';
import type { MCPToolResult } from '../../types.ts';

// =============================================================================
// Mock Supabase client with functions.invoke
// =============================================================================

const mockInvoke = jest.fn<() => Promise<{ data: unknown; error: unknown }>>();

const MOCK_SUPABASE = {
  functions: { invoke: mockInvoke },
} as never;

const ATHLETE_ID = 'athlete-test-1';

// =============================================================================
// Import the module under test
// =============================================================================

const { generatePlanTool } = await import('../generate-plan.ts');

// =============================================================================
// Helpers
// =============================================================================

async function callHandler(input: Record<string, unknown> = {}): Promise<MCPToolResult> {
  return generatePlanTool.handler(input, ATHLETE_ID, MOCK_SUPABASE);
}

/** Sample plan response from the generate-plan Edge Function. */
function makePlanResponse(overrides?: Record<string, unknown>) {
  return {
    id: 'plan-123',
    name: '12-Week Build Plan',
    start_date: '2026-02-15',
    end_date: '2026-05-10',
    total_weeks: 12,
    status: 'active',
    goal_id: null,
    periodization: {
      total_weeks: 12,
      phases: [
        { phase: 'base', weeks: 4, focus: 'Aerobic foundation' },
        { phase: 'build', weeks: 4, focus: 'Intensity progression' },
        { phase: 'peak', weeks: 2, focus: 'Race preparation' },
        { phase: 'taper', weeks: 2, focus: 'Recovery and sharpening' },
      ],
      weekly_volumes: [],
    },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generatePlanTool', () => {
  // ---------------------------------------------------------------------------
  // Definition
  // ---------------------------------------------------------------------------
  describe('definition', () => {
    it('has the correct tool name', () => {
      expect(generatePlanTool.definition.name).toBe('generate_plan');
    });

    it('has no required properties', () => {
      expect(generatePlanTool.definition.input_schema.required).toEqual([]);
    });

    it('has goal_id, start_date, and total_weeks properties', () => {
      const propNames = Object.keys(generatePlanTool.definition.input_schema.properties);
      expect(propNames).toContain('goal_id');
      expect(propNames).toContain('start_date');
      expect(propNames).toContain('total_weeks');
    });
  });

  // ---------------------------------------------------------------------------
  // Input validation
  // ---------------------------------------------------------------------------
  describe('input validation', () => {
    it('rejects non-string goal_id', async () => {
      const result = await callHandler({ goal_id: 123 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('goal_id');
    });

    it('rejects empty string goal_id', async () => {
      const result = await callHandler({ goal_id: '' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects non-UUID goal_id', async () => {
      const result = await callHandler({ goal_id: 'not-a-uuid' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects invalid start_date format', async () => {
      const result = await callHandler({ start_date: 'bad-date' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('start_date');
    });

    it('rejects start_date that is not a real date', async () => {
      const result = await callHandler({ start_date: '2026-02-30' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects total_weeks below minimum (4)', async () => {
      const result = await callHandler({ total_weeks: 3 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('4');
      expect(result.error).toContain('52');
    });

    it('rejects total_weeks above maximum (52)', async () => {
      const result = await callHandler({ total_weeks: 53 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects non-integer total_weeks', async () => {
      const result = await callHandler({ total_weeks: 8.5 });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects NaN total_weeks', async () => {
      const result = await callHandler({ total_weeks: Number.NaN });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects Infinity total_weeks', async () => {
      const result = await callHandler({ total_weeks: Number.POSITIVE_INFINITY });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('rejects non-number total_weeks', async () => {
      const result = await callHandler({ total_weeks: 'twelve' });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('INVALID_INPUT');
    });
  });

  // ---------------------------------------------------------------------------
  // Successful generation
  // ---------------------------------------------------------------------------
  describe('successful generation', () => {
    it('works with no parameters (all defaults)', async () => {
      const plan = makePlanResponse();
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({});

      expect(mockInvoke).toHaveBeenCalledWith('generate-plan', { body: {} });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { message: string; plan: Record<string, unknown> };
      expect(data.message).toContain('12-Week Build Plan');
      expect(data.message).toContain('created successfully');
    });

    it('passes goal_id to Edge Function when provided', async () => {
      const plan = makePlanResponse({ goal_id: '11111111-1111-1111-1111-111111111111' });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({ goal_id: '11111111-1111-1111-1111-111111111111' });

      expect(mockInvoke).toHaveBeenCalledWith('generate-plan', {
        body: { goal_id: '11111111-1111-1111-1111-111111111111' },
      });
      expect(result.success).toBe(true);
    });

    it('passes start_date to Edge Function when provided', async () => {
      const plan = makePlanResponse({ start_date: '2026-03-01' });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({ start_date: '2026-03-01' });

      expect(mockInvoke).toHaveBeenCalledWith('generate-plan', {
        body: { start_date: '2026-03-01' },
      });
      expect(result.success).toBe(true);
    });

    it('passes total_weeks to Edge Function when provided', async () => {
      const plan = makePlanResponse({ total_weeks: 8 });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({ total_weeks: 8 });

      expect(mockInvoke).toHaveBeenCalledWith('generate-plan', {
        body: { total_weeks: 8 },
      });
      expect(result.success).toBe(true);
    });

    it('passes all parameters when provided', async () => {
      const plan = makePlanResponse();
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      await callHandler({
        goal_id: '11111111-1111-1111-1111-111111111111',
        start_date: '2026-03-01',
        total_weeks: 16,
      });

      expect(mockInvoke).toHaveBeenCalledWith('generate-plan', {
        body: {
          goal_id: '11111111-1111-1111-1111-111111111111',
          start_date: '2026-03-01',
          total_weeks: 16,
        },
      });
    });

    it('returns plan summary with phases', async () => {
      const plan = makePlanResponse();
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({});

      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { plan: Record<string, unknown> };
      const phases = data.plan.phases as Array<{ phase: string; weeks: number; focus: string }>;
      expect(phases).toHaveLength(4);
      expect(phases[0]).toEqual({ phase: 'base', weeks: 4, focus: 'Aerobic foundation' });
    });

    it('accepts boundary value total_weeks = 4', async () => {
      const plan = makePlanResponse({ total_weeks: 4 });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({ total_weeks: 4 });
      expect(result.success).toBe(true);
    });

    it('accepts boundary value total_weeks = 52', async () => {
      const plan = makePlanResponse({ total_weeks: 52 });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({ total_weeks: 52 });
      expect(result.success).toBe(true);
    });

    it('does not pass undefined optional fields to Edge Function', async () => {
      const plan = makePlanResponse();
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      await callHandler({ goal_id: '11111111-1111-1111-1111-111111111111' });

      const callArgs = mockInvoke.mock.calls[0] as unknown[];
      const body = (callArgs[1] as { body: Record<string, unknown> }).body;
      expect(Object.keys(body)).toEqual(['goal_id']);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    it('returns error when Edge Function returns error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function invocation failed' },
      });

      const result = await callHandler({});

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('GENERATE_PLAN_ERROR');
      expect(result.error).toContain('Function invocation failed');
    });

    it('returns error when Edge Function response has success=false', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, error: 'Athlete not found' },
        error: null,
      });

      const result = await callHandler({});

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('GENERATE_PLAN_ERROR');
    });

    it('returns error when Edge Function response has no plan', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const result = await callHandler({});

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('GENERATE_PLAN_ERROR');
    });

    it('returns error when data is null', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: null });

      const result = await callHandler({});

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe('GENERATE_PLAN_ERROR');
    });
  });

  // ---------------------------------------------------------------------------
  // Plan summary
  // ---------------------------------------------------------------------------
  describe('plan summary', () => {
    it('extracts correct fields from plan response', async () => {
      const plan = makePlanResponse({
        id: 'plan-xyz',
        name: 'Race Prep',
        start_date: '2026-04-01',
        end_date: '2026-06-24',
        total_weeks: 12,
        goal_id: '22222222-2222-2222-2222-222222222222',
      });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({});

      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { plan: Record<string, unknown> };
      expect(data.plan).toEqual(
        expect.objectContaining({
          id: 'plan-xyz',
          name: 'Race Prep',
          start_date: '2026-04-01',
          end_date: '2026-06-24',
          total_weeks: 12,
          goal_id: '22222222-2222-2222-2222-222222222222',
        })
      );
    });

    it('handles plan with no periodization phases gracefully', async () => {
      const plan = makePlanResponse({ periodization: {} });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({});

      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { plan: { phases: unknown[] } };
      expect(data.plan.phases).toEqual([]);
    });

    it('handles plan with null goal_id', async () => {
      const plan = makePlanResponse({ goal_id: null });
      mockInvoke.mockResolvedValue({ data: { success: true, plan }, error: null });

      const result = await callHandler({});

      expect(result.success).toBe(true);
      if (!result.success) return;
      const data = result.data as { plan: { goal_id: unknown } };
      expect(data.plan.goal_id).toBeNull();
    });
  });
});
