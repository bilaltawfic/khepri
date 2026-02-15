import { render } from '@testing-library/react-native';

import RaceCountdownScreen from '../race-countdown';

import type { UseRaceCountdownReturn } from '@/hooks';

const mockRefresh = jest.fn();

let mockReturn: UseRaceCountdownReturn = {
  races: [],
  isLoading: true,
  error: null,
  refresh: mockRefresh,
};

jest.mock('@/hooks', () => ({
  useRaceCountdown: () => mockReturn,
}));

const mockRaces = [
  {
    goal: {
      id: 'goal-1',
      athlete_id: 'ath-1',
      title: 'Spring Marathon',
      goal_type: 'race',
      status: 'active',
      target_date: '2026-04-15',
      race_event_name: 'City Marathon 2026',
      race_location: 'London',
      race_distance: '42.2 km',
      race_target_time_seconds: 12600,
      priority: 'A',
      description: null,
      fitness_metric: null,
      fitness_target_value: null,
      health_current_value: null,
      health_metric: null,
      health_target_value: null,
      perf_current_value: null,
      perf_metric: null,
      perf_target_value: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    readiness: {
      daysUntilRace: 59,
      currentForm: 'fresh' as const,
      projectedTsb: 12.5,
      recommendation: 'Continue building fitness with progressive overload.',
      confidence: 'low' as const,
    },
  },
  {
    goal: {
      id: 'goal-2',
      athlete_id: 'ath-1',
      title: 'Sprint Tri',
      goal_type: 'race',
      status: 'active',
      target_date: '2026-06-01',
      race_event_name: null,
      race_location: null,
      race_distance: 'Sprint',
      race_target_time_seconds: null,
      priority: 'B',
      description: null,
      fitness_metric: null,
      fitness_target_value: null,
      health_current_value: null,
      health_metric: null,
      health_target_value: null,
      perf_current_value: null,
      perf_metric: null,
      perf_target_value: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    readiness: null,
  },
];

describe('RaceCountdownScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturn = {
      races: mockRaces,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows loading state when loading', () => {
    mockReturn = { ...mockReturn, races: [], isLoading: true };

    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading race countdown...');
  });

  it('shows error state when error occurs', () => {
    mockReturn = { ...mockReturn, races: [], isLoading: false, error: 'Network error' };

    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Network error');
    expect(json).toContain('Unable to load races');
  });

  it('shows empty state when no races', () => {
    mockReturn = { ...mockReturn, races: [], isLoading: false };

    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No Upcoming Races');
    expect(json).toContain('Add a race goal');
  });

  it('renders race event name', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('City Marathon 2026');
  });

  it('falls back to goal title when no race_event_name', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    // goal-2 has no race_event_name, should use title
    expect(json).toContain('Sprint Tri');
  });

  it('displays days remaining for races with readiness', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('59');
    expect(json).toContain('days');
  });

  it('displays form status badge', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fresh');
  });

  it('displays projected TSB', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Projected TSB');
    expect(json).toContain('13'); // Math.round(12.5)
  });

  it('displays recommendation text', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue building fitness');
  });

  it('displays confidence level', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('low');
  });

  it('displays location when available', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('London');
  });

  it('displays distance when available', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('42.2 km');
    expect(json).toContain('Sprint');
  });

  it('shows connect message when readiness is null', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Connect to Intervals.icu for race predictions');
  });

  it('renders screen title', () => {
    const { toJSON } = render(<RaceCountdownScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Countdown');
  });
});
