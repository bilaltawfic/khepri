import { StyleSheet, View, TextInput, Pressable, FlatList } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

// Placeholder messages for the chat UI
const PLACEHOLDER_MESSAGES = [
  {
    id: '1',
    role: 'assistant' as const,
    content:
      "Hi! I'm your Khepri AI coach. I can help you with training recommendations, answer questions about your workouts, and provide guidance based on exercise science. How can I help you today?",
  },
];

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function ChatMessage({
  message,
  colorScheme,
}: {
  message: Message;
  colorScheme: 'light' | 'dark';
}) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[styles.messageContainer, isUser && styles.userMessageContainer]}
    >
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
          style={[
            styles.messageText,
            isUser && { color: Colors[colorScheme].textInverse },
          ]}
        >
          {message.content}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer style={styles.container}>
      {/* Header info */}
      <ThemedView
        style={[
          styles.infoCard,
          { backgroundColor: Colors[colorScheme].surfaceVariant },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={Colors[colorScheme].icon}
        />
        <ThemedText type="caption" style={styles.infoText}>
          Chat with your AI coach about training, recovery, and goals. Responses
          will be personalized based on your data.
        </ThemedText>
      </ThemedView>

      {/* Messages */}
      <FlatList
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        data={PLACEHOLDER_MESSAGES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage message={item} colorScheme={colorScheme} />
        )}
      />

      {/* Suggested prompts */}
      <View style={styles.suggestionsContainer}>
        <ThemedText type="caption" style={styles.suggestionsLabel}>
          Try asking:
        </ThemedText>
        <View style={styles.suggestions}>
          {[
            'What should I focus on this week?',
            "Why am I feeling tired today?",
            'Suggest a recovery workout',
          ].map((suggestion) => (
            <Pressable
              key={suggestion}
              style={[
                styles.suggestionChip,
                { backgroundColor: Colors[colorScheme].surface },
              ]}
              onPress={() => {
                // TODO: Populate input with suggestion
              }}
              accessibilityLabel={`Ask: ${suggestion}`}
              accessibilityRole="button"
            >
              <ThemedText type="caption">{suggestion}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

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
          placeholder="Ask your coach..."
          placeholderTextColor={Colors[colorScheme].textTertiary}
          multiline
          editable={false}
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: Colors[colorScheme].primary },
          ]}
          accessibilityLabel="Send message"
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={20}
            color={Colors[colorScheme].textInverse}
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
