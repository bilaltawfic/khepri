/**
 * Embedding query functions for RAG knowledge base
 *
 * Provides type-safe database operations for the embeddings table,
 * including vector similarity search via the match_embeddings RPC function.
 */

import type { KhepriSupabaseClient } from '../types.js';
import { type QueryResult, createError } from './athlete.js';

// =============================================================================
// TYPES
// =============================================================================

/** Valid content types for embeddings */
export const EMBEDDING_CONTENT_TYPES = ['knowledge', 'conversation', 'activity'] as const;
export type EmbeddingContentType = (typeof EMBEDDING_CONTENT_TYPES)[number];

/** A row in the embeddings table */
export interface EmbeddingRecord {
  readonly id: string;
  readonly content_type: EmbeddingContentType;
  readonly source_id: string | null;
  readonly chunk_index: number;
  readonly title: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly embedding: string;
  readonly athlete_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** A similarity search result from match_embeddings */
export interface EmbeddingMatch {
  readonly id: string;
  readonly content_type: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly similarity: number;
}

/** Input for inserting a new embedding */
export type EmbeddingInsert = Omit<EmbeddingRecord, 'id' | 'created_at' | 'updated_at'>;

// =============================================================================
// VALIDATION
// =============================================================================

/** Expected embedding vector dimensions (matches vector(1536) column) */
export const EMBEDDING_DIMENSIONS = 1536;

const VALID_CONTENT_TYPES: ReadonlySet<string> = new Set(EMBEDDING_CONTENT_TYPES);

/**
 * Validate that a string is a valid EmbeddingContentType.
 * Used for runtime validation of external data.
 */
export function isValidContentType(value: unknown): value is EmbeddingContentType {
  return typeof value === 'string' && VALID_CONTENT_TYPES.has(value);
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Insert a new embedding record.
 *
 * @param record - The embedding data to insert (id and timestamps are auto-generated)
 */
export async function insertEmbedding(
  client: KhepriSupabaseClient,
  record: EmbeddingInsert
): Promise<QueryResult<EmbeddingRecord>> {
  if (!isValidContentType(record.content_type)) {
    return {
      data: null,
      error: new Error(
        `Invalid content_type: ${record.content_type}. Must be one of: ${EMBEDDING_CONTENT_TYPES.join(', ')}.`
      ),
    };
  }

  const { data, error } = await client
    .from('embeddings')
    .insert(record as never)
    .select()
    .single();

  return {
    data: data as EmbeddingRecord | null,
    error: error ? createError(error) : null,
  };
}

/**
 * Search for similar embeddings using cosine similarity.
 * Calls the match_embeddings RPC function defined in the database.
 *
 * @param queryEmbedding - The query vector to search with (1536 dimensions)
 * @param options.matchCount - Maximum number of results (default: 5)
 * @param options.matchThreshold - Minimum similarity score 0-1 (default: 0.7)
 * @param options.contentType - Filter by content type (optional)
 * @param options.athleteId - Filter by athlete ID, also includes shared knowledge (optional)
 */
export async function searchEmbeddings(
  client: KhepriSupabaseClient,
  queryEmbedding: number[],
  options?: {
    readonly matchCount?: number;
    readonly matchThreshold?: number;
    readonly contentType?: EmbeddingContentType;
    readonly athleteId?: string;
  }
): Promise<QueryResult<EmbeddingMatch[]>> {
  if (queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
    return {
      data: null,
      error: new Error(
        `Invalid embedding dimension: expected ${EMBEDDING_DIMENSIONS}, got ${queryEmbedding.length}.`
      ),
    };
  }

  const { data, error } = await client.rpc('match_embeddings', {
    query_embedding: queryEmbedding as unknown as string,
    match_count: options?.matchCount ?? 5,
    match_threshold: options?.matchThreshold ?? 0.7,
    filter_content_type: options?.contentType ?? null,
    filter_athlete_id: options?.athleteId ?? null,
  });

  if (error) {
    return {
      data: null,
      error: createError(error),
    };
  }

  return {
    data: (data as EmbeddingMatch[] | null) ?? [],
    error: null,
  };
}

/**
 * Delete embeddings by source ID.
 * Used for re-indexing: delete old embeddings before inserting updated ones.
 *
 * @param sourceId - The source_id to delete embeddings for
 */
export async function deleteEmbeddingsBySource(
  client: KhepriSupabaseClient,
  sourceId: string
): Promise<QueryResult<null>> {
  const { error } = await client.from('embeddings').delete().eq('source_id', sourceId);

  return {
    data: null,
    error: error ? createError(error) : null,
  };
}
