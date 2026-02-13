import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  MAX_CONTENT_LENGTH,
  VALID_CONTENT_TYPES,
} from '../types.ts';

describe('embedding constants', () => {
  it('uses text-embedding-3-small model', () => {
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
  });

  it('expects 1536 dimensions', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });

  it('has a reasonable content length limit', () => {
    expect(MAX_CONTENT_LENGTH).toBe(30_000);
    expect(MAX_CONTENT_LENGTH).toBeGreaterThan(0);
  });

  it('defines exactly three content types', () => {
    expect(VALID_CONTENT_TYPES).toEqual(['knowledge', 'conversation', 'activity']);
    expect(VALID_CONTENT_TYPES).toHaveLength(3);
  });

  it('VALID_CONTENT_TYPES entries are all non-empty strings', () => {
    for (const type of VALID_CONTENT_TYPES) {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    }
  });
});
