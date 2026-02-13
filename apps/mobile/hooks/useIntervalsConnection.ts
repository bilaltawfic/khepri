import { useCallback, useEffect, useState } from 'react';

import {
  type ConnectionStatus,
  deleteCredentials,
  getConnectionStatus,
  saveCredentials,
} from '@/services/credentials';

type UseIntervalsConnectionReturn = {
  readonly status: ConnectionStatus;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly connect: (athleteId: string, apiKey: string) => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly refresh: () => Promise<void>;
};

export function useIntervalsConnection(): UseIntervalsConnectionReturn {
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

  const connect = useCallback(
    async (athleteId: string, apiKey: string) => {
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
    },
    [refresh]
  );

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
