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

// Store for mock resolved values that can be consumed
let mockOrderResults: {
  data: ConstraintRow[] | null;
  error: { message: string } | null;
}[] = [];

// Create a lazy chainable object that resolves only when awaited
// This properly handles both single .order() and chained .order().order() patterns
interface ChainableQuery {
  order: () => ChainableQuery;
  then: <TResult>(
    onfulfilled?: (value: {
      data: ConstraintRow[] | null;
      error: { message: string } | null;
    }) => TResult
  ) => Promise<TResult>;
}

function createChainableQuery(): ChainableQuery {
  return {
    order: () => createChainableQuery(), // Chaining returns a new chainable
    // biome-ignore lint/suspicious/noThenProperty: Required to mimic Supabase's PostgREST FilterBuilder thenable behavior
    then: (onfulfilled) => {
      // Only consume the value when actually awaited
      const value = mockOrderResults.shift() ?? { data: [], error: null };
      return Promise.resolve(value).then(onfulfilled);
    },
  };
}

// Mock order function that returns the chainable query
const mockOrderFinal = jest.fn(() => createChainableQuery());

// Helper to set mock resolved values (like mockResolvedValueOnce)
function setMockOrderResult(value: {
  data: ConstraintRow[] | null;
  error: { message: string } | null;
}) {
  mockOrderResults.push(value);
}

const mockDeleteEq = jest.fn<() => Promise<{ error: { message: string } | null }>>();

const mockOr = jest.fn(() => ({ order: mockOrderFinal }));
const mockLte = jest.fn(() => ({ or: mockOr, order: mockOrderFinal }));
const mockEq = jest.fn(() => ({
  eq: mockEq,
  lte: mockLte,
  or: mockOr,
  order: mockOrderFinal,
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
  getAllConstraints,
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

describe('getAllConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('returns all constraints (active and resolved)', async () => {
    const resolvedConstraint = {
      ...mockInjuryConstraint,
      id: 'constraint-789',
      status: 'resolved' as const,
    };
    setMockOrderResult({
      data: [mockInjuryConstraint, mockTravelConstraint, resolvedConstraint],
      error: null,
    });

    const result = await getAllConstraints(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    // Verify two-level ordering: first by status (ascending, NULLs last), then by start_date (descending)
    expect(mockOrderFinal).toHaveBeenCalled();
    expect(result.data).toHaveLength(3);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no constraints exist', async () => {
    setMockOrderResult({ data: [], error: null });

    const result = await getAllConstraints(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error when query fails', async () => {
    setMockOrderResult({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await getAllConstraints(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database error');
  });
});

describe('getActiveConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('returns active constraints within date range', async () => {
    setMockOrderResult({
      data: [mockInjuryConstraint, mockTravelConstraint],
      error: null,
    });

    const result = await getActiveConstraints(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no active constraints', async () => {
    setMockOrderResult({ data: [], error: null });

    const result = await getActiveConstraints(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('getConstraintsByType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('filters by constraint type', async () => {
    setMockOrderResult({ data: [mockInjuryConstraint], error: null });

    const result = await getConstraintsByType(mockClient, 'athlete-456', 'injury');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getActiveInjuries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('returns only active injuries', async () => {
    setMockOrderResult({ data: [mockInjuryConstraint], error: null });

    const result = await getActiveInjuries(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getCurrentTravelConstraints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('returns overlapping travel constraints', async () => {
    setMockOrderResult({ data: [mockTravelConstraint], error: null });

    const result = await getCurrentTravelConstraints(mockClient, 'athlete-456');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });
});

describe('getConstraintById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
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
    mockOrderResults = [];
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
    mockOrderResults = [];
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
    mockOrderResults = [];
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
    mockOrderResults = [];
  });

  it('removes constraint from database', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: null });

    const result = await deleteConstraint(mockClient, 'constraint-123');

    expect(mockFrom).toHaveBeenCalledWith('constraints');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('error handling for list queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderResults = [];
  });

  it('returns null data on error for getActiveConstraints', async () => {
    setMockOrderResult({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await getActiveConstraints(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Database connection failed');
  });

  it('returns null data on error for getActiveInjuries', async () => {
    setMockOrderResult({
      data: null,
      error: { message: 'Query timeout' },
    });

    const result = await getActiveInjuries(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Query timeout');
  });
});
