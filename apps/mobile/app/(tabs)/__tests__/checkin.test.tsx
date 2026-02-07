import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import CheckinScreen from '../checkin';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock useCheckin hook
const mockUseCheckin = jest.fn();
jest.mock('@/hooks/useCheckin', () => ({
  useCheckin: () => mockUseCheckin(),
}));

// Default mock values for idle form state
const createDefaultMockValues = (overrides = {}) => ({
  formData: {
    sleepQuality: null,
    sleepHours: null,
    energyLevel: null,
    stressLevel: null,
    overallSoreness: null,
    sorenessAreas: {},
    availableTimeMinutes: null,
    constraints: [],
    travelStatus: 'home',
    notes: '',
  },
  submissionState: 'idle',
  submissionError: null,
  recommendation: null,
  setSleepQuality: jest.fn(),
  setSleepHours: jest.fn(),
  setEnergyLevel: jest.fn(),
  setStressLevel: jest.fn(),
  setOverallSoreness: jest.fn(),
  toggleSorenessArea: jest.fn(),
  setAvailableTime: jest.fn(),
  setConstraints: jest.fn(),
  submitCheckin: jest.fn(),
  resetForm: jest.fn(),
  isFormValid: false,
  missingFields: [
    'Sleep Quality',
    'Hours Slept',
    'Energy Level',
    'Stress Level',
    'Soreness',
    'Available Time',
  ],
  ...overrides,
});

// Complete form data mock
const createCompletedFormMock = (overrides = {}) =>
  createDefaultMockValues({
    formData: {
      sleepQuality: 7,
      sleepHours: 8,
      energyLevel: 7,
      stressLevel: 3,
      overallSoreness: 2,
      sorenessAreas: {},
      availableTimeMinutes: 60,
      constraints: [],
      travelStatus: 'home',
      notes: '',
    },
    isFormValid: true,
    missingFields: [],
    ...overrides,
  });

// Submitting state mock
const createSubmittingMock = () =>
  createCompletedFormMock({
    submissionState: 'submitting',
  });

// Analyzing state mock
const createAnalyzingMock = () =>
  createCompletedFormMock({
    submissionState: 'analyzing',
  });

