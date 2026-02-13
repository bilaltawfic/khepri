# P3-B-02: Store Encrypted API Credentials

## Branch
```bash
git checkout feat/p3-b-02-encrypted-credentials
```

## Goal

Securely store Intervals.icu API credentials (athlete ID and API key) so they can be used by the MCP gateway to fetch data. This involves:

1. Adding an encrypted credentials table in Supabase
2. Creating Edge Functions to encrypt/decrypt credentials
3. Updating the mobile app to save and load credentials securely

## Files to Create/Modify

```
supabase/
├── migrations/
│   └── 20260213000000_intervals_credentials.sql  # NEW: Credentials table
├── functions/
│   └── credentials/
│       └── index.ts                              # NEW: Encrypt/decrypt endpoint

apps/mobile/
├── services/
│   └── credentials.ts                            # NEW: Credentials service
├── hooks/
│   └── useIntervalsConnection.ts                 # NEW: Connection state hook
└── app/profile/
    └── intervals.tsx                             # UPDATE: Wire to real storage
```

## Implementation Steps

### 1. Create Database Migration

```sql
-- supabase/migrations/20260213000000_intervals_credentials.sql

-- Store encrypted Intervals.icu credentials per athlete
-- The API key is encrypted server-side before storage
create table if not exists intervals_credentials (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  intervals_athlete_id text not null,
  encrypted_api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Each athlete can only have one set of credentials
  unique(athlete_id)
);

-- RLS policies
alter table intervals_credentials enable row level security;

-- Athletes can only see/manage their own credentials
create policy "Athletes can view own credentials"
  on intervals_credentials for select
  using (
    athlete_id in (
      select id from athletes where auth_user_id = auth.uid()
    )
  );

create policy "Athletes can insert own credentials"
  on intervals_credentials for insert
  with check (
    athlete_id in (
      select id from athletes where auth_user_id = auth.uid()
    )
  );

create policy "Athletes can update own credentials"
  on intervals_credentials for update
  using (
    athlete_id in (
      select id from athletes where auth_user_id = auth.uid()
    )
  );

create policy "Athletes can delete own credentials"
  on intervals_credentials for delete
  using (
    athlete_id in (
      select id from athletes where auth_user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
create trigger update_intervals_credentials_updated_at
  before update on intervals_credentials
  for each row
  execute function update_updated_at_column();

-- Index for quick lookup by athlete
create index if not exists idx_intervals_credentials_athlete
  on intervals_credentials(athlete_id);
```

### 2. Create Credentials Edge Function

```typescript
// supabase/functions/credentials/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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
 * Simple encryption using AES-GCM with a server-side key.
 * The ENCRYPTION_KEY env var should be a 32-byte hex string.
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = Deno.env.get('ENCRYPTION_KEY');
  if (!key || key.length !== 64) {
    throw new Error('Invalid encryption key configuration');
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(key.slice(i * 2, i * 2 + 2), 16);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedText
  );

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encrypted: string): Promise<string> {
  const key = Deno.env.get('ENCRYPTION_KEY');
  if (!key || key.length !== 64) {
    throw new Error('Invalid encryption key configuration');
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(key.slice(i * 2, i * 2 + 2), 16);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get athlete ID
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return errorResponse('Athlete profile not found', 404);
    }

    // Handle GET - check connection status
    if (req.method === 'GET') {
      const { data: creds } = await supabase
        .from('intervals_credentials')
        .select('intervals_athlete_id, created_at, updated_at')
        .eq('athlete_id', athlete.id)
        .single();

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

    // Handle POST - save credentials
    if (req.method === 'POST') {
      const body = await req.json();
      const { intervals_athlete_id, api_key } = body;

      if (!intervals_athlete_id || typeof intervals_athlete_id !== 'string') {
        return errorResponse('intervals_athlete_id is required', 400);
      }

      if (!api_key || typeof api_key !== 'string') {
        return errorResponse('api_key is required', 400);
      }

      // Encrypt the API key
      const encryptedApiKey = await encrypt(api_key);

      // Upsert credentials
      const { error: upsertError } = await supabase
        .from('intervals_credentials')
        .upsert({
          athlete_id: athlete.id,
          intervals_athlete_id: intervals_athlete_id.trim(),
          encrypted_api_key: encryptedApiKey,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'athlete_id',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return errorResponse('Failed to save credentials', 500);
      }

      return jsonResponse({ success: true, message: 'Credentials saved' });
    }

    // Handle DELETE - remove credentials
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
```

