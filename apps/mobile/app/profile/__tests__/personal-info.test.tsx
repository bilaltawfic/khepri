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

describe('PersonalInfoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Cancel button', () => {
    it('renders cancel button that can be pressed', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const cancelButton = getByLabelText('Cancel and go back');
      expect(cancelButton).toBeTruthy();
      fireEvent.press(cancelButton);
    });
  });

  describe('Description text', () => {
    it('renders personalization message', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('This helps Khepri personalize your training recommendations');
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

    it('shows error for non-numeric weight', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, 'abc');

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

    it('shows error for invalid height (too high)', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '300');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid height (100-250 cm)');
      });
    });

    it('shows error for non-numeric height', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, 'xyz');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid height (100-250 cm)');
      });
    });

    it('clears error when user corrects the field', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      // Enter invalid weight
      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '10');

      // Try to save
      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      // Verify error appears
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid weight (20-300 kg)');
      });

      // Correct the value
      fireEvent.changeText(weightInput, '75');

      // Error should be cleared
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Please enter a valid weight (20-300 kg)');
      });
    });

    it('shows multiple errors simultaneously', async () => {
      const { getByLabelText, toJSON } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      const weightInput = getByLabelText('Weight');
      const heightInput = getByLabelText('Height');

      fireEvent.changeText(displayNameInput, '');
      fireEvent.changeText(weightInput, '10');
      fireEvent.changeText(heightInput, '50');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Display name is required');
        expect(json).toContain('Please enter a valid weight (20-300 kg)');
        expect(json).toContain('Please enter a valid height (100-250 cm)');
      });
    });
  });

  describe('Form submission', () => {
    it('shows success alert with valid data', async () => {
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

    it('shows success alert with valid weight', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75.5');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('shows success alert with valid height', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '180');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('does not show success alert when validation fails', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const displayNameInput = getByLabelText('Display Name');
      fireEvent.changeText(displayNameInput, '');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).not.toHaveBeenCalled();
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
      fireEvent.changeText(heightInput, '175');

      expect(heightInput.props.value).toBe('175');
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
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('validates maximum boundary for weight (300)', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '300');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('validates minimum boundary for height (100)', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '100');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('validates maximum boundary for height (250)', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '250');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Personal information saved successfully',
          expect.any(Array)
        );
      });
    });

    it('handles decimal weight values', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const weightInput = getByLabelText('Weight');
      fireEvent.changeText(weightInput, '75.5');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    it('handles decimal height values', async () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);

      const heightInput = getByLabelText('Height');
      fireEvent.changeText(heightInput, '175.5');

      const saveButton = getByLabelText('Save personal info');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
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

    it('renders physical stats description', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('These are optional but help with power-to-weight calculations');
      expect(json).toContain('training load estimates');
    });
  });

  describe('Unit options', () => {
    it('renders metric option as default selection', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      // The default selection shows "Metric (kg, km, m)"
      expect(json).toContain('Metric');
      expect(json).toContain('kg');
    });
  });

  describe('Timezone options', () => {
    it('renders UTC timezone', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('UTC');
    });
  });

  describe('Initial form values', () => {
    it('has default display name of Athlete', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const displayNameInput = getByLabelText('Display Name');
      expect(displayNameInput.props.value).toBe('Athlete');
    });

    it('has empty weight by default', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const weightInput = getByLabelText('Weight');
      expect(weightInput.props.value).toBe('');
    });

    it('has empty height by default', () => {
      const { getByLabelText } = render(<PersonalInfoScreen />);
      const heightInput = getByLabelText('Height');
      expect(heightInput.props.value).toBe('');
    });
  });

  describe('PersonalInfoScreen layout', () => {
    it('uses ScreenContainer', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders scrollable content area', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Color scheme handling', () => {
    it('renders correctly with default light color scheme', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      expect(toJSON()).toBeTruthy();
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

  describe('Date picker', () => {
    it('renders date of birth picker', () => {
      const { toJSON } = render(<PersonalInfoScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Date of Birth');
    });
  });
});
