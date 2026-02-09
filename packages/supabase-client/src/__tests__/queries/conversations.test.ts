/**
 * Tests for conversation and message query functions
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { ConversationRow, KhepriSupabaseClient, MessageRow } from '../../types.js';

// Mock chainable query builder
function createMockQueryBuilder(result: { data: unknown; error: unknown }) {
  // Create a proxy that makes every method chainable and returns itself
  const builder: Record<string, jest.Mock> = {};

  const chainableMethods = ['select', 'insert', 'update', 'delete', 'eq', 'lt', 'order', 'limit'];

  // Terminal methods that return the result
  const terminalMethods = ['single', 'maybeSingle'];

  // Set up chainable methods - they return the builder itself
  for (const method of chainableMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // Set up terminal methods - they return a promise with the result
  for (const method of terminalMethods) {
    builder[method] = jest.fn().mockResolvedValue(result);
  }

  // Make the builder thenable so it can be awaited directly
  // This handles cases where no terminal method is called
  Object.defineProperty(builder, 'then', {
    value: jest.fn().mockImplementation((resolve) => resolve(result)),
    enumerable: false,
  });

  return builder;
}

// Import functions under test
const {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  getMessages,
  addMessage,
  getMostRecentConversation,
  deleteConversation,
  isValidMessageRole,
} = await import('../../queries/conversations.js');

// Sample conversation data for tests
const sampleConversation: ConversationRow = {
  id: 'conv-123',
  athlete_id: 'athlete-456',
  title: 'Morning check-in',
  is_archived: false,
  last_message_at: '2026-02-08T10:30:00Z',
  created_at: '2026-02-08T06:00:00Z',
  updated_at: '2026-02-08T10:30:00Z',
  started_at: '2026-02-08T06:00:00Z',
  metadata: {},
};

// Sample message data for tests
const sampleMessage: MessageRow = {
  id: 'msg-789',
  conversation_id: 'conv-123',
  role: 'user',
  content: 'How should I train today?',
  prompt_tokens: null,
  completion_tokens: null,
  created_at: '2026-02-08T10:30:00Z',
};

describe('isValidMessageRole', () => {
  it('returns true for valid roles', () => {
    expect(isValidMessageRole('user')).toBe(true);
    expect(isValidMessageRole('assistant')).toBe(true);
    expect(isValidMessageRole('system')).toBe(true);
  });

  it('returns false for invalid roles', () => {
    expect(isValidMessageRole('admin')).toBe(false);
    expect(isValidMessageRole('bot')).toBe(false);
    expect(isValidMessageRole('')).toBe(false);
    expect(isValidMessageRole(null)).toBe(false);
    expect(isValidMessageRole(undefined)).toBe(false);
    expect(isValidMessageRole(123)).toBe(false);
  });
});

describe('getConversations', () => {
  it('returns conversations for athlete ordered by last_message_at', async () => {
    const conversations = [
      sampleConversation,
      { ...sampleConversation, id: 'conv-124', title: 'Training plan' },
    ];
    const mockBuilder = createMockQueryBuilder({ data: conversations, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getConversations(mockClient, 'athlete-456');

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.select).toHaveBeenCalledWith('*');
    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.eq).toHaveBeenCalledWith('is_archived', false);
    expect(mockBuilder.order).toHaveBeenCalledWith('last_message_at', { ascending: false });
    expect(mockBuilder.limit).toHaveBeenCalledWith(50);
    expect(result.data).toEqual(conversations);
    expect(result.error).toBeNull();
  });

  it('respects custom limit option', async () => {
    const mockBuilder = createMockQueryBuilder({ data: [], error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    await getConversations(mockClient, 'athlete-456', { limit: 10 });

    expect(mockBuilder.limit).toHaveBeenCalledWith(10);
  });

  it('includes archived when requested', async () => {
    const mockBuilder = createMockQueryBuilder({ data: [], error: null });
    // Track whether eq was called with is_archived
    let isArchivedFilterApplied = false;
    mockBuilder.eq.mockImplementation((field: string) => {
      if (field === 'is_archived') {
        isArchivedFilterApplied = true;
      }
      return mockBuilder;
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    await getConversations(mockClient, 'athlete-456', { includeArchived: true });

    // When includeArchived is true, eq should NOT be called with is_archived
    expect(isArchivedFilterApplied).toBe(false);
  });

  it('returns empty array when no conversations', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getConversations(mockClient, 'athlete-456');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns null data on error to distinguish from empty results', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Database error' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getConversations(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Database error');
  });
});

describe('getConversation', () => {
  it('returns single conversation by ID', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getConversation(mockClient, 'conv-123');

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'conv-123');
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleConversation);
    expect(result.error).toBeNull();
  });

  it('returns error when conversation not found', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Row not found' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getConversation(mockClient, 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('createConversation', () => {
  it('creates conversation with title', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await createConversation(mockClient, 'athlete-456', 'Morning check-in');

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.insert).toHaveBeenCalledWith({
      athlete_id: 'athlete-456',
      title: 'Morning check-in',
    });
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleConversation);
    expect(result.error).toBeNull();
  });

  it('creates conversation without title', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    await createConversation(mockClient, 'athlete-456');

    expect(mockBuilder.insert).toHaveBeenCalledWith({
      athlete_id: 'athlete-456',
      title: null,
    });
  });
});

describe('updateConversation', () => {
  it('updates conversation fields', async () => {
    const updatedConversation = { ...sampleConversation, title: 'Updated title' };
    const mockBuilder = createMockQueryBuilder({ data: updatedConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await updateConversation(mockClient, 'conv-123', { title: 'Updated title' });

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.update).toHaveBeenCalledWith({ title: 'Updated title' });
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'conv-123');
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data?.title).toBe('Updated title');
    expect(result.error).toBeNull();
  });
});

describe('archiveConversation', () => {
  it('sets is_archived to true', async () => {
    const archivedConversation = { ...sampleConversation, is_archived: true };
    const mockBuilder = createMockQueryBuilder({ data: archivedConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await archiveConversation(mockClient, 'conv-123');

    expect(mockBuilder.update).toHaveBeenCalledWith({ is_archived: true });
    expect(result.data?.is_archived).toBe(true);
  });
});

describe('unarchiveConversation', () => {
  it('sets is_archived to false', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await unarchiveConversation(mockClient, 'conv-123');

    expect(mockBuilder.update).toHaveBeenCalledWith({ is_archived: false });
    expect(result.data?.is_archived).toBe(false);
  });
});

describe('getMessages', () => {
  it('returns messages for conversation ordered by created_at ascending', async () => {
    const messages = [
      sampleMessage,
      { ...sampleMessage, id: 'msg-790', role: 'assistant' as const, content: 'Based on...' },
    ];
    const mockBuilder = createMockQueryBuilder({ data: messages, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getMessages(mockClient, 'conv-123');

    expect(mockClient.from).toHaveBeenCalledWith('messages');
    expect(mockBuilder.select).toHaveBeenCalledWith('*');
    expect(mockBuilder.eq).toHaveBeenCalledWith('conversation_id', 'conv-123');
    expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.data).toEqual(messages);
    expect(result.error).toBeNull();
  });

  it('respects limit option', async () => {
    const mockBuilder = createMockQueryBuilder({ data: [], error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    await getMessages(mockClient, 'conv-123', { limit: 20 });

    expect(mockBuilder.limit).toHaveBeenCalledWith(20);
  });

  it('handles pagination with before option', async () => {
    // The function makes two from() calls:
    // 1. First for main query (select * from messages where conversation_id = ...)
    // 2. Second to look up the "before" message by ID (select created_at from messages where id = ...)
    const beforeMessage = { created_at: '2026-02-08T10:00:00Z' };

    // Builder for the lookup query
    const lookupBuilder = createMockQueryBuilder({ data: beforeMessage, error: null });

    // Builder for the main messages query
    const messagesBuilder = createMockQueryBuilder({ data: [], error: null });

    let callCount = 0;
    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        // First from() is for main query, second is for lookup
        if (callCount === 1) return messagesBuilder;
        return lookupBuilder;
      }),
    } as unknown as KhepriSupabaseClient;

    await getMessages(mockClient, 'conv-123', { before: 'msg-789' });

    // Verify both from() calls happened
    expect(mockClient.from).toHaveBeenCalledTimes(2);
    expect(mockClient.from).toHaveBeenCalledWith('messages');

    // Check that lookup query selected created_at and filtered by id AND conversation_id
    expect(lookupBuilder.select).toHaveBeenCalledWith('created_at');
    expect(lookupBuilder.eq).toHaveBeenCalledWith('id', 'msg-789');
    expect(lookupBuilder.eq).toHaveBeenCalledWith('conversation_id', 'conv-123');
    expect(lookupBuilder.single).toHaveBeenCalled();

    // Check that main query filtered with lt on created_at
    expect(messagesBuilder.lt).toHaveBeenCalledWith('created_at', '2026-02-08T10:00:00Z');
  });

  it('returns error when pagination lookup fails', async () => {
    // Builder for the lookup query that fails
    const lookupBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Message not found' },
    });

    // Builder for the main messages query
    const messagesBuilder = createMockQueryBuilder({ data: [], error: null });

    let callCount = 0;
    const mockClient = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return messagesBuilder;
        return lookupBuilder;
      }),
    } as unknown as KhepriSupabaseClient;

    const result = await getMessages(mockClient, 'conv-123', { before: 'invalid-id' });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Message not found');
  });

  it('returns empty array when no messages', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getMessages(mockClient, 'conv-123');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns null data on error to distinguish from empty results', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Query failed' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getMessages(mockClient, 'conv-123');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Query failed');
  });
});

describe('addMessage', () => {
  it('adds message with valid role', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleMessage, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await addMessage(mockClient, 'conv-123', {
      role: 'user',
      content: 'How should I train today?',
    });

    expect(mockClient.from).toHaveBeenCalledWith('messages');
    expect(mockBuilder.insert).toHaveBeenCalledWith({
      conversation_id: 'conv-123',
      role: 'user',
      content: 'How should I train today?',
      prompt_tokens: null,
      completion_tokens: null,
    });
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleMessage);
    expect(result.error).toBeNull();
  });

  it('includes token counts when provided', async () => {
    const messageWithTokens: MessageRow = {
      ...sampleMessage,
      role: 'assistant',
      prompt_tokens: 100,
      completion_tokens: 250,
    };
    const mockBuilder = createMockQueryBuilder({ data: messageWithTokens, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await addMessage(mockClient, 'conv-123', {
      role: 'assistant',
      content: 'Based on your fitness...',
      prompt_tokens: 100,
      completion_tokens: 250,
    });

    expect(mockBuilder.insert).toHaveBeenCalledWith({
      conversation_id: 'conv-123',
      role: 'assistant',
      content: 'Based on your fitness...',
      prompt_tokens: 100,
      completion_tokens: 250,
    });
    expect(result.data?.prompt_tokens).toBe(100);
    expect(result.data?.completion_tokens).toBe(250);
  });

  it('returns error for invalid role', async () => {
    const mockClient = {
      from: jest.fn(),
    } as unknown as KhepriSupabaseClient;

    // TypeScript would catch this at compile time, but we test runtime validation
    const result = await addMessage(mockClient, 'conv-123', {
      role: 'admin' as 'user',
      content: 'Test message',
    });

    // Should not call the database
    expect(mockClient.from).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Invalid message role');
    expect(result.error?.message).toContain('admin');
  });
});

describe('getMostRecentConversation', () => {
  it('returns most recent non-archived conversation', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleConversation, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getMostRecentConversation(mockClient, 'athlete-456');

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.eq).toHaveBeenCalledWith('athlete_id', 'athlete-456');
    expect(mockBuilder.eq).toHaveBeenCalledWith('is_archived', false);
    expect(mockBuilder.order).toHaveBeenCalledWith('last_message_at', { ascending: false });
    expect(mockBuilder.limit).toHaveBeenCalledWith(1);
    expect(mockBuilder.maybeSingle).toHaveBeenCalled();
    expect(result.data).toEqual(sampleConversation);
    expect(result.error).toBeNull();
  });

  it('returns null when no conversations exist', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await getMostRecentConversation(mockClient, 'athlete-456');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('deleteConversation', () => {
  it('deletes conversation by ID', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    // For delete, we need to handle the promise at the eq level
    mockBuilder.eq.mockImplementation(() => Promise.resolve({ error: null }));
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await deleteConversation(mockClient, 'conv-123');

    expect(mockClient.from).toHaveBeenCalledWith('conversations');
    expect(mockBuilder.delete).toHaveBeenCalled();
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'conv-123');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when delete fails', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    mockBuilder.eq.mockImplementation(() =>
      Promise.resolve({ error: { message: 'Delete failed' } })
    );
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await deleteConversation(mockClient, 'conv-123');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
