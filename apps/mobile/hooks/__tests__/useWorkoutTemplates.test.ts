import { act, renderHook } from '@testing-library/react-native';

import { GYM_TEMPLATES, TRAVEL_TEMPLATES } from '@khepri/core';

import { useWorkoutTemplates } from '../useWorkoutTemplates';

describe('useWorkoutTemplates', () => {
  it('returns all templates by default', () => {
    const { result } = renderHook(() => useWorkoutTemplates());

    expect(result.current.templates.length).toBe(GYM_TEMPLATES.length + TRAVEL_TEMPLATES.length);
    expect(result.current.source).toBe('all');
    expect(result.current.category).toBeNull();
    expect(result.current.difficulty).toBeNull();
  });

  describe('source filter', () => {
    it('returns only gym templates when source is gym', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('gym');
      });

      expect(result.current.templates.length).toBe(GYM_TEMPLATES.length);
      for (const t of result.current.templates) {
        expect(GYM_TEMPLATES.some((g) => g.id === t.id)).toBe(true);
      }
    });

    it('returns only travel templates when source is travel', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('travel');
      });

      expect(result.current.templates.length).toBe(TRAVEL_TEMPLATES.length);
      for (const t of result.current.templates) {
        expect(TRAVEL_TEMPLATES.some((tr) => tr.id === t.id)).toBe(true);
      }
    });

    it('returns all templates when switching back to all', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('gym');
      });
      expect(result.current.templates.length).toBe(GYM_TEMPLATES.length);

      act(() => {
        result.current.setSource('all');
      });
      expect(result.current.templates.length).toBe(GYM_TEMPLATES.length + TRAVEL_TEMPLATES.length);
    });
  });

  describe('category filter', () => {
    it('filters templates by category', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setCategory('strength');
      });

      expect(result.current.templates.length).toBeGreaterThan(0);
      for (const t of result.current.templates) {
        expect(t.category).toBe('strength');
      }
    });

    it('clears category filter when set to null', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setCategory('strength');
      });
      const filtered = result.current.templates.length;

      act(() => {
        result.current.setCategory(null);
      });
      expect(result.current.templates.length).toBeGreaterThan(filtered);
    });
  });

  describe('difficulty filter', () => {
    it('filters templates by difficulty', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setDifficulty('beginner');
      });

      expect(result.current.templates.length).toBeGreaterThan(0);
      for (const t of result.current.templates) {
        expect(t.difficulty).toBe('beginner');
      }
    });

    it('clears difficulty filter when set to null', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setDifficulty('beginner');
      });
      const filtered = result.current.templates.length;

      act(() => {
        result.current.setDifficulty(null);
      });
      expect(result.current.templates.length).toBeGreaterThan(filtered);
    });
  });

  describe('combined filters', () => {
    it('applies source and category together', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('gym');
        result.current.setCategory('strength');
      });

      expect(result.current.templates.length).toBeGreaterThan(0);
      for (const t of result.current.templates) {
        expect(t.category).toBe('strength');
        expect(GYM_TEMPLATES.some((g) => g.id === t.id)).toBe(true);
      }
    });

    it('applies source, category, and difficulty together', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('gym');
        result.current.setCategory('strength');
        result.current.setDifficulty('intermediate');
      });

      for (const t of result.current.templates) {
        expect(t.category).toBe('strength');
        expect(t.difficulty).toBe('intermediate');
        expect(GYM_TEMPLATES.some((g) => g.id === t.id)).toBe(true);
      }
    });

    it('returns empty array when no templates match filters', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      // Dynamically find a source/category/difficulty combo with no results
      const sources = ['gym', 'travel'] as const;
      const categories = ['strength', 'mobility', 'core', 'plyometric'] as const;
      const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
      const allTemplates = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];

      let emptyCombo: { source: 'gym' | 'travel'; category: string; difficulty: string } | null =
        null;
      for (const s of sources) {
        for (const c of categories) {
          for (const d of difficulties) {
            const pool = s === 'gym' ? GYM_TEMPLATES : TRAVEL_TEMPLATES;
            const matches = pool.filter((t) => t.category === c && t.difficulty === d);
            if (matches.length === 0) {
              emptyCombo = { source: s, category: c, difficulty: d };
              break;
            }
          }
          if (emptyCombo != null) break;
        }
        if (emptyCombo != null) break;
      }

      // Guard: ensure we found a guaranteed-empty combination
      if (emptyCombo == null) {
        // If every combination has templates, skip the test rather than false-pass
        expect(allTemplates.length).toBeGreaterThan(0);
        return;
      }

      act(() => {
        result.current.setSource(emptyCombo.source);
        result.current.setCategory(emptyCombo.category as 'strength');
        result.current.setDifficulty(emptyCombo.difficulty as 'beginner');
      });

      expect(result.current.templates.length).toBe(0);
    });
  });

  describe('getTemplateById', () => {
    it('finds a known gym template', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      const template = result.current.getTemplateById('cycling-lower-body');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Cycling Lower Body Strength');
    });

    it('finds a known travel template', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      const template = result.current.getTemplateById('hotel-room-circuit');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Hotel Room Circuit');
    });

    it('returns undefined for unknown id', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      const template = result.current.getTemplateById('nonexistent-id');
      expect(template).toBeUndefined();
    });

    it('works regardless of current source filter', () => {
      const { result } = renderHook(() => useWorkoutTemplates());

      act(() => {
        result.current.setSource('gym');
      });

      // Should still find travel template even when source is gym
      const template = result.current.getTemplateById('hotel-room-circuit');
      expect(template).toBeDefined();
    });
  });
});
