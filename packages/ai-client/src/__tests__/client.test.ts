/**
 * Tests for CoachingClient
 *
 * These tests focus on the helper functions and constructors
 * that can be tested without mocking the API.
 */

import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { CoachingClient, createCoachingClient, isConfigured } from '../client.js';

describe('CoachingClient', () => {
  describe('constructor', () => {
    it('creates client with default config', () => {
      const client = new CoachingClient();
      expect(client).toBeDefined();
    });

    it('creates client with custom config', () => {
      const client = new CoachingClient({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 8192,
        timeout: 30000,
        maxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('creates client with custom baseURL', () => {
      const client = new CoachingClient({
        baseURL: 'https://custom.api.com',
      });
      expect(client).toBeDefined();
    });

    it('creates client with partial config', () => {
      const client = new CoachingClient({
        apiKey: 'test-key',
      });
      expect(client).toBeDefined();
    });

    it('creates client with only timeout', () => {
      const client = new CoachingClient({
        timeout: 45000,
      });
      expect(client).toBeDefined();
    });

    it('creates client with only maxRetries', () => {
      const client = new CoachingClient({
        maxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('creates client with only model', () => {
      const client = new CoachingClient({
        model: 'claude-3-haiku-20240307',
      });
      expect(client).toBeDefined();
    });

    it('creates client with only maxTokens', () => {
      const client = new CoachingClient({
        maxTokens: 2048,
      });
      expect(client).toBeDefined();
    });
  });
});

describe('createCoachingClient', () => {
  it('creates a new CoachingClient instance', () => {
    const client = createCoachingClient();
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('creates client with no config', () => {
    const client = createCoachingClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('passes config to CoachingClient', () => {
    const client = createCoachingClient({ apiKey: 'test-key', model: 'custom-model' });
    expect(client).toBeInstanceOf(CoachingClient);
  });

  it('creates client with all config options', () => {
    const client = createCoachingClient({
      apiKey: 'test-key',
      model: 'claude-3-opus-20240229',
      maxTokens: 8192,
      baseURL: 'https://custom.api.com',
      timeout: 30000,
      maxRetries: 5,
    });
    expect(client).toBeInstanceOf(CoachingClient);
  });
});

describe('isConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns true when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(isConfigured()).toBe(true);
  });

  it('returns false when ANTHROPIC_API_KEY is not set', () => {
    process.env.ANTHROPIC_API_KEY = undefined;
    expect(isConfigured()).toBe(false);
  });

  it('returns false when ANTHROPIC_API_KEY is empty string', () => {
    process.env.ANTHROPIC_API_KEY = '';
    expect(isConfigured()).toBe(false);
  });

  it('returns true when ANTHROPIC_API_KEY has whitespace', () => {
    // A key with whitespace is still truthy
    process.env.ANTHROPIC_API_KEY = '  test-key  ';
    expect(isConfigured()).toBe(true);
  });
});
