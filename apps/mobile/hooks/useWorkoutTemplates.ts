import { useMemo, useState } from 'react';

import {
  type DifficultyLevel,
  GYM_TEMPLATES,
  TRAVEL_TEMPLATES,
  type WorkoutCategory,
  type WorkoutTemplate,
} from '@khepri/core';

type TemplateSource = 'all' | 'gym' | 'travel';

export type UseWorkoutTemplatesReturn = {
  readonly templates: readonly WorkoutTemplate[];
  readonly source: TemplateSource;
  readonly setSource: (source: TemplateSource) => void;
  readonly category: WorkoutCategory | null;
  readonly setCategory: (category: WorkoutCategory | null) => void;
  readonly difficulty: DifficultyLevel | null;
  readonly setDifficulty: (difficulty: DifficultyLevel | null) => void;
  readonly getTemplateById: (id: string) => WorkoutTemplate | undefined;
};

export function useWorkoutTemplates(): UseWorkoutTemplatesReturn {
  const [source, setSource] = useState<TemplateSource>('all');
  const [category, setCategory] = useState<WorkoutCategory | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);

  const templates = useMemo(() => {
    let base: readonly WorkoutTemplate[];
    switch (source) {
      case 'gym':
        base = GYM_TEMPLATES;
        break;
      case 'travel':
        base = TRAVEL_TEMPLATES;
        break;
      case 'all':
        base = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];
        break;
    }

    return base.filter((t) => {
      if (category != null && t.category !== category) return false;
      if (difficulty != null && t.difficulty !== difficulty) return false;
      return true;
    });
  }, [source, category, difficulty]);

  const getTemplateById = useMemo(() => {
    const combined = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];
    return (id: string) => combined.find((t) => t.id === id);
  }, []);

  return {
    templates,
    source,
    setSource,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    getTemplateById,
  };
}
