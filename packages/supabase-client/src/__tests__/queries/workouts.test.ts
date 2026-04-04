/**
 * Tests for workout query functions
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient, WorkoutRow } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: WorkoutRow | null; error: { message: string } | null }>>();

const mockLimit =
  jest.fn<() => Promise<{ data: WorkoutRow[] | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: WorkoutRow[] | null; error: { message: string } | null }>>();

const mockDeleteEq = jest.fn<() => Promise<{ error: { message: string } | null }>>();

const mockLte = jest.fn(() => ({
  order: mockOrder,
}));

const mockGte = jest.fn(() => ({
  lte: mockLte,
  order: mockOrder,
}));

const mockEq = jest.fn(() => ({
  eq: mockEq,
  gte: mockGte,
  order: mockOrder,
  select: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle,
  limit: mockLimit,
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
  bulkInsertWorkouts,
  createWorkout,
  deleteBlockWorkouts,
  getBlockWorkouts,
  getWorkoutByExternalId,
  getWorkoutById,
  getWorkoutsByDate,
  getWorkoutsForDateRange,
  updateWorkout,
  updateWorkoutActuals,
  updateWorkoutCompliance,
  updateWorkoutSyncStatus,
} from '../../queries/workouts.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockWorkoutRow: WorkoutRow = {
  id: 'workout-123',
  block_id: 'block-456',
  athlete_id: 'athlete-789',
  date: '2026-03-15',
  week_number: 3,
  name: 'Easy Run',
  sport: 'run',
  workout_type: 'easy',
  planned_duration_minutes: 45,
  planned_tss: 35,
  planned_distance_meters: 8000,
  structure: {},
  description_dsl: '',
  intervals_target: 'AUTO',
  sync_status: 'not_connected',
  external_id: 'ext-123',
  intervals_event_id: null,
  actual_duration_minutes: null,
  actual_tss: null,
  actual_distance_meters: null,
  actual_avg_power: null,
  actual_avg_pace_sec_per_km: null,
  actual_avg_hr: null,
  completed_at: null,
  intervals_activity_id: null,
  compliance: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('getWorkoutById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workout when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockWorkoutRow, error: null });

    const result = await getWorkoutById(mockClient, 'workout-123');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(result.data).toEqual(mockWorkoutRow);
    expect(result.error).toBeNull();
  });

  it('returns error when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getWorkoutById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('getBlockWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workouts ordered by date ascending', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockWorkoutRow], error: null });

    const result = await getBlockWorkouts(mockClient, 'block-456');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(mockEq).toHaveBeenCalledWith('block_id', 'block-456');
    expect(mockOrder).toHaveBeenCalledWith('date', { ascending: true });
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no workouts exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getBlockWorkouts(mockClient, 'block-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getBlockWorkouts(mockClient, 'block-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getWorkoutsByDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workouts for athlete on date', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockWorkoutRow], error: null });

    const result = await getWorkoutsByDate(mockClient, 'athlete-789', '2026-03-15');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-789');
    expect(mockEq).toHaveBeenCalledWith('date', '2026-03-15');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no workouts on date', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getWorkoutsByDate(mockClient, 'athlete-789', '2026-03-16');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getWorkoutsByDate(mockClient, 'athlete-789', '2026-03-15');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getWorkoutsForDateRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workouts in date range', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockWorkoutRow], error: null });

    const result = await getWorkoutsForDateRange(
      mockClient,
      'athlete-789',
      '2026-03-01',
      '2026-03-31'
    );

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-789');
    expect(mockGte).toHaveBeenCalledWith('date', '2026-03-01');
    expect(mockLte).toHaveBeenCalledWith('date', '2026-03-31');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getWorkoutsForDateRange(
      mockClient,
      'athlete-789',
      '2026-03-01',
      '2026-03-31'
    );

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getWorkoutByExternalId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns workout when found by external_id', async () => {
    mockLimit.mockResolvedValueOnce({ data: [mockWorkoutRow], error: null });

    const result = await getWorkoutByExternalId(mockClient, 'ext-123');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(mockEq).toHaveBeenCalledWith('external_id', 'ext-123');
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(result.data).toEqual(mockWorkoutRow);
    expect(result.error).toBeNull();
  });

  it('returns null when no workout with external_id', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    const result = await getWorkoutByExternalId(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on query failure', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'Connection timeout' },
    });

    const result = await getWorkoutByExternalId(mockClient, 'ext-123');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Connection timeout');
  });
});

describe('createWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new workout', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockWorkoutRow, error: null });

    const result = await createWorkout(mockClient, {
      block_id: 'block-456',
      athlete_id: 'athlete-789',
      date: '2026-03-15',
      week_number: 3,
      name: 'Easy Run',
      sport: 'run',
      planned_duration_minutes: 45,
      structure: {},
      external_id: 'ext-123',
    });

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.data).toEqual(mockWorkoutRow);
    expect(result.error).toBeNull();
  });

  it('returns error on constraint violation', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });

    const result = await createWorkout(mockClient, {
      block_id: 'block-456',
      athlete_id: 'athlete-789',
      date: '2026-03-15',
      week_number: 3,
      name: 'Duplicate',
      sport: 'run',
      planned_duration_minutes: 45,
      structure: {},
      external_id: 'ext-123',
    });

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('duplicate key');
  });
});

describe('bulkInsertWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts multiple workouts and returns them', async () => {
    const mockBulkSelect = jest
      .fn<() => Promise<{ data: WorkoutRow[] | null; error: { message: string } | null }>>()
      .mockResolvedValueOnce({ data: [mockWorkoutRow], error: null });
    const mockBulkInsert = jest.fn(() => ({ select: mockBulkSelect }));
    const localFrom = jest.fn(() => ({ insert: mockBulkInsert }));
    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const workouts = [
      {
        block_id: 'block-456',
        athlete_id: 'athlete-789',
        date: '2026-03-15',
        week_number: 3,
        name: 'Easy Run',
        sport: 'run',
        planned_duration_minutes: 45,
        structure: {},
        external_id: 'ext-123',
      },
    ];

    const result = await bulkInsertWorkouts(localClient, workouts);

    expect(localFrom).toHaveBeenCalledWith('workouts');
    expect(mockBulkInsert).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns error on bulk insert failure', async () => {
    const mockBulkSelect = jest
      .fn<() => Promise<{ data: WorkoutRow[] | null; error: { message: string } | null }>>()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Bulk insert failed' },
      });
    const mockBulkInsert = jest.fn(() => ({ select: mockBulkSelect }));
    const localFrom = jest.fn(() => ({ insert: mockBulkInsert }));
    const localClient = { from: localFrom } as unknown as KhepriSupabaseClient;

    const result = await bulkInsertWorkouts(localClient, []);

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Bulk insert failed');
  });
});

describe('updateWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns workout', async () => {
    const updated = { ...mockWorkoutRow, name: 'Tempo Run' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateWorkout(mockClient, 'workout-123', { name: 'Tempo Run' });

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.data?.name).toBe('Tempo Run');
    expect(result.error).toBeNull();
  });

  it('returns error when workout not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await updateWorkout(mockClient, 'nonexistent', { name: 'Updated' });

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('updateWorkoutActuals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates actual fields', async () => {
    const updated = {
      ...mockWorkoutRow,
      actual_duration_minutes: 47,
      actual_tss: 38,
      completed_at: '2026-03-15T18:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateWorkoutActuals(mockClient, 'workout-123', {
      actual_duration_minutes: 47,
      actual_tss: 38,
      completed_at: '2026-03-15T18:00:00Z',
    });

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.data?.actual_duration_minutes).toBe(47);
    expect(result.error).toBeNull();
  });
});

describe('updateWorkoutCompliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates compliance JSONB', async () => {
    const compliance = { score: 0.85, notes: 'Good effort' };
    const updated = { ...mockWorkoutRow, compliance };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateWorkoutCompliance(mockClient, 'workout-123', compliance);

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.error).toBeNull();
  });
});

describe('updateWorkoutSyncStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates sync status', async () => {
    const updated = { ...mockWorkoutRow, sync_status: 'synced' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateWorkoutSyncStatus(mockClient, 'workout-123', 'synced');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.error).toBeNull();
  });

  it('updates sync status with intervals_event_id', async () => {
    const updated = {
      ...mockWorkoutRow,
      sync_status: 'synced',
      intervals_event_id: 'evt-123',
    };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const result = await updateWorkoutSyncStatus(mockClient, 'workout-123', 'synced', 'evt-123');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.error).toBeNull();
  });
});

describe('deleteBlockWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all workouts for a block', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null });

    const result = await deleteBlockWorkouts(mockClient, 'block-456');

    expect(mockFrom).toHaveBeenCalledWith('workouts');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error on delete failure', async () => {
    mockDeleteEq.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    });

    const result = await deleteBlockWorkouts(mockClient, 'block-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Delete failed');
  });
});
