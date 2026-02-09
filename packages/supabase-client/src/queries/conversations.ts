/**
 * Conversation and message query functions
 *
 * Provides type-safe database operations for conversations and messages tables.
 */

import type {
  ConversationInsert,
  ConversationRow,
  ConversationUpdate,
  KhepriSupabaseClient,
  MessageInsert,
  MessageRole,
  MessageRow,
} from '../types.js';
import { type QueryResult, createError } from './athlete.js';

// =============================================================================
// ALLOWED VALUES
// =============================================================================

const VALID_MESSAGE_ROLES: readonly MessageRole[] = ['user', 'assistant', 'system'];

/**
 * Validate that a role string is a valid MessageRole.
 * Used for runtime validation of external data.
 */
export function isValidMessageRole(role: unknown): role is MessageRole {
  return typeof role === 'string' && VALID_MESSAGE_ROLES.includes(role as MessageRole);
}

// =============================================================================
// CONVERSATION QUERIES
// =============================================================================

/**
 * Get conversations for an athlete.
 * Ordered by last_message_at descending (most recent first).
 *
 * @param options.limit - Maximum number of conversations to return (default: 50)
 * @param options.includeArchived - Whether to include archived conversations (default: false)
 */
export async function getConversations(
  client: KhepriSupabaseClient,
  athleteId: string,
  options?: { limit?: number; includeArchived?: boolean }
): Promise<QueryResult<ConversationRow[]>> {
  const limit = options?.limit ?? 50;
  const includeArchived = options?.includeArchived ?? false;

  let query = client
    .from('conversations')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;

  // Return null on error to distinguish failures from empty results
  if (error) {
    return {
      data: null,
      error: createError(error),
    };
  }

  return {
    data: data ?? [],
    error: null,
  };
}

/**
 * Get a single conversation by ID.
 */
export async function getConversation(
  client: KhepriSupabaseClient,
  conversationId: string
): Promise<QueryResult<ConversationRow>> {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Create a new conversation for an athlete.
 */
export async function createConversation(
  client: KhepriSupabaseClient,
  athleteId: string,
  title?: string
): Promise<QueryResult<ConversationRow>> {
  const insertData: ConversationInsert = {
    athlete_id: athleteId,
    title: title ?? null,
  };

  const { data, error } = await client
    .from('conversations')
    .insert(insertData as never)
    .select()
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Update a conversation.
 */
export async function updateConversation(
  client: KhepriSupabaseClient,
  conversationId: string,
  updates: ConversationUpdate
): Promise<QueryResult<ConversationRow>> {
  const { data, error } = await client
    .from('conversations')
    .update(updates as never)
    .eq('id', conversationId)
    .select()
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Archive a conversation (soft delete).
 * Sets is_archived to true.
 */
export async function archiveConversation(
  client: KhepriSupabaseClient,
  conversationId: string
): Promise<QueryResult<ConversationRow>> {
  return updateConversation(client, conversationId, { is_archived: true });
}

/**
 * Unarchive a conversation.
 * Sets is_archived to false.
 */
export async function unarchiveConversation(
  client: KhepriSupabaseClient,
  conversationId: string
): Promise<QueryResult<ConversationRow>> {
  return updateConversation(client, conversationId, { is_archived: false });
}

// =============================================================================
// MESSAGE QUERIES
// =============================================================================

/**
 * Get messages for a conversation.
 * Ordered by created_at ascending (oldest first).
 *
 * @param options.limit - Maximum number of messages to return
 * @param options.before - Get messages before this message ID (for pagination)
 */
export async function getMessages(
  client: KhepriSupabaseClient,
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<QueryResult<MessageRow[]>> {
  let query = client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (options?.before) {
    // Get the created_at of the "before" message, scoped to this conversation
    const { data: beforeMessage, error: beforeError } = await client
      .from('messages')
      .select('created_at')
      .eq('id', options.before)
      .eq('conversation_id', conversationId)
      .single();

    // Return error if pagination lookup fails
    if (beforeError) {
      return {
        data: null,
        error: createError(beforeError),
      };
    }

    if (beforeMessage) {
      query = query.lt('created_at', beforeMessage.created_at);
    }
  }

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  // Return null on error to distinguish failures from empty results
  if (error) {
    return {
      data: null,
      error: createError(error),
    };
  }

  return {
    data: data ?? [],
    error: null,
  };
}

/**
 * Add a message to a conversation.
 * Note: The conversation's last_message_at is automatically updated by a database trigger.
 *
 * @param message.role - Message role (must be 'user', 'assistant', or 'system')
 * @param message.content - Message content text
 * @param message.prompt_tokens - Optional token count for AI prompts
 * @param message.completion_tokens - Optional token count for AI completions
 */
export async function addMessage(
  client: KhepriSupabaseClient,
  conversationId: string,
  message: {
    role: MessageRole;
    content: string;
    prompt_tokens?: number;
    completion_tokens?: number;
  }
): Promise<QueryResult<MessageRow>> {
  // Runtime validation of role
  if (!isValidMessageRole(message.role)) {
    return {
      data: null,
      error: new Error(
        `Invalid message role: ${message.role}. Must be 'user', 'assistant', or 'system'.`
      ),
    };
  }

  const insertData: MessageInsert = {
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
    prompt_tokens: message.prompt_tokens ?? null,
    completion_tokens: message.completion_tokens ?? null,
  };

  const { data, error } = await client
    .from('messages')
    .insert(insertData as never)
    .select()
    .single();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Get the most recent conversation for an athlete.
 * Returns the non-archived conversation with the most recent message.
 */
export async function getMostRecentConversation(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<ConversationRow>> {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data,
    error: error ? createError(error) : null,
  };
}

/**
 * Delete a conversation and all its messages.
 * Uses CASCADE delete defined in the database schema.
 */
export async function deleteConversation(
  client: KhepriSupabaseClient,
  conversationId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('conversations').delete().eq('id', conversationId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
