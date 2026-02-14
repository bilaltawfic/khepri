/**
 * Runtime validation for semantic-search request bodies.
 * Extracted to a separate module for testability.
 */

import { MAX_MATCH_COUNT, MAX_QUERY_LENGTH, VALID_CONTENT_TYPES } from './types.ts';

/**
 * Validate an incoming request body at runtime.
 * Returns a descriptive error string, or null if valid.
 */
export function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }

  const b = body as Record<string, unknown>;

  const queryError = validateQuery(b);
  if (queryError != null) {
    return queryError;
  }

  return validateOptionalFields(b);
}

/** Validate the required query field. */
function validateQuery(b: Record<string, unknown>): string | null {
  if (typeof b.query !== 'string' || b.query.trim().length === 0) {
    return 'query is required and must be a non-empty string';
  }
  if (b.query.length > MAX_QUERY_LENGTH) {
    return `query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`;
  }

  return null;
}

/** Validate optional match_count, match_threshold, content_type, and athlete_id fields. */
function validateOptionalFields(b: Record<string, unknown>): string | null {
  if (b.match_count != null) {
    if (
      typeof b.match_count !== 'number' ||
      !Number.isInteger(b.match_count) ||
      b.match_count < 1
    ) {
      return 'match_count must be a positive integer';
    }
    if (b.match_count > MAX_MATCH_COUNT) {
      return `match_count must not exceed ${MAX_MATCH_COUNT}`;
    }
  }

  if (b.match_threshold != null) {
    if (typeof b.match_threshold !== 'number' || b.match_threshold < 0 || b.match_threshold > 1) {
      return 'match_threshold must be a number between 0 and 1';
    }
  }

  if (b.content_type != null) {
    if (
      typeof b.content_type !== 'string' ||
      !(VALID_CONTENT_TYPES as readonly string[]).includes(b.content_type)
    ) {
      return `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`;
    }
  }

  if (b.athlete_id != null && typeof b.athlete_id !== 'string') {
    return 'athlete_id must be a string';
  }

  return null;
}
