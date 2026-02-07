import { fireEvent, render } from '@testing-library/react-native';
import CheckinScreen from '../checkin';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('shows missing fields hint when form is incomplete', () => {
    const { toJSON } = render(<CheckinScreen />);
    const json = JSON.stringify(toJSON());
    // When form is empty, it should show which fields are missing
    expect(json).toContain('Complete:');
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

  it('allows selecting scale values', () => {
    const { getAllByLabelText } = render(<CheckinScreen />);
    // Multiple scale inputs have "Select 7" labels, get all and press the first one
    const buttons = getAllByLabelText('Select 7');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.press(buttons[0]);
    // The button should now be selected (visual state change)
  });

  it('allows selecting time available', () => {
    const { getByLabelText } = render(<CheckinScreen />);
    const button = getByLabelText('Select 1 hr');
    fireEvent.press(button);
    // The button should now be selected
  });

  it('allows toggling constraints', () => {
    const { getByLabelText } = render(<CheckinScreen />);
    const toggle = getByLabelText('Traveling not selected');
    fireEvent.press(toggle);
    // Now it should be selected
  });
});
