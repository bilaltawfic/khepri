import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { View } from 'react-native';
import FitnessScreen from '../fitness';

// Mock expo-router
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

  it('renders the Continue button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue');
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

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for FTP below minimum', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '10');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for out-of-range resting HR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Resting Heart Rate'), '150');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Resting HR should be 30-100');
    });

    it('shows validation error for out-of-range max HR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('Max Heart Rate'), '250');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('Max HR should be 100-220');
    });

    it('shows validation error for out-of-range LTHR', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('LTHR (Lactate Threshold Heart Rate)'), '250');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('LTHR should be 80-200');
    });

    it('shows validation error for non-integer values', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '250.5');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('shows validation error for non-numeric input', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), 'abc');

      fireEvent.press(getByLabelText('Continue to goals'));

      const json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');
    });

    it('does not navigate when validation fails', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '600');
      fireEvent.press(getByLabelText('Continue to goals'));

      expect(router.push).not.toHaveBeenCalled();
    });

    it('clears error when field value is updated', () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      // Enter invalid value and trigger validation
      const ftpInput = getByLabelText('FTP (Functional Threshold Power)');
      fireEvent.changeText(ftpInput, '600');
      fireEvent.press(getByLabelText('Continue to goals'));

      let json = JSON.stringify(toJSON());
      expect(json).toContain('FTP should be 50-500');

      // Fix the value
      fireEvent.changeText(ftpInput, '250');

      json = JSON.stringify(toJSON());
      expect(json).not.toContain('FTP should be 50-500');
    });

    it('allows empty fields (all fields optional)', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Continue to goals'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/goals');
    });
  });

  describe('context integration', () => {
    it('saves valid data to context on continue', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '250');
      fireEvent.changeText(getByLabelText('Resting Heart Rate'), '52');
      fireEvent.changeText(getByLabelText('Max Heart Rate'), '185');

      fireEvent.press(getByLabelText('Continue to goals'));

      expect(dataRef.current?.ftp).toBe(250);
      expect(dataRef.current?.restingHR).toBe(52);
      expect(dataRef.current?.maxHR).toBe(185);
    });

    it('saves partial data when only some fields are filled', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '280');

      fireEvent.press(getByLabelText('Continue to goals'));

      expect(dataRef.current?.ftp).toBe(280);
      expect(dataRef.current?.restingHR).toBeUndefined();
      expect(dataRef.current?.maxHR).toBeUndefined();
    });

    it('navigates to goals after saving', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '250');
      fireEvent.press(getByLabelText('Continue to goals'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/goals');
    });
  });

  describe('skip functionality', () => {
    it('navigates to goals without saving data', () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Skip fitness numbers'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/goals');
      expect(dataRef.current?.ftp).toBeUndefined();
      expect(dataRef.current?.restingHR).toBeUndefined();
      expect(dataRef.current?.maxHR).toBeUndefined();
    });

    it('skips even when invalid data is entered', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.changeText(getByLabelText('FTP (Functional Threshold Power)'), '9999');
      fireEvent.press(getByLabelText('Skip fitness numbers'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/goals');
    });
  });
});
