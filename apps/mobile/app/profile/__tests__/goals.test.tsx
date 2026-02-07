import { fireEvent, render } from '@testing-library/react-native';
import GoalsScreen, { getGoalSubtitle, GoalCard, type Goal } from '../goals';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: mockRouterPush,
  },
}));

// Note: formatDate and formatDuration are tested in utils/__tests__/formatters.test.ts

describe('getGoalSubtitle', () => {
  it('returns race subtitle with distance and location', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'race',
      title: 'Ironman',
      priority: 'A',
      status: 'active',
      raceDistance: '140.6 miles',
      raceLocation: 'Kona, Hawaii',
    };
    expect(getGoalSubtitle(goal)).toBe('140.6 miles | Kona, Hawaii');
  });

  it('returns race subtitle with target time', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'race',
      title: 'Marathon',
      priority: 'A',
      status: 'active',
      raceTargetTimeSeconds: 10800, // 3 hours
    };
    expect(getGoalSubtitle(goal)).toBe('Target: 3:00:00');
  });

  it('returns fallback for empty race goal', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'race',
      title: 'Race',
      priority: 'A',
      status: 'active',
    };
    expect(getGoalSubtitle(goal)).toBe('Race goal');
  });

  it('returns performance subtitle with current and target values', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'performance',
      title: 'FTP',
      priority: 'B',
      status: 'active',
      perfMetric: 'FTP',
      perfCurrentValue: 250,
      perfTargetValue: 280,
    };
    expect(getGoalSubtitle(goal)).toBe('FTP: 250 -> 280');
  });

  it('returns performance fallback for incomplete data', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'performance',
      title: 'FTP',
      priority: 'B',
      status: 'active',
      perfMetric: 'FTP',
    };
    expect(getGoalSubtitle(goal)).toBe('FTP');
  });

  it('returns fitness subtitle with target value', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'fitness',
      title: 'Weekly Mileage',
      priority: 'B',
      status: 'active',
      fitnessMetric: 'km/week',
      fitnessTargetValue: 50,
    };
    expect(getGoalSubtitle(goal)).toBe('Target: 50 km/week');
  });

  it('returns health subtitle with current and target values', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'health',
      title: 'Weight',
      priority: 'C',
      status: 'active',
      healthMetric: 'kg',
      healthCurrentValue: 80,
      healthTargetValue: 75,
    };
    expect(getGoalSubtitle(goal)).toBe('kg: 80 -> 75');
  });
});

describe('GoalCard', () => {
  const mockOnPress = jest.fn();
  const mockGoal: Goal = {
    id: '1',
    goalType: 'race',
    title: 'Ironman 70.3',
    priority: 'A',
    status: 'active',
    raceDistance: '70.3 miles',
    targetDate: new Date('2024-09-15'),
  };

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders goal title', () => {
    const { toJSON } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain('Ironman 70.3');
  });

  it('renders priority badge', () => {
    const { toJSON } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"A"'); // Priority badge text
  });

  it('calls onPress when pressed', () => {
    const { getByLabelText } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const card = getByLabelText('Ironman 70.3, Race goal, priority A');
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders goal subtitle', () => {
    const { toJSON } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain('70.3 miles');
  });

  it('renders target date when present', () => {
    const { toJSON } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sep');
    expect(json).toContain('15');
    expect(json).toContain('2024');
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <GoalCard goal={mockGoal} colorScheme="light" onPress={mockOnPress} />
    );
    expect(getByLabelText('Ironman 70.3, Race goal, priority A')).toBeTruthy();
  });
});

describe('GoalsScreen', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('renders empty state when no goals exist', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No active goals yet');
  });

  it('renders all add goal type cards with correct accessibility labels', () => {
    const { getByLabelText } = render(<GoalsScreen />);
    expect(getByLabelText('Add race goal')).toBeTruthy();
    expect(getByLabelText('Add performance goal')).toBeTruthy();
    expect(getByLabelText('Add fitness goal')).toBeTruthy();
    expect(getByLabelText('Add health goal')).toBeTruthy();
  });

  it('renders goal type descriptions', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("A specific event you're training for");
    expect(json).toContain('A fitness metric you want to improve');
    expect(json).toContain('Volume or consistency targets');
    expect(json).toContain('Weight, wellness, or lifestyle targets');
  });

  // Note: Navigation tests via fireEvent.press on Pressable are unreliable
  // in React Native Testing Library. Navigation is tested via E2E tests.

  it('renders priority tip', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Set priorities (A/B/C)');
  });

  it('renders ADD A GOAL section', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ADD A GOAL');
  });
});
