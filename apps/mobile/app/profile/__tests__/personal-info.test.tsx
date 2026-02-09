import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PersonalInfoScreen from '../personal-info';

// Mock expo-router
const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: mockRouterBack,
    push: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useAthleteProfile hook
const mockUpdateProfile = jest.fn();

type MockAthlete = {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  preferred_units: string | null;
  timezone: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

type MockHookReturn = {
  athlete: MockAthlete | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: typeof mockUpdateProfile;
  refetch: jest.Mock;
};

const defaultAthlete: MockAthlete = {
  id: 'athlete-123',
  auth_user_id: 'auth-user-123',
  display_name: 'Test Athlete',
  weight_kg: 70,
  height_cm: 175,
  preferred_units: 'metric',
  timezone: 'UTC',
  date_of_birth: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

let mockHookReturn: MockHookReturn = {
  athlete: defaultAthlete,
  isLoading: false,
  error: null,
  updateProfile: mockUpdateProfile,
  refetch: jest.fn(),
};

jest.mock('@/hooks', () => ({
  useAthleteProfile: () => mockHookReturn,
}));

describe('PersonalInfoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({ success: true });
    mockHookReturn = {
      athlete: { ...defaultAthlete },
      isLoading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      refetch: jest.fn(),
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the description', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Update your personal information');
  });

  it('renders Basic Information section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Basic Information');
    expect(json).toContain('Display Name');
    expect(json).toContain('Date of Birth');
  });

  it('renders Physical Stats section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Physical Stats');
    expect(json).toContain('Weight');
    expect(json).toContain('Height');
  });

  it('renders Preferences section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Preferences');
    expect(json).toContain('Units');
    expect(json).toContain('Timezone');
  });

  it('renders Save and Cancel buttons', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Save Changes');
    expect(json).toContain('Cancel');
  });

  describe('Loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      mockHookReturn.isLoading = true;
      mockHookReturn.athlete = null;
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Loading profile');
    });
  });

  describe('Error state', () => {
    it('shows error message when error is present', () => {
      mockHookReturn.error = 'Failed to load profile';
      mockHookReturn.athlete = null;
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to load profile');
    });

    it('shows go back button on error', () => {
      mockHookReturn.error = 'Failed to load profile';
      mockHookReturn.athlete = null;
      const { getByLabelText } = render(<PersonalInfoScreen />);
      expect(getByLabelText('Go back')).toBeTruthy();
    });
  });

  describe('Cancel button', () => {
    it('renders and can be pressed', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const cancelButton = getByLabelText('Cancel and go back');
      expect(cancelButton).toBeTruthy();
      // Button should be pressable (not throw)
      fireEvent.press(cancelButton);
    });
  });

  describe('Form pre-population', () => {
    it('pre-populates display name from athlete data', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const displayNameInput = getByLabelText('Display Name');
      expect(displayNameInput.props.value).toBe('Test Athlete');
    });

    it('pre-populates weight from athlete data', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const weightInput = getByLabelText('Weight');
      expect(weightInput.props.value).toBe('70');
    });

    it('pre-populates height from athlete data', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const heightInput = getByLabelText('Height');
      expect(heightInput.props.value).toBe('175');
    });

    it('handles null weight gracefully', () => {
      mockHookReturn.athlete = { ...defaultAthlete, weight_kg: null };
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const weightInput = getByLabelText('Weight');
      expect(weightInput.props.value).toBe('');
    });

    it('handles null height gracefully', () => {
      mockHookReturn.athlete = { ...defaultAthlete, height_cm: null };
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const heightInput = getByLabelText('Height');
      expect(heightInput.props.value).toBe('');
    });
  });

  describe('Form validation', () => {
    it('shows error when display name is empty', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      fireEvent.changeText(displayNameInput, '');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Display name is required');
      });
    });

    it('shows error when display name is only whitespace', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      fireEvent.changeText(displayNameInput, '   ');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Display name is required');
      });
    });

    it('shows error for invalid weight (too low)', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '10');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid weight (20-300 kg)');
      });
    });

    it('shows error for invalid weight (too high)', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '400');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid weight (20-300 kg)');
      });
    });

    it('shows error for invalid height (too low)', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '50');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid height (100-250 cm)');
      });
    });

    it('clears error when user corrects the field', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '10');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid weight (20-300 kg)');
      });

      fireEvent.changeText(weightInput, '75');

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Please enter a valid weight (20-300 kg)');
      });
    });
  });

  describe('Form submission', () => {
    it('calls updateProfile with correct data on save', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            display_name: 'Test Athlete',
            weight_kg: 70,
            height_cm: 175,
            preferred_units: 'metric',
            timezone: 'UTC',
          })
        );
      });
    });

    it('shows success alert on successful save', async () => {
      mockUpdateProfile.mockResolvedValue({ success: true });

      const { getByLabelText } = render(<PersonalInfoScreen />);

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
        );
      });
    });

    it('shows error alert on failed save', async () => {
      mockUpdateProfile.mockResolvedValue({ success: false, error: 'Save failed' });

      const { getByLabelText } = render(<PersonalInfoScreen />);

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Save failed');
      });
    });

    it('does not call updateProfile when validation fails', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      fireEvent.changeText(displayNameInput, '');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).not.toHaveBeenCalled();
      });
    });
  });

  describe('Field updates', () => {
    it('updates display name correctly', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      fireEvent.changeText(displayNameInput, 'John Doe');

      expect(displayNameInput.props.value).toBe('John Doe');
    });

    it('updates weight correctly', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '80');

      expect(weightInput.props.value).toBe('80');
    });

    it('updates height correctly', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '180');

      expect(heightInput.props.value).toBe('180');
    });
  });

  describe('Edge cases', () => {
    it('validates minimum boundary for weight (20)', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '20');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });

    it('validates maximum boundary for weight (300)', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '300');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalled();
      });
    });

    it('handles decimal weight values', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75.5');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            weight_kg: 75.5,
          })
        );
      });
    });
  });

  describe('Help text', () => {
    it('renders help text for date of birth', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Used to calculate age-appropriate training zones');
    });

    it('renders help text for units preference', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Used for displaying distances, weights, and paces');
    });

    it('renders help text for timezone preference', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Used for scheduling daily check-ins');
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label for save button', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      expect(getByLabelText('Save personal info')).toBeTruthy();
    });

    it('has correct accessibility label for cancel button', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      expect(getByLabelText('Cancel and go back')).toBeTruthy();
    });
  });

  describe('Dynamic unit display', () => {
    it('shows kg unit for weight with metric preference', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('kg');
    });

    it('shows cm unit for height with metric preference', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('cm');
    });
  });
});
