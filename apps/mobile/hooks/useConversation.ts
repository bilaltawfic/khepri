import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type ConversationRow,
  type MessageRole,
  type MessageRow,
  addMessage,
  createConversation,
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
  sendMessage: (content: string) => Promise<void>;
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
    async function fetchAthleteId() {
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
        const { data, error: fetchError } = await supabase
          .from('athletes')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (fetchError) {
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }

        setAthleteId(data?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athlete');
        setIsLoading(false);
      }
    }

    void fetchAthleteId();
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
    async (content: string) => {
      if (!conversation || !supabase) {
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
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
          return;
        }

        if (result.data) {
          setMessages((prev) => [...prev, mapMessageToConversationMessage(result.data!)]);
        }

        // TODO: Call AI Edge Function to get assistant response
        // For now, we just save the user message
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [conversation]
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
        const archiveResult = await supabase
          .from('conversations')
          .update({ is_archived: true })
          .eq('id', conversation.id);

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
