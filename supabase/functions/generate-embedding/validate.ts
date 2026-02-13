/**
 * Runtime validation for generate-embedding request bodies.
 * Extracted to a separate module for testability.
 */

import { MAX_CONTENT_LENGTH, VALID_CONTENT_TYPES } from './types.ts';

/**
 * Validate an incoming request body at runtime.
 * Returns a descriptive error string, or null if valid.
 */
export function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }

  const b = body as Record<string, unknown>;

  // Required: content (non-empty string within size limit)
  if (typeof b.content !== 'string' || b.content.length === 0) {
    return 'content is required and must be a non-empty string';
  }
  if (b.content.length > MAX_CONTENT_LENGTH) {
    return `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`;
  }

  // Required: title (non-empty string)
  if (typeof b.title !== 'string' || b.title.length === 0) {
    return 'title is required and must be a non-empty string';
  }

  // Required: content_type (must be one of the allowed values)
  if (
    typeof b.content_type !== 'string' ||
    !(VALID_CONTENT_TYPES as readonly string[]).includes(b.content_type)
  ) {
    return `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`;
  }

  // Optional: source_id (string if provided)
  if (b.source_id != null && typeof b.source_id !== 'string') {
    return 'source_id must be a string';
  }

  // Optional: chunk_index (non-negative integer if provided)
  if (b.chunk_index != null) {
    if (typeof b.chunk_index !== 'number' || b.chunk_index < 0) {
      return 'chunk_index must be a non-negative number';
    }
    if (!Number.isInteger(b.chunk_index)) {
      return 'chunk_index must be an integer';
    }
  }

  // Optional: metadata (object if provided)
  if (b.metadata != null && (typeof b.metadata !== 'object' || Array.isArray(b.metadata))) {
    return 'metadata must be an object';
  }

  // Optional: athlete_id (string if provided)
  if (b.athlete_id != null && typeof b.athlete_id !== 'string') {
    return 'athlete_id must be a string';
  }

  return null;
}
