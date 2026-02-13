import { deleteCredentials, getConnectionStatus, saveCredentials } from '../credentials';

const mockGetSession = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Stable env for URL construction
const TEST_SUPABASE_URL = 'https://test.supabase.co';

function createMockSupabase() {
  return {
    auth: {
      getSession: mockGetSession,
    },
  };
}

describe('credentials service', () => {
  let originalUrl: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
  });

  describe('getConnectionStatus', () => {
    it('returns connected status with athlete details', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            connected: true,
            intervals_athlete_id: 'i12345',
            connected_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
          }),
      });

      const status = await getConnectionStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/credentials`,
        expect.objectContaining({ method: 'GET' })
      );
      expect(status).toEqual({
        connected: true,
        intervalsAthleteId: 'i12345',
        connectedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      });
    });

    it('returns not connected when no credentials exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      });

      const status = await getConnectionStatus();

      expect(status).toEqual({
        connected: false,
        connectedAt: undefined,
        intervalsAthleteId: undefined,
        updatedAt: undefined,
      });
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(getConnectionStatus()).rejects.toThrow('Failed to get connection status');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await expect(getConnectionStatus()).rejects.toThrow('Not authenticated');
    });

    it('throws when Supabase is not configured', async () => {
      mockSupabase = undefined;

      await expect(getConnectionStatus()).rejects.toThrow('Supabase is not configured');
    });

    it('throws when EXPO_PUBLIC_SUPABASE_URL is not set', async () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = '';

      await expect(getConnectionStatus()).rejects.toThrow(
        'EXPO_PUBLIC_SUPABASE_URL is not configured'
      );
    });

    it('includes authorization header in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      });

      await getConnectionStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });
  });

  describe('saveCredentials', () => {
    it('sends POST with athlete ID and API key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await saveCredentials('i12345', 'my-secret-api-key-here');

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/credentials`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            intervals_athlete_id: 'i12345',
            api_key: 'my-secret-api-key-here',
          }),
        })
      );
    });

    it('throws with server error message on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'intervals_athlete_id is required' }),
      });

      await expect(saveCredentials('', 'key')).rejects.toThrow('intervals_athlete_id is required');
    });

    it('throws fallback message when no error detail in response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(saveCredentials('i12345', 'key')).rejects.toThrow('Failed to save credentials');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      await expect(saveCredentials('i12345', 'key')).rejects.toThrow('Not authenticated');
    });
  });

  describe('deleteCredentials', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await deleteCredentials();

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_SUPABASE_URL}/functions/v1/credentials`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('throws with server error message on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to delete credentials' }),
      });

      await expect(deleteCredentials()).rejects.toThrow('Failed to delete credentials');
    });

    it('throws fallback message when no error detail in response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(deleteCredentials()).rejects.toThrow('Failed to delete credentials');
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      await expect(deleteCredentials()).rejects.toThrow('Not authenticated');
    });
  });
});
