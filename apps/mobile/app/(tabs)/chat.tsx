import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MarkdownText } from '@/components/MarkdownText';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts';
import { type ConversationMessage, useConversation } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { getAthleteByAuthUser, getTodayCheckin } from '@khepri/supabase-client';

const WELCOME_MESSAGE: ConversationMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your Khepri AI coach. I can help you with training recommendations, answer questions about your workouts, and provide guidance based on exercise science. How can I help you today?",
  createdAt: new Date().toISOString(),
};

function buildCheckinSummaryMessage(checkin: {
  readonly sleep_quality: number | null;
  readonly energy_level: number | null;
  readonly stress_level: number | null;
  readonly overall_soreness: number | null;
  readonly available_time_minutes: number | null;
}): ConversationMessage {
  const parts: string[] = [];
  if (checkin.sleep_quality != null) parts.push(`sleep ${checkin.sleep_quality}/10`);
  if (checkin.energy_level != null) parts.push(`energy ${checkin.energy_level}/10`);
  if (checkin.stress_level != null) parts.push(`stress ${checkin.stress_level}/10`);
  if (checkin.overall_soreness != null) parts.push(`soreness ${checkin.overall_soreness}/10`);
  if (checkin.available_time_minutes != null)
    parts.push(`${checkin.available_time_minutes} min available`);

  const summary = parts.length > 0 ? parts.join(', ') : 'your wellness scores';

  return {
    id: 'checkin-context',
    role: 'assistant',
    content: `I've got your check-in: ${summary}. Ask me anything about your recommendation or today's training.`,
    createdAt: new Date().toISOString(),
  };
}

function buildDisplayMessages(
  messages: ConversationMessage[],
  checkinMessage: ConversationMessage | null
): ConversationMessage[] {
  if (messages.length > 0) {
    if (checkinMessage) return [...messages, checkinMessage];
    return messages;
  }
  if (checkinMessage) return [checkinMessage];
  return [WELCOME_MESSAGE];
}

function ChatMessage({
  message,
  colorScheme,
}: {
  message: ConversationMessage;
  colorScheme: 'light' | 'dark';
}) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
      <ThemedView
        style={[
          styles.messageBubble,
          isUser
            ? {
                backgroundColor: Colors[colorScheme].primary,
              }
            : {
                backgroundColor: Colors[colorScheme].surface,
              },
        ]}
      >
        {isUser ? (
          <ThemedText style={[styles.messageText, { color: Colors[colorScheme].textInverse }]}>
            {message.content}
          </ThemedText>
        ) : (
          <MarkdownText>{message.content}</MarkdownText>
        )}
      </ThemedView>
    </View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const { fromCheckin } = useLocalSearchParams<{ fromCheckin?: string }>();
  const { messages, isLoading, isSending, error, sendMessage, refetch } = useConversation();
  const [inputText, setInputText] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<ConversationMessage | null>(null);
  const flatListRef = useRef<FlatList<ConversationMessage>>(null);

  // Fetch today's check-in data when navigating from check-in screen
  useEffect(() => {
    if (fromCheckin !== '1' || !user?.id || !supabase) return;

    async function fetchCheckinContext() {
      if (!supabase || !user?.id) return;
      try {
        const athleteResult = await getAthleteByAuthUser(supabase, user.id);
        if (athleteResult.error || !athleteResult.data) return;

        const checkinResult = await getTodayCheckin(supabase, athleteResult.data.id);
        if (checkinResult.error || !checkinResult.data) return;

        setCheckinMessage(buildCheckinSummaryMessage(checkinResult.data));
      } catch {
        // Silently fail — the chat still works without the summary
      }
    }

    void fetchCheckinContext();
  }, [fromCheckin, user?.id]);

  // Build display messages: checkin context (if available) + conversation messages or welcome
  const displayMessages = buildDisplayMessages(messages, checkinMessage);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    // Store text before clearing to allow restore on failure
    const messageText = text;
    setInputText('');

    const success = await sendMessage(messageText);

    if (!success) {
      // Restore input text on failure so user can retry
      setInputText(messageText);
      return;
    }

    // Scroll to bottom after successful send
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  // Loading state
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading conversation..." />
      </ThemedView>
    );
  }

  // Error state
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorState
          message={error}
          action={{
            title: 'Retry',
            onPress: refetch,
            accessibilityLabel: 'Retry loading conversation',
          }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessage message={item} colorScheme={colorScheme} />}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {/* Sending indicator */}
      {isSending && (
        <View style={styles.sendingIndicator}>
          <ActivityIndicator size="small" color={Colors[colorScheme].primary} />
          <ThemedText type="caption" style={styles.sendingText}>
            Sending...
          </ThemedText>
        </View>
      )}

      {/* Suggested prompts - only show when no messages or just welcome message */}
      {messages.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <ThemedText type="caption" style={styles.suggestionsLabel}>
            Try asking:
          </ThemedText>
          <View style={styles.suggestions}>
            {[
              'What should I focus on this week?',
              'Why am I feeling tired today?',
              'Suggest a recovery workout',
            ].map((suggestion) => (
              <Pressable
                key={suggestion}
                style={[styles.suggestionChip, { backgroundColor: Colors[colorScheme].surface }]}
                onPress={() => handleSuggestionPress(suggestion)}
                accessibilityLabel={`Ask: ${suggestion}`}
                accessibilityRole="button"
              >
                <ThemedText type="caption">{suggestion}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Input area */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: Colors[colorScheme].surface,
            borderTopColor: Colors[colorScheme].border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: Colors[colorScheme].surfaceVariant,
              color: Colors[colorScheme].text,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your coach..."
          placeholderTextColor={Colors[colorScheme].textTertiary}
          multiline
          editable={!isSending}
          accessibilityLabel="Message input"
        />
        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !isSending
                  ? Colors[colorScheme].primary
                  : Colors[colorScheme].surfaceVariant,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: !inputText.trim() || isSending }}
        >
          <Ionicons
            name="send"
            size={20}
            color={
              inputText.trim() && !isSending
                ? Colors[colorScheme].textInverse
                : Colors[colorScheme].textTertiary
            }
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  sendingText: {
    opacity: 0.7,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestionsLabel: {
    marginBottom: 8,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    gap: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
