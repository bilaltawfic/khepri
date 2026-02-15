import { fireEvent, render } from '@testing-library/react-native';

import { GYM_TEMPLATES, TRAVEL_TEMPLATES } from '@khepri/core';

import type { UseWorkoutTemplatesReturn } from '@/hooks/useWorkoutTemplates';

import WorkoutListScreen from '../index';

const mockSetSource = jest.fn();
const mockSetCategory = jest.fn();
const mockSetDifficulty = jest.fn();
const mockGetTemplateById = jest.fn();

const allTemplates = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];

let mockReturn: UseWorkoutTemplatesReturn = {
  templates: allTemplates,
  source: 'all',
  setSource: mockSetSource,
  category: null,
  setCategory: mockSetCategory,
  difficulty: null,
  setDifficulty: mockSetDifficulty,
  getTemplateById: mockGetTemplateById,
};

jest.mock('@/hooks', () => ({
  useWorkoutTemplates: () => mockReturn,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

describe('WorkoutListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturn = {
      templates: allTemplates,
      source: 'all',
      setSource: mockSetSource,
      category: null,
      setCategory: mockSetCategory,
      difficulty: null,
      setDifficulty: mockSetDifficulty,
      getTemplateById: mockGetTemplateById,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<WorkoutListScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all template names', () => {
    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    for (const t of allTemplates) {
      expect(json).toContain(t.name);
    }
  });

  it('renders filter chips for source', () => {
    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('All');
    expect(json).toContain('Gym');
    expect(json).toContain('Travel');
  });

  it('renders filter chips for categories', () => {
    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('All Categories');
    expect(json).toContain('Strength');
    expect(json).toContain('Mobility');
    expect(json).toContain('Core');
    expect(json).toContain('Plyometric');
  });

  it('renders filter chips for difficulty', () => {
    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('All Difficulties');
    expect(json).toContain('Beginner');
    expect(json).toContain('Intermediate');
    expect(json).toContain('Advanced');
  });

  it('shows empty state when no templates match', () => {
    mockReturn = { ...mockReturn, templates: [] };

    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain('No Workouts Found');
    expect(json).toContain('Try adjusting your filters');
  });

  it('displays exercise count for each template', () => {
    mockReturn = { ...mockReturn, templates: [GYM_TEMPLATES[0]] };

    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(`${GYM_TEMPLATES[0].exercises.length} exercises`);
  });

  it('displays duration for templates', () => {
    mockReturn = { ...mockReturn, templates: [GYM_TEMPLATES[0]] };

    const { toJSON } = render(<WorkoutListScreen />);
    const json = JSON.stringify(toJSON());

    expect(json).toContain(`${GYM_TEMPLATES[0].estimatedDurationMinutes}min`);
  });

  it('calls setSource when source chip is pressed', () => {
    const { getByLabelText } = render(<WorkoutListScreen />);

    fireEvent.press(getByLabelText('Gym'));
    expect(mockSetSource).toHaveBeenCalledWith('gym');
  });

  it('calls setCategory when category chip is pressed', () => {
    const { getByLabelText } = render(<WorkoutListScreen />);

    fireEvent.press(getByLabelText('Strength'));
    expect(mockSetCategory).toHaveBeenCalledWith('strength');
  });

  it('calls setDifficulty when difficulty chip is pressed', () => {
    const { getByLabelText } = render(<WorkoutListScreen />);

    fireEvent.press(getByLabelText('Beginner'));
    expect(mockSetDifficulty).toHaveBeenCalledWith('beginner');
  });

  it('calls setCategory with null when All Categories chip is pressed', () => {
    mockReturn = { ...mockReturn, category: 'strength' };

    const { getByLabelText } = render(<WorkoutListScreen />);
    fireEvent.press(getByLabelText('All Categories'));
    expect(mockSetCategory).toHaveBeenCalledWith(null);
  });

  it('navigates to detail screen when template card is pressed', () => {
    const { router: mockRouter } = jest.requireMock('expo-router');
    mockReturn = { ...mockReturn, templates: [GYM_TEMPLATES[0]] };

    const { getByLabelText } = render(<WorkoutListScreen />);

    const cardLabel = `${GYM_TEMPLATES[0].name}, Strength, Intermediate, ${GYM_TEMPLATES[0].estimatedDurationMinutes} minutes, ${GYM_TEMPLATES[0].exercises.length} exercises`;
    fireEvent.press(getByLabelText(cardLabel));
    expect(mockRouter.push).toHaveBeenCalledWith(`/workouts/${GYM_TEMPLATES[0].id}`);
  });

  it('has accessibility attributes on filter chips', () => {
    const { getByLabelText } = render(<WorkoutListScreen />);

    const gymChip = getByLabelText('Gym');
    expect(gymChip).toBeTruthy();
    // On web, accessibilityRole="button" renders as role="button"
    expect(gymChip.props.accessibilityRole ?? gymChip.props.role).toBe('button');
  });
});
