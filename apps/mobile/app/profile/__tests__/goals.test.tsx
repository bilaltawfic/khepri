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

// Configurable mock state for useGoals
const mockUseGoalsState = {
  goals: [] as unknown[],
  isLoading: false,
  error: null as string | null,
};

// Mock useGoals hook with configurable state
jest.mock('@/hooks', () => ({
  useGoals: () => ({
    ...mockUseGoalsState,
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    getGoal: jest.fn(),
    refetch: jest.fn(),
  }),
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

  it('returns fitness fallback with only metric (no target value)', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'fitness',
      title: 'Running Volume',
      priority: 'B',
      status: 'active',
      fitnessMetric: 'km/week',
    };
    expect(getGoalSubtitle(goal)).toBe('km/week');
  });

  it('returns fitness fallback when no metric or target', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'fitness',
      title: 'Weekly Volume',
      priority: 'B',
      status: 'active',
    };
    expect(getGoalSubtitle(goal)).toBe('Fitness goal');
  });

  it('returns health fallback with only metric (no values)', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'health',
      title: 'Weight Goal',
      priority: 'C',
      status: 'active',
      healthMetric: 'lbs',
    };
    expect(getGoalSubtitle(goal)).toBe('lbs');
  });

  it('returns health fallback when no metric or values', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'health',
      title: 'Health Goal',
      priority: 'C',
      status: 'active',
    };
    expect(getGoalSubtitle(goal)).toBe('Health goal');
  });

  it('returns performance fallback when no metric', () => {
    const goal: Goal = {
      id: '1',
      goalType: 'performance',
      title: 'Get Faster',
      priority: 'A',
      status: 'active',
    };
    expect(getGoalSubtitle(goal)).toBe('Performance goal');
  });

  it('returns empty string for unknown goal type', () => {
    const goal = {
      id: '1',
      goalType: 'unknown' as Goal['goalType'],
      title: 'Unknown',
      priority: 'A',
      status: 'active',
    } as Goal;
    expect(getGoalSubtitle(goal)).toBe('');
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

  it('renders performance goal with trending-up icon', () => {
    const performanceGoal: Goal = {
      id: '2',
      goalType: 'performance',
      title: 'Increase FTP',
      priority: 'B',
      status: 'active',
      perfMetric: 'FTP',
      perfCurrentValue: 250,
      perfTargetValue: 280,
    };
    const { toJSON } = render(
      <GoalCard goal={performanceGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('trending-up');
    expect(json).toContain('Increase FTP');
  });

  it('renders fitness goal with fitness icon', () => {
    const fitnessGoal: Goal = {
      id: '3',
      goalType: 'fitness',
      title: 'Weekly Mileage',
      priority: 'B',
      status: 'active',
      fitnessMetric: 'km/week',
      fitnessTargetValue: 50,
    };
    const { toJSON } = render(
      <GoalCard goal={fitnessGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('fitness');
    expect(json).toContain('Weekly Mileage');
  });

  it('renders health goal with heart icon', () => {
    const healthGoal: Goal = {
      id: '4',
      goalType: 'health',
      title: 'Target Weight',
      priority: 'C',
      status: 'active',
      healthMetric: 'kg',
      healthCurrentValue: 80,
      healthTargetValue: 75,
    };
    const { toJSON } = render(
      <GoalCard goal={healthGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('heart');
    expect(json).toContain('Target Weight');
  });

  it('renders goal without target date', () => {
    const goalNoDate: Goal = {
      id: '5',
      goalType: 'race',
      title: 'Future Race',
      priority: 'A',
      status: 'active',
    };
    const { toJSON } = render(
      <GoalCard goal={goalNoDate} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Future Race');
    // No date should be rendered
    expect(json).not.toContain('2024');
  });

  it('renders priority B badge correctly', () => {
    const priorityBGoal: Goal = {
      id: '6',
      goalType: 'performance',
      title: 'Secondary Goal',
      priority: 'B',
      status: 'active',
    };
    const { toJSON } = render(
      <GoalCard goal={priorityBGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"B"');
  });

  it('renders priority C badge correctly', () => {
    const priorityCGoal: Goal = {
      id: '7',
      goalType: 'health',
      title: 'Maintenance Goal',
      priority: 'C',
      status: 'active',
    };
    const { toJSON } = render(
      <GoalCard goal={priorityCGoal} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"C"');
  });

  it('renders in dark mode', () => {
    const { toJSON } = render(
      <GoalCard goal={mockGoal} colorScheme="dark" onPress={mockOnPress} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// Loading and error state tests
describe('GoalsScreen loading state', () => {
  afterEach(() => {
    // Reset mock state after each test
    mockUseGoalsState.goals = [];
    mockUseGoalsState.isLoading = false;
    mockUseGoalsState.error = null;
  });

  it('renders loading indicator when isLoading is true', () => {
    mockUseGoalsState.isLoading = true;
    mockUseGoalsState.error = null;

    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading goals...');
  });

  it('renders error state when error is present', () => {
    mockUseGoalsState.isLoading = false;
    mockUseGoalsState.error = 'Network error: Unable to fetch goals';

    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Failed to load goals');
    expect(json).toContain('Network error: Unable to fetch goals');
    expect(json).toContain('alert-circle-outline');
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

  // Note: Navigation tests via fireEvent.press on nested Pressable components
  // are unreliable in React Native Testing Library. Navigation is verified via E2E tests.

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

  it('renders bulb icon for tip', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bulb-outline');
  });

  it('renders flag icon for empty state', () => {
    const { toJSON } = render(<GoalsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('flag-outline');
  });
});
