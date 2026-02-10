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

// Mock useConstraints hook
const mockUseConstraints = jest.fn();
jest.mock('@/hooks', () => ({
  useConstraints: () => mockUseConstraints(),
}));

const defaultHookReturn = {
  constraints: [],
  isLoading: false,
  error: null,
  getConstraint: jest.fn(),
  createConstraint: jest.fn(),
  updateConstraint: jest.fn(),
  deleteConstraint: jest.fn(),
  resolveConstraint: jest.fn(),
  refetch: jest.fn(),
};

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

  it('returns injury with only body part', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'injury',
      title: 'Shoulder pain',
      startDate: new Date(),
      status: 'active',
      injuryBodyPart: 'right_shoulder',
    };
    expect(getConstraintSubtitle(constraint)).toBe('right shoulder');
  });

  it('returns injury with only severity', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'injury',
      title: 'General soreness',
      startDate: new Date(),
      status: 'active',
      injurySeverity: 'mild',
    };
    expect(getConstraintSubtitle(constraint)).toBe('Mild');
  });

  it('returns injury with severe severity', () => {
    const constraint: Constraint = {
      id: '1',
      constraintType: 'injury',
      title: 'Stress fracture',
      startDate: new Date(),
      status: 'active',
      injuryBodyPart: 'shin',
      injurySeverity: 'severe',
    };
    expect(getConstraintSubtitle(constraint)).toBe('shin | Severe');
  });

  it('returns empty string for unknown constraint type', () => {
    const constraint = {
      id: '1',
      constraintType: 'unknown' as Constraint['constraintType'],
      title: 'Unknown',
      startDate: new Date(),
      status: 'active',
    } as Constraint;
    expect(getConstraintSubtitle(constraint)).toBe('');
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

  it('renders resolved badge text', () => {
    const resolved: Constraint = { ...mockConstraint, status: 'resolved' };
    const { toJSON } = render(
      <ConstraintCard constraint={resolved} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain('Resolved');
  });

  it('renders travel constraint with airplane icon', () => {
    const travelConstraint: Constraint = {
      id: '2',
      constraintType: 'travel',
      title: 'Conference trip',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-05'),
      status: 'active',
      travelDestination: 'San Francisco',
    };
    const { toJSON } = render(
      <ConstraintCard constraint={travelConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('airplane-outline');
    expect(json).toContain('Conference trip');
    expect(json).toContain('San Francisco');
  });

  it('renders availability constraint with time icon', () => {
    const availConstraint: Constraint = {
      id: '3',
      constraintType: 'availability',
      title: 'Busy work week',
      startDate: new Date('2024-06-01'),
      status: 'active',
      availabilityHoursPerWeek: 3,
    };
    const { toJSON } = render(
      <ConstraintCard constraint={availConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('time-outline');
    expect(json).toContain('Busy work week');
    expect(json).toContain('3 hours/week available');
  });

  it('renders constraint with end date', () => {
    const constraintWithEnd: Constraint = {
      ...mockConstraint,
      endDate: new Date('2024-07-01'),
    };
    const { toJSON } = render(
      <ConstraintCard constraint={constraintWithEnd} colorScheme="light" onPress={mockOnPress} />
    );
    // Date range should be rendered
    expect(toJSON()).toBeTruthy();
  });

  it('renders in dark mode', () => {
    const { toJSON } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="dark" onPress={mockOnPress} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders bandage icon for injury constraint', () => {
    const { toJSON } = render(
      <ConstraintCard constraint={mockConstraint} colorScheme="light" onPress={mockOnPress} />
    );
    expect(JSON.stringify(toJSON())).toContain('bandage-outline');
  });
});

describe('ConstraintsScreen', () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    mockUseConstraints.mockReturnValue(defaultHookReturn);
  });

  it('renders empty state when no constraints exist', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No active constraints');
  });

  it('renders loading state', () => {
    mockUseConstraints.mockReturnValue({ ...defaultHookReturn, isLoading: true });
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading constraints...');
  });

  it('renders error state', () => {
    mockUseConstraints.mockReturnValue({
      ...defaultHookReturn,
      error: 'Failed to load constraints',
    });
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Failed to load constraints');
  });

  it('renders active constraints section with count', () => {
    const mockConstraints = [
      {
        id: 'c1',
        athlete_id: 'a1',
        constraint_type: 'injury',
        title: 'Knee Pain',
        description: null,
        start_date: '2026-02-01',
        end_date: null,
        status: 'active',
        injury_body_part: 'left_knee',
        injury_severity: 'moderate',
        injury_restrictions: null,
        travel_destination: null,
        travel_equipment_available: null,
        travel_facilities_available: null,
        availability_hours_per_week: null,
        availability_days_available: null,
        created_at: '',
        updated_at: '',
      },
    ];
    mockUseConstraints.mockReturnValue({
      ...defaultHookReturn,
      constraints: mockConstraints,
    });
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    // Note: React splits interpolated text, so we check parts separately
    expect(json).toContain('ACTIVE CONSTRAINTS');
    expect(json).toContain('Knee Pain');
    // Verify the constraint subtitle shows body part and severity
    expect(json).toContain('left knee');
    expect(json).toContain('Moderate');
  });

  it('renders both active and resolved constraints', () => {
    const mockConstraints = [
      {
        id: 'c1',
        athlete_id: 'a1',
        constraint_type: 'travel',
        title: 'Business Trip',
        description: null,
        start_date: '2026-02-01',
        end_date: '2026-02-05',
        status: 'active',
        injury_body_part: null,
        injury_severity: null,
        injury_restrictions: null,
        travel_destination: 'New York',
        travel_equipment_available: null,
        travel_facilities_available: null,
        availability_hours_per_week: null,
        availability_days_available: null,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'c2',
        athlete_id: 'a1',
        constraint_type: 'injury',
        title: 'Old Injury',
        description: null,
        start_date: '2026-01-01',
        end_date: '2026-01-15',
        status: 'resolved',
        injury_body_part: 'right_knee',
        injury_severity: 'mild',
        injury_restrictions: null,
        travel_destination: null,
        travel_equipment_available: null,
        travel_facilities_available: null,
        availability_hours_per_week: null,
        availability_days_available: null,
        created_at: '',
        updated_at: '',
      },
    ];
    mockUseConstraints.mockReturnValue({
      ...defaultHookReturn,
      constraints: mockConstraints,
    });
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    // Active section
    expect(json).toContain('ACTIVE CONSTRAINTS');
    expect(json).toContain('Business Trip');
    expect(json).toContain('New York');
    // Resolved section
    expect(json).toContain('RESOLVED');
    expect(json).toContain('Old Injury');
    expect(json).toContain('right knee');
  });

  it('hides empty state when active constraints exist', () => {
    const mockConstraints = [
      {
        id: 'c1',
        athlete_id: 'a1',
        constraint_type: 'availability',
        title: 'Busy Week',
        description: null,
        start_date: '2026-02-01',
        end_date: null,
        status: 'active',
        injury_body_part: null,
        injury_severity: null,
        injury_restrictions: null,
        travel_destination: null,
        travel_equipment_available: null,
        travel_facilities_available: null,
        availability_hours_per_week: 5,
        availability_days_available: ['monday', 'wednesday'],
        created_at: '',
        updated_at: '',
      },
    ];
    mockUseConstraints.mockReturnValue({
      ...defaultHookReturn,
      constraints: mockConstraints,
    });
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('No active constraints');
    expect(json).toContain('Busy Week');
    // Verify availability subtitle renders hours
    expect(json).toContain('5 hours/week available');
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

  it('renders checkmark icon for empty state', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('checkmark-circle-outline');
  });

  it('renders bulb icon for tip', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bulb-outline');
  });

  it('renders injury add card icon', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('bandage-outline');
  });

  it('renders travel add card icon', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('airplane-outline');
  });

  it('renders availability add card icon', () => {
    const { toJSON } = render(<ConstraintsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('time-outline');
  });
});
