/** Request body for the semantic-search edge function */
export interface SemanticSearchRequest {
  /** The natural-language query to search for */
  readonly query: string;
  /** Maximum number of results to return (default: 5, max: 20) */
  readonly match_count?: number;
  /** Minimum similarity threshold 0-1 (default: 0.7) */
  readonly match_threshold?: number;
  /** Filter results by content type */
  readonly content_type?: 'knowledge' | 'conversation' | 'activity';
  /** Include personal embeddings for this athlete (also includes shared knowledge) */
  readonly athlete_id?: string;
}

/** A single search result returned by match_embeddings */
export interface SearchResult {
  readonly id: string;
  readonly content_type: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly similarity: number;
}

/** Response body on successful search */
export interface SemanticSearchResponse {
  readonly results: readonly SearchResult[];
  readonly query_tokens: number;
  readonly model: string;
}

/** Shape of the OpenAI embeddings API response */
export interface OpenAIEmbeddingResponse {
  readonly data: ReadonlyArray<{
    readonly embedding: number[];
    readonly index: number;
  }>;
  readonly model: string;
  readonly usage: {
    readonly prompt_tokens: number;
    readonly total_tokens: number;
  };
}

/** OpenAI model used for embeddings */
export const EMBEDDING_MODEL = 'text-embedding-3-small';

/** Expected vector dimensions (must match the vector(1536) column) */
export const EMBEDDING_DIMENSIONS = 1536;

/** Maximum query length in characters */
export const MAX_QUERY_LENGTH = 2000;

/** Maximum number of results per search */
export const MAX_MATCH_COUNT = 20;

/** Default number of results per search */
export const DEFAULT_MATCH_COUNT = 5;

/** Default similarity threshold */
export const DEFAULT_MATCH_THRESHOLD = 0.7;

/** Allowed content_type filter values (single source of truth) */
export const VALID_CONTENT_TYPES = ['knowledge', 'conversation', 'activity'] as const;
