import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import PlanScreen from '../plan';

const mockReset = jest.fn();
const mockSetPlanDuration = jest.fn();
const mockSaveOnboardingData = jest.fn();

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
  useOnboarding: () => ({
    data: { goals: [], ftp: 250, restingHR: 52, maxHR: 185 },
    setPlanDuration: mockSetPlanDuration,
    reset: mockReset,
  }),
}));

jest.mock('@/services/onboarding', () => ({
  saveOnboardingData: (...args: unknown[]) => mockSaveOnboardingData(...args),
}));

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveOnboardingData.mockResolvedValue({ success: true });
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<PlanScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('How would you like to train?');
  });

  it('renders the description', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Choose how Khepri should guide your training');
  });

  it('renders the Structured Training Plan option', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Structured Training Plan');
    expect(json).toContain('Periodized training blocks');
    expect(json).toContain('Progressive overload built-in');
  });

  it('renders the Daily Suggestions option', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Daily Suggestions');
    expect(json).toContain('Flexible day-to-day training');
    expect(json).toContain('Adapts to your schedule');
  });

  it('renders the info card', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Both options use AI to personalize workouts');
  });

  it('renders the Start Training button', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Start Training');
  });

  it('renders the Decide later button', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Decide later');
  });

  it('can select the structured plan option', () => {
    const { getByLabelText } = render(<PlanScreen />);
    const structuredButton = getByLabelText('Select Structured Training Plan');
    expect(() => fireEvent.press(structuredButton)).not.toThrow();
  });

  it('can select the daily suggestions option', () => {
    const { getByLabelText } = render(<PlanScreen />);
    const dailyButton = getByLabelText('Select Daily Suggestions');
    expect(() => fireEvent.press(dailyButton)).not.toThrow();
  });

  describe('save onboarding data', () => {
    it('saves data when Start Training is pressed after selecting a plan', async () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(mockSaveOnboardingData).toHaveBeenCalledWith('test-user-id', {
          goals: [],
          ftp: 250,
          restingHR: 52,
          maxHR: 185,
          planDurationWeeks: 12,
        });
      });
    });

    it('sets plan duration for structured plan', async () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(mockSetPlanDuration).toHaveBeenCalledWith(12);
      });
    });

    it('clears plan duration for daily suggestions', async () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Daily Suggestions'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(mockSetPlanDuration).toHaveBeenCalledWith(undefined);
      });
    });

    it('navigates to tabs after successful save', async () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('resets onboarding context after successful save', async () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });
    });

    it('shows error alert when save fails', async () => {
      mockSaveOnboardingData.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Save Error',
          'Database error',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Continue Anyway' }),
            expect.objectContaining({ text: 'Try Again' }),
          ])
        );
      });

      alertSpy.mockRestore();
    });

    it('shows note alert for partial success', async () => {
      mockSaveOnboardingData.mockResolvedValueOnce({
        success: true,
        error: 'Profile saved but some goals failed: Goal 2',
      });

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Select Structured Training Plan'));
      fireEvent.press(getByLabelText('Start training'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Note',
          expect.stringContaining('some goals failed'),
          expect.any(Array)
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('decide later', () => {
    it('skips saving and navigates directly to tabs', () => {
      const { getByLabelText } = render(<PlanScreen />);

      fireEvent.press(getByLabelText('Decide later'));

      expect(mockSaveOnboardingData).not.toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
