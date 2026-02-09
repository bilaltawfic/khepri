import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ConnectScreen from '../connect';

// Override the default expo-router mock from jest.setup.ts
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

describe('ConnectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ConnectScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Intervals.icu');
  });

  it('renders the description', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect your Intervals.icu account');
  });

  it('renders the benefits list', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("What you'll get:");
    expect(json).toContain('Automatic workout sync');
    expect(json).toContain('Real-time CTL/ATL/TSB metrics');
    expect(json).toContain('Training plan integration');
    expect(json).toContain('Workout push to calendar');
  });

  it('renders the Athlete ID input', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Athlete ID');
    expect(json).toContain('Found in your Intervals.icu URL');
  });

  it('renders the API Key input', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('API Key');
    expect(json).toContain('From Settings > API in Intervals.icu');
  });

  it('renders the Connect Account button', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Account');
  });

  it('renders the Skip button', () => {
    const { toJSON } = render(<ConnectScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Skip for now');
  });

  describe('input functionality', () => {
    it('allows editing the Athlete ID input', () => {
      const { getByLabelText } = render(<ConnectScreen />);
      const input = getByLabelText('Athlete ID');

      fireEvent.changeText(input, 'i12345');

      expect(input.props.value).toBe('i12345');
    });

    it('allows editing the API Key input', () => {
      const { getByLabelText } = render(<ConnectScreen />);
      const input = getByLabelText('API Key');

      fireEvent.changeText(input, 'my-secret-api-key');

      expect(input.props.value).toBe('my-secret-api-key');
    });
  });

  describe('validation', () => {
    it('shows error when only Athlete ID is provided', async () => {
      const { getByLabelText, toJSON } = render(<ConnectScreen />);

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please provide both Athlete ID and API Key');
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('shows error when only API Key is provided', async () => {
      const { getByLabelText, toJSON } = render(<ConnectScreen />);

      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please provide both Athlete ID and API Key');
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('navigates when both credentials are provided', () => {
      const { getByLabelText } = render(<ConnectScreen />);

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('navigates when neither credential is provided (skip with Connect button)', () => {
      const { getByLabelText } = render(<ConnectScreen />);

      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('clears error when retrying with valid input', async () => {
      const { getByLabelText, toJSON } = render(<ConnectScreen />);

      // First, trigger an error
      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please provide both Athlete ID and API Key');
      });

      // Now fix the issue and retry
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');

      // Error should be cleared
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Please provide both Athlete ID and API Key');
    });
  });

  describe('navigation', () => {
    it('Skip button navigates to fitness screen', () => {
      const { getByLabelText } = render(<ConnectScreen />);

      fireEvent.press(getByLabelText('Skip connection setup'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });
  });
});
