/**
 * Integration tests for constraint query functions
 *
 * Tests real CRUD operations against local Supabase.
 * Requires: `supabase start` running locally.
 */

import { createAthlete } from '../../queries/athlete.js';
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
import {
  type ServiceRoleClient,
  createServiceRoleClient,
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  getDaysFromToday,
  getToday,
} from './setup.js';

describe('constraint queries (integration)', () => {
  let client: ServiceRoleClient;
  let testAuthUserId: string;
  let testAthleteId: string;
  let testEmail: string;
  const createdConstraintIds: string[] = [];

  beforeAll(async () => {
    client = createServiceRoleClient();
    testEmail = generateTestEmail();
    testAuthUserId = await createTestUser(client, testEmail);

    // Create athlete profile
    const { data: athlete, error } = await createAthlete(client, {
      auth_user_id: testAuthUserId,
      display_name: 'Constraint Test User',
    });
    if (error || !athlete || !athlete.id) {
      throw new Error(`Failed to create test athlete: ${error?.message ?? 'no athlete returned'}`);
    }
    testAthleteId = athlete.id;
  });

  afterAll(async () => {
    await deleteTestUser(client, testAuthUserId);
  });

  describe('createConstraint', () => {
    it('creates an injury constraint', async () => {
      const result = await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'injury',
        title: 'Left knee tendinitis',
        description: 'IT band irritation',
        start_date: getDaysFromToday(-7),
        injury_body_part: 'left_knee',
        injury_severity: 'mild',
        injury_restrictions: ['high_intensity_running', 'hill_repeats'],
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.constraint_type).toBe('injury');
      expect(result.data?.title).toBe('Left knee tendinitis');
      expect(result.data?.status).toBe('active'); // Default
      expect(result.data?.injury_body_part).toBe('left_knee');
      expect(result.data?.injury_severity).toBe('mild');
      expect(result.data?.injury_restrictions).toEqual(['high_intensity_running', 'hill_repeats']);

      const constraintId = result.data?.id;
      if (!constraintId) throw new Error('Expected constraint ID to be defined');
      createdConstraintIds.push(constraintId);
    });

    it('creates a travel constraint', async () => {
      const result = await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'travel',
        title: 'Business trip to SF',
        start_date: getToday(),
        end_date: getDaysFromToday(5),
        travel_destination: 'San Francisco, CA',
        travel_equipment_available: ['running_shoes', 'resistance_bands'],
        travel_facilities_available: ['hotel_gym', 'outdoor_running'],
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.constraint_type).toBe('travel');
      expect(result.data?.travel_destination).toBe('San Francisco, CA');
      expect(result.data?.travel_equipment_available).toEqual([
        'running_shoes',
        'resistance_bands',
      ]);

      const constraintId = result.data?.id;
      if (!constraintId) throw new Error('Expected constraint ID to be defined');
      createdConstraintIds.push(constraintId);
    });

    it('creates an availability constraint', async () => {
      const result = await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'availability',
        title: 'Busy work period',
        start_date: getDaysFromToday(10),
        end_date: getDaysFromToday(20),
        availability_hours_per_week: 5,
        availability_days_available: ['saturday', 'sunday'],
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.constraint_type).toBe('availability');
      expect(result.data?.availability_hours_per_week).toBe('5');
      expect(result.data?.availability_days_available).toEqual(['saturday', 'sunday']);

      const constraintId = result.data?.id;
      if (!constraintId) throw new Error('Expected constraint ID to be defined');
      createdConstraintIds.push(constraintId);
    });

    it('validates constraint_type enum', async () => {
      const { error } = await client.from('constraints').insert({
        athlete_id: testAthleteId,
        constraint_type: 'invalid_type',
        title: 'Bad constraint',
        start_date: getToday(),
      });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check');
    });

    it('validates injury_severity enum', async () => {
      const { error } = await client.from('constraints').insert({
        athlete_id: testAthleteId,
        constraint_type: 'injury',
        title: 'Bad severity',
        start_date: getToday(),
        injury_severity: 'extreme',
      });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check');
    });
  });

  describe('getActiveConstraints', () => {
    it('returns active constraints not yet ended', async () => {
      const result = await getActiveConstraints(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(2);

      // All should be active
      expect(result.data?.every((c) => c.status === 'active')).toBe(true);
    });

    it('excludes past constraints', async () => {
      // Create a past constraint
      await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'travel',
        title: 'Past trip',
        start_date: getDaysFromToday(-30),
        end_date: getDaysFromToday(-25),
      });

      const result = await getActiveConstraints(client, testAthleteId);

      expect(result.data?.every((c) => c.title !== 'Past trip')).toBe(true);
    });
  });

  describe('getConstraintsByType', () => {
    it('returns only injury constraints', async () => {
      const result = await getConstraintsByType(client, testAthleteId, 'injury');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
      expect(result.data?.every((c) => c.constraint_type === 'injury')).toBe(true);
    });

    it('returns only travel constraints', async () => {
      const result = await getConstraintsByType(client, testAthleteId, 'travel');

      expect(result.error).toBeNull();
      expect(result.data?.every((c) => c.constraint_type === 'travel')).toBe(true);
    });
  });

  describe('getActiveInjuries', () => {
    it('returns only active injury constraints', async () => {
      const result = await getActiveInjuries(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.every((c) => c.constraint_type === 'injury')).toBe(true);
      expect(result.data?.every((c) => c.status === 'active')).toBe(true);
    });
  });

  describe('getCurrentTravelConstraints', () => {
    it('returns travel constraints overlapping today', async () => {
      const result = await getCurrentTravelConstraints(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.every((c) => c.constraint_type === 'travel')).toBe(true);

      // All should have started
      const today = getToday();
      expect(result.data?.every((c) => c.start_date <= today)).toBe(true);
    });

    it('excludes future travel constraints', async () => {
      // Create a future travel constraint
      await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'travel',
        title: 'Future vacation',
        start_date: getDaysFromToday(60),
        end_date: getDaysFromToday(67),
      });

      const result = await getCurrentTravelConstraints(client, testAthleteId);

      expect(result.data?.every((c) => c.title !== 'Future vacation')).toBe(true);
    });
  });

  describe('getConstraintById', () => {
    it('returns the constraint', async () => {
      const constraintId = createdConstraintIds[0];
      const result = await getConstraintById(client, constraintId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe(constraintId);
    });

    it('returns error for non-existent constraint', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await getConstraintById(client, fakeId);

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('updateConstraint', () => {
    it('updates constraint fields', async () => {
      const constraintId = createdConstraintIds[0]; // Injury
      const result = await updateConstraint(client, constraintId, {
        description: 'Getting better with PT',
        injury_severity: 'moderate',
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.description).toBe('Getting better with PT');
      expect(result.data?.injury_severity).toBe('moderate');
    });
  });

  describe('resolveConstraint', () => {
    it('marks constraint as resolved', async () => {
      const constraintId = createdConstraintIds[0]; // Injury
      const result = await resolveConstraint(client, constraintId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.status).toBe('resolved');
    });

    it('removes resolved constraint from active list', async () => {
      const result = await getActiveConstraints(client, testAthleteId);

      const resolvedId = createdConstraintIds[0];
      expect(result.data?.every((c) => c.id !== resolvedId)).toBe(true);
    });
  });

  describe('deleteConstraint', () => {
    it('hard deletes the constraint', async () => {
      // Create a constraint to delete
      const { data: constraint, error } = await createConstraint(client, {
        athlete_id: testAthleteId,
        constraint_type: 'availability',
        title: 'Constraint to delete',
        start_date: getToday(),
      });

      expect(error).toBeNull();
      expect(constraint).not.toBeNull();
      if (!constraint) throw new Error('Expected constraint to be defined');
      const constraintId = constraint.id;

      const deleteResult = await deleteConstraint(client, constraintId);
      expect(deleteResult.error).toBeNull();

      // Verify it's gone
      const getResult = await getConstraintById(client, constraintId);
      expect(getResult.error).not.toBeNull();
      expect(getResult.data).toBeNull();
    });
  });

  describe('foreign key constraints', () => {
    it('rejects constraint with invalid athlete_id', async () => {
      const fakeAthleteId = '00000000-0000-0000-0000-000000000000';
      const result = await createConstraint(client, {
        athlete_id: fakeAthleteId,
        constraint_type: 'injury',
        title: 'Invalid athlete',
        start_date: getToday(),
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('foreign key');
    });
  });
});
