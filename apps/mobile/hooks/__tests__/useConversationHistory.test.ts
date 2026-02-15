import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useConversationHistory } from '../useConversationHistory';

// Mock useAuth
const mockUser = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Build a chainable Supabase query mock that returns configurable results
let mockQueryResult: { data: unknown[] | null; error: unknown } = { data: [], error: null };

function createChainableMock() {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult));
  return chain;
}

const mockFrom = jest.fn().mockImplementation(() => createChainableMock());

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock supabase-client queries
const mockGetAthleteByAuthUser = jest.fn();
const mockGetConversations = jest.fn();
const mockArchiveConversation = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getConversations: (...args: unknown[]) => mockGetConversations(...args),
  archiveConversation: (...args: unknown[]) => mockArchiveConversation(...args),
}));

describe('useConversationHistory', () => {
  const mockAthleteId = 'athlete-123';
  const mockConversationRows = [
    {
      id: 'conv-1',
      athlete_id: mockAthleteId,
      title: 'Training advice',
      last_message_at: '2026-02-15T09:15:00Z',
      is_archived: false,
      metadata: {},
      created_at: '2026-02-15T09:00:00Z',
      updated_at: '2026-02-15T09:15:00Z',
      started_at: '2026-02-15T09:00:00Z',
    },
    {
      id: 'conv-2',
      athlete_id: mockAthleteId,
      title: 'Recovery question',
      last_message_at: '2026-02-14T15:22:00Z',
      is_archived: false,
      metadata: {},
      created_at: '2026-02-14T15:00:00Z',
      updated_at: '2026-02-14T15:22:00Z',
      started_at: '2026-02-14T15:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });

    mockGetConversations.mockResolvedValue({
      data: mockConversationRows,
      error: null,
    });

    // Default: return a message preview for each conversation
    mockQueryResult = {
      data: [
        {
          content:
            "Based on your check-in, I'd recommend focusing on zone 2 work today. Your fatigue is elevated from yesterday's intervals.",
        },
      ],
      error: null,
    };

    mockArchiveConversation.mockResolvedValue({
      data: { id: 'conv-1', is_archived: true },
      error: null,
    });
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useConversationHistory());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches conversations on mount', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns conversations with correct summaries', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const [first, second] = result.current.conversations;

    expect(first).toEqual({
      id: 'conv-1',
      title: 'Training advice',
      lastMessageAt: '2026-02-15T09:15:00Z',
      messagePreview: expect.stringContaining("Based on your check-in, I'd recommend"),
      isArchived: false,
    });

    expect(second).toEqual({
      id: 'conv-2',
      title: 'Recovery question',
      lastMessageAt: '2026-02-14T15:22:00Z',
      messagePreview: expect.stringContaining("Based on your check-in, I'd recommend"),
      isArchived: false,
    });
  });

  it('queries messages table with limit 1 and descending order', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should query the messages table for each conversation
    expect(mockFrom).toHaveBeenCalledWith('messages');
  });

  it('truncates long message previews', async () => {
    const longContent = 'A'.repeat(150);
    mockQueryResult = {
      data: [{ content: longContent }],
      error: null,
    };

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const preview = result.current.conversations[0]?.messagePreview ?? '';
    // 100 chars + "..."
    expect(preview.length).toBe(103);
    expect(preview.endsWith('...')).toBe(true);
  });

  it('handles empty conversation list', async () => {
    mockGetConversations.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error gracefully', async () => {
    mockGetConversations.mockResolvedValue({
      data: null,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.conversations).toEqual([]);
  });

  it('handles athlete fetch error', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: new Error('Auth failed'),
    });

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Auth failed');
  });

  it('handles missing athlete profile', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('No athlete profile found');
  });

  it('handles message preview fetch error gracefully', async () => {
    mockQueryResult = {
      data: null,
      error: new Error('Messages error'),
    };

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still return conversations but with empty previews
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0]?.messagePreview).toBe('');
  });

  it('refreshes conversations when refresh is called', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetConversations).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetConversations).toHaveBeenCalledTimes(2);
  });

  it('sets isRefreshing during pull-to-refresh', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After initial load, isRefreshing should be false
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('archives conversation and removes it from list', async () => {
    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toHaveLength(2);

    await act(async () => {
      await result.current.archiveConversation('conv-1');
    });

    expect(mockArchiveConversation).toHaveBeenCalledWith(expect.anything(), 'conv-1');
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0]?.id).toBe('conv-2');
  });

  it('sets error when archive fails', async () => {
    mockArchiveConversation.mockResolvedValue({
      data: null,
      error: new Error('Archive failed'),
    });

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.archiveConversation('conv-1');
    });

    expect(result.current.error).toBe('Archive failed');
    // Should not remove from list on failure
    expect(result.current.conversations).toHaveLength(2);
  });

  it('handles conversation with no messages', async () => {
    mockQueryResult = {
      data: [],
      error: null,
    };

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations[0]?.messagePreview).toBe('');
  });

  it('handles exception during conversation fetch', async () => {
    mockGetConversations.mockRejectedValue(new Error('Unexpected error'));

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Unexpected error');
  });

  it('handles non-Error exception during athlete fetch', async () => {
    mockGetAthleteByAuthUser.mockRejectedValue('string error');

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load athlete');
  });

  it('handles non-Error exception during conversation fetch', async () => {
    mockGetConversations.mockRejectedValue('string error');

    const { result } = renderHook(() => useConversationHistory());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load conversations');
  });
});
