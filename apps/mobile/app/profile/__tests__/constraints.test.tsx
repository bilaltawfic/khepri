import { fireEvent, render } from '@testing-library/react-native';
import ConstraintsScreen, {
  getConstraintSubtitle,
  ConstraintCard,
  type Constraint,
} from '../constraints';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: mockRouterPush,
  },
}));

// Note: formatDate and formatDateRange are tested in utils/__tests__/formatters.test.ts

describe('getConstraintSubtitle', () => {
  it('returns injury subtitle with body part and severity', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'injury',
      title: 'Knee pain',
      startDate: new Date(),
      status: 'active',
      injuryBodyPart: 'left_knee',
      injurySeverity: 'moderate',
    };
    expect(getConstraintSubtitle(constraint)).toBe('left knee | Moderate');
  });

  it('returns fallback for empty injury', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'injury',
      title: 'Injury',
      startDate: new Date(),
      status: 'active',
    };
    expect(getConstraintSubtitle(constraint)).toBe('Injury');
  });

  it('returns travel destination', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'travel',
      title: 'Business trip',
      startDate: new Date(),
      status: 'active',
      travelDestination: 'New York',
    };
    expect(getConstraintSubtitle(constraint)).toBe('New York');
  });

  it('returns fallback for empty travel', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'travel',
      title: 'Trip',
      startDate: new Date(),
      status: 'active',
    };
    expect(getConstraintSubtitle(constraint)).toBe('Travel period');
  });

  it('returns availability hours', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'availability',
      title: 'Reduced schedule',
      startDate: new Date(),
      status: 'active',
      availabilityHoursPerWeek: 5,
    };
    expect(getConstraintSubtitle(constraint)).toBe('5 hours/week available');
  });

  it('returns fallback for empty availability', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'availability',
      title: 'Schedule change',
      startDate: new Date(),
      status: 'active',
    };
    expect(getConstraintSubtitle(constraint)).toBe('Schedule change');
  });
});

describe('ConstraintCard', () => {
  const mockOnPress = jest.fn();
  const mockConstraint: Constraint = {
    id: '1',
    constraintType: 'injury',
    title: "Runner's knee",
    startDate: new Date('2024-06-01'),
    status: 'active',
    injuryBodyPart: 'left_knee',
    injurySeverity: 'moderate',
  };

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders constraint title', () => {
    const { toJSON } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain("Runner's knee");
  });

  it('calls onPress when pressed', () => {
    const { getByLabelText } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    const card = getByLabelText("Runner's knee, Injury, active");
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders constraint subtitle', () => {
    const { toJSON } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain('left knee');
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    expect(getByLabelText("Runner's knee, Injury, active")).toBeTruthy();
  });

  it('shows resolved status correctly', () => {
    const resolved: Constraint = { ...mockConstraint, status: 'resolved' };
    const { getByLabelText } = render(
      <ConstraintCard constraint={resolved} colorScheme="light" onPress={mockOnPress} />
    );
    expect(getByLabelText("Runner's knee, Injury, resolved")).toBeTruthy();
  });
});

describe('ConstraintsScreen', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
  });

  it('renders empty state when no constraints exist', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No active constraints');
  });

  it('renders description text', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Tell Khepri about things that affect your training');
  });

  it('renders all add constraint type cards with correct accessibility labels', () => {
    const { getByLabelText } = render(<ConstraintsScreen />);
    expect(getByLabelText('Add injury')).toBeTruthy();
    expect(getByLabelText('Add travel')).toBeTruthy();
    expect(getByLabelText('Add availability change')).toBeTruthy();
  });

  it('renders constraint type descriptions', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Log an injury to adjust training');
    expect(json).toContain('Traveling with limited equipment');
    expect(json).toContain('Temporary schedule changes');
  });

  // Note: Navigation tests via fireEvent.press on Pressable are unreliable
  // in React Native Testing Library. Navigation is tested via E2E tests.

  it('renders tip about constraints', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Khepri will automatically adjust');
  });

  it('renders ADD A CONSTRAINT section', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ADD A CONSTRAINT');
  });
});
