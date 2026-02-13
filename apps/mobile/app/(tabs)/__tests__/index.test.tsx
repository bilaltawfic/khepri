import { render } from '@testing-library/react-native';
import DashboardScreen from '../index';

import type { UseDashboardReturn } from '@/hooks';

const mockRefresh = jest.fn();

let mockDashboardReturn: UseDashboardReturn = {
  data: null,
  isLoading: true,
  error: null,
  refresh: mockRefresh,
};

jest.mock('@/hooks', () => ({
  useDashboard: () => mockDashboardReturn,
}));

const mockDashboardData: UseDashboardReturn['data'] = {
  greeting: 'Good morning, John!',
  athleteName: 'John',
  todayRecommendation: null,
  hasCompletedCheckinToday: false,
  fitnessMetrics: {
    ftp: null,
    weight: null,
    ctl: null,
    atl: null,
    tsb: null,
  },
  upcomingEvents: [],
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardReturn = {
      data: mockDashboardData,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<DashboardScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows loading state when loading', () => {
    mockDashboardReturn = { data: null, isLoading: true, error: null, refresh: mockRefresh };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading your dashboard...');
  });

  it('shows error state when error occurs', () => {
    mockDashboardReturn = {
      data: null,
      isLoading: false,
      error: 'Database error',
      refresh: mockRefresh,
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Database error');
    expect(json).toContain('Unable to load dashboard');
  });

  it('renders the greeting text', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Good morning, John!');
  });

  it('renders the subtitle text', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Here's your training overview");
  });

  it("renders Today's Workout card with check-in prompt", () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Today's Workout");
    expect(json).toContain('Complete your daily check-in');
  });

  it('renders Training Load card with metrics', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Training Load');
    expect(json).toContain('CTL (Fitness)');
    expect(json).toContain('ATL (Fatigue)');
    expect(json).toContain('TSB (Form)');
  });

  it('renders Upcoming Events card', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Upcoming Events');
    expect(json).toContain('No upcoming events');
  });

  it('renders all three main dashboard cards', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Today's Workout");
    expect(json).toContain('Training Load');
    expect(json).toContain('Upcoming Events');
  });

  it('displays placeholder values for training metrics', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('--');
  });

  it('shows recommendation when available', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        hasCompletedCheckinToday: true,
        todayRecommendation: {
          workoutSuggestion: 'Easy recovery ride',
          intensityLevel: 'easy',
          duration: 45,
          summary: 'Take it easy today',
        },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Easy recovery ride');
    expect(json).toContain('Take it easy today');
    expect(json).toContain('easy');
    expect(json).toContain('45');
  });

  it('shows upcoming events when available', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        upcomingEvents: [
          { id: 'goal-1', title: 'Complete Ironman', type: 'goal', date: '2026-09-15', priority: 'A' },
        ],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Complete Ironman');
  });

  it('shows FTP when available', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ...mockDashboardData.fitnessMetrics, ftp: 250 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('250W');
  });
});
