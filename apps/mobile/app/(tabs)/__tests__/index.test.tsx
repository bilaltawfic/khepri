import { formatDateLocal } from '@khepri/core';
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

let mockActiveSeasonReturn = {
  hasActiveSeason: false,
  isLoading: false,
  refresh: jest.fn(),
};

jest.mock('@/hooks', () => ({
  useDashboard: () => mockDashboardReturn,
  useWeekOverview: () => ({ info: null, isLoading: false, error: null }),
  useActiveSeason: () => mockActiveSeasonReturn,
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
  recentActivities: [],
  warnings: [],
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
    mockActiveSeasonReturn = {
      hasActiveSeason: false,
      isLoading: false,
      refresh: jest.fn(),
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
          {
            id: 'goal-1',
            title: 'Complete Ironman',
            type: 'goal',
            date: '2026-09-15',
            priority: 'A',
          },
        ],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Complete Ironman');
  });

  it('renders Recent Activities card with placeholder', () => {
    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Recent Activities');
    expect(json).toContain('No recent activities');
  });

  it('shows activities when available', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        recentActivities: [
          {
            id: 'act-1',
            name: 'Morning Ride',
            type: 'Ride',
            date: '2026-02-13',
            duration: 60,
            load: 55,
          },
          {
            id: 'act-2',
            name: 'Tempo Run',
            type: 'Run',
            date: '2026-02-12',
            duration: 45,
            load: 48,
          },
        ],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Morning Ride');
    expect(json).toContain('Tempo Run');
    expect(json).toContain('1h');
    expect(json).toContain('45m');
    expect(json).toContain(' TSS');
    expect(json).toContain('55');
  });

  it('shows training load metrics without FTP', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ...mockDashboardData.fitnessMetrics, ftp: 250 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('250W');
    expect(json).toContain('CTL');
    expect(json).toContain('ATL');
    expect(json).toContain('TSB');
  });

  it('shows Fresh status badge when TSB > 5', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ftp: null, weight: null, ctl: 80, atl: 70, tsb: 10 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fresh');
    expect(json).toContain('fitness exceeds fatigue');
  });

  it('shows Optimal status badge when TSB is between -10 and 5', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ftp: null, weight: null, ctl: 80, atl: 78, tsb: 2 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Optimal');
    expect(json).toContain('sustainable training zone');
  });

  it('shows Fatigued status badge when TSB < -10', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ftp: null, weight: null, ctl: 70, atl: 85, tsb: -15 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fatigued');
    expect(json).toContain('consider recovery');
  });

  it('formats metric values to 2 decimal places', () => {
    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        fitnessMetrics: { ftp: null, weight: null, ctl: 70.123, atl: 65, tsb: 5.12 },
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('70.12');
    expect(json).toContain('65'); // integer, no decimals
    expect(json).toContain('5.12');
  });

  it('shows weeks away for upcoming events', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21); // 3 weeks out
    const dateStr = formatDateLocal(futureDate);

    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        upcomingEvents: [{ id: '1', title: 'Race Day', type: 'race', date: dateStr }],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Day');
    expect(json).toContain('3w');
  });

  it('shows today label for events happening today', () => {
    const todayStr = formatDateLocal(new Date());

    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        upcomingEvents: [{ id: '1', title: 'Today Event', type: 'workout', date: todayStr }],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Today Event');
    expect(json).toContain('today');
  });

  it('shows days label for events within a week', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = formatDateLocal(futureDate);

    mockDashboardReturn = {
      ...mockDashboardReturn,
      data: {
        ...mockDashboardData,
        upcomingEvents: [{ id: '1', title: 'Near Event', type: 'workout', date: dateStr }],
      },
    };

    const { toJSON } = render(<DashboardScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Near Event');
    expect(json).toContain('3d');
  });

  describe('Season Setup CTA', () => {
    it('shows season setup CTA when no active season', () => {
      mockActiveSeasonReturn = {
        hasActiveSeason: false,
        isLoading: false,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Set Up Your Season');
      expect(json).toContain('Set Up Season');
      expect(json).toContain('explore the app first');
    });

    it('hides season setup CTA when active season exists', () => {
      mockActiveSeasonReturn = {
        hasActiveSeason: true,
        isLoading: false,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Set Up Your Season');
    });

    it('hides season setup CTA while loading', () => {
      mockActiveSeasonReturn = {
        hasActiveSeason: false,
        isLoading: true,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Set Up Your Season');
    });

    it('includes the current year in the CTA message', () => {
      mockActiveSeasonReturn = {
        hasActiveSeason: false,
        isLoading: false,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain(String(new Date().getFullYear()));
    });
  });
});
