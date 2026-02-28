import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { View } from 'react-native';
import ConnectScreen from '../connect';

// Override the default expo-router mock from jest.setup.ts
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <ConnectScreen />
    </OnboardingProvider>
  );
}

/**
 * Test wrapper that captures context data changes for assertions.
 * The dataRef will always have the latest context data.
 */
function ContextObserver({ dataRef }: { dataRef: MutableRefObject<OnboardingData | null> }) {
  const { data } = useOnboarding();
  useEffect(() => {
    dataRef.current = data;
  }, [data, dataRef]);
  return null;
}

/**
 * Render with provider and a way to observe context changes.
 */
function renderWithContextObserver() {
  const dataRef: MutableRefObject<OnboardingData | null> = { current: null };
  const result = render(
    <OnboardingProvider>
      <View>
        <ContextObserver dataRef={dataRef} />
        <ConnectScreen />
      </View>
    </OnboardingProvider>
  );
  return { ...result, dataRef };
}

describe('ConnectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Intervals.icu');
  });

  it('renders the description', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect your Intervals.icu account');
  });

  it('renders the benefits list', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain("What you'll get:");
    expect(json).toContain('Automatic workout sync');
    expect(json).toContain('Real-time CTL/ATL/TSB metrics');
    expect(json).toContain('Training plan integration');
    expect(json).toContain('Workout push to calendar');
  });

  it('renders the Athlete ID input', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Athlete ID');
    expect(json).toContain('Found in your Intervals.icu URL');
  });

  it('renders the API Key input', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('API Key');
    expect(json).toContain('From Settings > API in Intervals.icu');
  });

  it('renders the Connect Account button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Account');
  });

  it('renders the Skip button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Skip for now');
  });

  describe('input functionality', () => {
    it('allows editing the Athlete ID input', () => {
      const { getByLabelText } = renderWithProvider();
      const input = getByLabelText('Athlete ID');

      fireEvent.changeText(input, 'i12345');

      expect(input.props.value).toBe('i12345');
    });

    it('allows editing the API Key input', () => {
      const { getByLabelText } = renderWithProvider();
      const input = getByLabelText('API Key');

      fireEvent.changeText(input, 'my-secret-api-key');

      expect(input.props.value).toBe('my-secret-api-key');
    });
  });

  describe('button disabled state', () => {
    it('disables Connect button when both fields are empty', () => {
      const { getByLabelText } = renderWithProvider();

      const button = getByLabelText('Connect Intervals.icu account');
      expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);
    });

    it('disables Connect button when only Athlete ID is provided', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');

      const button = getByLabelText('Connect Intervals.icu account');
      expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);
    });

    it('disables Connect button when only API Key is provided', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');

      const button = getByLabelText('Connect Intervals.icu account');
      expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);
    });

    it('enables Connect button when both fields are filled', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');

      const button = getByLabelText('Connect Intervals.icu account');
      expect(
        button.props.accessibilityState?.disabled ?? button.props['aria-disabled']
      ).toBeFalsy();
    });

    it('navigates when both credentials are provided', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });
  });

  describe('navigation', () => {
    it('Skip button navigates to fitness screen', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Skip connection setup'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });
  });

  describe('context persistence', () => {
    it('persists credentials to context when connecting with valid input', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(dataRef.current?.intervalsAthleteId).toBe('i12345');
      expect(dataRef.current?.intervalsApiKey).toBe('my-secret-key');
    });

    it('trims whitespace from credentials before persisting', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('Athlete ID'), '  i12345  ');
      fireEvent.changeText(getByLabelText('API Key'), '  my-secret-key  ');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(dataRef.current?.intervalsAthleteId).toBe('i12345');
      expect(dataRef.current?.intervalsApiKey).toBe('my-secret-key');
    });

    it('clears credentials from context when skipping', () => {
      // Use a shared ref that persists across rerenders
      const dataRef: MutableRefObject<OnboardingData | null> = { current: null };

      // Custom wrapper that keeps the same provider across rerenders
      function Wrapper({ children }: { children: React.ReactNode }) {
        return (
          <OnboardingProvider>
            <View>
              <ContextObserver dataRef={dataRef} />
              {children}
            </View>
          </OnboardingProvider>
        );
      }

      const { getByLabelText, rerender } = render(<ConnectScreen />, { wrapper: Wrapper });

      // First, set some credentials via Connect
      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      // Verify they were set in context
      expect(dataRef.current?.intervalsAthleteId).toBe('i12345');
      expect(dataRef.current?.intervalsApiKey).toBe('my-secret-key');

      // Reset router mock to simulate navigation side effects being cleared
      jest.clearAllMocks();

      // Rerender to simulate navigating back (same provider instance)
      rerender(<ConnectScreen />);

      // Now skip - this should clear credentials
      fireEvent.press(getByLabelText('Skip connection setup'));

      // Credentials should be cleared in the same context instance
      expect(dataRef.current?.intervalsAthleteId).toBeUndefined();
      expect(dataRef.current?.intervalsApiKey).toBeUndefined();
    });

    it('does not persist credentials when Connect button is disabled (empty fields)', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      // Connect button is disabled when both fields are empty
      const button = getByLabelText('Connect Intervals.icu account');
      expect(button.props.accessibilityState?.disabled ?? button.props['aria-disabled']).toBe(true);

      // Context should have no credentials set
      expect(dataRef.current?.intervalsAthleteId).toBeUndefined();
      expect(dataRef.current?.intervalsApiKey).toBeUndefined();
    });
  });
});
