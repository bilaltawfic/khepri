/**
 * Tests for training plan query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient, TrainingPlanRow } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: TrainingPlanRow | null; error: { message: string } | null }>>();

const mockLimit =
  jest.fn<() => Promise<{ data: TrainingPlanRow[] | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: TrainingPlanRow[] | null; error: { message: string } | null }>>();

const mockDeleteEq = jest.fn<() => Promise<{ error: { message: string } | null }>>();

const mockEq = jest.fn(() => ({
  eq: mockEq,
  order: mockOrder,
  select: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle,
}));

const mockSelect = jest.fn(() => ({
  eq: mockEq,
  single: mockSingle,
}));

const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockUpdate = jest.fn(() => ({
  eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) })),
}));
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = jest.fn(() => ({
  delete: mockDelete,
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
}));

const mockClient = {
  from: mockFrom,
} as unknown as KhepriSupabaseClient;

import {
  addPlanAdaptation,
  cancelTrainingPlan,
  completeTrainingPlan,
  createTrainingPlan,
  deleteTrainingPlan,
  getActiveTrainingPlan,
  getAthleteTrainingPlans,
  getTrainingPlanById,
  getTrainingPlansForGoal,
  pauseTrainingPlan,
  updateTrainingPlan,
} from '../../queries/training-plans.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockPlanRow: TrainingPlanRow = {
  id: 'plan-123',
  athlete_id: 'athlete-456',
  name: 'Marathon Build 2026',
  description: '16-week marathon preparation plan',
  goal_id: 'goal-789',
  start_date: '2026-01-06',
  end_date: '2026-04-27',
  total_weeks: 16,
  status: 'active',
  periodization: [],
  weekly_template: null,
  adaptations: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getTrainingPlanById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns plan when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockPlanRow, error: null });

    const result = await getTrainingPlanById(mockClient, 'plan-123');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(mockPlanRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getTrainingPlanById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });

  it('returns error on query failure', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await getTrainingPlanById(mockClient, 'plan-123');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database connection failed');
  });
});

describe('getAthleteTrainingPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns plans ordered by start_date descending', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [mockPlanRow],
      error: null,
    });

    const result = await getAthleteTrainingPlans(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no plans exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getAthleteTrainingPlans(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns empty array when data is null', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const result = await getAthleteTrainingPlans(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('filters by status when option provided', async () => {
    // When status option is provided, the query chains .order().eq('status', ...)
    // mockOrder returns an object with .eq that resolves
    const statusFilterMock =
      jest.fn<
        () => Promise<{
          data: TrainingPlanRow[] | null;
          error: { message: string } | null;
        }>
      >();
    statusFilterMock.mockResolvedValueOnce({ data: [mockPlanRow], error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ eq: statusFilterMock });

    const result = await getAthleteTrainingPlans(mockClient, 'athlete-456', {
      status: 'active',
    });

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(statusFilterMock).toHaveBeenCalledWith('status', 'active');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await getAthleteTrainingPlans(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database connection failed');
  });
});

describe('getActiveTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active plan when one exists', async () => {
    mockLimit.mockResolvedValueOnce({ data: [mockPlanRow], error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveTrainingPlan(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(mockPlanRow);
    expect(result.error).toBeNull();
  });

  it('returns null when no active plan exists', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveTrainingPlan(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveTrainingPlan(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });
    (mockOrder as jest.Mock).mockReturnValueOnce({ limit: mockLimit });

    const result = await getActiveTrainingPlan(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Connection timeout');
  });
});

describe('getTrainingPlansForGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns plans linked to the goal', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [mockPlanRow],
      error: null,
    });

    const result = await getTrainingPlansForGoal(mockClient, 'goal-789');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('goal_id', 'goal-789');
    expect(mockOrder).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no plans for goal', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getTrainingPlansForGoal(mockClient, 'goal-789');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Permission denied' },
    });

    const result = await getTrainingPlansForGoal(mockClient, 'goal-789');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Permission denied');
  });
});

describe('createTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new plan', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockPlanRow, error: null });

    const result = await createTrainingPlan(mockClient, {
      athlete_id: 'athlete-456',
      name: 'Marathon Build 2026',
      start_date: '2026-01-06',
      end_date: '2026-04-27',
      total_weeks: 16,
    });

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(result.data).toEqual(mockPlanRow);
    expect(result.error).toBeNull();
  });

  it('returns error on constraint violation', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Check constraint violated: end_date must be after start_date' },
    });

    const result = await createTrainingPlan(mockClient, {
      athlete_id: 'athlete-456',
      name: 'Bad Plan',
      start_date: '2026-04-27',
      end_date: '2026-01-06',
      total_weeks: 16,
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Check constraint violated');
  });
});

describe('updateTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns plan', async () => {
    const updatedPlan = { ...mockPlanRow, name: 'Updated Plan Name' };
    mockSingle.mockResolvedValueOnce({ data: updatedPlan, error: null });

    const result = await updateTrainingPlan(mockClient, 'plan-123', {
      name: 'Updated Plan Name',
    });

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(result.data?.name).toBe('Updated Plan Name');
    expect(result.error).toBeNull();
  });

  it('returns error when plan not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await updateTrainingPlan(mockClient, 'nonexistent', {
      name: 'Updated',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('pauseTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateTrainingPlan with status paused', async () => {
    const pausedPlan = { ...mockPlanRow, status: 'paused' as const };
    mockSingle.mockResolvedValueOnce({ data: pausedPlan, error: null });

    const result = await pauseTrainingPlan(mockClient, 'plan-123');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'paused' });
    expect(result.data?.status).toBe('paused');
    expect(result.error).toBeNull();
  });
});

describe('completeTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateTrainingPlan with status completed', async () => {
    const completedPlan = { ...mockPlanRow, status: 'completed' as const };
    mockSingle.mockResolvedValueOnce({ data: completedPlan, error: null });

    const result = await completeTrainingPlan(mockClient, 'plan-123');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.data?.status).toBe('completed');
    expect(result.error).toBeNull();
  });
});

describe('cancelTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to updateTrainingPlan with status cancelled', async () => {
    const cancelledPlan = { ...mockPlanRow, status: 'cancelled' as const };
    mockSingle.mockResolvedValueOnce({ data: cancelledPlan, error: null });

    const result = await cancelTrainingPlan(mockClient, 'plan-123');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(result.data?.status).toBe('cancelled');
    expect(result.error).toBeNull();
  });
});

describe('addPlanAdaptation', () => {
  const mockAdaptation = {
    date: '2026-02-15',
    reason: 'Athlete reported knee soreness',
    changes: 'Reduced running volume by 20%',
    ai_generated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends adaptation to existing array', async () => {
    // First call: fetch current adaptations
    const fetchSingle = jest.fn().mockResolvedValueOnce({
      data: {
        adaptations: [{ date: '2026-01-15', reason: 'Old', changes: 'None', ai_generated: false }],
      },
      error: null,
    });
    const fetchEq = jest.fn(() => ({ single: fetchSingle }));
    const fetchSelect = jest.fn(() => ({ eq: fetchEq }));

    // Second call: update with appended adaptation
    const updateSingle = jest.fn().mockResolvedValueOnce({
      data: {
        ...mockPlanRow,
        adaptations: [
          { date: '2026-01-15', reason: 'Old', changes: 'None', ai_generated: false },
          mockAdaptation,
        ],
      },
      error: null,
    });
    const updateSelectFn = jest.fn(() => ({ single: updateSingle }));
    const updateEq = jest.fn(() => ({ select: updateSelectFn }));
    const updateFn = jest.fn(() => ({ eq: updateEq }));

    const localFrom = jest
      .fn()
      .mockReturnValueOnce({ select: fetchSelect })
      .mockReturnValueOnce({ update: updateFn });

    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await addPlanAdaptation(localClient, 'plan-123', mockAdaptation);

    expect(localFrom).toHaveBeenCalledTimes(2);
    expect(localFrom).toHaveBeenNthCalledWith(1, 'training_plans');
    expect(localFrom).toHaveBeenNthCalledWith(2, 'training_plans');
    expect(fetchSelect).toHaveBeenCalledWith('adaptations');
    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('handles empty existing adaptations array', async () => {
    const fetchSingle = jest.fn().mockResolvedValueOnce({
      data: { adaptations: [] },
      error: null,
    });
    const fetchEq = jest.fn(() => ({ single: fetchSingle }));
    const fetchSelect = jest.fn(() => ({ eq: fetchEq }));

    const updateSingle = jest.fn().mockResolvedValueOnce({
      data: { ...mockPlanRow, adaptations: [mockAdaptation] },
      error: null,
    });
    const updateSelectFn = jest.fn(() => ({ single: updateSingle }));
    const updateEq = jest.fn(() => ({ select: updateSelectFn }));
    const updateFn = jest.fn(() => ({ eq: updateEq }));

    const localFrom = jest
      .fn()
      .mockReturnValueOnce({ select: fetchSelect })
      .mockReturnValueOnce({ update: updateFn });

    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await addPlanAdaptation(localClient, 'plan-123', mockAdaptation);

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('handles null existing adaptations', async () => {
    const fetchSingle = jest.fn().mockResolvedValueOnce({
      data: { adaptations: null },
      error: null,
    });
    const fetchEq = jest.fn(() => ({ single: fetchSingle }));
    const fetchSelect = jest.fn(() => ({ eq: fetchEq }));

    const updateSingle = jest.fn().mockResolvedValueOnce({
      data: { ...mockPlanRow, adaptations: [mockAdaptation] },
      error: null,
    });
    const updateSelectFn = jest.fn(() => ({ single: updateSingle }));
    const updateEq = jest.fn(() => ({ select: updateSelectFn }));
    const updateFn = jest.fn(() => ({ eq: updateEq }));

    const localFrom = jest
      .fn()
      .mockReturnValueOnce({ select: fetchSelect })
      .mockReturnValueOnce({ update: updateFn });

    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await addPlanAdaptation(localClient, 'plan-123', mockAdaptation);

    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when plan not found (fetch step fails)', async () => {
    const fetchSingle = jest.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });
    const fetchEq = jest.fn(() => ({ single: fetchSingle }));
    const fetchSelect = jest.fn(() => ({ eq: fetchEq }));

    const localFrom = jest.fn().mockReturnValueOnce({ select: fetchSelect });

    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await addPlanAdaptation(localClient, 'nonexistent', mockAdaptation);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });

  it('returns error when update step fails', async () => {
    const fetchSingle = jest.fn().mockResolvedValueOnce({
      data: { adaptations: [] },
      error: null,
    });
    const fetchEq = jest.fn(() => ({ single: fetchSingle }));
    const fetchSelect = jest.fn(() => ({ eq: fetchEq }));

    const updateSingle = jest.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    });
    const updateSelectFn = jest.fn(() => ({ single: updateSingle }));
    const updateEq = jest.fn(() => ({ select: updateSelectFn }));
    const updateFn = jest.fn(() => ({ eq: updateEq }));

    const localFrom = jest
      .fn()
      .mockReturnValueOnce({ select: fetchSelect })
      .mockReturnValueOnce({ update: updateFn });

    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await addPlanAdaptation(localClient, 'plan-123', mockAdaptation);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Update failed');
  });
});

describe('deleteTrainingPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes plan from database', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null });

    const result = await deleteTrainingPlan(mockClient, 'plan-123');

    expect(mockFrom).toHaveBeenCalledWith('training_plans');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when plan not found', async () => {
    mockDeleteEq.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    });

    const result = await deleteTrainingPlan(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Delete failed');
  });
});
