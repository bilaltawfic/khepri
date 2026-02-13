import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useIntervalsConnection } from '../useIntervalsConnection';

const mockGetConnectionStatus = jest.fn();
const mockSaveCredentials = jest.fn();
const mockDeleteCredentials = jest.fn();

jest.mock('@/services/credentials', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  saveCredentials: (...args: unknown[]) => mockSaveCredentials(...args),
  deleteCredentials: (...args: unknown[]) => mockDeleteCredentials(...args),
}));

describe('useIntervalsConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnectionStatus.mockResolvedValue({ connected: false });
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useIntervalsConnection());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.status).toEqual({ connected: false });
  });

  it('loads connection status on mount', async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: true,
      intervalsAthleteId: 'i12345',
      connectedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });

    const { result } = renderHook(() => useIntervalsConnection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toEqual({
      connected: true,
      intervalsAthleteId: 'i12345',
      connectedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error when initial load fails', async () => {
    mockGetConnectionStatus.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useIntervalsConnection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.status).toEqual({ connected: false });
  });

  it('sets fallback error message for non-Error exceptions', async () => {
    mockGetConnectionStatus.mockRejectedValue('string error');

    const { result } = renderHook(() => useIntervalsConnection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load status');
  });

  describe('connect', () => {
    it('saves credentials and refreshes status', async () => {
      mockSaveCredentials.mockResolvedValue(undefined);
      mockGetConnectionStatus.mockResolvedValueOnce({ connected: false }).mockResolvedValueOnce({
        connected: true,
        intervalsAthleteId: 'i12345',
      });

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.connect('i12345', 'my-api-key');
      });

      expect(mockSaveCredentials).toHaveBeenCalledWith('i12345', 'my-api-key');
      expect(result.current.status.connected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('sets error and rethrows on failure', async () => {
      mockSaveCredentials.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.connect('i12345', 'my-api-key');
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).message).toBe('Save failed');
      expect(result.current.error).toBe('Save failed');
    });

    it('sets fallback error for non-Error exceptions', async () => {
      mockSaveCredentials.mockRejectedValue(42);

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.connect('i12345', 'key');
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBe(42);
      expect(result.current.error).toBe('Failed to connect');
    });
  });

  describe('disconnect', () => {
    it('deletes credentials and resets status', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        connected: true,
        intervalsAthleteId: 'i12345',
      });
      mockDeleteCredentials.mockResolvedValue(undefined);

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status.connected).toBe(true);

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockDeleteCredentials).toHaveBeenCalled();
      expect(result.current.status).toEqual({ connected: false });
      expect(result.current.error).toBeNull();
    });

    it('sets error and rethrows on failure', async () => {
      mockDeleteCredentials.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.disconnect();
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).message).toBe('Delete failed');
      expect(result.current.error).toBe('Delete failed');
    });

    it('sets fallback error for non-Error exceptions', async () => {
      mockDeleteCredentials.mockRejectedValue('string error');

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.disconnect();
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toBe('string error');
      expect(result.current.error).toBe('Failed to disconnect');
    });
  });

  describe('refresh', () => {
    it('reloads connection status', async () => {
      mockGetConnectionStatus.mockResolvedValueOnce({ connected: false }).mockResolvedValueOnce({
        connected: true,
        intervalsAthleteId: 'i99999',
      });

      const { result } = renderHook(() => useIntervalsConnection());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status.connected).toBe(false);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.status.connected).toBe(true);
      expect(mockGetConnectionStatus).toHaveBeenCalledTimes(2);
    });
  });
});
