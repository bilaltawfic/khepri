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
    let message: string;
    try {
      const body = await response.json();
      message = body.error ?? '';
    } catch {
      message = '';
    }

    if (!message) {
      if (response.status === 401) {
        message = 'Invalid Intervals.icu credentials. Please check your Athlete ID and API Key.';
      } else if (response.status === 429) {
        message = 'Intervals.icu rate limit reached. Please wait a moment and try again.';
      } else if (response.status === 502) {
        message = 'Could not reach Intervals.icu to verify credentials. Please try again.';
      } else {
        message = 'Failed to save credentials';
      }
    }

    throw new Error(message);
  }
}

export async function deleteCredentials(): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(getCredentialsFunctionUrl(), {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    let message = 'Failed to delete credentials';
    try {
      const error = await response.json();
      if (error.error) message = error.error;
    } catch {
      // Non-JSON error response, use fallback message
    }
    throw new Error(message);
  }
}
