import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { type ConversationSummary, useConversationHistory } from '@/hooks';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (date >= todayStart) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  if (date >= yesterdayStart) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ConversationCard({
  conversation,
  colorScheme,
  onPress,
  onArchive,
}: {
  readonly conversation: ConversationSummary;
  readonly colorScheme: 'light' | 'dark';
  readonly onPress: () => void;
  readonly onArchive: () => void;
}) {
  const handleLongPress = () => {
    Alert.alert('Conversation', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: onArchive },
    ]);
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}
      onPress={onPress}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${conversation.title ?? 'Untitled conversation'}, ${formatRelativeTime(conversation.lastMessageAt)}`}
      accessibilityState={{ selected: false }}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={1}>
            {conversation.title ?? 'Untitled conversation'}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={Colors[colorScheme].iconSecondary} />
        </View>
        {conversation.messagePreview !== '' && (
          <ThemedText
            type="caption"
            style={[styles.preview, { color: Colors[colorScheme].textSecondary }]}
            numberOfLines={2}
          >
            {conversation.messagePreview}
          </ThemedText>
        )}
        <ThemedText
          type="caption"
          style={[styles.timestamp, { color: Colors[colorScheme].textTertiary }]}
        >
          {formatRelativeTime(conversation.lastMessageAt)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function EmptyState({ colorScheme }: { readonly colorScheme: 'light' | 'dark' }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={Colors[colorScheme].iconSecondary} />
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No conversations yet
      </ThemedText>
      <ThemedText
        type="caption"
        style={[styles.emptyText, { color: Colors[colorScheme].textSecondary }]}
      >
        Start chatting with your coach!
      </ThemedText>
    </View>
  );
}

export default function ConversationHistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { conversations, isLoading, isRefreshing, error, refresh, archiveConversation } =
    useConversationHistory();

  const handleConversationPress = useCallback(
    (_conversationId: string) => {
      router.back();
    },
    [router]
  );

  const handleArchive = useCallback(
    (conversationId: string) => {
      void archiveConversation(conversationId);
    },
    [archiveConversation]
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading conversations..." />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorState
          message={error}
          action={{
            title: 'Retry',
            onPress: refresh,
            accessibilityLabel: 'Retry loading conversations',
          }}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            colorScheme={colorScheme}
            onPress={() => handleConversationPress(item.id)}
            onArchive={() => handleArchive(item.id)}
          />
        )}
        contentContainerStyle={[styles.listContent, conversations.length === 0 && styles.emptyList]}
        ListEmptyComponent={<EmptyState colorScheme={colorScheme} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors[colorScheme].primary}
          />
        }
        accessibilityLabel="Conversation history"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
  },
  preview: {
    marginTop: 4,
    lineHeight: 20,
  },
  timestamp: {
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
