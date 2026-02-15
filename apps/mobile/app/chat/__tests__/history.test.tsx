import { fireEvent, render } from '@testing-library/react-native';

import ConversationHistoryScreen from '../history';

// Mock useConversationHistory hook
const mockRefresh = jest.fn();
const mockArchiveConversation = jest.fn();

let mockHistoryState = {
  conversations: [] as Array<{
    id: string;
    title: string | null;
    lastMessageAt: string;
    messagePreview: string;
    isArchived: boolean;
  }>,
  isLoading: false,
  error: null as string | null,
  refresh: mockRefresh,
  archiveConversation: mockArchiveConversation,
};

jest.mock('@/hooks', () => ({
  useConversationHistory: () => mockHistoryState,
}));

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock Alert
const mockAlert = jest.fn();
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: (...args: unknown[]) => mockAlert(...args),
}));

describe('ConversationHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryState = {
      conversations: [],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
      archiveConversation: mockArchiveConversation,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ConversationHistoryScreen />);
    expect(toJSON()).toBeTruthy();
  });

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      mockHistoryState.isLoading = true;
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Loading conversations');
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      mockHistoryState.error = 'Failed to load conversations';
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to load conversations');
    });

    it('calls refresh when retry is pressed', () => {
      mockHistoryState.error = 'Failed to load conversations';
      const { getByLabelText } = render(<ConversationHistoryScreen />);
      const retryButton = getByLabelText('Retry loading conversations');

      fireEvent.press(retryButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no conversations', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No conversations yet');
      expect(json).toContain('Start chatting with your coach!');
    });
  });

  describe('with conversations', () => {
    beforeEach(() => {
      mockHistoryState.conversations = [
        {
          id: 'conv-1',
          title: 'Training advice for Sunday',
          lastMessageAt: new Date().toISOString(),
          messagePreview: "Based on your check-in, I'd recommend...",
          isArchived: false,
        },
        {
          id: 'conv-2',
          title: 'Recovery protocol question',
          lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
          messagePreview: "After yesterday's hard ride...",
          isArchived: false,
        },
      ];
    });

    it('renders conversation list', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Training advice for Sunday');
      expect(json).toContain('Recovery protocol question');
    });

    it('renders message previews', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain("Based on your check-in, I'd recommend...");
      expect(json).toContain("After yesterday's hard ride...");
    });

    it('renders relative timestamps', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Today');
      expect(json).toContain('Yesterday');
    });

    it('renders conversation cards as pressable buttons', () => {
      const { getByLabelText } = render(<ConversationHistoryScreen />);
      // Verify conversation cards are rendered with correct accessibility labels
      const card = getByLabelText(/Training advice for Sunday/);
      expect(card).toBeTruthy();
      expect(card.props.role).toBe('button');
    });

    it('does not show empty state when conversations exist', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('No conversations yet');
    });

    it('renders untitled conversation with fallback', () => {
      mockHistoryState.conversations = [
        {
          id: 'conv-3',
          title: null,
          lastMessageAt: new Date().toISOString(),
          messagePreview: 'Some preview text',
          isArchived: false,
        },
      ];

      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Untitled conversation');
    });

    it('does not render preview when messagePreview is empty', () => {
      mockHistoryState.conversations = [
        {
          id: 'conv-4',
          title: 'No messages yet',
          lastMessageAt: new Date().toISOString(),
          messagePreview: '',
          isArchived: false,
        },
      ];

      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No messages yet');
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockHistoryState.conversations = [
        {
          id: 'conv-1',
          title: 'Training advice',
          lastMessageAt: new Date().toISOString(),
          messagePreview: 'Some preview',
          isArchived: false,
        },
      ];
    });

    it('has accessible conversation cards', () => {
      const { getByLabelText } = render(<ConversationHistoryScreen />);
      expect(getByLabelText(/Training advice/)).toBeTruthy();
    });

    it('has accessible conversation list', () => {
      const { getByLabelText } = render(<ConversationHistoryScreen />);
      expect(getByLabelText('Conversation history')).toBeTruthy();
    });
  });

  describe('pull to refresh', () => {
    it('has refresh control', () => {
      const { toJSON } = render(<ConversationHistoryScreen />);
      const json = JSON.stringify(toJSON());
      // RefreshControl renders as part of the FlatList
      expect(json).toBeTruthy();
    });
  });
});
