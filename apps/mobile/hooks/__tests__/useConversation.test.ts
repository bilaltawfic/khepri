import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useConversation } from '../useConversation';

// Mock useAuth
const mockUser = { id: 'auth-user-123' };
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock supabase - provide a minimal mock since we use helper functions from @khepri/supabase-client
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Mock supabase-client queries
const mockGetAthleteByAuthUser = jest.fn();
const mockGetMostRecentConversation = jest.fn();
const mockCreateConversation = jest.fn();
const mockGetMessages = jest.fn();
const mockAddMessage = jest.fn();
const mockArchiveConversation = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getMostRecentConversation: (...args: unknown[]) => mockGetMostRecentConversation(...args),
  createConversation: (...args: unknown[]) => mockCreateConversation(...args),
  getMessages: (...args: unknown[]) => mockGetMessages(...args),
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
  archiveConversation: (...args: unknown[]) => mockArchiveConversation(...args),
}));

describe('useConversation', () => {
  const mockAthleteId = 'athlete-123';
  const mockConversation = {
    id: 'conv-123',
    athlete_id: mockAthleteId,
    created_at: '2026-02-10T00:00:00Z',
    is_archived: false,
  };
  const mockMessages = [
    {
      id: 'msg-1',
      conversation_id: 'conv-123',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      created_at: '2026-02-10T00:00:00Z',
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-123',
      role: 'user',
      content: 'What should I focus on today?',
      created_at: '2026-02-10T00:01:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: successful athlete fetch via getAthleteByAuthUser
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: mockAthleteId },
      error: null,
    });

    // Default: successful conversation fetch
    mockGetMostRecentConversation.mockResolvedValue({
      data: mockConversation,
      error: null,
    });

    // Default: successful messages fetch
    mockGetMessages.mockResolvedValue({
      data: mockMessages,
      error: null,
    });

    // Default: successful message send
    mockAddMessage.mockResolvedValue({
      data: {
        id: 'msg-new',
        conversation_id: 'conv-123',
        role: 'user',
        content: 'Test message',
        created_at: '2026-02-10T00:02:00Z',
      },
      error: null,
    });
  });

  describe('initial loading', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useConversation());

      expect(result.current.isLoading).toBe(true);
    });

    it('loads athlete id from auth user', async () => {
      renderHook(() => useConversation());

      await waitFor(() => {
        expect(mockGetAthleteByAuthUser).toHaveBeenCalledWith(expect.anything(), 'auth-user-123');
      });
    });

    it('fetches most recent conversation after getting athlete id', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetMostRecentConversation).toHaveBeenCalled();
    });

    it('fetches messages for conversation', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetMessages).toHaveBeenCalledWith(expect.anything(), 'conv-123');
    });

    it('maps messages correctly', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });

      expect(result.current.messages[0]).toEqual({
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello! How can I help you?',
        createdAt: '2026-02-10T00:00:00Z',
      });
    });
  });

  describe('no existing conversation', () => {
    it('creates a new conversation if none exists', async () => {
      mockGetMostRecentConversation.mockResolvedValue({
        data: null,
        error: null,
      });
      mockCreateConversation.mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCreateConversation).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets error when athlete fetch fails', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: { message: 'Athlete not found' },
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Athlete not found');
      });
    });

    it('sets error when no athlete row exists for user', async () => {
      mockGetAthleteByAuthUser.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('No athlete profile found for this user');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets error when conversation fetch fails', async () => {
      mockGetMostRecentConversation.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch conversation' },
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch conversation');
      });
    });

    it('sets error when messages fetch fails', async () => {
      mockGetMessages.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch messages' },
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch messages');
      });
    });

    it('sets error when conversation creation fails', async () => {
      mockGetMostRecentConversation.mockResolvedValue({
        data: null,
        error: null,
      });
      mockCreateConversation.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create conversation' },
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to create conversation');
      });
    });

    it('handles exception during athlete fetch', async () => {
      mockGetAthleteByAuthUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('handles exception during conversation fetch', async () => {
      mockGetMostRecentConversation.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('sendMessage', () => {
    it('sends a message successfully', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockAddMessage).toHaveBeenCalledWith(expect.anything(), 'conv-123', {
        role: 'user',
        content: 'Test message',
      });
    });

    it('resets isSending after sending completes', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      // After send completes, isSending should be false
      expect(result.current.isSending).toBe(false);
    });

    it('adds message to messages array after sending', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.messages.length;

      await act(async () => {
        await result.current.sendMessage('New message');
      });

      expect(result.current.messages.length).toBe(initialCount + 1);
      expect(result.current.messages[result.current.messages.length - 1].content).toBe(
        'Test message'
      );
    });

    it('trims whitespace from message', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage('  Test message  ');
      });

      expect(mockAddMessage).toHaveBeenCalledWith(expect.anything(), 'conv-123', {
        role: 'user',
        content: 'Test message',
      });
    });

    it('does not send empty message', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(mockAddMessage).not.toHaveBeenCalled();
    });

    it('does not send if no conversation', async () => {
      mockGetMostRecentConversation.mockResolvedValue({
        data: null,
        error: null,
      });
      mockCreateConversation.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(mockAddMessage).not.toHaveBeenCalled();
    });

    it('sets error when send fails', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockAddMessage.mockResolvedValue({
        data: null,
        error: { message: 'Failed to send' },
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.error).toBe('Failed to send');
    });

    it('handles exception during send', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockAddMessage.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('startNewConversation', () => {
    beforeEach(() => {
      // Set up archive mock
      mockArchiveConversation.mockResolvedValue({ error: null });
    });

    it('creates a new conversation', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.conversation).not.toBeNull();
      });

      // Set up mock for new conversation creation
      mockCreateConversation.mockResolvedValue({
        data: { ...mockConversation, id: 'conv-new' },
        error: null,
      });

      await act(async () => {
        await result.current.startNewConversation();
      });

      // Verify new conversation was created (called at least once during startNew)
      expect(mockCreateConversation).toHaveBeenCalled();
    });

    it('archives current conversation before creating new one', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.conversation).not.toBeNull();
      });

      mockCreateConversation.mockResolvedValue({
        data: { ...mockConversation, id: 'conv-new' },
        error: null,
      });

      await act(async () => {
        await result.current.startNewConversation();
      });

      expect(mockArchiveConversation).toHaveBeenCalledWith(expect.anything(), 'conv-123');
    });

    it('clears messages when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.messages.length).toBe(2);
      });

      mockCreateConversation.mockResolvedValue({
        data: { ...mockConversation, id: 'conv-new' },
        error: null,
      });

      await act(async () => {
        await result.current.startNewConversation();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('sets error when creation fails', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockCreateConversation.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create' },
      });

      await act(async () => {
        await result.current.startNewConversation();
      });

      expect(result.current.error).toBe('Failed to create');
    });

    it('handles exception during creation', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockCreateConversation.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.startNewConversation();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('refetch', () => {
    it('refetches conversation and messages', async () => {
      const { result } = renderHook(() => useConversation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear and track calls
      mockGetMostRecentConversation.mockClear();
      mockGetMessages.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMostRecentConversation).toHaveBeenCalled();
      expect(mockGetMessages).toHaveBeenCalled();
    });
  });
});
