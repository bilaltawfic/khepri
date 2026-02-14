import { MAX_CONTENT_LENGTH, VALID_CONTENT_TYPES } from '../types.ts';
import { validateRequest } from '../validate.ts';

// =============================================================================
// Helper: builds a valid request body for overriding individual fields
// =============================================================================

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    content: 'Some text to embed',
    title: 'Test embedding',
    content_type: 'knowledge',
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
// content field
// =============================================================================

describe('validateRequest – content', () => {
  it('rejects missing content', () => {
    const body = validBody();
    body.content = undefined;
    expect(validateRequest(body)).toBe('content is required and must be a non-empty string');
  });

  it('rejects empty string content', () => {
    expect(validateRequest(validBody({ content: '' }))).toBe(
      'content is required and must be a non-empty string'
    );
  });

  it('rejects non-string content', () => {
    expect(validateRequest(validBody({ content: 123 }))).toBe(
      'content is required and must be a non-empty string'
    );
  });

  it('rejects content exceeding maximum length', () => {
    const longContent = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
    expect(validateRequest(validBody({ content: longContent }))).toBe(
      `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
    );
  });

  it('accepts content at exactly maximum length', () => {
    const maxContent = 'a'.repeat(MAX_CONTENT_LENGTH);
    expect(validateRequest(validBody({ content: maxContent }))).toBeNull();
  });
});

// =============================================================================
// title field
// =============================================================================

describe('validateRequest – title', () => {
  it('rejects missing title', () => {
    const body = validBody();
    body.title = undefined;
    expect(validateRequest(body)).toBe('title is required and must be a non-empty string');
  });

  it('rejects empty string title', () => {
    expect(validateRequest(validBody({ title: '' }))).toBe(
      'title is required and must be a non-empty string'
    );
  });

  it('rejects non-string title', () => {
    expect(validateRequest(validBody({ title: 42 }))).toBe(
      'title is required and must be a non-empty string'
    );
  });
});

// =============================================================================
// content_type field
// =============================================================================

describe('validateRequest – content_type', () => {
  it('rejects missing content_type', () => {
    const body = validBody();
    body.content_type = undefined;
    expect(validateRequest(body)).toBe(
      `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
    );
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
// Optional fields
// =============================================================================

describe('validateRequest – source_id', () => {
  it('accepts missing source_id', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts null source_id', () => {
    expect(validateRequest(validBody({ source_id: null }))).toBeNull();
  });

  it('accepts valid string source_id', () => {
    expect(validateRequest(validBody({ source_id: 'doc-123' }))).toBeNull();
  });

  it('rejects non-string source_id', () => {
    expect(validateRequest(validBody({ source_id: 42 }))).toBe('source_id must be a string');
  });
});

describe('validateRequest – chunk_index', () => {
  it('accepts missing chunk_index', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts null chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: null }))).toBeNull();
  });

  it('accepts zero chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: 0 }))).toBeNull();
  });

  it('accepts positive chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: 5 }))).toBeNull();
  });

  it('rejects negative chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: -1 }))).toBe(
      'chunk_index must be a non-negative number'
    );
  });

  it('rejects non-number chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: 'three' }))).toBe(
      'chunk_index must be a non-negative number'
    );
  });

  it('rejects non-integer chunk_index', () => {
    expect(validateRequest(validBody({ chunk_index: 1.5 }))).toBe('chunk_index must be an integer');
  });
});

describe('validateRequest – metadata', () => {
  it('accepts missing metadata', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts null metadata', () => {
    expect(validateRequest(validBody({ metadata: null }))).toBeNull();
  });

  it('accepts valid object metadata', () => {
    expect(validateRequest(validBody({ metadata: { sport: 'cycling' } }))).toBeNull();
  });

  it('accepts empty object metadata', () => {
    expect(validateRequest(validBody({ metadata: {} }))).toBeNull();
  });

  it('rejects array metadata', () => {
    expect(validateRequest(validBody({ metadata: ['a'] }))).toBe('metadata must be an object');
  });

  it('rejects non-object metadata', () => {
    expect(validateRequest(validBody({ metadata: 'bad' }))).toBe('metadata must be an object');
  });
});

describe('validateRequest – athlete_id', () => {
  it('accepts missing athlete_id', () => {
    expect(validateRequest(validBody())).toBeNull();
  });

  it('accepts null athlete_id', () => {
    expect(validateRequest(validBody({ athlete_id: null }))).toBeNull();
  });

  it('accepts valid string athlete_id', () => {
    expect(validateRequest(validBody({ athlete_id: 'uuid-123' }))).toBeNull();
  });

  it('rejects non-string athlete_id', () => {
    expect(validateRequest(validBody({ athlete_id: 42 }))).toBe('athlete_id must be a string');
  });
});

// =============================================================================
// Full valid request
// =============================================================================

describe('validateRequest – valid requests', () => {
  it('accepts minimal valid request', () => {
    expect(
      validateRequest({
        content: 'Training zone explanation',
        title: 'Zone 2 training',
        content_type: 'knowledge',
      })
    ).toBeNull();
  });

  it('accepts fully populated request', () => {
    expect(
      validateRequest({
        content: 'Training zone explanation',
        title: 'Zone 2 training',
        content_type: 'knowledge',
        source_id: 'doc-001',
        chunk_index: 3,
        metadata: { sport: 'cycling', category: 'physiology' },
        athlete_id: 'athlete-uuid-123',
      })
    ).toBeNull();
  });
});
