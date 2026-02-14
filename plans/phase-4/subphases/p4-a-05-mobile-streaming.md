# P4-A-05: Consume Streaming Responses in Mobile App

## Goal

Update the mobile chat to consume SSE streaming responses from the AI orchestrator, so users see the AI's response appear progressively (word by word) instead of waiting for the full response. The backend already supports streaming — this wires the mobile client to use it.

## Dependencies

- ✅ P4-A-03: Streaming response support in ai-orchestrator
- ✅ P2-C-05: Chat with conversation persistence

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/services/ai.ts` | Modify | Add streaming fetch + SSE parser |
| `apps/mobile/hooks/useConversation.ts` | Modify | Progressive message updates |
| `apps/mobile/services/ai.test.ts` | Modify | Tests for streaming |
| `apps/mobile/hooks/useConversation.test.ts` | Modify | Tests for progressive updates |

## Implementation Steps

### Step 1: Add SSE Parser Utility

In `apps/mobile/services/ai.ts`, add a simple SSE event parser:

```typescript
interface SSEEvent {
  readonly type: 'tool_calls' | 'content_delta' | 'usage' | 'done';
  readonly data: unknown;
}

function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith('data: ')) return null;
  const json = line.slice(6);
  try {
    return JSON.parse(json) as SSEEvent;
  } catch {
    return null;
  }
}
```

### Step 2: Add Streaming Chat Function

```typescript
export async function sendChatMessageStream(
  messages: AIMessage[],
  context?: AIContext,
  onDelta: (text: string) => void,
  onDone: (fullContent: string) => void,
  onError: (error: Error) => void,
): Promise<void> {
  const supabaseUrl = getSupabaseUrl();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/ai-orchestrator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, context, stream: true }),
    }
  );

  if (!response.ok || !response.body) {
    onError(new Error(`Stream request failed: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const event = parseSSELine(line);
      if (!event) continue;

      if (event.type === 'content_delta') {
        const text = (event.data as { text: string }).text;
        fullContent += text;
        onDelta(fullContent);
      } else if (event.type === 'done') {
        onDone(fullContent);
        return;
      }
    }
  }

  onDone(fullContent);
}
```

### Step 3: Update useConversation Hook

Modify the `sendMessage` function to use streaming:

```typescript
// Add a streaming assistant message placeholder
const placeholderMessage: Message = {
  id: tempId,
  role: 'assistant',
  content: '',
  created_at: new Date().toISOString(),
};
setMessages(prev => [...prev, placeholderMessage]);

await sendChatMessageStream(
  aiMessages,
  context,
  // onDelta: update the placeholder message progressively
  (partialContent) => {
    setMessages(prev =>
      prev.map(m => m.id === tempId ? { ...m, content: partialContent } : m)
    );
  },
  // onDone: save final message to database
  async (fullContent) => {
    await addMessage(supabase, conversationId, {
      role: 'assistant',
      content: fullContent,
    });
    // Replace placeholder with real message
    await refreshMessages();
  },
  // onError
  (error) => {
    setError(error.message);
    setMessages(prev => prev.filter(m => m.id !== tempId));
  },
);
```

### Step 4: Write Tests

**`ai.test.ts`:**
- Tests SSE line parsing (valid events, malformed data, empty lines)
- Tests streaming fetch with mock ReadableStream
- Tests content_delta accumulation
- Tests done event triggers completion callback
- Tests error handling for failed requests
- Tests network error during stream

**`useConversation.test.ts`:**
- Tests placeholder message appears immediately
- Tests progressive content updates
- Tests final message saved to database on done
- Tests placeholder removed on error
- Tests fallback to non-streaming if stream fails

## Testing Requirements

- Mock `fetch` and `ReadableStream` for streaming tests
- Verify progressive state updates during streaming
- Verify final message persistence
- Test error recovery (stream drops mid-response)

## Verification

1. `pnpm test` passes
2. In chat, send a message — response appears word-by-word
3. Final message is saved to database correctly
4. Network error during stream shows error state

## Key Considerations

- **Fallback**: If streaming fails, could fall back to non-streaming `sendChatMessage`
- **React Native compatibility**: `ReadableStream` support varies — may need polyfill
- **Database save**: Only save the final complete message, not intermediate deltas
- **SSE format**: Backend sends `data: {json}\n\n` format per `stream.ts`
- **Token counting**: `usage` event provides token counts for the final message
- **Scope**: Only the chat tab gets streaming — check-in stays non-streaming
