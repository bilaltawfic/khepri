/**
 * Tests for embedding query functions
 */

import { describe, expect, it, jest } from '@jest/globals';
import type { KhepriSupabaseClient } from '../../types.js';

// Mock chainable query builder (same pattern as conversations.test.ts)
function createMockQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, jest.Mock> = {};

  const chainableMethods = ['select', 'insert', 'update', 'delete', 'eq', 'lt', 'order', 'limit'];
  const terminalMethods = ['single', 'maybeSingle'];

  for (const method of chainableMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  for (const method of terminalMethods) {
    builder[method] = jest.fn().mockResolvedValue(result);
  }

  Object.defineProperty(builder, 'then', {
    value: jest.fn().mockImplementation((resolve) => resolve(result)),
    enumerable: false,
  });

  return builder;
}

// Import functions under test
const {
  insertEmbedding,
  searchEmbeddings,
  deleteEmbeddingsBySource,
  isValidContentType,
  EMBEDDING_CONTENT_TYPES,
} = await import('../../queries/embeddings.js');

// Sample embedding data for tests
const sampleEmbedding = {
  content_type: 'knowledge' as const,
  source_id: 'doc-001',
  chunk_index: 0,
  title: 'Periodization Basics',
  content: 'Periodization is the systematic planning of training...',
  metadata: { category: 'training-theory', sport: 'running' },
  embedding: Array.from({ length: 1536 }, () => 0.1),
  athlete_id: null,
};

const sampleEmbeddingRecord = {
  id: 'emb-123',
  ...sampleEmbedding,
  created_at: '2026-02-13T10:00:00Z',
  updated_at: '2026-02-13T10:00:00Z',
};

describe('isValidContentType', () => {
  it('returns true for valid content types', () => {
    expect(isValidContentType('knowledge')).toBe(true);
    expect(isValidContentType('conversation')).toBe(true);
    expect(isValidContentType('activity')).toBe(true);
  });

  it('returns false for invalid content types', () => {
    expect(isValidContentType('invalid')).toBe(false);
    expect(isValidContentType('')).toBe(false);
    expect(isValidContentType(null)).toBe(false);
    expect(isValidContentType(undefined)).toBe(false);
    expect(isValidContentType(123)).toBe(false);
  });
});

describe('EMBEDDING_CONTENT_TYPES', () => {
  it('contains expected content types', () => {
    expect(EMBEDDING_CONTENT_TYPES).toEqual(['knowledge', 'conversation', 'activity']);
  });
});

describe('insertEmbedding', () => {
  it('inserts embedding with correct fields', async () => {
    const mockBuilder = createMockQueryBuilder({ data: sampleEmbeddingRecord, error: null });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await insertEmbedding(mockClient, sampleEmbedding);

    expect(mockClient.from).toHaveBeenCalledWith('embeddings');
    expect(mockBuilder.insert).toHaveBeenCalledWith(sampleEmbedding);
    expect(mockBuilder.select).toHaveBeenCalled();
    expect(mockBuilder.single).toHaveBeenCalled();
    expect(result.data).toEqual(sampleEmbeddingRecord);
    expect(result.error).toBeNull();
  });

  it('inserts personal embedding with athlete_id', async () => {
    const personalEmbedding = {
      ...sampleEmbedding,
      content_type: 'conversation' as const,
      athlete_id: 'athlete-456',
    };
    const mockBuilder = createMockQueryBuilder({
      data: { ...sampleEmbeddingRecord, ...personalEmbedding },
      error: null,
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await insertEmbedding(mockClient, personalEmbedding);

    expect(mockBuilder.insert).toHaveBeenCalledWith(personalEmbedding);
    expect(result.data?.athlete_id).toBe('athlete-456');
    expect(result.error).toBeNull();
  });

  it('returns error for invalid content_type', async () => {
    const mockClient = {
      from: jest.fn(),
    } as unknown as KhepriSupabaseClient;

    const invalidEmbedding = {
      ...sampleEmbedding,
      content_type: 'invalid' as 'knowledge',
    };

    const result = await insertEmbedding(mockClient, invalidEmbedding);

    expect(mockClient.from).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Invalid content_type');
    expect(result.error?.message).toContain('invalid');
  });

  it('returns error on database failure', async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: 'Database error' },
    });
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await insertEmbedding(mockClient, sampleEmbedding);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Database error');
  });
});

describe('searchEmbeddings', () => {
  const queryVector = Array.from({ length: 1536 }, () => 0.2);
  const sampleMatches = [
    {
      id: 'emb-123',
      content_type: 'knowledge',
      title: 'Periodization Basics',
      content: 'Periodization is the systematic planning...',
      metadata: { category: 'training-theory' },
      similarity: 0.92,
    },
    {
      id: 'emb-124',
      content_type: 'knowledge',
      title: 'Recovery Principles',
      content: 'Recovery is essential for adaptation...',
      metadata: { category: 'recovery' },
      similarity: 0.85,
    },
  ];

  it('calls match_embeddings RPC with query vector', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({ data: sampleMatches, error: null }),
    } as unknown as KhepriSupabaseClient;

    const result = await searchEmbeddings(mockClient, queryVector);

    expect(mockClient.rpc).toHaveBeenCalledWith('match_embeddings', {
      query_embedding: queryVector,
      match_count: 5,
      match_threshold: 0.7,
      filter_content_type: null,
      filter_athlete_id: null,
    });
    expect(result.data).toEqual(sampleMatches);
    expect(result.error).toBeNull();
  });

  it('passes optional filters', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({ data: sampleMatches, error: null }),
    } as unknown as KhepriSupabaseClient;

    await searchEmbeddings(mockClient, queryVector, {
      matchCount: 10,
      matchThreshold: 0.8,
      contentType: 'knowledge',
      athleteId: 'athlete-456',
    });

    expect(mockClient.rpc).toHaveBeenCalledWith('match_embeddings', {
      query_embedding: queryVector,
      match_count: 10,
      match_threshold: 0.8,
      filter_content_type: 'knowledge',
      filter_athlete_id: 'athlete-456',
    });
  });

  it('uses default match count and threshold when not specified', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as KhepriSupabaseClient;

    await searchEmbeddings(mockClient, queryVector);

    expect(mockClient.rpc).toHaveBeenCalledWith(
      'match_embeddings',
      expect.objectContaining({
        match_count: 5,
        match_threshold: 0.7,
      })
    );
  });

  it('returns empty array when no matches', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as KhepriSupabaseClient;

    const result = await searchEmbeddings(mockClient, queryVector);

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error on RPC failure', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC error' } }),
    } as unknown as KhepriSupabaseClient;

    const result = await searchEmbeddings(mockClient, queryVector);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('RPC error');
  });
});

describe('deleteEmbeddingsBySource', () => {
  it('deletes embeddings by source_id', async () => {
    const mockBuilder = createMockQueryBuilder({ data: null, error: null });
    mockBuilder.eq.mockImplementation(() => Promise.resolve({ error: null }));
    const mockClient = {
      from: jest.fn().mockReturnValue(mockBuilder),
    } as unknown as KhepriSupabaseClient;

    const result = await deleteEmbeddingsBySource(mockClient, 'doc-001');

    expect(mockClient.from).toHaveBeenCalledWith('embeddings');
    expect(mockBuilder.delete).toHaveBeenCalled();
    expect(mockBuilder.eq).toHaveBeenCalledWith('source_id', 'doc-001');
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

    const result = await deleteEmbeddingsBySource(mockClient, 'doc-001');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Delete failed');
  });
});
