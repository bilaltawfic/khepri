/**
 * Integration tests for check-in query functions
 *
 * Tests real CRUD operations against local Supabase.
 * Requires: `supabase start` running locally.
 */

import { createAthlete } from '../../queries/athlete.js';
import {
  createCheckin,
  getCheckinByDate,
  getPendingRecommendations,
  getRecentCheckins,
  getTodayCheckin,
  updateCheckin,
  updateCheckinRecommendation,
  updateCheckinUserResponse,
} from '../../queries/checkins.js';
import {
  type ServiceRoleClient,
  createServiceRoleClient,
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  getDaysFromToday,
  getToday,
} from './setup.js';

describe('checkin queries (integration)', () => {
  let client: ServiceRoleClient;
  let testAuthUserId: string;
  let testAthleteId: string;
  let testEmail: string;

  beforeAll(async () => {
    client = createServiceRoleClient();
    testEmail = generateTestEmail();
    testAuthUserId = await createTestUser(client, testEmail);

    // Create athlete profile
    const { data: athlete, error } = await createAthlete(client, {
      auth_user_id: testAuthUserId,
      display_name: 'Checkin Test User',
    });

    if (error || !athlete || !athlete.id) {
      throw new Error(
        `Failed to create test athlete for checkin integration tests: ${error?.message ?? 'missing athlete id'}`
      );
    }

    testAthleteId = athlete.id;
  });

  afterAll(async () => {
    await deleteTestUser(client, testAuthUserId);
  });

  describe('createCheckin', () => {
    it('creates a check-in with minimal data', async () => {
      const result = await createCheckin(client, {
        athlete_id: testAthleteId,
        checkin_date: getToday(),
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.athlete_id).toBe(testAthleteId);
      expect(result.data?.checkin_date).toBe(getToday());
    });

    it('creates a check-in with full wellness data', async () => {
      const yesterday = getDaysFromToday(-1);
      const result = await createCheckin(client, {
        athlete_id: testAthleteId,
        checkin_date: yesterday,
        sleep_quality: 8,
        sleep_hours: 7.5,
        energy_level: 7,
        stress_level: 3,
        overall_soreness: 4,
        soreness_areas: { legs: 5, back: 2 },
        resting_hr: 52,
        hrv_ms: 48.5,
        available_time_minutes: 90,
        equipment_access: ['bike_trainer', 'treadmill'],
        travel_status: 'home',
        notes: 'Feeling good after rest day',
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.sleep_quality).toBe(8);
      expect(result.data?.sleep_hours).toBe(7.5);
      expect(result.data?.energy_level).toBe(7);
      expect(result.data?.stress_level).toBe(3);
      expect(result.data?.soreness_areas).toEqual({ legs: 5, back: 2 });
      expect(result.data?.equipment_access).toEqual(['bike_trainer', 'treadmill']);
    });

    it('enforces unique constraint on athlete_id + checkin_date', async () => {
      // First create an initial check-in for a unique date
      const uniqueDate = getDaysFromToday(-3);
      const firstResult = await createCheckin(client, {
        athlete_id: testAthleteId,
        checkin_date: uniqueDate,
      });

      expect(firstResult.error).toBeNull();
      expect(firstResult.data).not.toBeNull();

      // Then attempt to create a duplicate check-in for the same athlete and date
      const duplicateResult = await createCheckin(client, {
        athlete_id: testAthleteId,
        checkin_date: uniqueDate,
      });

      expect(duplicateResult.error).not.toBeNull();
      expect(duplicateResult.data).toBeNull();
      expect(duplicateResult.error?.message).toContain('duplicate');
    });

    it('validates sleep_quality range (1-10)', async () => {
      const twoDaysAgo = getDaysFromToday(-2);
      const result = await createCheckin(client, {
        athlete_id: testAthleteId,
        checkin_date: twoDaysAgo,
        sleep_quality: 11, // Invalid: > 10
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('check');
    });
  });

  describe('getTodayCheckin', () => {
    it('returns today check-in', async () => {
      const result = await getTodayCheckin(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.checkin_date).toBe(getToday());
    });

    it('returns null for athlete with no today check-in', async () => {
      // Create a new athlete without check-ins
      const newEmail = generateTestEmail();
      const newAuthUserId = await createTestUser(client, newEmail);
      const { data: newAthlete, error: athleteError } = await createAthlete(client, {
        auth_user_id: newAuthUserId,
      });

      expect(athleteError).toBeNull();
      expect(newAthlete).not.toBeNull();
      if (!newAthlete) throw new Error('Expected newAthlete to be defined');

      const result = await getTodayCheckin(client, newAthlete.id);

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();

      // Clean up
      await deleteTestUser(client, newAuthUserId);
    });
  });

  describe('getCheckinByDate', () => {
    it('returns check-in for specific date', async () => {
      const yesterday = getDaysFromToday(-1);
      const result = await getCheckinByDate(client, testAthleteId, yesterday);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.checkin_date).toBe(yesterday);
      expect(result.data?.notes).toBe('Feeling good after rest day');
    });

    it('returns null for date with no check-in', async () => {
      const farFuture = getDaysFromToday(365);
      const result = await getCheckinByDate(client, testAthleteId, farFuture);

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('getRecentCheckins', () => {
    it('returns check-ins ordered by date descending', async () => {
      const result = await getRecentCheckins(client, testAthleteId, 7);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(2);

      // Check ordering (most recent first)
      const dates = result.data?.map((c) => c.checkin_date);
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i] >= dates[i + 1]).toBe(true);
      }
    });
  });

  describe('updateCheckin', () => {
    it('updates wellness metrics', async () => {
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      expect(checkin).not.toBeNull();

      const result = await updateCheckin(client, checkin?.id, {
        sleep_quality: 9,
        energy_level: 8,
        notes: 'Updated notes',
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.sleep_quality).toBe(9);
      expect(result.data?.energy_level).toBe(8);
      expect(result.data?.notes).toBe('Updated notes');
    });
  });

  describe('updateCheckinRecommendation', () => {
    it('saves AI recommendation with timestamp', async () => {
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      expect(checkin).not.toBeNull();

      const recommendation = {
        workout_type: 'easy_run',
        duration_minutes: 45,
        intensity: 'zone_2',
        rationale: 'Recovery day based on elevated soreness',
      };

      const result = await updateCheckinRecommendation(client, checkin?.id, recommendation);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.ai_recommendation).toEqual(recommendation);
      expect(result.data?.ai_recommendation_generated_at).not.toBeNull();
    });

    it('clears recommendation when passed null', async () => {
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      expect(checkin).not.toBeNull();

      const result = await updateCheckinRecommendation(client, checkin?.id, null);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.ai_recommendation).toBeNull();
      expect(result.data?.ai_recommendation_generated_at).toBeNull();
    });
  });

  describe('updateCheckinUserResponse', () => {
    it('records user response to recommendation', async () => {
      // First add a recommendation
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      await updateCheckinRecommendation(client, checkin?.id, { workout: 'test' });

      const result = await updateCheckinUserResponse(
        client,
        checkin?.id,
        'accepted',
        'Did the workout as suggested'
      );

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.user_response).toBe('accepted');
      expect(result.data?.user_response_notes).toBe('Did the workout as suggested');
    });

    it('validates user_response enum values', async () => {
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      expect(checkin).not.toBeNull();

      // Use raw update to bypass TypeScript validation
      const { error } = await client
        .from('daily_checkins')
        .update({ user_response: 'invalid_response' as 'accepted' })
        .eq('id', checkin?.id);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check');
    });
  });

  describe('getPendingRecommendations', () => {
    it('returns check-ins with recommendations but no response', async () => {
      // Clear user response from today's check-in
      const { data: checkin } = await getTodayCheckin(client, testAthleteId);
      await client
        .from('daily_checkins')
        .update({ user_response: null, ai_recommendation: { workout: 'pending_test' } })
        .eq('id', checkin?.id);

      const result = await getPendingRecommendations(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.some((c) => c.id === checkin?.id)).toBe(true);
    });
  });

  describe('foreign key constraints', () => {
    it('rejects check-in with invalid athlete_id', async () => {
      const fakeAthleteId = '00000000-0000-0000-0000-000000000000';
      const result = await createCheckin(client, {
        athlete_id: fakeAthleteId,
        checkin_date: getDaysFromToday(-10),
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('foreign key');
    });
  });
});
