import { render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import CheckinDetailScreen from '../[id]';

// Set search params for this test file
jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'test-checkin-id' });

// Mock useAuth to provide authenticated user
jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-auth-user-id' } }),
}));

// Mock getAthleteByAuthUser to resolve athlete profile
jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: jest.fn().mockResolvedValue({
    data: { id: 'test-athlete-profile-id' },
    error: null,
  }),
}));

// Mock supabase client with chained query builder
jest.mock('@/lib/supabase', () => {
  const maybeSingle = jest.fn();
  const builder = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return {
    supabase: { from: jest.fn(() => builder) },
    __mockMaybeSingle: maybeSingle,
  };
});

function getMock(): jest.Mock {
  return (require('@/lib/supabase') as { __mockMaybeSingle: jest.Mock }).__mockMaybeSingle;
}

const validCheckin = {
  id: 'test-checkin-id',
  checkin_date: '2026-03-28',
  sleep_quality: 8,
  sleep_hours: 7.5,
  energy_level: 7,
  stress_level: 3,
  overall_soreness: 2,
  available_time_minutes: 60,
  ai_recommendation: {
    summary: 'Great recovery day. Ready for a moderate effort.',
    workoutSuggestion: 'Tempo run with strides',
    intensityLevel: 'moderate',
    duration: 45,
    notes: 'Keep heart rate in zone 3',
  },
};

describe('CheckinDetailScreen', () => {
  beforeEach(() => {
    getMock().mockResolvedValue({ data: validCheckin, error: null });
  });

  it('renders loading state initially', () => {
    getMock().mockReturnValue(new Promise(() => {}));
    const { toJSON } = render(<CheckinDetailScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toBeTruthy();
  });

  it('renders check-in detail with wellness metrics', async () => {
    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Sleep Quality');
      expect(json).toContain('8/10');
      expect(json).toContain('Energy');
      expect(json).toContain('7/10');
      expect(json).toContain('Stress');
      expect(json).toContain('3/10');
      expect(json).toContain('Soreness');
      expect(json).toContain('2/10');
    });
  });

  it('renders wellness score', async () => {
    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Wellness');
      expect(json).toContain('%');
    });
  });

  it('renders AI recommendation', async () => {
    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Recommendation');
      expect(json).toContain('Tempo run with strides');
      expect(json).toContain('"45"');
      expect(json).toContain('Keep heart rate in zone 3');
    });
  });

  it('renders available time', async () => {
    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Available Time');
      expect(json).toContain('60 min');
    });
  });

  it('shows fallback notice for local fallback recommendations', async () => {
    getMock().mockResolvedValue({
      data: {
        ...validCheckin,
        ai_recommendation: {
          ...validCheckin.ai_recommendation,
          isLocalFallback: true,
        },
      },
      error: null,
    });

    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('AI coach unavailable');
    });
  });

  it('shows error state when fetch fails', async () => {
    getMock().mockResolvedValue({ data: null, error: { message: 'Network error' } });

    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Could not load check-in');
    });
  });

  it('shows not found state when no data returned', async () => {
    getMock().mockResolvedValue({ data: null, error: null });

    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Check-in not found');
    });
  });

  it('renders go back button on error', async () => {
    getMock().mockResolvedValue({ data: null, error: { message: 'error' } });

    const { getByLabelText } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      expect(getByLabelText('Go back')).toBeTruthy();
    });
  });

  it('handles invalid ai_recommendation gracefully', async () => {
    getMock().mockResolvedValue({
      data: { ...validCheckin, ai_recommendation: 'not an object' },
      error: null,
    });

    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Sleep Quality');
      expect(json).not.toContain('Recommendation');
    });
  });

  it('handles null metrics gracefully', async () => {
    getMock().mockResolvedValue({
      data: {
        ...validCheckin,
        sleep_quality: null,
        energy_level: null,
        stress_level: null,
        overall_soreness: null,
        available_time_minutes: null,
        ai_recommendation: null,
      },
      error: null,
    });

    const { toJSON } = render(<CheckinDetailScreen />);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Sleep Quality');
      expect(json).not.toContain('Recommendation');
    });
  });
});
