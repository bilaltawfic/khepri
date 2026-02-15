# P7-A-04: Conversation History Screen

## Goal

Build a conversation history screen in the mobile app that lets athletes browse, search, and resume past coaching conversations. Conversations already persist in Supabase - this task exposes them in the UI and wires the Chat tab to support loading historical conversations.

## Dependencies

- ✅ P2-C-02: Conversations queries in supabase-client (complete)
- ✅ P2-C-05: Chat with conversation persistence (complete)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/app/chat/history.tsx` | Create | Conversation list screen |
| `apps/mobile/hooks/useConversationHistory.ts` | Create | Data fetching hook |
| `apps/mobile/hooks/useConversationHistory.test.ts` | Create | Hook tests |
| `apps/mobile/app/chat/history.test.tsx` | Create | Screen tests |
| `apps/mobile/app/(tabs)/chat.tsx` | Modify | Add "History" button to header |

## Implementation Steps

### Step 1: Create `useConversationHistory` Hook

```typescript
interface ConversationSummary {
  readonly id: string;
  readonly title: string | null;
  readonly lastMessageAt: string;
  readonly messagePreview: string;  // First ~100 chars of last message
  readonly isArchived: boolean;
}

interface UseConversationHistoryReturn {
  readonly conversations: readonly ConversationSummary[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly archiveConversation: (id: string) => Promise<void>;
}

function useConversationHistory(): UseConversationHistoryReturn;
```

**Logic:**
1. Fetch conversations using `getConversations()` from supabase-client
2. For each conversation, fetch the most recent message for preview
3. Sort by `last_message_at` descending (most recent first)
4. Provide archive/unarchive functionality
5. Handle loading and error states

### Step 2: Create Conversation History Screen (`chat/history.tsx`)

**UI Layout:**
```
┌─────────────────────────────────────┐
│ ← Conversations                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Training advice for Sunday      │ │
│ │ "Based on your check-in, I'd..." │ │
│ │ Today, 9:15 AM                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Recovery protocol question       │ │
│ │ "After yesterday's hard ride..." │ │
│ │ Yesterday, 3:22 PM               │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Race prep discussion             │ │
│ │ "For your upcoming half..."     │ │
│ │ Feb 12, 8:45 AM                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Empty state: "No conversations     │
│  yet. Start chatting with your      │
│  coach!"]                           │
└─────────────────────────────────────┘
```

**Features:**
- FlatList with conversation cards
- Pull-to-refresh
- Tap card → navigate to chat with conversation loaded
- Swipe to archive (or long-press menu)
- Empty state when no conversations exist
- Relative time formatting ("Today", "Yesterday", "Feb 12")

**Accessibility:**
- `accessibilityRole="button"` on conversation cards
- `accessibilityState={{ selected: false }}` for cards
- `accessibilityLabel` with conversation title and time

### Step 3: Add History Button to Chat Tab

In `apps/mobile/app/(tabs)/chat.tsx`, add a header button:
```typescript
<Stack.Screen
  options={{
    headerRight: () => (
      <Pressable
        onPress={() => router.push('/chat/history')}
        accessibilityRole="button"
        accessibilityLabel="View conversation history"
      >
        <Ionicons name="time-outline" size={24} />
      </Pressable>
    ),
  }}
/>
```

### Step 4: Wire Conversation Loading

When user taps a conversation in history:
1. Navigate to chat screen with `conversationId` param
2. Chat screen loads messages for that conversation
3. User can continue the conversation

This likely requires modifying the existing `useConversation` hook to accept an optional `conversationId` parameter.

### Step 5: Write Tests

**`useConversationHistory.test.ts`:**
- Fetches conversations on mount
- Returns loading state while fetching
- Returns conversations sorted by most recent
- Handles empty conversation list
- Handles fetch errors gracefully
- Archive function calls archiveConversation query
- Refresh reloads conversations

**`history.test.tsx`:**
- Renders loading state
- Renders conversation list
- Renders empty state when no conversations
- Tapping conversation navigates to chat
- Pull-to-refresh calls refresh
- Shows relative timestamps correctly

## Testing Requirements

- Mock supabase-client queries for all tests
- Test accessibility attributes on interactive elements
- Test empty state and error state rendering
- Test navigation behavior (mock router)

## Verification

1. Run `pnpm test` - all tests pass
2. Run `pnpm lint` - no lint errors
3. Open Chat tab → tap history icon → see conversation list
4. Tap a conversation → loads in chat with full history
5. Swipe/long-press → archive works
6. Empty state shows when no conversations

## Key Considerations

- **Performance**: Only fetch message preview (not full message list) for the history screen
- **Existing hooks**: Check if `useConversation` hook already supports loading by ID
- **Navigation**: Use Expo Router's `router.push('/chat/history')` pattern
- **Accessibility**: Follow Copilot review patterns - `accessibilityRole` and `accessibilityState` on all interactive elements
- **Readonly props**: Mark component props as `readonly`
