# Phase 2 Workstream C: Real Claude Integration

## Goal

Replace mock AI responses with real Claude API calls for check-in recommendations and coach chat. Store conversation history in Supabase for context continuity.

---

## Current State

- `apps/mobile/hooks/useCheckin.ts` - Uses `generateMockRecommendation()` function
- `apps/mobile/app/(tabs)/chat.tsx` - Uses `PLACEHOLDER_MESSAGES` array, inputs disabled
- `packages/ai-client/` - Exists with context builder and prompts, but not wired to mobile
- No conversation storage in Supabase yet
- Supabase Edge Functions not yet created

---

## Architecture Decision

**Direct API calls vs Edge Functions?**

For Phase 2, we'll use **Supabase Edge Functions** to:
1. Keep API keys secure (not in mobile app bundle)
2. Enable rate limiting and usage tracking
3. Prepare for Phase 4's AI orchestration layer

The mobile app calls Edge Functions, which call Claude API.

---

## Tasks (5 PRs)

### P2-C-01: Create conversations table in Supabase
**Branch:** `feat/p2-c-01-conversations-schema`

**Create files:**
- `supabase/migrations/002_conversations.sql` - Conversations and messages tables

**Schema:**
```sql
-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title TEXT, -- Optional summary/title
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- For assistant messages, track token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER
);

-- Indexes for common queries
CREATE INDEX idx_conversations_athlete ON conversations(athlete_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS uses EXISTS to join via athletes.auth_user_id since athlete_id references athletes.id
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = conversations.athlete_id
    AND athletes.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM athletes WHERE athletes.id = conversations.athlete_id
    AND athletes.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    JOIN athletes a ON a.id = c.athlete_id
    WHERE c.id = messages.conversation_id AND a.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c
    JOIN athletes a ON a.id = c.athlete_id
    WHERE c.id = messages.conversation_id AND a.auth_user_id = auth.uid()
  ));
```

**Test:** Migration runs, RLS works correctly

---

### P2-C-02: Add conversations queries to supabase-client
**Branch:** `feat/p2-c-02-conversations-queries`

**Create files:**
- `packages/supabase-client/src/queries/conversations.ts`
- `packages/supabase-client/src/__tests__/queries/conversations.test.ts`

**Exports:**
```typescript
// Conversation operations
export async function getConversations(
  client: SupabaseClient,
  athleteId: string,
  options?: { limit?: number; includeArchived?: boolean }
): Promise<Conversation[]>;

export async function getConversation(
  client: SupabaseClient,
  conversationId: string
): Promise<Conversation | null>;

export async function createConversation(
  client: SupabaseClient,
  athleteId: string,
  title?: string
): Promise<Conversation>;

export async function archiveConversation(
  client: SupabaseClient,
  conversationId: string
): Promise<void>;

// Message operations
export async function getMessages(
  client: SupabaseClient,
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<Message[]>;

export async function addMessage(
  client: SupabaseClient,
  conversationId: string,
  message: NewMessage
): Promise<Message>;

export async function updateConversationLastMessage(
  client: SupabaseClient,
  conversationId: string
): Promise<void>;
```

**Test:** CRUD operations work, pagination works, RLS enforced

---

### P2-C-03: Create ai-coach Edge Function
**Branch:** `feat/p2-c-03-ai-coach-edge-function`

**Create files:**
- `supabase/functions/ai-coach/index.ts` - Main handler
- `supabase/functions/ai-coach/prompts.ts` - System prompts

**Edge Function pattern:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

