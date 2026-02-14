import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import { type AIMessage, sendChatMessageStream } from '@/services/ai';
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

// Maximum number of messages to include in AI context to limit payload size
const MAX_CONTEXT_MESSAGES = 20;

function updatePlaceholder(
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>,
  placeholderId: string,
  content: string
) {
  setMessages((prev) => prev.map((m) => (m.id === placeholderId ? { ...m, content } : m)));
}

function replacePlaceholder(
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>,
  placeholderId: string,
  replacement: ConversationMessage
) {
  setMessages((prev) => prev.map((m) => (m.id === placeholderId ? replacement : m)));
}

function removePlaceholder(
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>,
  placeholderId: string
) {
  setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
}

export function useConversation(): UseConversationReturn {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  // Use a ref to access latest messages without causing sendMessage to re-render
  const messagesRef = useRef<ConversationMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Counter to generate unique placeholder IDs
  const placeholderIdRef = useRef(0);

  // Save the final streamed assistant message to database and update state
  const handleStreamDone = useCallback(
    async (fullContent: string, placeholderId: string, conversationId: string) => {
      if (!fullContent || !supabase) {
        removePlaceholder(setMessages, placeholderId);
        return;
      }

      const assistantResult = await addMessage(supabase, conversationId, {
        role: 'assistant',
        content: fullContent,
      });

      if (assistantResult.error) {
        console.warn('Failed to save AI response:', assistantResult.error.message);
      } else if (assistantResult.data) {
        const savedMessage = mapMessageToConversationMessage(assistantResult.data);
        replacePlaceholder(setMessages, placeholderId, savedMessage);
      }
    },
    []
  );

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
        // Add user message to database
        const result = await addMessage(supabase, conversation.id, {
          role: 'user',
          content: trimmedContent,
        });

        if (result.error) {
          setError(result.error.message);
          setIsSending(false);
          return false;
        }

        // Build message history for AI context, including the newly added user message
        const userMessage = result.data ? mapMessageToConversationMessage(result.data) : null;

        if (userMessage) {
          setMessages((prev) => [...prev, userMessage]);
        }

        // Use the ref to get current messages plus the new user message for AI context
        // Limit to MAX_CONTEXT_MESSAGES to control payload size and token usage
        const allMessages = userMessage
          ? [...messagesRef.current, userMessage]
          : messagesRef.current;
        const contextMessages = allMessages.slice(-MAX_CONTEXT_MESSAGES);

        const aiMessages: AIMessage[] = contextMessages.map((msg) => ({
          role: msg.role as AIMessage['role'],
          content: msg.content,
        }));

        // Add a streaming placeholder for the assistant response
        placeholderIdRef.current += 1;
        const placeholderId = `streaming-${placeholderIdRef.current}`;
        const placeholderMessage: ConversationMessage = {
          id: placeholderId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, placeholderMessage]);

        // Stream AI response, updating the placeholder progressively
        await new Promise<void>((resolve) => {
          sendChatMessageStream(aiMessages, undefined, {
            onDelta: (text) => updatePlaceholder(setMessages, placeholderId, text),
            onDone: async (fullContent) => {
              await handleStreamDone(fullContent, placeholderId, conversation.id);
              setIsSending(false);
              resolve();
            },
            onError: (streamError) => {
              console.warn('Failed to get AI response:', streamError.message);
              removePlaceholder(setMessages, placeholderId);
              setIsSending(false);
              resolve();
            },
          });
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        setIsSending(false);
        return false;
      }
    },
    [conversation, handleStreamDone]
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
