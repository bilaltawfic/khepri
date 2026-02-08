/**
 * Integration test setup for Supabase client package
 *
 * Provides utilities for testing against a real local Supabase instance.
 * Uses the service role key to bypass RLS for setup/teardown operations.
 *
 * Prerequisites:
 * - Local Supabase running: `supabase start`
 * - Environment variables set (or using defaults from supabase start)
 */

import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import type { Database } from '../../types.js';

// Default local Supabase settings (from `supabase start` output)
// These can be overridden via environment variables for CI or custom setups
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

// Only allow built-in demo keys when talking to a local Supabase instance.
const isLocalSupabaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(SUPABASE_URL);

const SUPABASE_SERVICE_ROLE_KEY = (() => {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fromEnv) return fromEnv;
  if (isLocalSupabaseUrl) {
    // Default local service role key from `supabase start`
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  }
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY must be set in the environment when SUPABASE_URL is not localhost/127.0.0.1'
  );
})();

const SUPABASE_ANON_KEY = (() => {
  const fromEnv = process.env.SUPABASE_ANON_KEY;
  if (fromEnv) return fromEnv;
  if (isLocalSupabaseUrl) {
    // Default local anon key from `supabase start`
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  }
  throw new Error(
    'SUPABASE_ANON_KEY must be set in the environment when SUPABASE_URL is not localhost/127.0.0.1'
  );
})();

export type ServiceRoleClient = SupabaseClient<Database>;

/**
 * Creates a Supabase client with service role (bypasses RLS).
 * Use for test setup/teardown operations.
 */
export function createServiceRoleClient(): ServiceRoleClient {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client with anon key (respects RLS).
 * Use for testing RLS policies.
 */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a test user in Supabase Auth and returns their UUID.
 * Uses the Admin API (service role required).
 */
export async function createTestUser(
  client: ServiceRoleClient,
  email: string,
  password = 'testpassword123'
): Promise<string> {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for testing
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('User creation returned no user');
  }

  return data.user.id;
}

/**
 * Deletes a test user and all their data (cascades via foreign keys).
 */
export async function deleteTestUser(client: ServiceRoleClient, authUserId: string): Promise<void> {
  // First delete athlete (which cascades to goals, constraints, checkins)
  const { error: athleteDeleteError } = await client
    .from('athletes')
    .delete()
    .eq('auth_user_id', authUserId);

  if (athleteDeleteError) {
    throw new Error(`Failed to delete test athlete: ${athleteDeleteError.message}`);
  }

  // Then delete the auth user
  const { error } = await client.auth.admin.deleteUser(authUserId);

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`);
  }
}

/**
 * Generates a unique email for test isolation.
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@khepri-test.local`;
}

/**
 * Helper to format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gets today's date in YYYY-MM-DD format (UTC)
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Gets a date N days from today in YYYY-MM-DD format
 */
export function getDaysFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}
