import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { GYM_TEMPLATES, TRAVEL_TEMPLATES } from '@khepri/core';

import type { UseWorkoutTemplatesReturn } from '@/hooks/useWorkoutTemplates';

import WorkoutDetailScreen from '../[id]';

const allTemplates = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];

function findTemplateById(id: string) {
  return allTemplates.find((t) => t.id === id);
}

let mockReturn: UseWorkoutTemplatesReturn;

jest.mock('@/hooks', () => ({
  useWorkoutTemplates: () => mockReturn,
}));

describe('WorkoutDetailScreen', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: GYM_TEMPLATES[0].id });
    mockReturn = {
      templates: allTemplates,
      source: 'all',
      setSource: jest.fn(),
      category: null,
      setCategory: jest.fn(),
      difficulty: null,
      setDifficulty: jest.fn(),
      getTemplateById: findTemplateById,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays template name and description', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(GYM_TEMPLATES[0].name);
    expect(json).toContain(GYM_TEMPLATES[0].description);
  });

  it('displays template metadata', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(`${GYM_TEMPLATES[0].estimatedDurationMinutes}min`);
    expect(json).toContain(`${GYM_TEMPLATES[0].estimatedTss} TSS`);
    expect(json).toContain('Strength');
    expect(json).toContain('Intermediate');
  });

  it('displays exercise count in section title', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(`Exercises (${GYM_TEMPLATES[0].exercises.length})`);
  });

  it('displays all exercise names', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    for (const ex of GYM_TEMPLATES[0].exercises) {
      expect(json).toContain(ex.name);
    }
  });

  it('displays sets and reps for exercises', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    const firstExercise = GYM_TEMPLATES[0].exercises[0];
    expect(json).toContain(String(firstExercise.sets));
    expect(json).toContain(
      typeof firstExercise.reps === 'number' ? String(firstExercise.reps) : firstExercise.reps
    );
  });

  it('displays rest seconds for exercises', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    const firstExercise = GYM_TEMPLATES[0].exercises[0];
    expect(json).toContain(`${firstExercise.restSeconds}s`);
  });

  it('displays exercise notes when present', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    const exerciseWithNotes = GYM_TEMPLATES[0].exercises.find((e) => e.notes != null);
    if (exerciseWithNotes?.notes != null) {
      expect(json).toContain(exerciseWithNotes.notes);
    }
  });

  it('displays target muscle tags', () => {
    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    // Check that at least one muscle name appears formatted
    expect(json).toContain('Quadriceps');
  });

  it('renders travel template correctly', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: TRAVEL_TEMPLATES[0].id });

    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(TRAVEL_TEMPLATES[0].name);
    expect(json).toContain(TRAVEL_TEMPLATES[0].description);
  });

  it('shows error state for invalid id', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'nonexistent-template' });

    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Workout Not Found');
  });

  it('shows error state when id is undefined', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { toJSON } = render(<WorkoutDetailScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Workout Not Found');
  });

  it('has accessibility attributes on exercise cards', () => {
    const { getByLabelText } = render(<WorkoutDetailScreen />);

    const firstExercise = GYM_TEMPLATES[0].exercises[0];
    const reps =
      typeof firstExercise.reps === 'number' ? String(firstExercise.reps) : firstExercise.reps;
    const label = `Exercise 1: ${firstExercise.name}, ${firstExercise.sets} sets of ${reps}`;
    expect(getByLabelText(label)).toBeTruthy();
  });
});
