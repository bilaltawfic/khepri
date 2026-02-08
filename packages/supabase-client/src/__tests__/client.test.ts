/**
 * Tests for Supabase client factory
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock function - must be declared before jest.unstable_mockModule
const mockCreateClient = jest.fn(() => ({
  from: jest.fn(),
  auth: { getUser: jest.fn() },
}));

// ESM-compatible mocking - must use unstable_mockModule for ESM
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Import after mocking - must use dynamic import for ESM
const {
  createSupabaseClient,
  createSupabaseClientFromEnv,
  getSupabaseConfigStatus,
  isSupabaseConfigured,
  ENV_VARS,
} = await import('../client.js');

describe('createSupabaseClient', () => {
  beforeEach(() => {
    mockCreateClient.mockClear();
  });

  it('creates a client with valid config', () => {
    const client = createSupabaseClient({
      url: 'https://test.supabase.co',
      key: 'test-anon-key',
    });

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('throws error when URL is missing', () => {
    expect(() =>
      createSupabaseClient({
        url: '',
        key: 'test-key',
      })
    ).toThrow('Supabase URL is required');
  });

  it('throws error when key is missing', () => {
    expect(() =>
      createSupabaseClient({
        url: 'https://test.supabase.co',
        key: '',
      })
    ).toThrow('Supabase key is required');
  });

  it('passes options to createClient', () => {
    const options = { auth: { persistSession: false } };
    createSupabaseClient({
      url: 'https://test.supabase.co',
      key: 'test-key',
      options,
    });

    expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-key', options);
  });
});

describe('createSupabaseClientFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockCreateClient.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates client from environment variables', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://env-test.supabase.co';
    process.env[ENV_VARS.SUPABASE_ANON_KEY] = 'env-anon-key';

    const client = createSupabaseClientFromEnv();

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });

  it('uses service role key when specified', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY] = 'service-role-key';

    createSupabaseClientFromEnv(true);

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key',
      undefined
    );
  });

  it('throws error when URL env var is missing', () => {
    delete process.env[ENV_VARS.SUPABASE_URL];
    process.env[ENV_VARS.SUPABASE_ANON_KEY] = 'test-key';

    expect(() => createSupabaseClientFromEnv()).toThrow(
      `Environment variable ${ENV_VARS.SUPABASE_URL} is required`
    );
  });

  it('throws error when anon key env var is missing', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    delete process.env[ENV_VARS.SUPABASE_ANON_KEY];

    expect(() => createSupabaseClientFromEnv()).toThrow(
      `Environment variable ${ENV_VARS.SUPABASE_ANON_KEY} is required`
    );
  });

  it('throws error when service role key env var is missing', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    delete process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY];

    expect(() => createSupabaseClientFromEnv(true)).toThrow(
      `Environment variable ${ENV_VARS.SUPABASE_SERVICE_ROLE_KEY} is required`
    );
  });
});

describe('getSupabaseConfigStatus', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear all Supabase env vars
    delete process.env[ENV_VARS.SUPABASE_URL];
    delete process.env[ENV_VARS.SUPABASE_ANON_KEY];
    delete process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns all false when no env vars are set', () => {
    const status = getSupabaseConfigStatus();

    expect(status).toEqual({
      hasUrl: false,
      hasAnonKey: false,
      hasServiceRoleKey: false,
      isConfigured: false,
    });
  });

  it('returns correct status with URL only', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';

    const status = getSupabaseConfigStatus();

    expect(status).toEqual({
      hasUrl: true,
      hasAnonKey: false,
      hasServiceRoleKey: false,
      isConfigured: false,
    });
  });

  it('returns isConfigured true with URL and anon key', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_ANON_KEY] = 'anon-key';

    const status = getSupabaseConfigStatus();

    expect(status).toEqual({
      hasUrl: true,
      hasAnonKey: true,
      hasServiceRoleKey: false,
      isConfigured: true,
    });
  });

  it('returns isConfigured true with URL and service role key', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY] = 'service-key';

    const status = getSupabaseConfigStatus();

    expect(status).toEqual({
      hasUrl: true,
      hasAnonKey: false,
      hasServiceRoleKey: true,
      isConfigured: true,
    });
  });

  it('returns all true when all env vars are set', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_ANON_KEY] = 'anon-key';
    process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY] = 'service-key';

    const status = getSupabaseConfigStatus();

    expect(status).toEqual({
      hasUrl: true,
      hasAnonKey: true,
      hasServiceRoleKey: true,
      isConfigured: true,
    });
  });
});

describe('isSupabaseConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env[ENV_VARS.SUPABASE_URL];
    delete process.env[ENV_VARS.SUPABASE_ANON_KEY];
    delete process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns false when not configured', () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('returns true when configured with anon key', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_ANON_KEY] = 'anon-key';

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('returns true when configured with service role key', () => {
    process.env[ENV_VARS.SUPABASE_URL] = 'https://test.supabase.co';
    process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY] = 'service-key';

    expect(isSupabaseConfigured()).toBe(true);
  });
});
