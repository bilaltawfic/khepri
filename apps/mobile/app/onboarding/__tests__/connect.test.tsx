import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { Linking, View } from 'react-native';
import ConnectScreen from '../connect';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
let mockStatus = {
  connected: false as boolean,
  intervalsAthleteId: undefined as string | undefined,
};
let mockIsLoading = false;
let mockError: string | null = null;

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: () => ({
    status: mockStatus,
    isLoading: mockIsLoading,
    error: mockError,
    connect: mockConnect,
    disconnect: mockDisconnect,
    refresh: mockRefresh,
  }),
}));

// =============================================================================
// Helpers
// =============================================================================

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <ConnectScreen />
    </OnboardingProvider>
  );
}

function ContextObserver({
  dataRef,
}: { readonly dataRef: MutableRefObject<OnboardingData | null> }) {
  const { data } = useOnboarding();
  useEffect(() => {
    dataRef.current = data;
  }, [data, dataRef]);
  return null;
}

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

// =============================================================================
// Tests
// =============================================================================

describe('ConnectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStatus = { connected: false, intervalsAthleteId: undefined };
    mockIsLoading = false;
    mockError = null;
    mockConnect.mockReset().mockResolvedValue(undefined);
    mockDisconnect.mockReset().mockResolvedValue(undefined);
    mockRefresh.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ===========================================================================
  // Basic rendering
  // ===========================================================================

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
  });

  it('renders the API Key input', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('API Key');
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

  // ===========================================================================
  // Initial loading state
  // ===========================================================================

  it('shows loading spinner during initial status check', () => {
    mockIsLoading = true;
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    // Input fields should not be shown during initial load
    expect(json).not.toContain('Found in your Intervals.icu URL');
  });

  // ===========================================================================
  // Explainer section (IC-02)
  // ===========================================================================

  describe('explainer section', () => {
    it('renders "What is Intervals.icu?" header', () => {
      const { getByLabelText } = renderWithProvider();
      expect(getByLabelText('What is Intervals.icu?')).toBeTruthy();
    });

    it('expands and shows explanation on tap', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('What is Intervals.icu?'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('free training analytics platform');
      expect(json).toContain('Garmin, Strava, and Wahoo');
    });

    it('shows "Create a free account" link when expanded', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('What is Intervals.icu?'));

      expect(getByLabelText('Create a free Intervals.icu account')).toBeTruthy();
    });

    it('opens intervals.icu when "Create a free account" is tapped', () => {
      const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('What is Intervals.icu?'));
      fireEvent.press(getByLabelText('Create a free Intervals.icu account'));

      expect(spy).toHaveBeenCalledWith('https://intervals.icu');
      spy.mockRestore();
    });

    it('shows credential help text when expanded', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('What is Intervals.icu?'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Athlete ID: Found in your Intervals.icu URL');
      expect(json).toContain('API Key: Go to Settings');
    });
  });

  // ===========================================================================
  // Input functionality
  // ===========================================================================

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

  // ===========================================================================
  // Button disabled state
  // ===========================================================================

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
  });

  // ===========================================================================
  // Connection flow (IC-03)
  // ===========================================================================

  describe('connection flow', () => {
    it('calls connect with trimmed credentials on Connect tap', async () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), '  i12345  ');
      fireEvent.changeText(getByLabelText('API Key'), '  my-secret-key  ');

      await act(async () => {
        fireEvent.press(getByLabelText('Connect Intervals.icu account'));
      });

      expect(mockConnect).toHaveBeenCalledWith('i12345', 'my-secret-key');
    });

    it('shows error message when hook has error', () => {
      mockError = 'Invalid Intervals.icu credentials. Please check your Athlete ID and API Key.';
      const { toJSON } = renderWithProvider();

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Invalid Intervals.icu credentials');
    });

    it('persists credentials to onboarding context on connect success', async () => {
      mockConnect.mockImplementation(async () => {
        mockStatus = { connected: true, intervalsAthleteId: 'i12345' };
      });

      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');

      await act(async () => {
        fireEvent.press(getByLabelText('Connect Intervals.icu account'));
      });

      expect(dataRef.current?.intervalsAthleteId).toBe('i12345');
      expect(dataRef.current?.intervalsApiKey).toBe('my-secret-key');
    });

    it('auto-advances to fitness screen after successful connect', async () => {
      mockConnect.mockImplementation(async () => {
        mockStatus = { connected: true, intervalsAthleteId: 'i12345' };
      });

      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'my-secret-key');

      await act(async () => {
        fireEvent.press(getByLabelText('Connect Intervals.icu account'));
      });

      // Auto-advance fires after 1500ms
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('does not auto-advance when connection fails', async () => {
      mockConnect.mockRejectedValue(new Error('Invalid credentials'));

      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Athlete ID'), 'i12345');
      fireEvent.changeText(getByLabelText('API Key'), 'bad-key');

      await act(async () => {
        fireEvent.press(getByLabelText('Connect Intervals.icu account'));
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(router.push).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Connected view (IC-03)
  // ===========================================================================

  describe('connected view', () => {
    beforeEach(() => {
      mockStatus = { connected: true, intervalsAthleteId: 'i12345' };
    });

    it('shows connected banner with athlete ID', () => {
      const { toJSON } = renderWithProvider();
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Connected to Intervals.icu');
      expect(json).toContain('i12345');
    });

    it('shows Continue and Change Account buttons', () => {
      const { getByLabelText } = renderWithProvider();
      expect(getByLabelText('Continue to next step')).toBeTruthy();
      expect(getByLabelText('Change Intervals.icu account')).toBeTruthy();
    });

    it('hides input fields', () => {
      const { toJSON } = renderWithProvider();
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Found in your Intervals.icu URL');
    });

    it('navigates on Continue tap', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Continue to next step'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('calls disconnect on Change Account tap', async () => {
      const { getByLabelText } = renderWithProvider();

      await act(async () => {
        fireEvent.press(getByLabelText('Change Intervals.icu account'));
      });

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Navigation
  // ===========================================================================

  describe('navigation', () => {
    it('Skip button navigates to fitness screen', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Skip connection setup'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/fitness');
    });

    it('Skip clears credentials from context', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Skip connection setup'));

      expect(dataRef.current?.intervalsAthleteId).toBeUndefined();
      expect(dataRef.current?.intervalsApiKey).toBeUndefined();
    });
  });
});
