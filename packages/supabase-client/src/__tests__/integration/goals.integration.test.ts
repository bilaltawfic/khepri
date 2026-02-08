/**
 * Integration tests for goal query functions
 *
 * Tests real CRUD operations against local Supabase.
 * Requires: `supabase start` running locally.
 */

import { createAthlete } from '../../queries/athlete.js';
import {
  cancelGoal,
  completeGoal,
  createGoal,
  deleteGoal,
  getActiveGoals,
  getGoalById,
  getGoalsByType,
  getUpcomingRaceGoals,
  updateGoal,
} from '../../queries/goals.js';
import {
  type ServiceRoleClient,
  createServiceRoleClient,
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  getDaysFromToday,
} from './setup.js';

describe('goal queries (integration)', () => {
  let client: ServiceRoleClient;
  let testAuthUserId: string;
  let testAthleteId: string;
  let testEmail: string;
  const createdGoalIds: string[] = [];

  beforeAll(async () => {
    client = createServiceRoleClient();
    testEmail = generateTestEmail();
    testAuthUserId = await createTestUser(client, testEmail);

    // Create athlete profile
    const { data: athlete, error: athleteError } = await createAthlete(client, {
      auth_user_id: testAuthUserId,
      display_name: 'Goal Test User',
    });
    expect(athleteError).toBeNull();
    if (!athlete || !athlete.id) {
      throw new Error('Failed to create test athlete for goals integration tests');
    }
    testAthleteId = athlete.id;
  });

  afterAll(async () => {
    await deleteTestUser(client, testAuthUserId);
  });

  describe('createGoal', () => {
    it('creates a race goal with all fields', async () => {
      const result = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'race',
        title: 'Ironman 70.3 Chattanooga',
        description: 'First half-distance triathlon',
        target_date: getDaysFromToday(90),
        priority: 'A',
        race_event_name: 'Ironman 70.3 Chattanooga',
        race_distance: '70.3',
        race_location: 'Chattanooga, TN',
        race_target_time_seconds: 21600,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.goal_type).toBe('race');
      expect(result.data?.title).toBe('Ironman 70.3 Chattanooga');
      expect(result.data?.priority).toBe('A');
      expect(result.data?.status).toBe('active'); // Default
      expect(result.data?.race_target_time_seconds).toBe(21600);

      const goalId = result.data?.id;
      if (!goalId) throw new Error('Expected goal ID to be defined');
      createdGoalIds.push(goalId);
    });

    it('creates a performance goal', async () => {
      const result = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'performance',
        title: 'Increase FTP to 280W',
        priority: 'B',
        perf_metric: 'ftp',
        perf_current_value: 250,
        perf_target_value: 280,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.goal_type).toBe('performance');
      expect(result.data?.perf_metric).toBe('ftp');
      expect(result.data?.perf_current_value).toBe(250);
      expect(result.data?.perf_target_value).toBe(280);

      const goalId = result.data?.id;
      if (!goalId) throw new Error('Expected goal ID to be defined');
      createdGoalIds.push(goalId);
    });

    it('creates a fitness goal', async () => {
      const result = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'fitness',
        title: 'Run 40km per week',
        priority: 'B',
        fitness_metric: 'weekly_run_km',
        fitness_target_value: 40,
      });

      expect(result.error).toBeNull();
      expect(result.data?.goal_type).toBe('fitness');

      const goalId = result.data?.id;
      if (!goalId) throw new Error('Expected goal ID to be defined');
      createdGoalIds.push(goalId);
    });

    it('creates a health goal', async () => {
      const result = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'health',
        title: 'Reach target weight',
        priority: 'C',
        health_metric: 'weight_kg',
        health_current_value: 80,
        health_target_value: 75,
      });

      expect(result.error).toBeNull();
      expect(result.data?.goal_type).toBe('health');

      const goalId = result.data?.id;
      if (!goalId) throw new Error('Expected goal ID to be defined');
      createdGoalIds.push(goalId);
    });

    it('validates goal_type enum', async () => {
      const { error } = await client.from('goals').insert({
        athlete_id: testAthleteId,
        goal_type: 'invalid_type',
        title: 'Bad goal',
      });

      expect(error).not.toBeNull();
      // Check constraint violations have Postgres error code 23514
      expect(error?.code).toBe('23514');
    });

    it('validates priority enum', async () => {
      const { error } = await client.from('goals').insert({
        athlete_id: testAthleteId,
        goal_type: 'fitness',
        title: 'Bad priority',
        priority: 'X',
      });

      expect(error).not.toBeNull();
      // Check constraint violations have Postgres error code 23514
      expect(error?.code).toBe('23514');
    });
  });

  describe('getActiveGoals', () => {
    it('returns only active goals ordered by priority', async () => {
      const result = await getActiveGoals(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(4);

      // All should be active
      expect(result.data?.every((g) => g.status === 'active')).toBe(true);

      // Check priority ordering (A < B < C)
      const priorities = result.data?.map((g) => g.priority) ?? [];
      for (let i = 0; i < priorities.length - 1; i++) {
        const current = priorities[i];
        const next = priorities[i + 1];
        if (current != null && next != null) {
          expect(current <= next).toBe(true);
        }
      }
    });
  });

  describe('getGoalsByType', () => {
    it('returns only race goals', async () => {
      const result = await getGoalsByType(client, testAthleteId, 'race');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
      expect(result.data?.every((g) => g.goal_type === 'race')).toBe(true);
    });

    it('returns only performance goals', async () => {
      const result = await getGoalsByType(client, testAthleteId, 'performance');

      expect(result.error).toBeNull();
      expect(result.data?.every((g) => g.goal_type === 'performance')).toBe(true);
    });
  });

  describe('getGoalById', () => {
    it('returns the goal', async () => {
      const goalId = createdGoalIds[0];
      if (!goalId) throw new Error('Expected goalId to be defined from earlier test');
      const result = await getGoalById(client, goalId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe(goalId);
    });

    it('returns error for non-existent goal', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const result = await getGoalById(client, fakeId);

      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe('getUpcomingRaceGoals', () => {
    it('returns future race goals ordered by date', async () => {
      const result = await getUpcomingRaceGoals(client, testAthleteId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(1);

      // All should be race type
      expect(result.data?.every((g) => g.goal_type === 'race')).toBe(true);

      // All should be in the future
      const today = new Date().toISOString().slice(0, 10);
      expect(result.data?.every((g) => g.target_date != null && g.target_date >= today)).toBe(true);
    });

    it('excludes past race goals', async () => {
      // Create a past race goal
      const { data: pastGoal, error: pastError } = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'race',
        title: 'Past Race',
        target_date: getDaysFromToday(-30),
      });

      expect(pastError).toBeNull();
      expect(pastGoal).not.toBeNull();

      const result = await getUpcomingRaceGoals(client, testAthleteId);

      expect(result.data?.every((g) => g.title !== 'Past Race')).toBe(true);
    });
  });

  describe('updateGoal', () => {
    it('updates goal fields', async () => {
      const goalId = createdGoalIds[1]; // Performance goal
      if (!goalId) throw new Error('Expected goalId to be defined from earlier test');
      const result = await updateGoal(client, goalId, {
        title: 'Updated: Increase FTP to 290W',
        perf_target_value: 290,
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.title).toBe('Updated: Increase FTP to 290W');
      expect(result.data?.perf_target_value).toBe(290);
    });
  });

  describe('completeGoal', () => {
    it('marks goal as completed', async () => {
      const goalId = createdGoalIds[2]; // Fitness goal
      if (!goalId) throw new Error('Expected goalId to be defined from earlier test');
      const result = await completeGoal(client, goalId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.status).toBe('completed');
    });

    it('removes completed goal from active goals list', async () => {
      const result = await getActiveGoals(client, testAthleteId);

      const completedGoalId = createdGoalIds[2];
      if (!completedGoalId)
        throw new Error('Expected completedGoalId to be defined from earlier test');
      expect(result.data?.every((g) => g.id !== completedGoalId)).toBe(true);
    });
  });

  describe('cancelGoal', () => {
    it('marks goal as cancelled', async () => {
      const goalId = createdGoalIds[3]; // Health goal
      if (!goalId) throw new Error('Expected goalId to be defined from earlier test');
      const result = await cancelGoal(client, goalId);

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.status).toBe('cancelled');
    });
  });

  describe('deleteGoal', () => {
    it('hard deletes the goal', async () => {
      // Create a goal to delete
      const { data: goal, error } = await createGoal(client, {
        athlete_id: testAthleteId,
        goal_type: 'fitness',
        title: 'Goal to delete',
      });

      expect(error).toBeNull();
      expect(goal).not.toBeNull();
      if (!goal) throw new Error('Expected goal to be defined');
      const goalId = goal.id;

      const deleteResult = await deleteGoal(client, goalId);
      expect(deleteResult.error).toBeNull();

      // Verify it's gone
      const getResult = await getGoalById(client, goalId);
      expect(getResult.error).not.toBeNull();
      expect(getResult.data).toBeNull();
    });
  });

  describe('foreign key constraints', () => {
    it('rejects goal with invalid athlete_id', async () => {
      const fakeAthleteId = '00000000-0000-0000-0000-000000000000';
      const result = await createGoal(client, {
        athlete_id: fakeAthleteId,
        goal_type: 'race',
        title: 'Invalid athlete',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('foreign key');
    });
  });
});
