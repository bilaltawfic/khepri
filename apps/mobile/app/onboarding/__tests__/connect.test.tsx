import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect, useRef } from 'react';
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

  describe('validation', () => {
    it('shows error when only Athlete ID is provided', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please provide both Athlete ID and API Key');
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('shows error when only API Key is provided', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please provide both Athlete ID and API Key');
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('navigates when both credentials are provided', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('navigates when neither credential is provided (skip with Connect button)', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('clears error when retrying with valid input', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

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
      const { getByLabelText, dataRef } = renderWithContextObserver();

      // First, set some credentials via Connect
      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      // Verify they were set
      expect(dataRef.current?.intervalsAthleteId).toBe('i12345');

      // Reset mock to simulate going back
      jest.clearAllMocks();

      // Re-render to simulate navigating back
      const { getByLabelText: getByLabelText2, dataRef: dataRef2 } = renderWithContextObserver();

      // Now skip
      fireEvent.press(getByLabelText2('Skip connection setup'));

      // Credentials should be cleared
      expect(dataRef2.current?.intervalsAthleteId).toBeUndefined();
      expect(dataRef2.current?.intervalsApiKey).toBeUndefined();
    });

    it('clears credentials when connecting with empty fields', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      // Just press Connect with empty fields
      fireEvent.press(getByLabelText('Connect Intervals.icu account'));

      expect(dataRef.current?.intervalsAthleteId).toBeUndefined();
      expect(dataRef.current?.intervalsApiKey).toBeUndefined();
    });
  });
});
