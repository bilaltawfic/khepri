import type { UseConversationReturn } from '@/hooks/useConversation';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChatScreen from '../chat';

// Mock useConversation hook
const mockSendMessage = jest.fn();
const mockStartNewConversation = jest.fn();
const mockRefetch = jest.fn();

let mockConversationState: UseConversationReturn = {
  messages: [],
  conversation: null,
  isLoading: false,
  isSending: false,
  error: null,
  sendMessage: mockSendMessage,
  startNewConversation: mockStartNewConversation,
  refetch: mockRefetch,
};

jest.mock('@/hooks', () => ({
  useConversation: () => mockConversationState,
}));

// Mock useAuth
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// @khepri/supabase-client is handled by manual mock at __mocks__/@khepri/supabase-client.ts

// Override useLocalSearchParams from the existing expo-router mock (set up in jest.setup.ts)
const mockSearchParams: Record<string, string | undefined> = {};
const { useLocalSearchParams } = require('expo-router') as {
  useLocalSearchParams: jest.Mock;
};
useLocalSearchParams.mockImplementation(() => mockSearchParams);

// Re-establish mock implementations after clearAllMocks removes them
function resetSupabaseMocks() {
  const sc = require('@khepri/supabase-client') as {
    getAthleteByAuthUser: jest.Mock;
    getTodayCheckin: jest.Mock;
  };
  sc.getAthleteByAuthUser.mockResolvedValue({ data: null, error: null });
  sc.getTodayCheckin.mockResolvedValue({ data: null, error: null });
}

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSupabaseMocks();
    mockSearchParams.fromCheckin = undefined;
    mockConversationState = {
      messages: [],
      conversation: null,
      isLoading: false,
      isSending: false,
      error: null,
      sendMessage: mockSendMessage,
      startNewConversation: mockStartNewConversation,
      refetch: mockRefetch,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ChatScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the welcome message when no messages', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("I'm your Khepri AI coach");
  });

  it('renders suggestion chips when no messages', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Try asking:');
    expect(json).toContain('What should I focus on this week?');
    expect(json).toContain('Suggest a recovery workout');
  });

  it('renders the text input placeholder', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ask your coach...');
  });

  it('renders the send button', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('send');
  });

  describe('check-in context', () => {
    it('shows check-in summary message when fromCheckin=1 and data available', async () => {
      mockSearchParams.fromCheckin = '1';

      const { getAthleteByAuthUser, getTodayCheckin } = require('@khepri/supabase-client') as {
        getAthleteByAuthUser: jest.Mock;
        getTodayCheckin: jest.Mock;
      };
      getAthleteByAuthUser.mockResolvedValue({
        data: { id: 'athlete-1' },
        error: null,
      });
      getTodayCheckin.mockResolvedValue({
        data: {
          sleep_quality: 7,
          energy_level: 6,
          stress_level: 4,
          overall_soreness: 3,
          available_time_minutes: 60,
        },
        error: null,
      });

      const { toJSON } = render(<ChatScreen />);

      // Verify mocks are called
      await waitFor(() => {
        expect(getAthleteByAuthUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getTodayCheckin).toHaveBeenCalled();
      });

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain("I've got your check-in");
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      mockConversationState.isLoading = true;
      const { toJSON } = render(<ChatScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Loading conversation');
    });
  });

  describe('error state', () => {
    it('shows error message when error occurs', () => {
      mockConversationState.error = 'Failed to load conversation';
      const { toJSON } = render(<ChatScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to load conversation');
    });

    it('calls refetch when retry button is pressed', () => {
      mockConversationState.error = 'Failed to load conversation';
      const { getByLabelText } = render(<ChatScreen />);
      const retryButton = getByLabelText('Retry loading conversation');

      fireEvent.press(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('with messages', () => {
    beforeEach(() => {
      mockConversationState.messages = [
        { id: '1', role: 'user', content: 'Hello coach!', createdAt: new Date().toISOString() },
        {
          id: '2',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          createdAt: new Date().toISOString(),
        },
      ];
    });

    it('renders messages from conversation', () => {
      const { toJSON } = render(<ChatScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Hello coach!');
      expect(json).toContain('How can I help you today?');
    });

    it('does not show suggestions when messages exist', () => {
      const { toJSON } = render(<ChatScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Try asking:');
    });
  });

  describe('input functionality', () => {
    it('allows typing in the input field', () => {
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      fireEvent.changeText(input, 'Test message');

      expect(input.props.value).toBe('Test message');
    });

    it('clears input after sending', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(getByLabelText('Send message'));

      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('calls sendMessage when send button pressed', async () => {
      mockSendMessage.mockResolvedValue(undefined);
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(getByLabelText('Send message'));

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('does not send empty messages', async () => {
      const { getByLabelText } = render(<ChatScreen />);

      fireEvent.press(getByLabelText('Send message'));

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('restores input text on send failure', async () => {
      mockSendMessage.mockResolvedValue(false);
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      fireEvent.changeText(input, 'Test message');
      fireEvent.press(getByLabelText('Send message'));

      await waitFor(() => {
        expect(input.props.value).toBe('Test message');
      });
    });

    it('does not send whitespace-only messages', async () => {
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      fireEvent.changeText(input, '   ');
      fireEvent.press(getByLabelText('Send message'));

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('sending state', () => {
    beforeEach(() => {
      mockConversationState.isSending = true;
    });

    it('shows sending indicator when sending', () => {
      const { toJSON } = render(<ChatScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Sending...');
    });

    it('disables input when sending', () => {
      const { getByLabelText } = render(<ChatScreen />);
      const input = getByLabelText('Message input');

      // editable may be false or undefined (falsy) when disabled
      expect(input.props.editable).toBeFalsy();
    });
  });

  describe('suggestion chips', () => {
    it('populates input when suggestion is pressed', () => {
      const { getByLabelText } = render(<ChatScreen />);
      const suggestion = getByLabelText('Ask: What should I focus on this week?');
      const input = getByLabelText('Message input');

      fireEvent.press(suggestion);

      expect(input.props.value).toBe('What should I focus on this week?');
    });
  });

  describe('accessibility', () => {
    it('has accessible send button', () => {
      const { getByLabelText } = render(<ChatScreen />);
      expect(getByLabelText('Send message')).toBeTruthy();
    });

    it('has accessible message input', () => {
      const { getByLabelText } = render(<ChatScreen />);
      expect(getByLabelText('Message input')).toBeTruthy();
    });

    it('has accessible suggestion chips', () => {
      const { getByLabelText } = render(<ChatScreen />);
      expect(getByLabelText('Ask: What should I focus on this week?')).toBeTruthy();
      expect(getByLabelText('Ask: Why am I feeling tired today?')).toBeTruthy();
      expect(getByLabelText('Ask: Suggest a recovery workout')).toBeTruthy();
    });
  });
});
