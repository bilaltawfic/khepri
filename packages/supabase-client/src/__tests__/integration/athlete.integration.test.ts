/**
 * Integration tests for athlete query functions
 *
 * Tests real CRUD operations against local Supabase.
 * Requires: `supabase start` running locally.
 */

import {
  createAthlete,
  getAthleteByAuthUser,
  getAthleteById,
  getAthleteFitnessNumbers,
  updateAthlete,
  updateIntervalsConnection,
} from '../../queries/athlete.js';
import {
  type ServiceRoleClient,
  createServiceRoleClient,
  createTestUser,
  deleteTestUser,
  generateTestEmail,
} from './setup.js';

describe('athlete queries (integration)', () => {
  let client: ServiceRoleClient;
  let testAuthUserId: string;
  let testEmail: string;

  beforeAll(async () => {
    client = createServiceRoleClient();
    testEmail = generateTestEmail();
    testAuthUserId = await createTestUser(client, testEmail);
  });

  afterAll(async () => {
    // Clean up test user and all associated data
    await deleteTestUser(client, testAuthUserId);
  });

  describe('createAthlete', () => {
    it('creates an athlete profile with minimal data', async () => {
      const result = await createAthlete(client, {
        auth_user_id: testAuthUserId,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.auth_user_id).toBe(testAuthUserId);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.created_at).toBeDefined();
      expect(result.data?.preferred_units).toBe('metric'); // Default
    });

    it('fails with duplicate auth_user_id', async () => {
      const result = await createAthlete(client, {
        auth_user_id: testAuthUserId,
      });

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
      // Postgres unique constraint violation
      // Unique constraint violations have Postgres error code 23505
      expect(result.error?.code).toBe('23505');
    });
  });

  describe('getAthleteByAuthUser', () => {
    it('returns the athlete profile', async () => {
      const result = await getAthleteByAuthUser(client, testAuthUserId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.auth_user_id).toBe(testAuthUserId);
    });

    it('returns error for non-existent auth user', async () => {
      const fakeAuthUserId = '00000000-0000-0000-0000-000000000000';
      const result = await getAthleteByAuthUser(client, fakeAuthUserId);

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('getAthleteById', () => {
    it('returns the athlete by ID', async () => {
      // First get the athlete to know their ID
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');
      const athleteId = athlete.id;

      const result = await getAthleteById(client, athleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe(athleteId);
    });
  });

  describe('updateAthlete', () => {
    it('updates athlete profile fields', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');

      const result = await updateAthlete(client, athlete.id, {
        display_name: 'Test Runner',
        ftp_watts: 250,
        running_threshold_pace_sec_per_km: 270,
        preferred_units: 'imperial',
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.display_name).toBe('Test Runner');
      expect(result.data?.ftp_watts).toBe(250);
      expect(result.data?.running_threshold_pace_sec_per_km).toBe(270);
      expect(result.data?.preferred_units).toBe('imperial');
    });

    it('updates updated_at timestamp', async () => {
      const { data: before } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(before).not.toBeNull();
      if (!before) throw new Error('Expected athlete to be defined');

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await updateAthlete(client, before.id, {
        weight_kg: 75.5,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();

      const beforeTime = new Date(before.updated_at).getTime();
      const afterTime = new Date(result.data?.updated_at).getTime();
      expect(afterTime).toBeGreaterThan(beforeTime);
    });
  });

  describe('getAthleteFitnessNumbers', () => {
    it('returns only fitness metrics', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');
      const athleteId = athlete.id;

      // Ensure fitness fields are set for this test, so it doesn't depend on other tests
      const updated = await updateAthlete(client, athleteId, {
        ftp_watts: 250,
        running_threshold_pace_sec_per_km: 270,
      });
      expect(updated.error).toBeNull();
      expect(updated.data).not.toBeNull();

      const result = await getAthleteFitnessNumbers(client, athleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.ftp_watts).toBe(250);
      expect(result.data?.running_threshold_pace_sec_per_km).toBe(270);

      // Should NOT include non-fitness fields
      const data = result.data as Record<string, unknown>;
      expect(data.display_name).toBeUndefined();
      expect(data.preferred_units).toBeUndefined();
    });
  });

  describe('updateIntervalsConnection', () => {
    it('connects Intervals.icu with athlete ID', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');

      const result = await updateIntervalsConnection(client, athlete.id, true, 'i12345');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.intervals_icu_connected).toBe(true);
      expect(result.data?.intervals_icu_athlete_id).toBe('i12345');
    });

    it('disconnects and clears athlete ID', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');

      const result = await updateIntervalsConnection(client, athlete.id, false);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.intervals_icu_connected).toBe(false);
      expect(result.data?.intervals_icu_athlete_id).toBeNull();
    });

    it('fails when connecting without athlete ID', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');

      const result = await updateIntervalsConnection(client, athlete.id, true);

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('intervalsAthleteId is required');
    });
  });

  describe('constraint validation', () => {
    it('rejects invalid preferred_units value', async () => {
      const { data: athlete } = await getAthleteByAuthUser(client, testAuthUserId);
      expect(athlete).not.toBeNull();
      if (!athlete) throw new Error('Expected athlete to be defined');

      // Use raw update to bypass TypeScript validation
      const { error } = await client
        .from('athletes')
        .update({ preferred_units: 'invalid' as 'metric' })
        .eq('id', athlete.id);

      expect(error).not.toBeNull();
      // Check constraint violations have Postgres error code 23514
      expect(error?.code).toBe('23514');
    });
  });
});
