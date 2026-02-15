import { describe, expect, it } from '@jest/globals';
import {
  DIFFICULTY_LEVELS,
  GYM_TEMPLATES,
  MUSCLE_GROUPS,
  WORKOUT_CATEGORIES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
  isDifficultyLevel,
  isMuscleGroup,
  isWorkoutCategory,
} from '../index.js';

// ============================================================================
// Template validation
// ============================================================================

describe('GYM_TEMPLATES validation', () => {
  it('should have at least one template', () => {
    expect(GYM_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('should have unique IDs across all templates', () => {
    const ids = GYM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const template of GYM_TEMPLATES) {
    describe(`template "${template.id}"`, () => {
      it('should have a valid category', () => {
        expect(isWorkoutCategory(template.category)).toBe(true);
      });

      it('should have a valid difficulty', () => {
        expect(isDifficultyLevel(template.difficulty)).toBe(true);
      });

      it('should have estimatedDurationMinutes > 0', () => {
        expect(template.estimatedDurationMinutes).toBeGreaterThan(0);
      });

      it('should have estimatedTss >= 0', () => {
        expect(template.estimatedTss).toBeGreaterThanOrEqual(0);
      });

      it('should have at least one exercise', () => {
        expect(template.exercises.length).toBeGreaterThan(0);
      });

      it('should have non-empty tags', () => {
        expect(template.tags.length).toBeGreaterThan(0);
      });

      it('should have non-empty targetMuscles', () => {
        expect(template.targetMuscles.length).toBeGreaterThan(0);
      });

      it('should have all targetMuscles be valid MuscleGroup values', () => {
        const validMuscles = new Set<string>(MUSCLE_GROUPS);
        for (const muscle of template.targetMuscles) {
          expect(validMuscles.has(muscle)).toBe(true);
        }
      });

      it('should have template targetMuscles cover all exercise targetMuscles', () => {
        const templateMuscles = new Set<string>(template.targetMuscles);
        for (const exercise of template.exercises) {
          for (const muscle of exercise.targetMuscles) {
            expect(templateMuscles.has(muscle)).toBe(true);
          }
        }
      });

      for (const exercise of template.exercises) {
        describe(`exercise "${exercise.name}"`, () => {
          it('should have sets > 0', () => {
            expect(exercise.sets).toBeGreaterThan(0);
          });

          it('should have restSeconds >= 0', () => {
            expect(exercise.restSeconds).toBeGreaterThanOrEqual(0);
          });

          it('should have at least one target muscle', () => {
            expect(exercise.targetMuscles.length).toBeGreaterThan(0);
          });

          it('should have all targetMuscles be valid MuscleGroup values', () => {
            const validMuscles = new Set<string>(MUSCLE_GROUPS);
            for (const muscle of exercise.targetMuscles) {
              expect(validMuscles.has(muscle)).toBe(true);
            }
          });
        });
      }
    });
  }
});

// ============================================================================
// Lookup functions
// ============================================================================

describe('getGymTemplateById', () => {
  it('should return the correct template for a known ID', () => {
    const template = getGymTemplateById('cycling-lower-body');
    expect(template).toBeDefined();
    expect(template?.id).toBe('cycling-lower-body');
    expect(template?.name).toBe('Cycling Lower Body Strength');
  });

  it('should return undefined for an unknown ID', () => {
    expect(getGymTemplateById('nonexistent-template')).toBeUndefined();
  });

  it('should return undefined for an empty string', () => {
    expect(getGymTemplateById('')).toBeUndefined();
  });
});

describe('getGymTemplatesByCategory', () => {
  it('should return only strength templates', () => {
    const templates = getGymTemplatesByCategory('strength');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.category).toBe('strength');
    }
  });

  it('should return only core templates', () => {
    const templates = getGymTemplatesByCategory('core');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.category).toBe('core');
    }
  });

  it('should return only mobility templates', () => {
    const templates = getGymTemplatesByCategory('mobility');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.category).toBe('mobility');
    }
  });

  it('should return only plyometric templates', () => {
    const templates = getGymTemplatesByCategory('plyometric');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.category).toBe('plyometric');
    }
  });
});

describe('getGymTemplatesByDifficulty', () => {
  it('should return only beginner templates', () => {
    const templates = getGymTemplatesByDifficulty('beginner');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.difficulty).toBe('beginner');
    }
  });

  it('should return only intermediate templates', () => {
    const templates = getGymTemplatesByDifficulty('intermediate');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.difficulty).toBe('intermediate');
    }
  });

  it('should return only advanced templates', () => {
    const templates = getGymTemplatesByDifficulty('advanced');
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(t.difficulty).toBe('advanced');
    }
  });
});

// ============================================================================
// Type guards
// ============================================================================

describe('isDifficultyLevel', () => {
  it.each([...DIFFICULTY_LEVELS])('should accept "%s"', (level) => {
    expect(isDifficultyLevel(level)).toBe(true);
  });

  it('should reject invalid string', () => {
    expect(isDifficultyLevel('expert')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(isDifficultyLevel(42)).toBe(false);
    expect(isDifficultyLevel(null)).toBe(false);
    expect(isDifficultyLevel(undefined)).toBe(false);
    expect(isDifficultyLevel(true)).toBe(false);
  });
});

describe('isWorkoutCategory', () => {
  it.each([...WORKOUT_CATEGORIES])('should accept "%s"', (category) => {
    expect(isWorkoutCategory(category)).toBe(true);
  });

  it('should reject invalid string', () => {
    expect(isWorkoutCategory('cardio')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(isWorkoutCategory(42)).toBe(false);
    expect(isWorkoutCategory(null)).toBe(false);
    expect(isWorkoutCategory(undefined)).toBe(false);
    expect(isWorkoutCategory(true)).toBe(false);
  });
});

describe('isMuscleGroup', () => {
  it.each([...MUSCLE_GROUPS])('should accept "%s"', (group) => {
    expect(isMuscleGroup(group)).toBe(true);
  });

  it('should reject invalid string', () => {
    expect(isMuscleGroup('biceps')).toBe(false);
  });

  it('should reject non-string values', () => {
    expect(isMuscleGroup(42)).toBe(false);
    expect(isMuscleGroup(null)).toBe(false);
    expect(isMuscleGroup(undefined)).toBe(false);
    expect(isMuscleGroup(true)).toBe(false);
  });
});
