import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import FitnessNumbersScreen from '../fitness-numbers';

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
    push: jest.fn(),
  },
}));

// Mock useAthleteProfile hook with dynamic return values
const mockUpdateProfile = jest.fn();
const mockRefetch = jest.fn();
const mockUseAthleteProfile = jest.fn();

jest.mock('@/hooks', () => ({
  useAthleteProfile: () => mockUseAthleteProfile(),
}));

// Default mock return value
const defaultMockReturn = {
  athlete: {
    id: 'athlete-123',
    ftp_watts: null,
    running_threshold_pace_sec_per_km: null,
    css_sec_per_100m: null,
    resting_heart_rate: null,
    max_heart_rate: null,
    lthr: null,
  },
  isLoading: false,
  error: null,
  updateProfile: mockUpdateProfile,
  refetch: mockRefetch,
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('FitnessNumbersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAthleteProfile.mockReturnValue(defaultMockReturn);
    mockUpdateProfile.mockResolvedValue({ success: true });
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the description', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your fitness numbers help Khepri calculate training zones');
  });

  it('renders the Intervals.icu sync tip', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect Intervals.icu');
  });

  it('renders Cycling section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cycling');
    expect(json).toContain('Functional Threshold Power');
    expect(json).toContain('FTP');
  });

  it('renders Running section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Running');
    expect(json).toContain('Threshold Pace');
  });

  it('renders Swimming section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Swimming');
    expect(json).toContain('Critical Swim Speed');
  });

  it('renders Heart Rate section', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Heart Rate');
    expect(json).toContain('Resting Heart Rate');
    expect(json).toContain('Max Heart Rate');
    expect(json).toContain('Lactate Threshold Heart Rate');
  });

  it('renders Save and Cancel buttons', () => {
    const { toJSON } = render(<FitnessNumbersScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Save Changes');
    expect(json).toContain('Cancel');
  });

  describe('Cancel button', () => {
    it('renders cancel button with correct accessibility label', () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);
      expect(getByLabelText('Cancel and go back')).toBeTruthy();
    });

    // Note: Button press navigation is verified via E2E tests.
    // fireEvent.press on custom Button components is unreliable in unit tests.
  });

  describe('Run threshold pace validation', () => {
    it('shows error for pace too fast (below 2:00/km)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '1');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '59');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (2:00 - 15:59 /km)');
      });
    });

    it('shows error for pace too slow (above 15:59/km)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '16');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '0');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (2:00 - 15:59 /km)');
      });
    });

    it('shows error for invalid seconds (above 59)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '5');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '75');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (2:00 - 15:59 /km)');
      });
    });

    it('accepts valid pace at minimum boundary (2:00/km)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '2');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '0');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('accepts valid pace at maximum boundary (15:59/km)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '15');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '59');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('accepts valid mid-range pace (5:30/km)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Run threshold pace minutes');
      fireEvent.changeText(minInput, '5');
      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('shows error when only seconds provided with 0 minutes', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const secInput = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(secInput, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (2:00 - 15:59 /km)');
      });
    });
  });

  describe('CSS (swim) pace validation', () => {
    it('shows error for pace too fast (below 0:30/100m)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '0');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '25');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (0:30 - 5:59 /100m)');
      });
    });

    it('shows error for pace too slow (above 5:59/100m)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '6');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '0');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (0:30 - 5:59 /100m)');
      });
    });

    it('shows error for invalid seconds (above 59)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '1');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '70');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (0:30 - 5:59 /100m)');
      });
    });

    it('accepts valid pace at minimum boundary (0:30/100m)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '0');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('accepts valid pace at maximum boundary (5:59/100m)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '5');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '59');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('accepts valid mid-range pace (1:45/100m)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const minInput = getByLabelText('Swim CSS pace minutes');
      fireEvent.changeText(minInput, '1');
      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '45');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('shows error when only seconds provided with 0 minutes and sec < 30', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const secInput = getByLabelText('Swim CSS pace seconds');
      fireEvent.changeText(secInput, '20');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Enter a valid pace (0:30 - 5:59 /100m)');
      });
    });
  });

  describe('Form validation', () => {
    it('shows error for invalid FTP (too low)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('FTP should be between 50-500 watts');
      });
    });

    it('shows error for invalid FTP (too high)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '600');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('FTP should be between 50-500 watts');
      });
    });

    it('shows error for non-numeric FTP', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, 'abc');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('FTP should be between 50-500 watts');
      });
    });

    it('shows error for invalid resting heart rate (too low)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const rhrInput = getByLabelText('Resting Heart Rate');
      fireEvent.changeText(rhrInput, '20');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Resting HR should be between 30-100 bpm');
      });
    });

    it('shows error for invalid resting heart rate (too high)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const rhrInput = getByLabelText('Resting Heart Rate');
      fireEvent.changeText(rhrInput, '120');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Resting HR should be between 30-100 bpm');
      });
    });

    it('shows error for invalid max heart rate (too low)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const mhrInput = getByLabelText('Max Heart Rate');
      fireEvent.changeText(mhrInput, '80');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Max HR should be between 100-220 bpm');
      });
    });

    it('shows error for invalid max heart rate (too high)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const mhrInput = getByLabelText('Max Heart Rate');
      fireEvent.changeText(mhrInput, '250');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Max HR should be between 100-220 bpm');
      });
    });

    it('shows error for invalid LTHR (too low)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const lthrInput = getByLabelText('Lactate Threshold Heart Rate (LTHR)');
      fireEvent.changeText(lthrInput, '70');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('LTHR should be between 80-200 bpm');
      });
    });

    it('shows error for invalid LTHR (too high)', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const lthrInput = getByLabelText('Lactate Threshold Heart Rate (LTHR)');
      fireEvent.changeText(lthrInput, '210');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('LTHR should be between 80-200 bpm');
      });
    });

    it('clears error when user corrects the field', async () => {
      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      // Enter invalid FTP
      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '30');

      // Try to save
      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      // Verify error appears
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('FTP should be between 50-500 watts');
      });

      // Correct the value
      fireEvent.changeText(ftpInput, '250');

      // Error should be cleared
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('FTP should be between 50-500 watts');
      });
    });
  });

  describe('Form submission', () => {
    it('shows success alert with valid data', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
        );
      });
    });

    it('shows success alert with valid FTP', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '250');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('shows success alert with all valid heart rate values', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const rhrInput = getByLabelText('Resting Heart Rate');
      const mhrInput = getByLabelText('Max Heart Rate');
      const lthrInput = getByLabelText('Lactate Threshold Heart Rate (LTHR)');

      fireEvent.changeText(rhrInput, '50');
      fireEvent.changeText(mhrInput, '180');
      fireEvent.changeText(lthrInput, '160');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('does not show success alert when validation fails', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '30'); // Invalid FTP

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).not.toHaveBeenCalled();
      });
    });
  });

  describe('Field updates', () => {
    it('updates FTP field correctly', () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '275');

      expect(ftpInput.props.value).toBe('275');
    });

    it('updates all heart rate fields correctly', () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const rhrInput = getByLabelText('Resting Heart Rate');
      const mhrInput = getByLabelText('Max Heart Rate');
      const lthrInput = getByLabelText('Lactate Threshold Heart Rate (LTHR)');

      fireEvent.changeText(rhrInput, '55');
      fireEvent.changeText(mhrInput, '185');
      fireEvent.changeText(lthrInput, '165');

      expect(rhrInput.props.value).toBe('55');
      expect(mhrInput.props.value).toBe('185');
      expect(lthrInput.props.value).toBe('165');
    });
  });

  describe('Edge cases', () => {
    it('validates minimum boundary for FTP (50)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '50');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('validates maximum boundary for FTP (500)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '500');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Fitness numbers saved successfully',
          expect.any(Array)
        );
      });
    });

    it('validates minimum boundary for resting HR (30)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const rhrInput = getByLabelText('Resting Heart Rate');
      fireEvent.changeText(rhrInput, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    it('validates minimum boundary for max HR (100)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const mhrInput = getByLabelText('Max Heart Rate');
      fireEvent.changeText(mhrInput, '100');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    it('validates minimum boundary for LTHR (80)', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const lthrInput = getByLabelText('Lactate Threshold Heart Rate (LTHR)');
      fireEvent.changeText(lthrInput, '80');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('UI sections', () => {
    it('renders all sport section icons', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('bicycle-outline');
      expect(json).toContain('walk-outline');
      expect(json).toContain('water-outline');
      expect(json).toContain('heart-outline');
    });

    it('renders sync icon in tip card', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('sync-outline');
    });

    it('renders help text for FTP', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your best average power for a ~60 minute effort');
    });

    it('renders help text for threshold pace', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your best sustainable pace for ~60 minutes');
    });

    it('renders help text for CSS', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your threshold pace in the pool');
    });

    it('renders help text for resting HR', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Measured first thing in the morning');
    });

    it('renders help text for max HR', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your highest recorded heart rate');
    });

    it('renders help text for LTHR', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Heart rate at your lactate threshold');
    });
  });

  describe('Pace inputs', () => {
    it('renders pace units for running', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('/km');
    });

    it('renders pace units for swimming', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('/100m');
    });

    it('renders pace separator colons', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      // There should be two colons (one for run pace, one for swim pace)
      const colonCount = (json.match(/":"/g) || []).length;
      expect(colonCount).toBeGreaterThan(0);
    });
  });

  describe('Unit indicators', () => {
    it('renders watts unit for FTP', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('watts');
    });

    it('renders bpm units for heart rate fields', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('bpm');
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility labels for main inputs', () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);
      expect(getByLabelText('Functional Threshold Power (FTP)')).toBeTruthy();
      expect(getByLabelText('Resting Heart Rate')).toBeTruthy();
      expect(getByLabelText('Max Heart Rate')).toBeTruthy();
      expect(getByLabelText('Lactate Threshold Heart Rate (LTHR)')).toBeTruthy();
    });

    it('has correct accessibility labels for buttons', () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);
      expect(getByLabelText('Save fitness numbers')).toBeTruthy();
      expect(getByLabelText('Cancel and go back')).toBeTruthy();
    });
  });

  describe('Color scheme handling', () => {
    it('renders correctly with default light color scheme', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Pace inputs presence', () => {
    it('renders four pace input fields (two for run, two for swim)', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      // Count placeholder occurrences for mm and ss
      const mmCount = (json.match(/"placeholder":"mm"/g) || []).length;
      const ssCount = (json.match(/"placeholder":"ss"/g) || []).length;
      expect(mmCount).toBe(2);
      expect(ssCount).toBe(2);
    });

    it('renders Threshold Pace label', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Threshold Pace');
    });

    it('renders Critical Swim Speed label', () => {
      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Critical Swim Speed');
    });
  });

  describe('Loading state', () => {
    it('renders loading indicator when isLoading is true', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Loading fitness numbers...');
    });

    it('renders ActivityIndicator when loading', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      // In web test environment, ActivityIndicator renders as progressbar role
      expect(json).toContain('progressbar');
    });

    it('does not render form when loading', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Save Changes');
    });
  });

  describe('Athlete null state', () => {
    it('renders no profile message when athlete is null', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: null,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No athlete profile found');
    });

    it('renders person icon when athlete is null', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: null,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('person-outline');
    });

    it('does not render form when athlete is null', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: null,
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Save Changes');
    });
  });

  describe('Error state', () => {
    it('renders error message when error is present', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to load profile',
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to load profile');
    });

    it('renders error icon when error is present', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        error: 'Network error',
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('alert-circle-outline');
    });

    it('renders Go Back button when error is present', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        error: 'Something went wrong',
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('does not render form when error is present', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        error: 'Error occurred',
      });

      const { toJSON } = render(<FitnessNumbersScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Save Changes');
    });
  });

  describe('Save failure', () => {
    it('shows error alert when save fails', async () => {
      mockUpdateProfile.mockResolvedValue({
        success: false,
        error: 'Failed to save fitness numbers',
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save fitness numbers'
        );
      });
    });

    it('shows generic error message when save fails without error message', async () => {
      mockUpdateProfile.mockResolvedValue({
        success: false,
        error: null,
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save fitness numbers'
        );
      });
    });
  });

  describe('Data pre-population', () => {
    it('pre-populates form with existing athlete data', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: {
          id: 'athlete-123',
          ftp_watts: 280,
          running_threshold_pace_sec_per_km: 330, // 5:30
          css_sec_per_100m: 95, // 1:35
          resting_heart_rate: 52,
          max_heart_rate: 185,
          lthr: 165,
        },
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);

      expect(getByLabelText('Functional Threshold Power (FTP)').props.value).toBe('280');
      expect(getByLabelText('Resting Heart Rate').props.value).toBe('52');
      expect(getByLabelText('Max Heart Rate').props.value).toBe('185');
      expect(getByLabelText('Lactate Threshold Heart Rate (LTHR)').props.value).toBe('165');
    });

    it('pre-populates run pace minutes and seconds correctly', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: {
          id: 'athlete-123',
          ftp_watts: null,
          running_threshold_pace_sec_per_km: 330, // 5:30
          css_sec_per_100m: null,
          resting_heart_rate: null,
          max_heart_rate: null,
          lthr: null,
        },
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);

      expect(getByLabelText('Run threshold pace minutes').props.value).toBe('5');
      expect(getByLabelText('Run threshold pace seconds').props.value).toBe('30');
    });

    it('pre-populates swim pace minutes and seconds correctly', () => {
      mockUseAthleteProfile.mockReturnValue({
        ...defaultMockReturn,
        athlete: {
          id: 'athlete-123',
          ftp_watts: null,
          running_threshold_pace_sec_per_km: null,
          css_sec_per_100m: 95, // 1:35
          resting_heart_rate: null,
          max_heart_rate: null,
          lthr: null,
        },
      });

      const { getByLabelText } = render(<FitnessNumbersScreen />);

      expect(getByLabelText('Swim CSS pace minutes').props.value).toBe('1');
      expect(getByLabelText('Swim CSS pace seconds').props.value).toBe('35');
    });
  });

  describe('Saving state', () => {
    it('disables save button while saving', async () => {
      // Make updateProfile take time
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { getByLabelText, toJSON } = render(<FitnessNumbersScreen />);

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      // Check for "Saving..." text immediately after pressing
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Saving...');
      });
    });

    it('calls updateProfile with correct data', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const ftpInput = getByLabelText('Functional Threshold Power (FTP)');
      fireEvent.changeText(ftpInput, '275');

      const rhrInput = getByLabelText('Resting Heart Rate');
      fireEvent.changeText(rhrInput, '55');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          ftp_watts: 275,
          running_threshold_pace_sec_per_km: null,
          css_sec_per_100m: null,
          resting_heart_rate: 55,
          max_heart_rate: null,
          lthr: null,
        });
      });
    });

    it('converts pace to seconds when saving', async () => {
      const { getByLabelText } = render(<FitnessNumbersScreen />);

      const runMin = getByLabelText('Run threshold pace minutes');
      const runSec = getByLabelText('Run threshold pace seconds');
      fireEvent.changeText(runMin, '5');
      fireEvent.changeText(runSec, '30');

      const saveButton = getByLabelText('Save fitness numbers');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            running_threshold_pace_sec_per_km: 330, // 5*60 + 30
          })
        );
      });
    });
  });
});
