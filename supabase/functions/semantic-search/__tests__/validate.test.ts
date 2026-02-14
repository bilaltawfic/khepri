import { MAX_MATCH_COUNT, MAX_QUERY_LENGTH, VALID_CONTENT_TYPES } from '../types.ts';
import { validateRequest } from '../validate.ts';

// =============================================================================
// Helper: builds a valid request body for overriding individual fields
// =============================================================================

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    query: 'How should I structure my training week?',
    ...overrides,
  };
}

// =============================================================================
// Request body shape
// =============================================================================

describe('validateRequest – body shape', () => {
  it('rejects null', () => {
    expect(validateRequest(null)).toBe('Request body must be a JSON object');
  });

  it('rejects arrays', () => {
    expect(validateRequest([])).toBe('Request body must be a JSON object');
  });

  it('rejects non-object primitives', () => {
    expect(validateRequest('string')).toBe('Request body must be a JSON object');
    expect(validateRequest(42)).toBe('Request body must be a JSON object');
    expect(validateRequest(true)).toBe('Request body must be a JSON object');
  });
});

// =============================================================================
// query field
// =============================================================================

describe('validateRequest – query', () => {
  it('rejects missing query', () => {
    const body = validBody();
    body.query = undefined;
    expect(validateRequest(body)).toBe('query is required and must be a non-empty string');
  });

  it('rejects empty string query', () => {
    expect(validateRequest(validBody({ query: '' }))).toBe(
      'query is required and must be a non-empty string'
    );
  });

  it('rejects whitespace-only query', () => {
    expect(validateRequest(validBody({ query: '   ' }))).toBe(
      'query is required and must be a non-empty string'
    );
  });

  it('rejects non-string query', () => {
    expect(validateRequest(validBody({ query: 123 }))).toBe(
      'query is required and must be a non-empty string'
    );
  });

  it('rejects query exceeding maximum length', () => {
    const longQuery = 'a'.repeat(MAX_QUERY_LENGTH + 1);
    expect(validateRequest(validBody({ query: longQuery }))).toBe(
      `query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`
    );
  });

  it('accepts query at exactly maximum length', () => {
    const maxQuery = 'a'.repeat(MAX_QUERY_LENGTH);
    expect(validateRequest(validBody({ query: maxQuery }))).toBeNull();
  });
});

// =============================================================================
// match_count field
// =============================================================================

describe('validateRequest – match_count', () => {
  it('accepts missing match_count', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts valid match_count', () => {
    expect(validateRequest(validBody({ match_count: 10 }))).toBeNull();
  });

  it('accepts match_count of 1', () => {
    expect(validateRequest(validBody({ match_count: 1 }))).toBeNull();
  });

  it('accepts match_count at maximum', () => {
    expect(validateRequest(validBody({ match_count: MAX_MATCH_COUNT }))).toBeNull();
  });

  it('rejects match_count of 0', () => {
    expect(validateRequest(validBody({ match_count: 0 }))).toBe(
      'match_count must be a positive integer'
    );
  });

  it('rejects negative match_count', () => {
    expect(validateRequest(validBody({ match_count: -1 }))).toBe(
      'match_count must be a positive integer'
    );
  });

  it('rejects non-integer match_count', () => {
    expect(validateRequest(validBody({ match_count: 3.5 }))).toBe(
      'match_count must be a positive integer'
    );
  });

  it('rejects non-number match_count', () => {
    expect(validateRequest(validBody({ match_count: 'five' }))).toBe(
      'match_count must be a positive integer'
    );
  });

  it('rejects match_count exceeding maximum', () => {
    expect(validateRequest(validBody({ match_count: MAX_MATCH_COUNT + 1 }))).toBe(
      `match_count must not exceed ${MAX_MATCH_COUNT}`
    );
  });
});

// =============================================================================
// match_threshold field
// =============================================================================

describe('validateRequest – match_threshold', () => {
  it('accepts missing match_threshold', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts match_threshold of 0', () => {
    expect(validateRequest(validBody({ match_threshold: 0 }))).toBeNull();
  });

  it('accepts match_threshold of 1', () => {
    expect(validateRequest(validBody({ match_threshold: 1 }))).toBeNull();
  });

  it('accepts match_threshold of 0.5', () => {
    expect(validateRequest(validBody({ match_threshold: 0.5 }))).toBeNull();
  });

  it('rejects negative match_threshold', () => {
    expect(validateRequest(validBody({ match_threshold: -0.1 }))).toBe(
      'match_threshold must be a number between 0 and 1'
    );
  });

  it('rejects match_threshold greater than 1', () => {
    expect(validateRequest(validBody({ match_threshold: 1.1 }))).toBe(
      'match_threshold must be a number between 0 and 1'
    );
  });

  it('rejects non-number match_threshold', () => {
    expect(validateRequest(validBody({ match_threshold: 'high' }))).toBe(
      'match_threshold must be a number between 0 and 1'
    );
  });
});

// =============================================================================
// content_type field
// =============================================================================

describe('validateRequest – content_type', () => {
  it('accepts missing content_type', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('rejects invalid content_type', () => {
    expect(validateRequest(validBody({ content_type: 'invalid' }))).toBe(
      `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
    );
  });

  it.each(['knowledge', 'conversation', 'activity'] as const)(
    'accepts valid content_type "%s"',
    (contentType) => {
      expect(validateRequest(validBody({ content_type: contentType }))).toBeNull();
    }
  );
});

// =============================================================================
// athlete_id field
// =============================================================================

describe('validateRequest – athlete_id', () => {
  it('accepts missing athlete_id', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts valid string athlete_id', () => {
    expect(validateRequest(validBody({ athlete_id: 'uuid-123' }))).toBeNull();
  });

  it('rejects non-string athlete_id', () => {
    expect(validateRequest(validBody({ athlete_id: 42 }))).toBe('athlete_id must be a string');
  });
});

// =============================================================================
// Full valid requests
// =============================================================================

describe('validateRequest – valid requests', () => {
  it('accepts minimal valid request', () => {
    expect(validateRequest({ query: 'What is progressive overload?' })).toBeNull();
  });

  it('accepts fully populated request', () => {
    expect(
      validateRequest({
        query: 'How should I plan recovery after a hard workout?',
        match_count: 10,
        match_threshold: 0.8,
        content_type: 'knowledge',
        athlete_id: 'athlete-uuid-123',
      })
    ).toBeNull();
  });
});
