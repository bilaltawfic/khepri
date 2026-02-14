/** Request body for the generate-embedding edge function */
export interface GenerateEmbeddingRequest {
  /** The text content to embed */
  readonly content: string;
  /** Title for the embedding record */
  readonly title: string;
  /** Content classification */
  readonly content_type: 'knowledge' | 'conversation' | 'activity';
  /** Optional reference to source document/conversation/activity */
  readonly source_id?: string;
  /** Chunk index for documents split into parts (default: 0) */
  readonly chunk_index?: number;
  /** Flexible metadata (tags, category, sport, etc.) */
  readonly metadata?: Record<string, unknown>;
  /** NULL for shared knowledge, athlete UUID for personal embeddings */
  readonly athlete_id?: string;
}

/** Response body on successful embedding generation */
export interface GenerateEmbeddingResponse {
  /** UUID of the created embedding record */
  readonly embedding_id: string;
  /** Vector dimensions (always 1536 for text-embedding-3-small) */
  readonly dimensions: number;
  /** Model used for embedding */
  readonly model: string;
  /** Token count from OpenAI response */
  readonly tokens_used: number;
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

/** Maximum content length in characters (~8000 tokens, safe for text-embedding-3-small) */
export const MAX_CONTENT_LENGTH = 30_000;

/** Allowed content_type values (single source of truth) */
export const VALID_CONTENT_TYPES = ['knowledge', 'conversation', 'activity'] as const;
