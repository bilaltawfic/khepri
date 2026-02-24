/**
 * @khepri/supabase-client - Client Factory
 *
 * Provides factory functions for creating typed Supabase clients.
 */

import { type SupabaseClientOptions, createClient } from '@supabase/supabase-js';
import type { Database, KhepriSupabaseClient } from './types.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration options for the Supabase client
 */
export interface SupabaseClientConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase publishable key (for client-side) or secret key (for server-side) */
  key: string;
  /** Additional Supabase client options */
  options?: SupabaseClientOptions<'public'>;
}

/**
 * Environment variable names for Supabase configuration
 */
export const ENV_VARS = {
  SUPABASE_URL: 'SUPABASE_URL',
  SUPABASE_PUBLISHABLE_KEY: 'SUPABASE_PUBLISHABLE_KEY',
  SUPABASE_SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
} as const;

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Creates a typed Supabase client for the Khepri database.
 *
 * @param config - Configuration with URL and key
 * @returns Typed Supabase client
 *
 * @example
 * ```typescript
 * // Client-side with publishable key
 * const client = createSupabaseClient({
 *   url: process.env.SUPABASE_URL!,
 *   key: process.env.SUPABASE_PUBLISHABLE_KEY!,
 * });
 *
 * // Server-side with service role key
 * const adminClient = createSupabaseClient({
 *   url: process.env.SUPABASE_URL!,
 *   key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
 * });
 * ```
 */
export function createSupabaseClient(config: SupabaseClientConfig): KhepriSupabaseClient {
  const { url, key, options } = config;

  if (!url) {
    throw new Error('Supabase URL is required');
  }
  if (!key) {
    throw new Error('Supabase key is required');
  }

  return createClient<Database>(url, key, options);
}

/**
 * Creates a Supabase client from environment variables.
 *
 * Looks for:
 * - SUPABASE_URL
 * - SUPABASE_PUBLISHABLE_KEY (default) or SUPABASE_SERVICE_ROLE_KEY
 *
 * @param useServiceRole - If true, uses SUPABASE_SERVICE_ROLE_KEY instead of publishable key
 * @param options - Additional Supabase client options
 * @returns Typed Supabase client
 * @throws Error if required environment variables are not set
 *
 * @example
 * ```typescript
 * // Client with publishable key
 * const client = createSupabaseClientFromEnv();
 *
 * // Admin client with service role key
 * const adminClient = createSupabaseClientFromEnv(true);
 * ```
 */
export function createSupabaseClientFromEnv(
  useServiceRole = false,
  options?: SupabaseClientOptions<'public'>
): KhepriSupabaseClient {
  // Guard against non-Node environments (browser/React Native/Edge)
  if (typeof process === 'undefined' || !process.env) {
    throw new Error(
      'createSupabaseClientFromEnv requires Node.js environment. Use createSupabaseClient with explicit config instead.'
    );
  }

  const url = process.env[ENV_VARS.SUPABASE_URL];
  const keyEnvVar = useServiceRole
    ? ENV_VARS.SUPABASE_SERVICE_ROLE_KEY
    : ENV_VARS.SUPABASE_PUBLISHABLE_KEY;
  const key = process.env[keyEnvVar];

  if (!url) {
    throw new Error(`Environment variable ${ENV_VARS.SUPABASE_URL} is required`);
  }
  if (!key) {
    throw new Error(`Environment variable ${keyEnvVar} is required`);
  }

  return createSupabaseClient({ url, key, options });
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Checks if Supabase environment variables are configured.
 *
 * @returns Object indicating which config values are available
 */
export function getSupabaseConfigStatus(): {
  hasUrl: boolean;
  hasPublishableKey: boolean;
  hasServiceRoleKey: boolean;
  isConfigured: boolean;
} {
  // Guard against non-Node environments (browser/React Native/Edge)
  if (typeof process === 'undefined' || !process.env) {
    return {
      hasUrl: false,
      hasPublishableKey: false,
      hasServiceRoleKey: false,
      isConfigured: false,
    };
  }

  const hasUrl = Boolean(process.env[ENV_VARS.SUPABASE_URL]);
  const hasPublishableKey = Boolean(process.env[ENV_VARS.SUPABASE_PUBLISHABLE_KEY]);
  const hasServiceRoleKey = Boolean(process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY]);

  return {
    hasUrl,
    hasPublishableKey,
    hasServiceRoleKey,
    isConfigured: hasUrl && (hasPublishableKey || hasServiceRoleKey),
  };
}

/**
 * Checks if Supabase is configured with URL and the appropriate key.
 *
 * @param useServiceRole - When true, check for service role key; otherwise check for publishable key
 * @returns true if the required configuration is available
 */
export function isSupabaseConfigured(useServiceRole = false): boolean {
  const status = getSupabaseConfigStatus();
  return status.hasUrl && (useServiceRole ? status.hasServiceRoleKey : status.hasPublishableKey);
}
