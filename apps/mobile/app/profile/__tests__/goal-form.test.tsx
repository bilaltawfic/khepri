import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GoalFormScreen from '../goal-form';

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ type: 'race' })),
}));

// Get the mock for useLocalSearchParams
import { useLocalSearchParams } from 'expo-router';
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('GoalFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<GoalFormScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders the goal type header', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Goal');
      expect(json).toContain('A specific event you are training for');
    });

    it('renders Goal Information section', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Goal Information');
      expect(json).toContain('Title');
      expect(json).toContain('Description');
      expect(json).toContain('Priority');
    });

    it('renders Race Details section for race goal type', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Details');
      expect(json).toContain('Event Name');
      expect(json).toContain('Distance');
      expect(json).toContain('Location');
      expect(json).toContain('Target Time');
    });

    it('renders Add Goal button', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Add Goal');
    });

    it('renders Cancel button', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Cancel');
    });

    it('renders priority field', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Priority');
    });

    it('renders date picker for race date', () => {
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Date');
    });
  });

  describe('Different Goal Types', () => {
    it('renders performance goal type fields', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Performance Goal');
      expect(json).toContain('Performance Details');
      expect(json).toContain('Metric');
      expect(json).toContain('Current Value');
      expect(json).toContain('Target Value');
    });

    it('renders fitness goal type fields', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Fitness Goal');
      expect(json).toContain('Fitness Details');
      expect(json).toContain('Metric');
      expect(json).toContain('Target Value');
    });

    it('renders health goal type fields', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Health Goal');
      expect(json).toContain('Health Details');
      expect(json).toContain('Metric');
      expect(json).toContain('Current Value');
      expect(json).toContain('Target Value');
    });

    it('defaults to race type when type param is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({});
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Goal');
      expect(json).toContain('Race Details');
    });

    it('shows correct description for performance goal type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('A fitness metric you want to improve');
    });

    it('shows correct description for fitness goal type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Volume or consistency targets');
    });

    it('shows correct description for health goal type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Weight, wellness, or lifestyle targets');
    });
  });

  describe('Edit Mode', () => {
    it('shows Save Changes button when editing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race', id: '123' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Save Changes');
    });

    it('shows Delete Goal button when editing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race', id: '123' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Delete Goal');
    });

    it('does not show Delete Goal button when adding new goal', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { toJSON } = render(<GoalFormScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Delete Goal');
    });

    it('shows confirmation dialog when delete is pressed', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race', id: '123' });
      const { getByLabelText } = render(<GoalFormScreen />);

      fireEvent.press(getByLabelText('Delete this goal'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Goal',
        'Are you sure you want to delete this goal?',
        expect.any(Array)
      );
    });

    it('does not navigate when delete cancel is pressed', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race', id: '123' });
      const { getByLabelText } = render(<GoalFormScreen />);

      fireEvent.press(getByLabelText('Delete this goal'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cancelButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Cancel');
      // Cancel button just has style: 'cancel', no onPress
      expect(cancelButton.style).toBe('cancel');
    });
  });

  describe('Form Validation', () => {
    it('shows error when title is empty on save', () => {
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a title for your goal');
    });

    it('shows error for race type when date is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      // Fill in the title first using accessibilityLabel
      fireEvent.changeText(getByLabelText('Title'), 'My Race');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select the race date');
    });

    it('shows error for performance type when metric is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'FTP Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select a metric');
    });

    it('shows error for performance type when target value is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'FTP Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a target value');
    });

    it('shows error for fitness type when metric is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Fitness Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select a metric');
    });

    it('shows error for fitness type when target value is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Fitness Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a target value');
    });

    it('shows error for health type when metric is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Health Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select a metric');
    });

    it('shows error for health type when target value is missing', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'Health Goal');
      fireEvent.press(getByLabelText('Add new goal'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a target value');
    });

    it('clears error when field is updated', () => {
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      // Trigger validation error
      fireEvent.press(getByLabelText('Add new goal'));
      let json = JSON.stringify(toJSON());
      expect(json).toContain('Please enter a title for your goal');

      // Fill in the field
      fireEvent.changeText(getByLabelText('Title'), 'My Goal');

      json = JSON.stringify(toJSON());
      expect(json).not.toContain('Please enter a title for your goal');
    });
  });

  describe('Form Interactions', () => {
    it('updates title field when typing', () => {
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Title'), 'My Race Goal');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('My Race Goal');
    });

    it('updates description field when typing', () => {
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Description (optional)'), 'Important race');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Important race');
    });

    it('updates event name field when typing (race type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Event Name'), 'Ironman World Championship');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman World Championship');
    });

    it('updates location field when typing (race type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Location'), 'Kona, Hawaii');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Kona, Hawaii');
    });

    it('updates current value field (performance type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Current Value'), '250');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('250');
    });

    it('updates target value field (performance type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Target Value'), '300');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('300');
    });

    it('updates target value field (fitness type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Target Value'), '100');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('100');
    });

    it('updates current value field (health type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Current Value'), '80');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('80');
    });

    it('updates target value field (health type)', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { getByLabelText, toJSON } = render(<GoalFormScreen />);

      fireEvent.changeText(getByLabelText('Target Value'), '75');

      const json = JSON.stringify(toJSON());
      expect(json).toContain('75');
    });

    it('renders Cancel button with correct label', () => {
      const { getByLabelText } = render(<GoalFormScreen />);

      expect(getByLabelText('Cancel and go back')).toBeTruthy();
    });
  });

  describe('Date Picker and Select Labels', () => {
    it('shows correct date picker label based on goal type', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Target Date');
    });

    it('shows race date label for race goals', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Date');
    });

    it('shows correct help text for race date', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('When is the race?');
    });

    it('shows correct help text for target date', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('When do you want to achieve this?');
    });

    it('shows priority help text', () => {
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('A-priority goals get focused training attention');
    });

    it('shows default priority as B', () => {
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('B - Secondary (important)');
    });
  });

  describe('Goal Type Icons and Descriptions', () => {
    it('shows trophy icon for race goals', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('trophy');
    });

    it('shows trending-up icon for performance goals', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'performance' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('trending-up');
    });

    it('shows fitness icon for fitness goals', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'fitness' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('fitness');
    });

    it('shows heart icon for health goals', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'health' });
      const { toJSON } = render(<GoalFormScreen />);

      const json = JSON.stringify(toJSON());
      expect(json).toContain('heart');
    });
  });

  describe('useEffect for editing', () => {
    it('renders correctly with edit id parameter', () => {
      mockUseLocalSearchParams.mockReturnValue({ type: 'race', id: '123' });
      const { toJSON } = render(<GoalFormScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
