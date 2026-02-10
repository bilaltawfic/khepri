import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { type ConversationMessage, useConversation } from '@/hooks';

const WELCOME_MESSAGE: ConversationMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your Khepri AI coach. I can help you with training recommendations, answer questions about your workouts, and provide guidance based on exercise science. How can I help you today?",
  createdAt: new Date().toISOString(),
};

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
        <ThemedText
          style={[styles.messageText, isUser && { color: Colors[colorScheme].textInverse }]}
        >
          {message.content}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { messages, isLoading, isSending, error, sendMessage, refetch } = useConversation();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ConversationMessage>>(null);

  // Show welcome message if no messages yet
  const displayMessages = messages.length > 0 ? messages : [WELCOME_MESSAGE];

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
      <ScreenContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          <ThemedText style={styles.loadingText}>Loading conversation...</ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button title="Retry" onPress={refetch} accessibilityLabel="Retry loading conversation" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      {/* Header info */}
      <ThemedView
        style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
      >
        <Ionicons name="information-circle-outline" size={20} color={Colors[colorScheme].icon} />
        <ThemedText type="caption" style={styles.infoText}>
          Chat with your AI coach about training, recovery, and goals. Responses will be
          personalized based on your data.
        </ThemedText>
      </ThemedView>

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
              backgroundColor: inputText.trim() && !isSending
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
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
