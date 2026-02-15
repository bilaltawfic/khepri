import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
import {
  type ConversationRow,
  archiveConversation as archiveConversationQuery,
  getAthleteByAuthUser,
  getConversations,
  getMessages,
} from '@khepri/supabase-client';

const PREVIEW_MAX_LENGTH = 100;

export type ConversationSummary = {
  readonly id: string;
  readonly title: string | null;
  readonly lastMessageAt: string;
  readonly messagePreview: string;
  readonly isArchived: boolean;
};

export type UseConversationHistoryReturn = {
  readonly conversations: readonly ConversationSummary[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly archiveConversation: (id: string) => Promise<void>;
};

function truncatePreview(content: string): string {
  if (content.length <= PREVIEW_MAX_LENGTH) {
    return content;
  }
  return `${content.slice(0, PREVIEW_MAX_LENGTH)}...`;
}

async function fetchPreviewForConversation(
  conversation: ConversationRow
): Promise<ConversationSummary> {
  const summary: ConversationSummary = {
    id: conversation.id,
    title: conversation.title,
    lastMessageAt: conversation.last_message_at,
    messagePreview: '',
    isArchived: conversation.is_archived,
  };

  if (!supabase) {
    return summary;
  }

  // Fetch the most recent message for this conversation (limit 1, ordered ASC so we need to get the last)
  const messagesResult = await getMessages(supabase, conversation.id);

  if (messagesResult.error || !messagesResult.data || messagesResult.data.length === 0) {
    return summary;
  }

  // Messages are ordered ASC by created_at, so last item is the most recent
  const lastMessage = messagesResult.data[messagesResult.data.length - 1];
  if (!lastMessage) {
    return summary;
  }

  return {
    ...summary,
    messagePreview: truncatePreview(lastMessage.content),
  };
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<readonly ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  // Fetch athlete ID from user
  useEffect(() => {
    let isCurrent = true;

    async function fetchAthleteId() {
      if (!user?.id || !supabase) {
        setAthleteId(null);
        setConversations([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getAthleteByAuthUser(supabase, user.id);

        if (!isCurrent) return;

        if (result.error) {
          setError(result.error.message);
          setIsLoading(false);
          return;
        }

        if (!result.data) {
          setAthleteId(null);
          setConversations([]);
          setError('No athlete profile found');
          setIsLoading(false);
          return;
        }

        setAthleteId(result.data.id);
      } catch (err) {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : 'Failed to load athlete');
        setIsLoading(false);
      }
    }

    void fetchAthleteId();

    return () => {
      isCurrent = false;
    };
  }, [user?.id]);

  // Fetch conversations when athlete ID is available
  const fetchConversations = useCallback(async () => {
    if (!athleteId || !supabase) {
      setConversations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getConversations(supabase, athleteId);

      if (result.error) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      const conversationRows = result.data ?? [];

      // Fetch preview for each conversation in parallel
      const summaries = await Promise.all(conversationRows.map(fetchPreviewForConversation));

      setConversations(summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId) {
      void fetchConversations();
    }
  }, [athleteId, fetchConversations]);

  const refresh = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    if (!supabase) return;

    const result = await archiveConversationQuery(supabase, conversationId);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Remove archived conversation from the list
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refresh,
    archiveConversation,
  };
}
