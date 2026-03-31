import { render, waitFor } from '@testing-library/react-native';
import CheckinHistoryScreen from '../history';

// Mock useAuth
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// @khepri/supabase-client is handled by manual mock at __mocks__/@khepri/supabase-client.ts

function resetMocks() {
  const sc = require('@khepri/supabase-client') as {
    getAthleteByAuthUser: jest.Mock;
    getRecentCheckins: jest.Mock;
  };
  sc.getAthleteByAuthUser.mockResolvedValue({
    data: { id: 'athlete-1' },
    error: null,
  });
  sc.getRecentCheckins.mockResolvedValue({ data: [], error: null });
}

describe('CheckinHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('renders without crashing', async () => {
    const { toJSON } = render(<CheckinHistoryScreen />);
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it('shows empty state when no check-ins exist', async () => {
    const { toJSON } = render(<CheckinHistoryScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No check-ins yet');
    });
  });

  it('shows start check-in button in empty state', async () => {
    const { getByLabelText } = render(<CheckinHistoryScreen />);

    await waitFor(() => {
      expect(getByLabelText('Start first check-in')).toBeTruthy();
    });
  });

  it('renders history items with real data', async () => {
    const sc = require('@khepri/supabase-client') as {
      getRecentCheckins: jest.Mock;
    };
    sc.getRecentCheckins.mockResolvedValue({
      data: [
        {
          id: 'checkin-1',
          checkin_date: '2026-03-30',
          sleep_quality: 8,
          sleep_hours: 7.5,
          energy_level: 7,
          stress_level: 4,
          overall_soreness: 3,
          available_time_minutes: 60,
          ai_recommendation: {
            summary: 'Good day for training',
            workoutSuggestion: 'Steady state workout',
            intensityLevel: 'moderate',
            duration: 60,
          },
        },
      ],
      error: null,
    });

    const { toJSON } = render(<CheckinHistoryScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Wellness');
      expect(json).toContain('Energy');
      expect(json).toContain('Steady state workout');
    });
  });

  it('renders metric badges for sleep, energy, stress, soreness', async () => {
    const sc = require('@khepri/supabase-client') as {
      getRecentCheckins: jest.Mock;
    };
    sc.getRecentCheckins.mockResolvedValue({
      data: [
        {
          id: 'checkin-1',
          checkin_date: '2026-03-30',
          sleep_quality: 8,
          sleep_hours: 7,
          energy_level: 6,
          stress_level: 5,
          overall_soreness: 4,
          available_time_minutes: 45,
          ai_recommendation: null,
        },
      ],
      error: null,
    });

    const { toJSON } = render(<CheckinHistoryScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Energy');
      expect(json).toContain('Stress');
      expect(json).toContain('Soreness');
    });
  });

  it('shows error state when fetch fails', async () => {
    const sc = require('@khepri/supabase-client') as {
      getAthleteByAuthUser: jest.Mock;
    };
    sc.getAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { toJSON } = render(<CheckinHistoryScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Could not load athlete profile');
    });
  });
});
