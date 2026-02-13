import { supabase } from '@/lib/supabase';

export type ConnectionStatus = {
  readonly connected: boolean;
  readonly intervalsAthleteId?: string;
  readonly connectedAt?: string;
  readonly updatedAt?: string;
};

function getCredentialsFunctionUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${url}/functions/v1/credentials`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const headers = await getAuthHeaders();
  const response = await fetch(getCredentialsFunctionUrl(), {
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

export async function saveCredentials(intervalsAthleteId: string, apiKey: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(getCredentialsFunctionUrl(), {
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
  const response = await fetch(getCredentialsFunctionUrl(), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete credentials');
  }
}
