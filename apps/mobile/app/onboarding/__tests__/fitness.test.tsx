import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { View } from 'react-native';
import FitnessScreen from '../fitness';

const mockGetAthleteProfile = jest.fn();
const mockSaveOnboardingData = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('@/services/intervals', () => ({
  getAthleteProfile: (...args: unknown[]) => mockGetAthleteProfile(...args),
}));

jest.mock('@/services/onboarding', () => ({
  saveOnboardingData: (...args: unknown[]) => mockSaveOnboardingData(...args),
}));

jest.mock('@/contexts', () => {
  const actual = jest.requireActual('@/contexts');
  return {
    ...actual,
    useAuth: () => ({ user: { id: 'test-user-123' } }),
  };
});

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <FitnessScreen />
    </OnboardingProvider>
  );
}

/**
 * Test wrapper that captures context data changes for assertions.
 */
function ContextObserver({ dataRef }: { dataRef: MutableRefObject<OnboardingData | null> }) {
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
        <FitnessScreen />
      </View>
    </OnboardingProvider>
  );
  return { ...result, dataRef };
}

describe('FitnessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteProfile.mockResolvedValue(null);
    mockSaveOnboardingData.mockResolvedValue({ success: true });
  });

  it('renders without crashing', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your Fitness Numbers');
  });

  it('renders the description', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Share your current fitness metrics');
  });

  it('renders the info card about Intervals.icu sync', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('connect Intervals.icu');
  });

  it('renders the Cycling section', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cycling');
    expect(json).toContain('FTP (Functional Threshold Power)');
    expect(json).toContain('LTHR (Lactate Threshold Heart Rate)');
  });

  it('renders the Running section', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Running');
    expect(json).toContain('Threshold Pace');
  });

  it('renders the Swimming section', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Swimming');
    expect(json).toContain('CSS (Critical Swim Speed)');
  });

  it('renders the Heart Rate section', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Heart Rate');
    expect(json).toContain('Resting Heart Rate');
    expect(json).toContain('Max Heart Rate');
  });

  it('renders the Finish Setup button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Finish Setup');
  });

  it('renders the Skip button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Skip - I'll add these later");
  });

  describe('input editing', () => {
    it('renders all fitness input fields as editable', () => {
      const { getByLabelText } = renderWithProvider();

      expect(getByLabelText('FTP (Functional Threshold Power)')).toBeTruthy();
      expect(getByLabelText('LTHR (Lactate Threshold Heart Rate)')).toBeTruthy();
      expect(getByLabelText('Threshold Pace')).toBeTruthy();
      expect(getByLabelText('CSS (Critical Swim Speed)')).toBeTruthy();
      expect(getByLabelText('Resting Heart Rate')).toBeTruthy();
      expect(getByLabelText('Max Heart Rate')).toBeTruthy();
    });

    it('allows entering FTP value', () => {
      const { getByLabelText } = renderWithProvider();

      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '250');

      expect(ftpInput.props.value).toBe('250');
    });

    it('allows entering heart rate values', () => {
      const { getByLabelText } = renderWithProvider();

      const restingHR = getByLabelText('Resting Heart Rate');
      fireEvent.changeText(restingHR, '52');
      expect(restingHR.props.value).toBe('52');

      const maxHR = getByLabelText('Max Heart Rate');
      fireEvent.changeText(maxHR, '185');
      expect(maxHR.props.value).toBe('185');
    });

    it('allows entering LTHR value', () => {
      const { getByLabelText } = renderWithProvider();

      const lthrInput = getByLabelText('LTHR (Lactate Threshold Heart Rate)');
      fireEvent.changeText(lthrInput, '165');

      expect(lthrInput.props.value).toBe('165');
    });
  });

  describe('validation', () => {
    it('shows validation error for out-of-range FTP', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '600');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for FTP below minimum', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '10');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for out-of-range resting HR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Resting Heart Rate'), '150');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Resting HR should be 30-100');
    });

    it('shows validation error for out-of-range max HR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Max Heart Rate'), '250');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Max HR should be 100-220');
    });

    it('shows validation error for out-of-range LTHR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('LTHR (Lactate Threshold Heart Rate)'), '250');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('LTHR should be 80-200');
    });

    it('shows validation error for invalid threshold pace format', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Threshold Pace'), 'abc');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Use mm:ss format');
    });

    it('shows validation error for invalid CSS format', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('CSS (Critical Swim Speed)'), 'xyz');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Use mm:ss format');
    });

    it('shows validation error for non-integer values', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '250.5');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for non-numeric input', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), 'abc');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('does not navigate when validation fails', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '600');
      fireEvent.press(getByLabelText('Finish onboarding setup'));

      expect(router.replace).not.toHaveBeenCalled();
    });

    it('clears error when field value is updated', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      // Enter invalid value and trigger validation
      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '600');
      fireEvent.press(getByLabelText('Finish onboarding setup'));

      let json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');

      // Fix the value
      fireEvent.changeText(ftpInput, '250');

      json = JSON.stringify(toJSON());
      expect(json).not.toContain('FTP should be 50-500');
    });

    it('saves and navigates to dashboard when all fields are empty', async () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      await waitFor(() => {
        expect(mockSaveOnboardingData).toHaveBeenCalledWith('test-user-123', expect.any(Object));
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });

  describe('context integration', () => {
    it('saves fitness values and navigates to dashboard on continue', async () => {
      const { getByLabelText } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '250');
      fireEvent.changeText(getByLabelText('LTHR (Lactate Threshold Heart Rate)'), '165');
      fireEvent.changeText(getByLabelText('Threshold Pace'), '5:30');
      fireEvent.changeText(getByLabelText('CSS (Critical Swim Speed)'), '1:45');
      fireEvent.changeText(getByLabelText('Resting Heart Rate'), '52');
      fireEvent.changeText(getByLabelText('Max Heart Rate'), '185');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      await waitFor(() => {
        expect(mockSaveOnboardingData).toHaveBeenCalledWith(
          'test-user-123',
          expect.objectContaining({
            ftp: 250,
            lthr: 165,
            runThresholdPace: 330,
            css: 105,
            restingHR: 52,
            maxHR: 185,
          })
        );
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('saves partial data when only some fields are filled', async () => {
      const { getByLabelText } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '280');

      fireEvent.press(getByLabelText('Finish onboarding setup'));

      await waitFor(() => {
        expect(mockSaveOnboardingData).toHaveBeenCalledWith(
          'test-user-123',
          expect.objectContaining({ ftp: 280 })
        );
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });

  describe('skip functionality', () => {
    it('saves and navigates to dashboard without fitness data', async () => {
      const { getByLabelText } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Skip fitness numbers'));

      await waitFor(() => {
        expect(mockSaveOnboardingData).toHaveBeenCalledWith('test-user-123', expect.any(Object));
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('skips even when invalid data is entered', async () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '9999');
      fireEvent.press(getByLabelText('Skip fitness numbers'));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });

  describe('auto-sync from Intervals.icu', () => {
    /**
     * Wrapper that pre-sets Intervals.icu credentials in context
     * so the fitness screen triggers auto-sync on mount.
     */
    function CredentialSetter({ children }: Readonly<{ children: React.ReactNode }>) {
      const { setIntervalsCredentials } = useOnboarding();
      useEffect(() => {
        setIntervalsCredentials({ athleteId: 'i12345', apiKey: 'test-key' });
      }, [setIntervalsCredentials]);
      return <>{children}</>;
    }

    function renderWithCredentials() {
      return render(
        <OnboardingProvider>
          <CredentialSetter>
            <FitnessScreen />
          </CredentialSetter>
        </OnboardingProvider>
      );
    }

    it('shows syncing indicator when connected', async () => {
      // Use a promise that we control to keep the syncing state visible
      let resolveProfile: ((v: null) => void) | undefined;
      mockGetAthleteProfile.mockReturnValue(
        new Promise((resolve) => {
          resolveProfile = resolve;
        })
      );

      const { toJSON } = renderWithCredentials();

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Syncing from Intervals.icu');
      });

      // Clean up
      resolveProfile?.(null);
    });

    it('pre-fills fields with synced values', async () => {
      mockGetAthleteProfile.mockResolvedValue({
        ftp: 280,
        lthr: 170,
        resting_hr: 45,
        max_hr: 190,
        run_ftp: 300,
        swim_ftp: 110,
        source: 'intervals.icu',
      });

      const { getByLabelText, toJSON } = renderWithCredentials();

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Synced from Intervals.icu');
      });

      expect(getByLabelText('FTP (Functional Threshold Power)').props.value).toBe('280');
      expect(getByLabelText('LTHR (Lactate Threshold Heart Rate)').props.value).toBe('170');
      expect(getByLabelText('Resting Heart Rate').props.value).toBe('45');
      expect(getByLabelText('Max Heart Rate').props.value).toBe('190');
      expect(getByLabelText('Threshold Pace').props.value).toBe('5:00');
      expect(getByLabelText('CSS (Critical Swim Speed)').props.value).toBe('1:50');
    });

    it('shows synced badges on pre-filled fields', async () => {
      mockGetAthleteProfile.mockResolvedValue({
        ftp: 280,
        lthr: null,
        resting_hr: 45,
        max_hr: null,
        run_ftp: null,
        swim_ftp: null,
        source: 'intervals.icu',
      });

      const { toJSON } = renderWithCredentials();

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Synced from Intervals.icu');
      });

      // Synced badge should appear for fields that had values
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Synced');
    });

    it('shows error banner when sync fails', async () => {
      mockGetAthleteProfile.mockRejectedValue(new Error('Network error'));

      const { toJSON } = renderWithCredentials();

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Could not sync from Intervals.icu');
      });
    });

    it('does not attempt sync when not connected', () => {
      renderWithProvider();

      expect(mockGetAthleteProfile).not.toHaveBeenCalled();
    });
  });
});
