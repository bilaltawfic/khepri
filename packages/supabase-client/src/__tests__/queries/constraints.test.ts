/**
 * Tests for constraint query functions (injuries, travel, availability)
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ConstraintRow, KhepriSupabaseClient } from '../../types.js';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockSingle =
  jest.fn<() => Promise<{ data: ConstraintRow | null; error: { message: string } | null }>>();

const mockOrder =
  jest.fn<() => Promise<{ data: ConstraintRow[] | null; error: { message: string } | null }>>();

const mockDeleteEq = jest.fn<() => Promise<{ error: { message: string } | null }>>();

const mockOr = jest.fn(() => ({ order: mockOrder }));
const mockLte = jest.fn(() => ({ or: mockOr, order: mockOrder }));
const mockEq = jest.fn(() => ({
  eq: mockEq,
  lte: mockLte,
  or: mockOr,
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
  createConstraint,
  deleteConstraint,
  getActiveConstraints,
  getActiveInjuries,
  getConstraintById,
  getConstraintsByType,
  getCurrentTravelConstraints,
  resolveConstraint,
  updateConstraint,
} from '../../queries/constraints.js';

// =============================================================================
// TEST DATA
// =============================================================================

const mockInjuryConstraint: ConstraintRow = {
  id: 'constraint-123',
  athlete_id: 'athlete-456',
  constraint_type: 'injury',
  title: 'Knee strain',
  description: 'Minor strain from overtraining',
  start_date: '2026-01-15',
  end_date: '2026-02-15',
  status: 'active',
  injury_body_part: 'knee',
  injury_severity: 'mild',
  injury_restrictions: ['no running', 'low impact only'],
  travel_destination: null,
  travel_equipment_available: null,
  travel_facilities_available: null,
  availability_hours_per_week: null,
  availability_days_available: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTravelConstraint: ConstraintRow = {
  ...mockInjuryConstraint,
  id: 'constraint-456',
  constraint_type: 'travel',
  title: 'Business trip to NYC',
  injury_body_part: null,
  injury_severity: null,
  injury_restrictions: null,
  travel_destination: 'New York, NY',
  travel_equipment_available: ['hotel gym'],
  travel_facilities_available: ['treadmill', 'stationary bike'],
};

// =============================================================================
// TESTS
// =============================================================================

describe('getActiveConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns active constraints within date range', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [mockInjuryConstraint, mockTravelConstraint],
      error: null,
    });

    const result = await getActiveConstraints(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no active constraints', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getActiveConstraints(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('getConstraintsByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by constraint type', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockInjuryConstraint], error: null });

    const result = await getConstraintsByType(mockClient, 'athlete-456', 'injury');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getActiveInjuries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only active injuries', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockInjuryConstraint], error: null });

    const result = await getActiveInjuries(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getCurrentTravelConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns overlapping travel constraints', async () => {
    mockOrder.mockResolvedValueOnce({ data: [mockTravelConstraint], error: null });

    const result = await getCurrentTravelConstraints(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getConstraintById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns constraint when found', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockInjuryConstraint, error: null });

    const result = await getConstraintById(mockClient, 'constraint-123');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toEqual(mockInjuryConstraint);
    expect(result.error).toBeNull();
  });

  it('returns null when not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Row not found' },
    });

    const result = await getConstraintById(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Row not found');
  });
});

describe('createConstraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and returns new constraint', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockInjuryConstraint, error: null });

    const result = await createConstraint(mockClient, {
      athlete_id: 'athlete-456',
      constraint_type: 'injury',
      title: 'Knee strain',
      start_date: '2026-01-15',
    });

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toEqual(mockInjuryConstraint);
    expect(result.error).toBeNull();
  });
});

describe('updateConstraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates and returns constraint', async () => {
    const updatedConstraint = { ...mockInjuryConstraint, title: 'Updated Title' };
    mockSingle.mockResolvedValueOnce({ data: updatedConstraint, error: null });

    const result = await updateConstraint(mockClient, 'constraint-123', {
      title: 'Updated Title',
    });

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data?.title).toBe('Updated Title');
    expect(result.error).toBeNull();
  });
});

describe('resolveConstraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets status to resolved', async () => {
    const resolvedConstraint = { ...mockInjuryConstraint, status: 'resolved' as const };
    mockSingle.mockResolvedValueOnce({ data: resolvedConstraint, error: null });

    const result = await resolveConstraint(mockClient, 'constraint-123');

    expect(result.data?.status).toBe('resolved');
    expect(result.error).toBeNull();
  });
});

describe('deleteConstraint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes constraint from database', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null });

    const result = await deleteConstraint(mockClient, 'constraint-123');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});
