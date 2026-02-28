// Credentials Edge Function
// Manages encrypted storage of Intervals.icu API credentials.
//
// Environment variables required:
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase publishable key (auto-provided as SUPABASE_ANON_KEY)
// - ENCRYPTION_KEY: 32-byte hex string (64 chars) for AES-GCM encryption

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import {
  IntervalsApiError,
  validateIntervalsCredentials,
} from '../mcp-gateway/utils/intervals-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

/**
 * Parse a 64-character hex string into a 32-byte Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const byteHex = hex.slice(i * 2, i * 2 + 2);
    const byteValue = Number.parseInt(byteHex, 16);
    if (Number.isNaN(byteValue)) {
      throw new Error(`Invalid hex in encryption key at index ${i}`);
    }
    bytes[i] = byteValue;
  }
  return bytes;
}

/**
 * Load the AES-GCM encryption key from environment.
 */
function getEncryptionKey(): Uint8Array {
  const key = Deno.env.get('ENCRYPTION_KEY');
  if (!key || key.length !== 64) {
    throw new Error('Invalid encryption key configuration');
  }
  return hexToBytes(key);
}

/**
 * Encrypt plaintext using AES-GCM.
 * Returns base64-encoded IV + ciphertext.
 */
async function encrypt(plaintext: string): Promise<string> {
  const keyBytes = getEncryptionKey();
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);

  // Combine IV (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt base64-encoded IV + ciphertext using AES-GCM.
 */
async function decrypt(encrypted: string): Promise<string> {
  const keyBytes = getEncryptionKey();
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'decrypt',
  ]);

  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// Export crypto helpers for use by other edge functions (e.g., mcp-gateway).
// The import.meta.main guard below prevents serve() from executing as a side effect.
export { decrypt, encrypt };

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('Missing authorization header', 401);
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!supabaseUrl || !supabaseAnonKey) {
        return errorResponse('Server configuration error', 500);
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return errorResponse('Unauthorized', 401);
      }

      // Get athlete ID for the authenticated user
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (athleteError || !athlete) {
        return errorResponse('Athlete profile not found', 404);
      }

      // GET - check connection status (never returns the actual API key)
      if (req.method === 'GET') {
        const { data: creds, error: credsError } = await supabase
          .from('intervals_credentials')
          .select('intervals_athlete_id, created_at, updated_at')
          .eq('athlete_id', athlete.id)
          .single();

        if (credsError) {
          if (credsError.code === 'PGRST116') {
            return jsonResponse({ connected: false });
          }
          console.error('Fetch credentials error:', credsError);
          return errorResponse('Failed to fetch credentials', 500);
        }

        if (!creds) {
          return jsonResponse({ connected: false });
        }

        return jsonResponse({
          connected: true,
          intervals_athlete_id: creds.intervals_athlete_id,
          connected_at: creds.created_at,
          updated_at: creds.updated_at,
        });
      }

      // POST - save credentials (encrypts API key before storage)
      if (req.method === 'POST') {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return errorResponse('Invalid JSON in request body', 400);
        }

        if (typeof body !== 'object' || body === null) {
          return errorResponse('Invalid request body', 400);
        }

        const { intervals_athlete_id, api_key } = body as Record<string, unknown>;

        if (!intervals_athlete_id || typeof intervals_athlete_id !== 'string') {
          return errorResponse('intervals_athlete_id is required', 400);
        }

        if (!api_key || typeof api_key !== 'string') {
          return errorResponse('api_key is required', 400);
        }

        const trimmedAthleteId = intervals_athlete_id.trim();
        const trimmedApiKey = api_key.trim();

        if (!trimmedAthleteId) {
          return errorResponse('intervals_athlete_id is required', 400);
        }
        if (!trimmedApiKey) {
          return errorResponse('api_key is required', 400);
        }

        // Validate credentials against Intervals.icu API before saving
        try {
          await validateIntervalsCredentials({
            intervalsAthleteId: trimmedAthleteId,
            apiKey: trimmedApiKey,
          });
        } catch (err) {
          if (err instanceof IntervalsApiError) {
            if (err.code === 'INVALID_CREDENTIALS') {
              return errorResponse(
                'Invalid Intervals.icu credentials. Please check your Athlete ID and API Key.',
                401
              );
            }
            if (err.code === 'RATE_LIMITED') {
              return errorResponse(
                'Intervals.icu rate limit reached. Please wait a moment and try again.',
                429
              );
            }
            // Deterministic upstream errors (4xx client errors, 5xx server errors)
            if (err.statusCode >= 400 && err.statusCode < 500) {
              return errorResponse(
                `Intervals.icu rejected the request (${err.statusCode}). Please check your Athlete ID.`,
                400
              );
            }
            if (err.statusCode >= 500) {
              return errorResponse(
                'Intervals.icu is experiencing issues. Please try again later.',
                502
              );
            }
            // Network failure (statusCode 0 from NETWORK_ERROR)
            if (err.statusCode === 0) {
              return errorResponse(
                'Could not reach Intervals.icu to verify credentials. Please try again.',
                502
              );
            }
          }
          // Unexpected error (e.g. malformed upstream response)
          return errorResponse(
            'Unexpected error while verifying Intervals.icu credentials. Please try again.',
            502
          );
        }

        const encryptedApiKey = await encrypt(trimmedApiKey);

        const { error: upsertError } = await supabase.from('intervals_credentials').upsert(
          {
            athlete_id: athlete.id,
            intervals_athlete_id: trimmedAthleteId,
            encrypted_api_key: encryptedApiKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'athlete_id' }
        );

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          return errorResponse('Failed to save credentials', 500);
        }

        return jsonResponse({ success: true, message: 'Credentials saved' });
      }

      // DELETE - remove credentials
      if (req.method === 'DELETE') {
        const { error: deleteError } = await supabase
          .from('intervals_credentials')
          .delete()
          .eq('athlete_id', athlete.id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          return errorResponse('Failed to delete credentials', 500);
        }

        return jsonResponse({ success: true, message: 'Credentials removed' });
      }

      return errorResponse('Method not allowed', 405);
    } catch (error) {
      console.error('Credentials Error:', error);
      return errorResponse('Internal server error', 500);
    }
  });
}
