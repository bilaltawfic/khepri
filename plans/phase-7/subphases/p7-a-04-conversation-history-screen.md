# P7-A-04: Build Conversation History Screen

## Goal

Add a conversation history screen accessible from the Coach (chat) tab that lists past conversations, allows navigating to view them, and supports archiving. This gives athletes access to their full coaching history.

## Dependencies

- ✅ P2-C-02: Conversation queries in supabase-client - #38

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `apps/mobile/app/chat/_layout.tsx` | Stack navigator for chat + history screens |
| Create | `apps/mobile/app/chat/index.tsx` | Move chat screen into stack (re-export from current) |
| Create | `apps/mobile/app/chat/history.tsx` | Conversation history list screen |
| Modify | `apps/mobile/app/(tabs)/chat.tsx` | Add "History" button in header, refactor to use chat stack |
| Modify | `apps/mobile/app/(tabs)/_layout.tsx` | Update Coach tab to point to chat stack |
| Create | `apps/mobile/hooks/useConversationHistory.ts` | Hook for fetching conversation list |
| Create | `apps/mobile/app/chat/__tests__/history.test.tsx` | Tests for history screen |
| Create | `apps/mobile/hooks/__tests__/useConversationHistory.test.ts` | Tests for history hook |

## Implementation Steps

### Step 1: Create useConversationHistory Hook

**File:** `apps/mobile/hooks/useConversationHistory.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { getConversations, archiveConversation, deleteConversation } from '@khepri/supabase-client';
import type { ConversationRow } from '@khepri/supabase-client';
import { useAuth } from '../contexts/AuthContext';

export type UseConversationHistoryReturn = {
  conversations: ConversationRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  archive: (conversationId: string) => Promise<boolean>;
  remove: (conversationId: string) => Promise<boolean>;
};

// Fetch conversations list with:
// - getConversations(client, athleteId, { limit: 50, includeArchived: false })
// - Pull-to-refresh via refetch()
// - Archive support (soft-delete)
// - Delete support (hard-delete, with confirmation)
// - Loading and error states
```

### Step 2: Create Chat Stack Layout

**File:** `apps/mobile/app/chat/_layout.tsx`

Follow the pattern from `apps/mobile/app/checkin/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function ChatLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors[colorScheme].background },
        headerTintColor: Colors[colorScheme].text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} // Tab header handles this
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Conversation History',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
```

### Step 3: Move Chat Screen into Stack

**File:** `apps/mobile/app/chat/index.tsx`

Move the existing chat screen content from `apps/mobile/app/(tabs)/chat.tsx` into `apps/mobile/app/chat/index.tsx`. The tabs layout will reference the chat directory instead of the single file.

Add a history button to the chat screen header:

```typescript
// In the chat screen, add a header button
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Navigate to history
const handleHistoryPress = () => {
  router.push('/chat/history');
};

// Render button in header area or as a floating action
<Pressable
  onPress={handleHistoryPress}
  accessibilityRole="button"
  accessibilityLabel="View conversation history"
>
  <Ionicons name="time-outline" size={24} color={Colors[colorScheme].icon} />
</Pressable>
```

### Step 4: Build History Screen

**File:** `apps/mobile/app/chat/history.tsx`

Follow the pattern from `apps/mobile/app/checkin/history.tsx`:

```typescript
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { useConversationHistory } from '../../hooks/useConversationHistory';

// Key features:
// 1. FlatList with conversation items
// 2. Each item shows: title (or "Conversation from {date}"), last_message_at formatted
// 3. Tap navigates to that conversation in chat view
// 4. Swipe-to-archive or long-press menu for archive/delete
// 5. Pull-to-refresh
// 6. Empty state: "No conversations yet" with icon + "Start a conversation" button
// 7. Loading state with ActivityIndicator
```

**Conversation Item Component:**

```typescript
type ConversationItemProps = {
  readonly item: ConversationRow;
  readonly colorScheme: 'light' | 'dark';
  readonly onPress: () => void;
  readonly onArchive: () => void;
};

function ConversationItem({ item, colorScheme, onPress, onArchive }: ConversationItemProps) {
  const title = item.title ?? `Conversation from ${formatDate(item.started_at)}`;
  const timeAgo = formatRelativeTime(item.last_message_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      <ThemedView style={[styles.item, { backgroundColor: Colors[colorScheme].surface }]}>
        <View style={styles.itemHeader}>
          <ThemedText numberOfLines={1} style={styles.title}>{title}</ThemedText>
          <ThemedText type="caption">{timeAgo}</ThemedText>
        </View>
        <Pressable
          onPress={onArchive}
          accessibilityRole="button"
          accessibilityLabel="Archive conversation"
        >
          <Ionicons name="archive-outline" size={20} color={Colors[colorScheme].iconSecondary} />
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}
```

**Empty State:**

```typescript
function renderEmptyState(colorScheme: 'light' | 'dark') {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={Colors[colorScheme].iconSecondary} />
      </View>
      <ThemedText type="subtitle">No conversations yet</ThemedText>
      <ThemedText type="caption" style={styles.emptyDescription}>
        Start chatting with your AI coach to see your conversation history here.
      </ThemedText>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Start a conversation"
        style={[styles.startButton, { backgroundColor: Colors[colorScheme].primary }]}
      >
        <ThemedText style={styles.startButtonText}>Start a conversation</ThemedText>
      </Pressable>
    </View>
  );
}
```

### Step 5: Update Tab Layout

**File:** `apps/mobile/app/(tabs)/_layout.tsx`

If needed, update the Coach tab to point to the chat stack directory. Expo Router may handle this automatically if the chat directory contains an `_layout.tsx` and `index.tsx`.

### Step 6: Write Tests

**File:** `apps/mobile/app/chat/__tests__/history.test.tsx`

```typescript
// Test cases:
// 1. Renders loading state while fetching
// 2. Renders empty state when no conversations
// 3. Renders conversation list items
// 4. Displays conversation title or fallback date
// 5. Displays relative time for last_message_at
// 6. Navigates to conversation on press
// 7. Archive button calls archive function
// 8. Pull-to-refresh triggers refetch
// 9. Error state displays error message
```

**File:** `apps/mobile/hooks/__tests__/useConversationHistory.test.ts`

```typescript
// Test cases:
// 1. Fetches conversations on mount
// 2. Returns loading state during fetch
// 3. Returns conversations sorted by last_message_at
// 4. refetch() re-fetches conversations
// 5. archive() calls archiveConversation and removes from list
// 6. remove() calls deleteConversation and removes from list
// 7. Handles fetch error gracefully
// 8. Returns empty array when no conversations
```

## Code Patterns to Follow

- Use `readonly` on component props
- Add `accessibilityRole` and `accessibilityLabel` to all interactive elements
- Use `Colors[colorScheme]` for theme-aware styling
- Use `ThemedView` and `ThemedText` components
- Use `numberOfLines={1}` with text truncation
- Shadow styles: `shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2`
- Card border radius: `16`
- Use `.js` import extensions in test files for ESM packages

## Testing Requirements

- All new tests pass: `pnpm test`
- Existing chat tests still pass
- Lint passes: `pnpm lint`
- Build passes: `pnpm build`

## Verification

- [ ] History screen renders conversation list
- [ ] Tapping a conversation navigates to view it
- [ ] Archive button removes conversation from list
- [ ] Pull-to-refresh reloads the list
- [ ] Empty state renders when no conversations
- [ ] History button accessible from chat screen
- [ ] Accessibility labels on all interactive elements
- [ ] All tests pass