### 3. Create Mobile Credentials Service

```typescript
// apps/mobile/services/credentials.ts

import { supabase } from './supabase';

export interface ConnectionStatus {
  connected: boolean;
  intervalsAthleteId?: string;
  connectedAt?: string;
  updatedAt?: string;
}

const CREDENTIALS_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/credentials`;

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const headers = await getAuthHeaders();
  const response = await fetch(CREDENTIALS_FUNCTION_URL, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to get connection status');
  }

  const data = await response.json();
  return {
    connected: data.connected,
    intervalsAthleteId: data.intervals_athlete_id,
    connectedAt: data.connected_at,
    updatedAt: data.updated_at,
  };
}

export async function saveCredentials(
  intervalsAthleteId: string,
  apiKey: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(CREDENTIALS_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      intervals_athlete_id: intervalsAthleteId,
      api_key: apiKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save credentials');
  }
}

export async function deleteCredentials(): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(CREDENTIALS_FUNCTION_URL, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete credentials');
  }
}
```

### 4. Create useIntervalsConnection Hook

```typescript
// apps/mobile/hooks/useIntervalsConnection.ts

import { useCallback, useEffect, useState } from 'react';
import {
  ConnectionStatus,
  deleteCredentials,
  getConnectionStatus,
  saveCredentials,
} from '@/services/credentials';

export function useIntervalsConnection() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const connectionStatus = await getConnectionStatus();
      setStatus(connectionStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(async (athleteId: string, apiKey: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await saveCredentials(athleteId, apiKey);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteCredentials();
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    isLoading,
    error,
    connect,
    disconnect,
    refresh,
  };
}
```

### 5. Update intervals.tsx to Use Real Storage

Key changes to `apps/mobile/app/profile/intervals.tsx`:

1. Import and use `useIntervalsConnection` hook
2. Replace `useState<ConnectionStatus>` with hook state
3. Wire `handleConnect` to call `connect()`
4. Wire `handleDisconnect` to call `disconnect()`
5. Show loading states appropriately

## Environment Setup

Add to Supabase project secrets:
```bash
# Generate a 32-byte encryption key (64 hex characters)
openssl rand -hex 32

# Set in Supabase dashboard or CLI
supabase secrets set ENCRYPTION_KEY=<your-64-char-hex-key>
```

## Testing Requirements

### Unit Tests

Create `apps/mobile/services/__tests__/credentials.test.ts`:
- Mock fetch and test each function
- Test error handling for network failures
- Test auth header extraction

Create `apps/mobile/hooks/__tests__/useIntervalsConnection.test.ts`:
- Test initial loading state
- Test successful connection flow
- Test disconnect flow
- Test error handling

### Integration Tests

1. Run migration against local Supabase
2. Deploy credentials function locally
3. Test full flow:
   - Save credentials via POST
   - Verify GET returns connected
   - Delete via DELETE
   - Verify GET returns not connected

### Verification

```bash
# Save credentials
curl -X POST http://localhost:54321/functions/v1/credentials \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"intervals_athlete_id": "i12345", "api_key": "test-api-key-here"}'

# Check status
curl http://localhost:54321/functions/v1/credentials \
  -H "Authorization: Bearer <jwt>"

# Delete credentials
curl -X DELETE http://localhost:54321/functions/v1/credentials \
  -H "Authorization: Bearer <jwt>"
```

## Security Considerations

1. **API keys are encrypted at rest** using AES-GCM with a server-side key
2. **Server-side encryption key** is stored in Supabase secrets, never exposed to clients
3. **RLS policies** ensure athletes can only access their own credentials
4. **No plaintext transmission** - credentials are only decrypted server-side when needed by MCP gateway
5. **Credentials are never returned to clients** - only connection status is returned

## PR Guidelines

- Commit: `feat(supabase): add encrypted Intervals.icu credentials storage`
- Include migration, Edge Function, service, hook, and screen updates
- Ensure all tests pass

## Dependencies

- P3-B-01: Intervals.icu settings UI (✅ Complete)

## Enables

- P3-A-05: Wire to real Intervals.icu API (needs credentials to authenticate)
- P3-B-03: Fetch and display recent activities
- P3-B-04: Sync wellness data to daily check-in