serve(async (req) => {
  // Verify JWT from Supabase auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, context } = await req.json();

  // Build system prompt with athlete context
  const systemPrompt = buildSystemPrompt(context);

  // Filter out system messages - Anthropic API only accepts 'user'/'assistant' roles
  // System content should be in the top-level system field
  const systemMessages = (messages ?? []).filter((m: any) => m.role === 'system');
  const chatMessages = (messages ?? []).filter((m: any) => m.role !== 'system');

  // Append any stored system messages to the system prompt
  const additionalSystemContent = systemMessages
    .map((m: any) => m.content)
    .filter((c: string) => c?.trim())
    .join('\n\n');

  const finalSystemPrompt = additionalSystemContent
    ? `${systemPrompt}\n\n${additionalSystemContent}`
    : systemPrompt;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: finalSystemPrompt,
    messages: chatMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  });

  return new Response(JSON.stringify({
    content: response.content[0].text,
    usage: response.usage,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function buildSystemPrompt(context: AthleteContext): string {
  return `You are Khepri, an AI endurance sports coach...

Current athlete context:
- Name: ${context.name}
- Current CTL: ${context.ctl ?? 'Unknown'}
- Recent check-in: ${JSON.stringify(context.recentCheckin)}
- Goals: ${context.goals.map(g => g.title).join(', ')}
`;
}
```

**Test:** Function deploys, responds to authenticated requests

---

### P2-C-04: Wire useCheckin to call real AI
**Branch:** `feat/p2-c-04-checkin-real-ai`

**Modify files:**
- `apps/mobile/hooks/useCheckin.ts` - Call Edge Function instead of mock

**Create files:**
- `apps/mobile/services/ai.ts` - AI service wrapper
- `apps/mobile/services/__tests__/ai.test.ts`

**AI service pattern:**
```typescript
import { supabase } from '@/lib/supabase';

type AIRecommendationRequest = {
  checkinData: CheckinFormData;
  athleteContext?: {
    recentActivities?: Activity[];
    goals?: Goal[];
    constraints?: Constraint[];
  };
};

export async function getCheckinRecommendation(
  request: AIRecommendationRequest
): Promise<AIRecommendation> {
  if (!supabase) {
    // Dev mode: return mock recommendation
    return generateMockRecommendation(request.checkinData);
  }

  const { data, error } = await supabase.functions.invoke('ai-coach', {
    body: {
      messages: [
        {
          role: 'user',
          content: formatCheckinPrompt(request),
        },
      ],
      context: request.athleteContext,
    },
  });

  if (error) throw error;

  return parseAIResponse(data.content);
}

function formatCheckinPrompt(request: AIRecommendationRequest): string {
  const { checkinData } = request;
  return `Based on my daily check-in:
- Sleep: ${checkinData.sleepHours}h, quality ${checkinData.sleepQuality}/10
- Energy: ${checkinData.energyLevel}/10
- Stress: ${checkinData.stressLevel}/10
- Soreness: ${checkinData.overallSoreness}/10
- Available time: ${checkinData.availableTimeMinutes} minutes

What workout do you recommend for today?`;
}
```

**Changes to useCheckin:**
1. Replace `generateMockRecommendation()` with `getCheckinRecommendation()`
2. Fetch athlete context before calling AI
3. Handle loading/error states for AI call
4. Fall back to mock if Edge Function unavailable

**Test:** Mock Edge Function response, verify recommendation parsed correctly

---

### P2-C-05: Enable real chat with conversation persistence
**Branch:** `feat/p2-c-05-chat-real-ai`

**Modify files:**
- `apps/mobile/app/(tabs)/chat.tsx` - Enable real chat functionality

**Create files:**
- `apps/mobile/hooks/useConversation.ts` - Manage conversation state
- `apps/mobile/hooks/__tests__/useConversation.test.ts`

**useConversation pattern:**
```typescript
export function useConversation() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load or create conversation on mount
  useEffect(() => {
    async function initConversation() {
      // Get most recent conversation or create new one
    }
    initConversation();
  }, [user?.id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversation || !supabase) return;

    setIsSending(true);

    // Optimistically add user message
    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Save user message
      await addMessage(supabase, conversation.id, userMessage);

      // Call AI
      const response = await supabase.functions.invoke('ai-coach', {
        body: {
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: await getAthleteContext(),
        },
      });

      // Save and display assistant message
      const assistantMessage = { role: 'assistant', content: response.data.content };
      await addMessage(supabase, conversation.id, assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Handle error, maybe remove optimistic message
    } finally {
      setIsSending(false);
    }
  }, [conversation, messages]);

  const startNewConversation = useCallback(async () => {
    // Archive current and create new
  }, []);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    startNewConversation,
  };
}
```

**Chat screen changes:**
1. Remove `editable={false}` from TextInput
2. Wire send button to `sendMessage()`
3. Show loading indicator while sending
4. Auto-scroll to bottom on new message
5. Load conversation history on mount
6. Wire suggestion chips to input

**Test:** Messages send, responses display, history persists

---

## Dependencies

```
P2-C-01 ─────→ P2-C-02 ─────→ P2-C-05 (needs conversation storage)
                    │
P2-C-03 ────────────┴────────→ P2-C-04 (needs Edge Function)
                              P2-C-05 (needs Edge Function)
```

- P2-C-01 and P2-C-03 can run in parallel (schema and Edge Function)
- P2-C-02 depends on P2-C-01 (needs tables to exist)
- P2-C-04 depends on P2-C-03 (needs Edge Function)
- P2-C-05 depends on P2-C-02 and P2-C-03

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Check-in hook | `apps/mobile/hooks/useCheckin.ts` |
| Chat screen | `apps/mobile/app/(tabs)/chat.tsx` |
| AI client package | `packages/ai-client/` |
| Supabase client singleton | `apps/mobile/lib/supabase.ts` |
| Existing prompts | `packages/ai-client/src/prompts/` |

---

## Testing Approach

- Unit tests with mocked Edge Function responses
- Test conversation state management
- Test error handling (network failures, API errors)
- Test optimistic updates and rollback
- No real Claude API calls in tests

### TODO: Edge Function Unit Tests

**Deferred:** Add Deno tests for Edge Functions (`supabase/functions/ai-coach/`).

Currently, Edge Functions have no unit test coverage because:
- They run on Deno runtime, not Node.js/Jest
- Requires separate Deno test setup (`deno test`)

**Future task:** Create `supabase/functions/ai-coach/prompts.test.ts` to test:
- `buildSystemPrompt()` with various athlete contexts
- TSB description logic
- Context truncation/size limits

This can be addressed in a dedicated "Edge Function testing infrastructure" task.

---

## Environment Variables

Edge Function needs:
- `ANTHROPIC_API_KEY` - Claude API key

Set via Supabase dashboard or CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Verification

After all 5 PRs merged:
1. Complete daily check-in → get real AI recommendation
2. Open chat → previous messages load
3. Send message → get real AI response
4. Close and reopen app → conversation history persists
5. Check Supabase → messages stored correctly
6. Test without API key → graceful fallback to mock
