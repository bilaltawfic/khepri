import {
  DEFAULT_MATCH_COUNT,
  DEFAULT_MATCH_THRESHOLD,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  MAX_MATCH_COUNT,
  MAX_QUERY_LENGTH,
  VALID_CONTENT_TYPES,
} from '../types.ts';

describe('semantic-search constants', () => {
  it('uses text-embedding-3-small model', () => {
    expect(EMBEDDING_MODEL).toBe('text-embedding-3-small');
  });

  it('expects 1536 dimensions', () => {
    expect(EMBEDDING_DIMENSIONS).toBe(1536);
  });

  it('has a reasonable query length limit', () => {
    expect(MAX_QUERY_LENGTH).toBe(2000);
    expect(MAX_QUERY_LENGTH).toBeGreaterThan(0);
  });

  it('caps match count at 20', () => {
    expect(MAX_MATCH_COUNT).toBe(20);
    expect(MAX_MATCH_COUNT).toBeGreaterThan(0);
  });

  it('defaults to 5 results', () => {
    expect(DEFAULT_MATCH_COUNT).toBe(5);
    expect(DEFAULT_MATCH_COUNT).toBeGreaterThan(0);
    expect(DEFAULT_MATCH_COUNT).toBeLessThanOrEqual(MAX_MATCH_COUNT);
  });

  it('defaults to 0.7 similarity threshold', () => {
    expect(DEFAULT_MATCH_THRESHOLD).toBe(0.7);
    expect(DEFAULT_MATCH_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_MATCH_THRESHOLD).toBeLessThanOrEqual(1);
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
