import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { type AIMessage, sendChatMessage } from '@/services/ai';
import {
  type ConversationRow,
  type MessageRole,
  type MessageRow,
  addMessage,
  archiveConversation,
  createConversation,
  getAthleteByAuthUser,
  getMessages,
  getMostRecentConversation,
} from '@khepri/supabase-client';

export type ConversationMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

export type UseConversationReturn = {
  messages: ConversationMessage[];
  conversation: ConversationRow | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<boolean>;
  startNewConversation: () => Promise<void>;
  refetch: () => Promise<void>;
};

function mapMessageToConversationMessage(message: MessageRow): ConversationMessage {
  return {
    id: message.id,
    role: message.role as MessageRole,
    content: message.content,
    createdAt: message.created_at,
  };
}

export function useConversation(): UseConversationReturn {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  // Fetch athlete ID from user
  useEffect(() => {
    async function fetchAthleteIdFromUser() {
      if (!user?.id || !supabase) {
        // Clear all state when user is not available
        setAthleteId(null);
        setConversation(null);
        setMessages([]);
        setError(null);
        setIsSending(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getAthleteByAuthUser(supabase, user.id);

        if (result.error) {
          setError(result.error.message);
          setIsLoading(false);
          return;
        }

        // Handle case where no athlete row exists for this user
        if (!result.data) {
          setAthleteId(null);
          setConversation(null);
          setMessages([]);
          setIsSending(false);
          setError('No athlete profile found for this user');
          setIsLoading(false);
          return;
        }

        setAthleteId(result.data.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athlete');
        setIsLoading(false);
      }
    }

    void fetchAthleteIdFromUser();
  }, [user?.id]);

  // Fetch conversation and messages when athlete ID is available
  const fetchConversation = useCallback(async () => {
    if (!athleteId || !supabase) {
      // Clear stale state when athlete is not available
      setConversation(null);
      setMessages([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get most recent conversation or create one
      const conversationResult = await getMostRecentConversation(supabase, athleteId);

      if (conversationResult.error) {
        setError(conversationResult.error.message);
        setIsLoading(false);
        return;
      }

      let currentConversation = conversationResult.data;

      // If no conversation exists, create one
      if (!currentConversation) {
        const createResult = await createConversation(supabase, athleteId);
        if (createResult.error) {
          setError(createResult.error.message);
          setIsLoading(false);
          return;
        }
        currentConversation = createResult.data;
      }

      if (!currentConversation) {
        setError('Failed to load or create conversation');
        setIsLoading(false);
        return;
      }

      setConversation(currentConversation);

      // Fetch messages for the conversation
      const messagesResult = await getMessages(supabase, currentConversation.id);

      if (messagesResult.error) {
        setError(messagesResult.error.message);
        setIsLoading(false);
        return;
      }

      setMessages((messagesResult.data ?? []).map(mapMessageToConversationMessage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId) {
      void fetchConversation();
    }
  }, [athleteId, fetchConversation]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!conversation || !supabase) {
        return false;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return false;
      }

      // Clear any previous error before attempting to send
      setError(null);
      setIsSending(true);

      try {
        // Add user message
        const result = await addMessage(supabase, conversation.id, {
          role: 'user',
          content: trimmedContent,
        });

        if (result.error) {
          setError(result.error.message);
          return false;
        }

        // Build message history for AI context, including the newly added user message
        const userMessage = result.data ? mapMessageToConversationMessage(result.data) : null;

        if (userMessage) {
          setMessages((prev) => [...prev, userMessage]);
        }

        // Use the current messages array plus the new user message for AI context
        const currentMessages = userMessage ? [...messages, userMessage] : messages;

        const aiMessages: AIMessage[] = currentMessages.map((msg) => ({
          role: msg.role as AIMessage['role'],
          content: msg.content,
        }));

        // Call AI service to get assistant response
        const { data: aiResponse, error: aiError } = await sendChatMessage(aiMessages);

        if (aiError) {
          // Log AI error but don't fail the send - user message was saved
          console.warn('Failed to get AI response:', aiError.message);
          return true;
        }

        if (aiResponse) {
          // Save assistant message to database
          const assistantResult = await addMessage(supabase, conversation.id, {
            role: 'assistant',
            content: aiResponse,
          });

          if (assistantResult.error) {
            console.warn('Failed to save AI response:', assistantResult.error.message);
          } else if (assistantResult.data) {
            const assistantMessage = mapMessageToConversationMessage(assistantResult.data);
            setMessages((prev) => [...prev, assistantMessage]);
          }
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [conversation, messages]
  );

  const startNewConversation = useCallback(async () => {
    if (!athleteId || !supabase) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Archive current conversation if exists
      if (conversation) {
        const archiveResult = await archiveConversation(supabase, conversation.id);

        if (archiveResult.error) {
          // Log but don't block - user can still start a new conversation
          console.warn('Failed to archive conversation:', archiveResult.error.message);
        }
      }

      // Create new conversation
      const createResult = await createConversation(supabase, athleteId);

      if (createResult.error) {
        setError(createResult.error.message);
        return;
      }

      if (createResult.data) {
        setConversation(createResult.data);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new conversation');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId, conversation]);

  const refetch = useCallback(async () => {
    await fetchConversation();
  }, [fetchConversation]);

  return {
    messages,
    conversation,
    isLoading,
    isSending,
    error,
    sendMessage,
    startNewConversation,
    refetch,
  };
}
