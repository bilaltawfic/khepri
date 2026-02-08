/**
 * Tests for daily check-in query functions
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DailyCheckinRow, KhepriSupabaseClient } from '../../types.js';

// Mock chainable query builder
function createMockQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  // For queries that don't call .single(), return promise directly from order()
  builder.order.mockImplementation(() => Promise.resolve(result));
  return builder;
}

// Import functions under test
const {
  getTodayCheckin,
  getCheckinByDate,
  getRecentCheckins,
  createCheckin,
  updateCheckin,
  updateCheckinRecommendation,
  updateCheckinUserResponse,
  getPendingRecommendations,
} = await import('../../queries/checkins.js');

// Sample check-in data for tests
const sampleCheckin: DailyCheckinRow = {
  id: 'checkin-123',
  athlete_id: 'athlete-456',
  checkin_date: '2026-02-08',
  sleep_quality: 4,
  sleep_hours: 7.5,
  energy_level: 3,
  stress_level: 2,
  overall_soreness: 2,
  soreness_areas: { legs: 3 },
  resting_hr: 55,
  hrv_ms: 65,
  weight_kg: 70.5,
  available_time_minutes: 90,
  equipment_access: ['bike', 'treadmill'],
  travel_status: 'home',
  notes: 'Feeling good',
  ai_recommendation: { workout: 'Easy run' },
  ai_recommendation_generated_at: '2026-02-08T06:00:00Z',
  user_response: null,
  user_response_notes: null,
  created_at: '2026-02-08T05:30:00Z',
  updated_at: '2026-02-08T05:30:00Z',
};

describe('getTodayCheckin', () => {
  it("returns today's check-in when exists", async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleCheckin, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getTodayCheckin(mockClient, 'athlete-456');

    expect(mockClient.from).toHaveBeenCalledWith('daily_checkins');
    expect(mockBuilder.select).toHaveBeenCalledWith('*');
    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleCheckin);
    expect(result.error).toBeNull();
  });

  it('returns null when no check-in for today', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'PGRST116: Row not found' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getTodayCheckin(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('PGRST116: Row not found');
  });
});

describe('getCheckinByDate', () => {
  it('returns check-in for specific date', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleCheckin, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getCheckinByDate(mockClient, 'athlete-456', '2026-02-08');

    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.eq).toHaveBeenCalledWith('checkin_date', '2026-02-08');
    expect(result.data).toEqual(sampleCheckin);
    expect(result.error).toBeNull();
  });
});

describe('getRecentCheckins', () => {
  it('returns array of recent check-ins', async () => {
    const checkins = [
      sampleCheckin,
      { ...sampleCheckin, id: 'checkin-124', checkin_date: '2026-02-07' },
    ];
    const mockBuilder = createMockQueryBuilder({ data: checkins, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getRecentCheckins(mockClient, 'athlete-456', 7);

    expect(mockClient.from).toHaveBeenCalledWith('daily_checkins');
    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.gte).toHaveBeenCalled();
    expect(mockBuilder.order).toHaveBeenCalledWith('checkin_date', { ascending: false });
    expect(result.data).toEqual(checkins);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no check-ins', async () => {
    const mockBuilder = createMockQueryBuilder({ data: [], error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getRecentCheckins(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

describe('createCheckin', () => {
  it('creates and returns new check-in', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleCheckin, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const insertData = {
      athlete_id: 'athlete-456',
      checkin_date: '2026-02-08',
      sleep_quality: 4,
    };

    const result = await createCheckin(mockClient, insertData);

    expect(mockClient.from).toHaveBeenCalledWith('daily_checkins');
    expect(mockBuilder.insert).toHaveBeenCalledWith(insertData);
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleCheckin);
    expect(result.error).toBeNull();
  });

  it('returns error on duplicate date', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const insertData = {
      athlete_id: 'athlete-456',
      checkin_date: '2026-02-08',
    };

    const result = await createCheckin(mockClient, insertData);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('duplicate key');
  });
});

describe('updateCheckin', () => {
  it('updates and returns check-in', async () => {
    const updatedCheckin = { ...sampleCheckin, sleep_quality: 5 };
    const mockBuilder = createMockQueryBuilder({ data: updatedCheckin, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckin(mockClient, 'checkin-123', { sleep_quality: 5 });

    expect(mockClient.from).toHaveBeenCalledWith('daily_checkins');
    expect(mockBuilder.update).toHaveBeenCalledWith({ sleep_quality: 5 });
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'checkin-123');
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data?.sleep_quality).toBe(5);
    expect(result.error).toBeNull();
  });
});

describe('updateCheckinRecommendation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-08T07:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves AI recommendation with timestamp', async () => {
    const recommendation = { workout: 'Tempo run', duration: 45 };
    const mockBuilder = createMockQueryBuilder({
      data: { ...sampleCheckin, ai_recommendation: recommendation },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckinRecommendation(mockClient, 'checkin-123', recommendation);

    expect(mockBuilder.update).toHaveBeenCalledWith({
      ai_recommendation: recommendation,
      ai_recommendation_generated_at: '2026-02-08T07:00:00.000Z',
    });
    expect(result.data?.ai_recommendation).toEqual(recommendation);
    expect(result.error).toBeNull();
  });

  it('clears timestamp when recommendation is null', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: { ...sampleCheckin, ai_recommendation: null, ai_recommendation_generated_at: null },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckinRecommendation(mockClient, 'checkin-123', null);

    expect(mockBuilder.update).toHaveBeenCalledWith({
      ai_recommendation: null,
      ai_recommendation_generated_at: null,
    });
    expect(result.data?.ai_recommendation).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('updateCheckinUserResponse', () => {
  it('records user response', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: { ...sampleCheckin, user_response: 'accepted' },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckinUserResponse(mockClient, 'checkin-123', 'accepted');

    expect(mockBuilder.update).toHaveBeenCalledWith({ user_response: 'accepted' });
    expect(result.data?.user_response).toBe('accepted');
    expect(result.error).toBeNull();
  });

  it('records user response with notes', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: {
        ...sampleCheckin,
        user_response: 'modified',
        user_response_notes: 'Reduced intensity',
      },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckinUserResponse(
      mockClient,
      'checkin-123',
      'modified',
      'Reduced intensity'
    );

    expect(mockBuilder.update).toHaveBeenCalledWith({
      user_response: 'modified',
      user_response_notes: 'Reduced intensity',
    });
    expect(result.data?.user_response_notes).toBe('Reduced intensity');
    expect(result.error).toBeNull();
  });

  it('clears notes when null is passed', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: { ...sampleCheckin, user_response: 'accepted', user_response_notes: null },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateCheckinUserResponse(mockClient, 'checkin-123', 'accepted', null);

    expect(mockBuilder.update).toHaveBeenCalledWith({
      user_response: 'accepted',
      user_response_notes: null,
    });
    expect(result.data?.user_response_notes).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('getPendingRecommendations', () => {
  it('returns check-ins awaiting response', async () => {
    const pendingCheckins = [
      { ...sampleCheckin, user_response: null },
      { ...sampleCheckin, id: 'checkin-124', checkin_date: '2026-02-07', user_response: null },
    ];
    const mockBuilder = createMockQueryBuilder({ data: pendingCheckins, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getPendingRecommendations(mockClient, 'athlete-456');

    expect(mockClient.from).toHaveBeenCalledWith('daily_checkins');
    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.not).toHaveBeenCalledWith('ai_recommendation', 'is', null);
    expect(mockBuilder.is).toHaveBeenCalledWith('user_response', null);
    expect(mockBuilder.order).toHaveBeenCalledWith('checkin_date', { ascending: false });
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });
});