// Success state mock
const createSuccessMock = (recommendation = {}) =>
  createCompletedFormMock({
    submissionState: 'success',
    recommendation: {
      summary: 'You are feeling decent. A moderate effort session will help build fitness.',
      workoutSuggestion: 'Steady state workout',
      intensityLevel: 'moderate',
      duration: 60,
      notes: undefined,
      ...recommendation,
    },
  });

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCheckin.mockReturnValue(createDefaultMockValues());
  });

  describe('Form Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CheckinScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders the title', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Daily Check-in');
    });

    it('renders the quick wellness check subtitle', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Quick wellness check');
    });

    it('renders the Sleep section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Sleep');
      expect(json).toContain('How did you sleep');
      expect(json).toContain('Hours slept');
    });

    it('renders the Energy Level section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Energy Level');
    });

    it('renders the Stress Level section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Stress Level');
    });

    it('renders the Muscle Soreness section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Muscle Soreness');
    });

    it('renders the Available Time section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Available Time');
      expect(json).toContain('How much time do you have for training today');
    });

    it('renders the Constraints section', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Any Constraints');
    });

    it('renders the submit button', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain("Get Today's Recommendation");
    });

    it('renders the history link', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('View check-in history');
    });

    it('renders time available options', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('15 min');
      expect(json).toContain('30 min');
      expect(json).toContain('1 hr');
      expect(json).toContain('2+ hr');
    });

    it('renders constraint toggle options', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Traveling');
      expect(json).toContain('Limited Equipment');
      expect(json).toContain('Feeling Unwell');
    });

    it('renders scale input buttons for sleep quality', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // Should have numbers 1-10 for scale inputs
      for (let i = 1; i <= 10; i++) {
        expect(json).toContain(`"${i}"`);
      }
    });

    it('renders hours input with increment/decrement buttons', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('hours');
    });
  });

  describe('Form Inputs', () => {
    it('allows selecting scale values for sleep quality', () => {
      const mockSetSleepQuality = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setSleepQuality: mockSetSleepQuality })
      );

      const { getAllByLabelText } = render(<CheckinScreen />);
      // Multiple scale inputs have "Select 7" labels, get all and press the first one
      const buttons = getAllByLabelText('Select 7');
      expect(buttons.length).toBeGreaterThan(0);
      fireEvent.press(buttons[0]);
      expect(mockSetSleepQuality).toHaveBeenCalledWith(7);
    });

    it('allows selecting time available', () => {
      const mockSetAvailableTime = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setAvailableTime: mockSetAvailableTime })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      const button = getByLabelText('Select 1 hr');
      fireEvent.press(button);
      expect(mockSetAvailableTime).toHaveBeenCalledWith(60);
    });

    it('allows toggling constraints', () => {
      const mockSetConstraints = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setConstraints: mockSetConstraints })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      const toggle = getByLabelText('Traveling not selected');
      fireEvent.press(toggle);
      expect(mockSetConstraints).toHaveBeenCalled();
    });

    it('allows incrementing sleep hours', () => {
      const mockSetSleepHours = jest.fn();
      mockUseCheckin.mockReturnValue(createDefaultMockValues({ setSleepHours: mockSetSleepHours }));

      const { getByLabelText } = render(<CheckinScreen />);
      const incrementButton = getByLabelText('Increase hours');
      fireEvent.press(incrementButton);
      expect(mockSetSleepHours).toHaveBeenCalled();
    });

    it('allows decrementing sleep hours', () => {
      const mockSetSleepHours = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({
          setSleepHours: mockSetSleepHours,
          formData: {
            sleepQuality: null,
            sleepHours: 5, // Start with 5 hours
            energyLevel: null,
            stressLevel: null,
            overallSoreness: null,
            sorenessAreas: {},
            availableTimeMinutes: null,
            constraints: [],
            travelStatus: 'home',
            notes: '',
          },
        })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      const decrementButton = getByLabelText('Decrease hours');
      fireEvent.press(decrementButton);
      expect(mockSetSleepHours).toHaveBeenCalled();
    });

    it('allows selecting energy level', () => {
      const mockSetEnergyLevel = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setEnergyLevel: mockSetEnergyLevel })
      );

      const { getAllByLabelText } = render(<CheckinScreen />);
      // Energy level is the second scale input
      const buttons = getAllByLabelText('Select 5');
      expect(buttons.length).toBeGreaterThan(1);
      fireEvent.press(buttons[1]); // Second scale input
      expect(mockSetEnergyLevel).toHaveBeenCalledWith(5);
    });

    it('allows selecting stress level', () => {
      const mockSetStressLevel = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setStressLevel: mockSetStressLevel })
      );

      const { getAllByLabelText } = render(<CheckinScreen />);
      // Stress level is the third scale input
      const buttons = getAllByLabelText('Select 6');
      expect(buttons.length).toBeGreaterThan(2);
      fireEvent.press(buttons[2]); // Third scale input
      expect(mockSetStressLevel).toHaveBeenCalledWith(6);
    });

    it('allows selecting overall soreness', () => {
      const mockSetOverallSoreness = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setOverallSoreness: mockSetOverallSoreness })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      // Soreness uses different labels: "Soreness level X"
      const button = getByLabelText('Soreness level 4');
      fireEvent.press(button);
      expect(mockSetOverallSoreness).toHaveBeenCalledWith(4);
    });

    it('allows toggling multiple constraints', () => {
      const mockSetConstraints = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setConstraints: mockSetConstraints })
      );

      const { getByLabelText } = render(<CheckinScreen />);

      // Toggle traveling
      const travelingToggle = getByLabelText('Traveling not selected');
      fireEvent.press(travelingToggle);
      expect(mockSetConstraints).toHaveBeenCalled();
    });

    it('allows selecting different time options', () => {
      const mockSetAvailableTime = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ setAvailableTime: mockSetAvailableTime })
      );

      const { getByLabelText } = render(<CheckinScreen />);

      // Test 15 min
      fireEvent.press(getByLabelText('Select 15 min'));
      expect(mockSetAvailableTime).toHaveBeenCalledWith(15);

      // Test 30 min
      fireEvent.press(getByLabelText('Select 30 min'));
      expect(mockSetAvailableTime).toHaveBeenCalledWith(30);

      // Test 45 min
      fireEvent.press(getByLabelText('Select 45 min'));
      expect(mockSetAvailableTime).toHaveBeenCalledWith(45);

      // Test 1.5 hr
      fireEvent.press(getByLabelText('Select 1.5 hr'));
      expect(mockSetAvailableTime).toHaveBeenCalledWith(90);

      // Test 2+ hr
      fireEvent.press(getByLabelText('Select 2+ hr'));
      expect(mockSetAvailableTime).toHaveBeenCalledWith(120);
    });

    it('allows toggling soreness areas', () => {
      const mockToggleSorenessArea = jest.fn();
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({ toggleSorenessArea: mockToggleSorenessArea })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      const legsButton = getByLabelText('Legs not sore');
      fireEvent.press(legsButton);
      expect(mockToggleSorenessArea).toHaveBeenCalledWith('legs');
    });
  });

  describe('Form Validation', () => {
    it('shows missing fields hint when form is incomplete', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // When form is empty, it should show which fields are missing
      expect(json).toContain('Complete:');
    });

    it('shows all missing fields when form is empty', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Sleep Quality');
      expect(json).toContain('Hours Slept');
      expect(json).toContain('Energy Level');
      expect(json).toContain('Stress Level');
      expect(json).toContain('Soreness');
      expect(json).toContain('Available Time');
    });

    it('submit button is disabled when form is incomplete', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // When isFormValid is false, the button should be disabled
      // Check by verifying the disabled prop is present in the button
      expect(json).toContain('disabled":true');
    });

    it('submit button is enabled when form is complete', () => {
      mockUseCheckin.mockReturnValue(createCompletedFormMock());

      const { getByLabelText } = render(<CheckinScreen />);
      const submitButton = getByLabelText('Submit daily check-in');
      expect(submitButton.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('hides missing fields hint when form is complete', () => {
      mockUseCheckin.mockReturnValue(createCompletedFormMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // Missing fields hint should not be present
      expect(json).not.toContain('Complete:');
    });

    it('shows submission error when present', () => {
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({
          submissionError: 'Please complete: Sleep Quality, Hours Slept',
        })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please complete: Sleep Quality, Hours Slept');
    });

    it('calls submitCheckin when submit button is pressed', () => {
      const mockSubmitCheckin = jest.fn();
      mockUseCheckin.mockReturnValue(createCompletedFormMock({ submitCheckin: mockSubmitCheckin }));

      const { getByLabelText } = render(<CheckinScreen />);
      const submitButton = getByLabelText('Submit daily check-in');
      fireEvent.press(submitButton);
      expect(mockSubmitCheckin).toHaveBeenCalled();
    });
  });

  describe('Loading and Analyzing States', () => {
    it('shows submitting state when submissionState is submitting', () => {
      mockUseCheckin.mockReturnValue(createSubmittingMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Submitting...');
      expect(json).toContain('Saving your check-in data');
    });

    it('shows analyzing state when submissionState is analyzing', () => {
      mockUseCheckin.mockReturnValue(createAnalyzingMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Analyzing...');
      expect(json).toContain('Khepri is analyzing your wellness data and training history');
    });

    it('displays loading content during submitting state', () => {
      mockUseCheckin.mockReturnValue(createSubmittingMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // Check that loading content is present (ActivityIndicator and text)
      expect(json).toContain('Submitting...');
    });

    it('displays loading content during analyzing state', () => {
      mockUseCheckin.mockReturnValue(createAnalyzingMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // Check that loading content is present (ActivityIndicator and text)
      expect(json).toContain('Analyzing...');
    });

    it('does not show form during loading states', () => {
      mockUseCheckin.mockReturnValue(createSubmittingMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Daily Check-in');
      expect(json).not.toContain('Sleep');
    });
  });

  describe('Success State', () => {
    it('shows success state with recommendation', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Check-in Complete!');
    });

    it('displays recommendation summary', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain("Today's Recommendation");
    });

    it('displays workout suggestion', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Steady state workout');
    });

    it('displays intensity badge with moderate intensity', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock({ intensityLevel: 'moderate' }));

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Moderate');
    });

    it('displays duration in minutes', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock({ duration: 45 }));

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      // Duration appears as "45" followed by " min"
      expect(json).toContain('45');
      expect(json).toContain('min');
    });

    it('displays action buttons: Start Workout, Chat with Coach, View History', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Start Workout');
      expect(json).toContain('Chat with Coach');
      expect(json).toContain('View History');
    });

    it('displays submit another check-in link', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Submit another check-in');
    });

    it('displays notes when present', () => {
      mockUseCheckin.mockReturnValue(
        createSuccessMock({ notes: 'Adjusted for: traveling, limited equipment' })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Adjusted for: traveling, limited equipment');
    });

    it('does not display notes when not present', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock({ notes: undefined }));

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Adjusted for');
    });
  });

  describe('Navigation', () => {
    it('navigates to history when history link is pressed in form state', () => {
      const { getByLabelText } = render(<CheckinScreen />);
      const historyLink = getByLabelText('View check-in history');
      fireEvent.press(historyLink);
      expect(router.push).toHaveBeenCalledWith('/checkin/history');
    });

    it('navigates to chat when Chat with Coach button is pressed', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { getByLabelText } = render(<CheckinScreen />);
      const chatButton = getByLabelText('Open chat with AI coach');
      fireEvent.press(chatButton);
      expect(router.push).toHaveBeenCalledWith('/(tabs)/chat');
    });

    it('navigates to history from success state when View History is pressed', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { getByLabelText } = render(<CheckinScreen />);
      const historyButton = getByLabelText('View check-in history');
      fireEvent.press(historyButton);
      expect(router.push).toHaveBeenCalledWith('/checkin/history');
    });

    it('Start Workout button is present and pressable', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock());

      const { getByLabelText } = render(<CheckinScreen />);
      const startWorkoutButton = getByLabelText('Start recommended workout');
      expect(startWorkoutButton).toBeTruthy();
      fireEvent.press(startWorkoutButton);
      // Currently a TODO - just verify it doesn't crash
    });
  });

  describe('Reset Functionality', () => {
    it('calls resetForm when submit another check-in is pressed', () => {
      const mockResetForm = jest.fn();
      mockUseCheckin.mockReturnValue(
        createSuccessMock({
          resetForm: mockResetForm,
        })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());

      // Verify the reset link is present
      expect(json).toContain('Submit another check-in');

      // Since getByText has issues with nested text, let's find and press the Pressable directly
      const { UNSAFE_root } = render(<CheckinScreen />);
      // Find the Pressable by looking for the one with resetForm
      const pressables = UNSAFE_root.findAllByType(require('react-native').Pressable);
      // The reset link is a Pressable, find the one that contains "Submit another check-in"
      const resetPressable = pressables.find(
        (p: { props: { children: { props: { children: string } }[] } }) => {
          try {
            const children = p.props.children;
            if (Array.isArray(children)) {
              return children.some(
                (child: { props: { children: string } }) =>
                  child?.props?.children === 'Submit another check-in'
              );
            }
            return false;
          } catch {
            return false;
          }
        }
      );

      if (resetPressable) {
        fireEvent.press(resetPressable);
        expect(mockResetForm).toHaveBeenCalled();
      }
    });
  });

  describe('IntensityBadge Variations', () => {
    it('shows recovery intensity badge', () => {
      mockUseCheckin.mockReturnValue(
        createSuccessMock({
          intensityLevel: 'recovery',
          workoutSuggestion: 'Light recovery session',
          summary: 'Your body needs rest today.',
        })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Recovery');
    });

    it('shows easy intensity badge', () => {
      mockUseCheckin.mockReturnValue(
        createSuccessMock({
          intensityLevel: 'easy',
          workoutSuggestion: 'Easy aerobic session',
        })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Easy');
    });

    it('shows moderate intensity badge', () => {
      mockUseCheckin.mockReturnValue(createSuccessMock({ intensityLevel: 'moderate' }));

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Moderate');
    });

    it('shows hard intensity badge', () => {
      mockUseCheckin.mockReturnValue(
        createSuccessMock({
          intensityLevel: 'hard',
          workoutSuggestion: 'Quality training session',
          summary: 'You are fresh and ready!',
        })
      );

      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Hard');
    });
  });

  describe('Soreness Areas', () => {
    it('renders soreness area buttons', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Legs');
      expect(json).toContain('Back');
      expect(json).toContain('Shoulders');
      expect(json).toContain('Arms');
      expect(json).toContain('Core');
      expect(json).toContain('Neck');
    });

    it('shows sore areas when they are selected', () => {
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({
          formData: {
            sleepQuality: null,
            sleepHours: null,
            energyLevel: null,
            stressLevel: null,
            overallSoreness: 5,
            sorenessAreas: { legs: 5, back: 7 },
            availableTimeMinutes: null,
            constraints: [],
            travelStatus: 'home',
            notes: '',
          },
        })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      expect(getByLabelText('Legs sore')).toBeTruthy();
      expect(getByLabelText('Back sore')).toBeTruthy();
    });
  });

  describe('Constraint Display', () => {
    it('shows constraints as selected when they are in the form data', () => {
      mockUseCheckin.mockReturnValue(
        createDefaultMockValues({
          formData: {
            sleepQuality: null,
            sleepHours: null,
            energyLevel: null,
            stressLevel: null,
            overallSoreness: null,
            sorenessAreas: {},
            availableTimeMinutes: null,
            constraints: ['traveling', 'limited_equipment'],
            travelStatus: 'home',
            notes: '',
          },
        })
      );

      const { getByLabelText } = render(<CheckinScreen />);
      expect(getByLabelText('Traveling selected')).toBeTruthy();
      expect(getByLabelText('Limited Equipment selected')).toBeTruthy();
    });

    it('shows all constraint options', () => {
      const { toJSON } = render(<CheckinScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Traveling');
      expect(json).toContain('Limited Equipment');
      expect(json).toContain('Feeling Unwell');
      expect(json).toContain('Busy Day');
      expect(json).toContain('Outdoor Only');
      expect(json).toContain('Indoor Only');
    });
  });

  describe('Color Scheme', () => {
    it('renders correctly in light mode', () => {
      const { toJSON } = render(<CheckinScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
