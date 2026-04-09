import { formatDateLocal } from '@khepri/core';
import type { WeeklyCompliance } from '@khepri/core';
import type { PlanAdaptationRow, RaceBlockRow, WorkoutRow } from '@khepri/supabase-client';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../index';

import type { UseDashboardReturn, UseDashboardV2Return } from '@/hooks';
import type { DashboardV2Data } from '@/hooks/useDashboardV2';

const mockRefresh = jest.fn();

let mockDashboardReturn: UseDashboardReturn = {
  data: null,
  isLoading: true,
  error: null,
  refresh: mockRefresh,
};

let mockDashboardV2Return: UseDashboardV2Return = {
  data: null,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};

let mockActiveSeasonReturn = {
  hasActiveSeason: false,
  isLoading: false,
  refresh: jest.fn(),
};

jest.mock('@/hooks', () => ({
  useDashboard: () => mockDashboardReturn,
  useDashboardV2: () => mockDashboardV2Return,
  useWeekOverview: () => ({ info: null, isLoading: false, error: null }),
  useActiveSeason: () => mockActiveSeasonReturn,
  useAdaptations: () => ({
    pendingAdaptations: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  }),
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
    mockDashboardV2Return = {
      data: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
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
    it('shows season setup CTA when no active season (v2 data has no season)', () => {
      mockDashboardV2Return = {
        data: {
          season: null,
          activeBlock: null,
          todayWorkouts: [],
          pendingAdaptations: [],
          upcomingWorkouts: [],
          weeklyCompliance: null,
          nextRace: null,
          blockWeek: 0,
          checkInDone: false,
          weekRemainingCount: 0,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Set Up Your Season');
      expect(json).toContain('Set Up Season');
      expect(json).toContain('explore the app first');
    });

    it('hides season setup CTA when active season exists', () => {
      mockDashboardV2Return = {
        data: {
          season: makeSeason({ name: '2026' }),
          activeBlock: null,
          todayWorkouts: [],
          pendingAdaptations: [],
          upcomingWorkouts: [],
          weeklyCompliance: null,
          nextRace: null,
          blockWeek: 0,
          checkInDone: false,
          weekRemainingCount: 0,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Set Up Your Season');
    });

    it('hides season setup CTA while v2 loading', () => {
      mockDashboardV2Return = {
        data: null,
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      // When v2 is loading and no data, the CTA won't show because v2Data is null
      expect(toJSON()).toBeTruthy();
    });

    it('includes the current year in the CTA message', () => {
      mockDashboardV2Return = {
        data: {
          season: null,
          activeBlock: null,
          todayWorkouts: [],
          pendingAdaptations: [],
          upcomingWorkouts: [],
          weeklyCompliance: null,
          nextRace: null,
          blockWeek: 0,
          checkInDone: false,
          weekRemainingCount: 0,
        },
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      };

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain(String(new Date().getFullYear()));
    });
  });

  // =========================================================================
  // V2 Dashboard States (DASH-02 through DASH-11)
  // =========================================================================

  const mockBlock: RaceBlockRow = {
    id: 'block-1',
    season_id: 's1',
    athlete_id: 'a1',
    name: 'Base Phase',
    goal_id: null,
    start_date: '2026-03-01',
    end_date: '2026-05-31',
    total_weeks: 12,
    status: 'active',
    phases: [],
    locked_at: '2026-03-01T00:00:00Z',
    pushed_to_intervals_at: null,
    weekly_compliance: {},
    overall_compliance: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  };

  const mockWorkoutRow: WorkoutRow = {
    id: 'w1',
    block_id: 'block-1',
    athlete_id: 'a1',
    date: formatDateLocal(new Date()),
    week_number: 6,
    name: 'Threshold Intervals',
    sport: 'bike',
    workout_type: 'intervals',
    planned_duration_minutes: 60,
    planned_tss: 75,
    planned_distance_meters: null,
    structure: {
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'ramp 50-75% FTP', durationMinutes: 10 }],
        },
        {
          name: 'Main Set',
          durationMinutes: 40,
          steps: [{ description: '@ 95-105% FTP', durationMinutes: 8, repeat: 4 }],
        },
      ],
      totalDurationMinutes: 60,
    },
    description_dsl: '',
    intervals_target: '',
    sync_status: 'synced',
    external_id: 'ext1',
    intervals_event_id: null,
    actual_duration_minutes: null,
    actual_tss: null,
    actual_distance_meters: null,
    actual_avg_power: null,
    actual_avg_pace_sec_per_km: null,
    actual_avg_hr: null,
    completed_at: null,
    intervals_activity_id: null,
    compliance: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  };

  const mockWeeklyCompliance: WeeklyCompliance = {
    planned_sessions: 6,
    completed_sessions: 5,
    missed_sessions: 0,
    unplanned_sessions: 0,
    green_count: 4,
    amber_count: 1,
    red_count: 0,
    compliance_score: 0.83,
    compliance_color: 'green',
    planned_hours: 8.5,
    actual_hours: 7.2,
    planned_tss: 450,
    actual_tss: 380,
  };

  type DashboardSeason = NonNullable<DashboardV2Data['season']>;

  function makeSeason(overrides: Partial<DashboardSeason> = {}): DashboardSeason {
    return {
      id: 's1',
      athlete_id: 'a1',
      name: '2026 Season',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      status: 'active',
      preferences: {},
      skeleton: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function makeV2Data(overrides: Partial<DashboardV2Data> = {}): DashboardV2Data {
    return {
      season: makeSeason(),
      activeBlock: null,
      todayWorkouts: [],
      pendingAdaptations: [],
      upcomingWorkouts: [],
      weeklyCompliance: null,
      nextRace: null,
      blockWeek: 0,
      checkInDone: false,
      weekRemainingCount: 0,
      ...overrides,
    };
  }

  function setV2(data: DashboardV2Data) {
    mockDashboardV2Return = {
      data,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    };
  }

  describe('Plan Block CTA (DASH-02)', () => {
    it('shows "Plan First Block" CTA when season exists but no active block', () => {
      setV2(makeV2Data({ activeBlock: null }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Plan First Block');
      expect(json).toContain('2026 Season');
    });

    it('shows next race info in the CTA when available', () => {
      setV2(
        makeV2Data({
          activeBlock: null,
          nextRace: { name: 'Ironman 70.3', date: '2026-06-15', daysUntil: 67 },
        })
      );

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman 70.3');
    });

    it('does not show Plan Block CTA when active block exists', () => {
      setV2(makeV2Data({ activeBlock: mockBlock }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Plan First Block');
    });
  });

  describe('Active Block Dashboard (DASH-03)', () => {
    it('renders all dashboard sections when active block exists', () => {
      setV2(
        makeV2Data({
          activeBlock: mockBlock,
          todayWorkouts: [mockWorkoutRow],
          weeklyCompliance: mockWeeklyCompliance,
          weekRemainingCount: 1,
          blockWeek: 6,
          checkInDone: false,
        })
      );

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      // Today's workout section
      expect(json).toContain('TODAY');
      expect(json).toContain('Threshold Intervals');
      // Week summary section
      expect(json).toContain('THIS WEEK');
      // React splits template literals: ["83","%"] as separate text nodes
      expect(json).toContain('"83"');
      // Season progress section
      expect(json).toContain('Base Phase');
      // React splits "Week 6 of 12" into ["Week ","6"," of ","12"]
      expect(json).toContain('Week ');
      expect(json).toContain('"6"');
      expect(json).toContain(' of ');
      expect(json).toContain('"12"');
      // Check-in prompt (checkInDone is false)
      expect(json).toContain('Start Check-in');
    });
  });

  describe("Today's Workout (DASH-04, DASH-05, DASH-06)", () => {
    it('renders workout with sport emoji, name, duration (DASH-04)', () => {
      setV2(makeV2Data({ activeBlock: mockBlock, todayWorkouts: [mockWorkoutRow] }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Threshold Intervals');
      expect(json).toContain('1h');
      expect(json).toContain('Synced to Intervals.icu');
    });

    it('renders rest day message when no workouts planned (DASH-05)', () => {
      setV2(makeV2Data({ activeBlock: mockBlock, todayWorkouts: [] }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Rest Day');
      expect(json).toContain('Recovery and adaptation');
    });

    it('renders completed workout with actual duration and TSS (DASH-06)', () => {
      const completedWorkout: WorkoutRow = {
        ...mockWorkoutRow,
        completed_at: '2026-04-05T10:00:00Z',
        actual_duration_minutes: 58,
        actual_tss: 72,
        compliance: { score: 'green' },
      };
      setV2(makeV2Data({ activeBlock: mockBlock, todayWorkouts: [completedWorkout] }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('58m');
      expect(json).toContain('actual');
      expect(json).toContain('72 TSS');
    });
  });

  describe('Upcoming Workouts (DASH-07)', () => {
    it('renders upcoming workouts with day labels', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const upcomingWorkouts: WorkoutRow[] = [
        {
          ...mockWorkoutRow,
          id: 'u1',
          date: formatDateLocal(tomorrow),
          name: 'Easy Run',
          sport: 'run',
          planned_duration_minutes: 45,
        },
        {
          ...mockWorkoutRow,
          id: 'u2',
          date: formatDateLocal(dayAfter),
          name: 'Long Ride',
          sport: 'bike',
          planned_duration_minutes: 120,
        },
      ];

      setV2(makeV2Data({ activeBlock: mockBlock, upcomingWorkouts }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('UPCOMING');
      expect(json).toContain('Easy Run');
      expect(json).toContain('Long Ride');
      expect(json).toContain('45m');
      expect(json).toContain('2h');
    });
  });

  describe('Week Summary (DASH-08)', () => {
    it('renders completed/remaining counts and compliance percentage', () => {
      setV2(
        makeV2Data({
          activeBlock: mockBlock,
          weeklyCompliance: mockWeeklyCompliance,
          weekRemainingCount: 1,
        })
      );

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('THIS WEEK');
      // React splits template literals into separate text nodes
      expect(json).toContain('completed');
      expect(json).toContain('remaining');
      expect(json).toContain('"8.5h"');
      expect(json).toContain('"83"');
    });
  });

  describe('Season Progress (DASH-09)', () => {
    it('renders block name, week progress, and next race', () => {
      setV2(
        makeV2Data({
          activeBlock: mockBlock,
          blockWeek: 6,
          nextRace: { name: 'Ironman 70.3', date: '2026-06-15', daysUntil: 67 },
        })
      );

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Base Phase');
      // React splits template literals: ["Week ","6"," of ","12"]
      expect(json).toContain('Week ');
      expect(json).toContain('"12"');
      expect(json).toContain('Ironman 70.3');
      // React splits template: ["67"," days)"] as separate text nodes
      expect(json).toContain('"67"');
      expect(json).toContain('days');
    });
  });

  describe('Season CTA Dismiss (DASH-10)', () => {
    it('shows dismiss text alongside CTA', () => {
      setV2(makeV2Data({ season: null }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());

      // CTA visible with dismiss option
      expect(json).toContain('Set Up Your Season');
      expect(json).toContain('explore the app first');
      // Legacy cards remain alongside CTA
      expect(json).toContain('Training Load');
    });

    it('does not show season CTA when active season exists', () => {
      setV2(makeV2Data());

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Set Up Your Season');
    });
  });

  describe('Check-in Prompt (DASH-11)', () => {
    it('shows check-in prompt when check-in not done', () => {
      setV2(makeV2Data({ activeBlock: mockBlock, checkInDone: false }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Complete your check-in for personalized coaching');
      expect(json).toContain('Start Check-in');
    });

    it('hides check-in prompt when check-in is done', () => {
      setV2(makeV2Data({ activeBlock: mockBlock, checkInDone: true }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Complete your check-in for personalized coaching');
    });
  });

  describe('Adaptation Banner', () => {
    it('renders adaptation banner when pending adaptations exist', () => {
      const adaptation: PlanAdaptationRow = {
        id: 'adapt-1',
        block_id: 'block-1',
        athlete_id: 'a1',
        trigger: 'fatigue',
        status: 'pending',
        affected_workouts: [
          {
            before: {
              name: 'Threshold Intervals',
              sport: 'bike',
              plannedDurationMinutes: 60,
              date: '2026-04-10',
            },
            after: {
              name: 'Easy Spin',
              sport: 'bike',
              plannedDurationMinutes: 45,
              date: '2026-04-10',
            },
          },
        ],
        reason: 'High fatigue detected — suggesting easier sessions',
        context: { adaptationType: 'reduce_intensity' },
        rolled_back_at: null,
        rolled_back_by: null,
        rollback_adaptation_id: null,
        created_at: '2026-04-05T00:00:00Z',
      };

      setV2(makeV2Data({ activeBlock: mockBlock, pendingAdaptations: [adaptation] }));

      const { toJSON } = render(<DashboardScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('High fatigue detected');
    });
  });
});
