import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import IntervalsSettingsScreen from '../intervals';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/hooks/useIntervalsConnection', () => ({
  useIntervalsConnection: () => ({
    status: mockConnectionStatus,
    isLoading: mockIsLoading,
    error: null,
    connect: mockConnect,
    disconnect: mockDisconnect,
    refresh: mockRefresh,
  }),
}));

let mockConnectionStatus = { connected: false };
let mockIsLoading = false;

describe('IntervalsSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockConnectionStatus = { connected: false };
    mockIsLoading = false;
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('renders connection status as not connected by default', () => {
    const { toJSON } = render(<IntervalsSettingsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Not Connected');
  });

  it('renders the description text', () => {
    const { toJSON } = render(<IntervalsSettingsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect your Intervals.icu account');
  });

  it('renders Athlete ID and API Key inputs', () => {
    render(<IntervalsSettingsScreen />);

    expect(screen.getByLabelText('Intervals.icu Athlete ID')).toBeTruthy();
    expect(screen.getByLabelText('Intervals.icu API Key')).toBeTruthy();
  });

  it('renders Connect and Cancel buttons', () => {
    render(<IntervalsSettingsScreen />);

    expect(screen.getByLabelText('Connect to Intervals.icu')).toBeTruthy();
    expect(screen.getByLabelText('Cancel and go back')).toBeTruthy();
  });

  it('renders About section', () => {
    const { toJSON } = render(<IntervalsSettingsScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('About Intervals.icu');
    expect(json).toContain('training analytics platform');
  });

  describe('Form validation', () => {
    it('shows validation error for empty Athlete ID', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Athlete ID is required');
      });
    });

    it('shows validation error for empty API Key', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('API Key is required');
      });
    });

    it('shows validation error for invalid Athlete ID format', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'invalid-format!');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'abcdefghij1234567890valid');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Invalid format. Example: i12345 or 12345');
      });
    });

    it('shows validation error for short API Key', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'short');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('API key must be at least 20 characters');
      });
    });

    it('accepts valid "iXXXXX" athlete ID format', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'abcdefghij1234567890valid');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Athlete ID is required');
        expect(json).not.toContain('Invalid format');
      });
    });

    it('accepts API key with special characters', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'abc-def_ghi-1234567890');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('API key must be at least 20 characters');
      });
    });

    it('accepts valid numeric-only athlete ID format', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, '12345');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'abcdefghij1234567890valid');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Athlete ID is required');
        expect(json).not.toContain('Invalid format');
      });
    });
  });

  describe('Error clearing', () => {
    it('clears Athlete ID error when user starts typing', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Athlete ID is required');
      });

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i');

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Athlete ID is required');
      });
    });

    it('clears API Key error when user starts typing', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('API Key is required');
      });

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'a');

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('API Key is required');
      });
    });
  });

  describe('Connect action', () => {
    it('shows success alert with valid credentials', async () => {
      render(<IntervalsSettingsScreen />);

      const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
      fireEvent.changeText(athleteIdInput, 'i12345');

      const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
      fireEvent.changeText(apiKeyInput, 'abcdefghij1234567890valid');

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Connection Settings Saved',
          'Your Intervals.icu credentials have been saved.',
          expect.arrayContaining([expect.objectContaining({ text: 'OK' })])
        );
      });
    });

    it('does not show success alert when validation fails', async () => {
      const { toJSON } = render(<IntervalsSettingsScreen />);

      const connectButton = screen.getByLabelText('Connect to Intervals.icu');
      fireEvent.press(connectButton);

      // Wait for validation errors to appear
      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Athlete ID is required');
      });

      expect(Alert.alert).not.toHaveBeenCalledWith(
        'Connection Settings Saved',
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('Navigation', () => {
    it('navigates back when cancel pressed', () => {
      const { router } = require('expo-router');
      render(<IntervalsSettingsScreen />);

      const cancelButton = screen.getByLabelText('Cancel and go back');
      fireEvent.press(cancelButton);

      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('External links', () => {
    it('opens Intervals.icu settings when help link pressed', () => {
      render(<IntervalsSettingsScreen />);

      const helpButton = screen.getByLabelText('Open Intervals.icu settings');
      fireEvent.press(helpButton);

      expect(Linking.openURL).toHaveBeenCalledWith('https://intervals.icu/settings');
    });
  });

  describe('Accessibility', () => {
    it('has accessibility label for connect button', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Connect to Intervals.icu')).toBeTruthy();
    });

    it('has accessibility label for cancel button', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Cancel and go back')).toBeTruthy();
    });

    it('has accessibility label for help link', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Open Intervals.icu settings')).toBeTruthy();
    });

    it('has accessibility label for athlete ID input', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Intervals.icu Athlete ID')).toBeTruthy();
    });

    it('has accessibility label for API key input', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Intervals.icu API Key')).toBeTruthy();
    });

    it('has accessibility role and label on status row', () => {
      render(<IntervalsSettingsScreen />);
      expect(screen.getByLabelText('Connection status: Not Connected')).toBeTruthy();
    });
  });
});
