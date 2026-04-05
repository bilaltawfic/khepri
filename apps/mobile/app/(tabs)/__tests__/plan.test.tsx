import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { UseTrainingPlanReturn } from '@/hooks/useTrainingPlan';

import PlanScreen from '../plan';

jest.spyOn(Alert, 'alert');

const mockRefetch = jest.fn();
const mockCancelPlan = jest.fn();
const mockGetActiveBlock = jest.fn();
const mockGetAthleteByAuthUser = jest.fn();
const mockGetBlockWorkouts = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

let mockSupabase: object | undefined = {};

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

let mockTrainingPlanReturn: UseTrainingPlanReturn = {
  plan: null,
  isLoading: true,
  error: null,
  refetch: mockRefetch,
  createPlan: jest.fn(),
  cancelPlan: mockCancelPlan,
};

jest.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => mockTrainingPlanReturn,
}));

let mockPendingAdaptations: unknown[] = [];

jest.mock('@/hooks/useAdaptations', () => ({
  useAdaptations: () => ({
    pendingAdaptations: mockPendingAdaptations,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  }),
}));

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveBlock: (...args: unknown[]) => mockGetActiveBlock(...args),
  getBlockWorkouts: (...args: unknown[]) => mockGetBlockWorkouts(...args),
}));

const mockPlan = {
  id: 'plan-1',
  athlete_id: 'athlete-1',
  goal_id: 'goal-1',
  name: 'Ironman Base Training',
  description: '20-week Ironman preparation plan',
  start_date: '2026-01-06',
  end_date: '2026-05-25',
  total_weeks: 20,
  status: 'active',
  periodization: {
    phases: [
      {
        phase: 'base',
        weeks: 8,
        focus: 'aerobic_endurance',
        intensity_distribution: [80, 15, 5],
      },
      {
        phase: 'build',
        weeks: 6,
        focus: 'threshold_work',
        intensity_distribution: [70, 20, 10],
      },
      {
        phase: 'peak',
        weeks: 4,
        focus: 'race_specific',
        intensity_distribution: [60, 25, 15],
      },
      {
        phase: 'taper',
        weeks: 2,
        focus: 'recovery',
        intensity_distribution: [85, 10, 5],
      },
    ],
    weekly_volumes: [
      { week: 1, volume_multiplier: 0.7, phase: 'base' },
      { week: 2, volume_multiplier: 0.8, phase: 'base' },
      { week: 3, volume_multiplier: 0.9, phase: 'base' },
      { week: 4, volume_multiplier: 1.0, phase: 'base' },
    ],
  },
  weekly_template: null,
  adaptations: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {};
    mockPendingAdaptations = [];
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveBlock.mockResolvedValue({ data: null, error: null });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });
    mockTrainingPlanReturn = {
      plan: mockPlan,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
  });

  it('renders without crashing', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it('shows loading state when loading', () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading your training plan...');
  });

  it('shows error state when error occurs', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: 'Database error',
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Database error');
      expect(json).toContain('Unable to load training plan');
    });
  });

  it('shows block setup prompt when no active plan or block', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Plan Your Training Block');
      expect(json).toContain('Start Block Setup');
    });
  });

  it('renders plan name', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman Base Training');
    });
  });

  it('renders plan description', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('20-week Ironman preparation plan');
    });
  });

  it('renders active status badge', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Active');
    });
  });

  it('renders training phases section', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Training Phases');
      expect(json).toContain('Base');
      expect(json).toContain('Build');
      expect(json).toContain('Peak');
      expect(json).toContain('Taper');
    });
  });

  it('renders phase focus areas', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Aerobic Endurance');
      expect(json).toContain('Threshold Work');
      expect(json).toContain('Race Specific');
      expect(json).toContain('Recovery');
    });
  });

  it('renders weekly volume section', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Weekly Volume');
    });
  });

  it('renders cancel button', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Cancel Plan');
    });
  });

  it('renders week progress indicator', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('of 20');
    });
  });

  it('renders intensity legend', async () => {
    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Easy');
      expect(json).toContain('Moderate');
      expect(json).toContain('Hard');
    });
  });

  it('renders plan without periodization when data is invalid', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, periodization: 'invalid' },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman Base Training');
      expect(json).not.toContain('Training Phases');
    });
  });

  it('renders plan without description when null', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, description: null },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman Base Training');
      expect(json).not.toContain('20-week Ironman preparation plan');
    });
  });

  it('handles plan that has not started yet', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, start_date: '2099-01-01' },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Starts soon');
    });
  });

  it('handles periodization with empty phases array', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: { phases: [], weekly_volumes: [] },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman Base Training');
      expect(json).not.toContain('Training Phases');
      expect(json).not.toContain('Weekly Volume');
    });
  });

  it('rejects periodization with invalid phase objects', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [{ invalid: true }],
          weekly_volumes: [],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Training Phases');
    });
  });

  it('shows cancel confirmation dialog when cancel button pressed', async () => {
    const { getByLabelText } = render(<PlanScreen />);
    await waitFor(() => {
      fireEvent.press(getByLabelText('Cancel training plan'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Training Plan',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Keep Plan' }),
        expect.objectContaining({ text: 'Cancel Plan', style: 'destructive' }),
      ])
    );
  });

  it('calls cancelPlan when cancel is confirmed', async () => {
    mockCancelPlan.mockResolvedValue({ success: true });
    const { getByLabelText } = render(<PlanScreen />);
    await waitFor(() => {
      fireEvent.press(getByLabelText('Cancel training plan'));
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[alertCalls.length - 1][2];
    const confirmButton = buttons.find((b: { text: string }) => b.text === 'Cancel Plan');
    confirmButton.onPress();

    await waitFor(() => {
      expect(mockCancelPlan).toHaveBeenCalled();
    });
  });

  it('shows active block view when block exists', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    mockGetActiveBlock.mockResolvedValue({
      data: {
        id: 'block-1',
        name: 'Base Building',
        total_weeks: 8,
        start_date: '2026-01-01',
        end_date: '2026-02-26',
        status: 'in_progress',
        phases: [{ name: 'Base', focus: 'Aerobic endurance', weeks: 8, weeklyHours: 8 }],
      },
      error: null,
    });
    mockGetBlockWorkouts.mockResolvedValue({
      data: [
        {
          id: 'w1',
          block_id: 'block-1',
          week_number: 1,
          date: '2026-01-05',
          name: 'Run - Easy Spin',
          sport: 'run',
          planned_duration_minutes: 45,
          completed_at: null,
        },
      ],
      error: null,
    });

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Base Building');
      // Block header shows the block name
      expect(json).toContain('Aerobic endurance');
    });
  });

  it('shows week navigation in active block view', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    mockGetActiveBlock.mockResolvedValue({
      data: {
        id: 'block-1',
        name: 'Build Phase',
        total_weeks: 6,
        start_date: '2026-01-01',
        end_date: '2026-02-12',
        status: 'in_progress',
        phases: [],
      },
      error: null,
    });
    mockGetBlockWorkouts.mockResolvedValue({
      data: [
        {
          id: 'w1',
          block_id: 'block-1',
          week_number: 1,
          date: '2026-01-05',
          name: 'Swim',
          sport: 'swim',
          planned_duration_minutes: 40,
          completed_at: null,
        },
      ],
      error: null,
    });

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      // Week navigation should be present
      expect(json).toContain('Previous week');
      expect(json).toContain('Next week');
    });
  });

  it('renders plan with recovery phase', async () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [
            {
              phase: 'recovery',
              weeks: 2,
              focus: 'recovery',
              intensity_distribution: [90, 5, 5],
            },
          ],
          weekly_volumes: [],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Training Phases');
      expect(json).toContain('Recovery');
    });
  });

  it('renders active block with workout rows', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    mockGetActiveBlock.mockResolvedValue({
      data: {
        id: 'block-2',
        name: 'Build Phase',
        total_weeks: 1,
        start_date: todayStr,
        end_date: todayStr,
        status: 'in_progress',
        phases: [{ name: 'Build', focus: 'Threshold', weeks: 1, weeklyHours: 10 }],
      },
      error: null,
    });
    mockGetBlockWorkouts.mockResolvedValue({
      data: [
        {
          id: 'w1',
          block_id: 'block-2',
          week_number: 1,
          date: todayStr,
          name: 'Bike - Threshold Intervals',
          sport: 'bike',
          planned_duration_minutes: 60,
          completed_at: null,
        },
        {
          id: 'w2',
          block_id: 'block-2',
          week_number: 1,
          date: todayStr,
          name: 'Run - Easy Recovery',
          sport: 'run',
          planned_duration_minutes: 30,
          completed_at: '2026-04-04T12:00:00Z',
        },
      ],
      error: null,
    });

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Build Phase');
      expect(json).toContain('Bike - Threshold Intervals');
      expect(json).toContain('Run - Easy Recovery');
      expect(json).toContain('TODAY');
    });
  });

  it('renders adaptation cards when pending adaptations exist', async () => {
    // Adaptation cards are only shown when there is an active block
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    mockGetActiveBlock.mockResolvedValue({
      data: {
        id: 'block-1',
        name: 'Base Building',
        total_weeks: 4,
        start_date: '2026-01-01',
        end_date: '2026-01-28',
        status: 'in_progress',
        phases: [],
      },
      error: null,
    });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });

    mockPendingAdaptations = [
      {
        id: 'adapt-1',
        athlete_id: 'athlete-1',
        block_id: 'block-1',
        trigger: 'coach_suggestion',
        status: 'suggested',
        reason: 'Poor sleep — reduce intensity.',
        affected_workouts: [
          {
            workoutId: 'w1',
            before: { name: 'Run - Threshold', sport: 'run', plannedDurationMinutes: 60 },
            after: { plannedDurationMinutes: 40 },
            changeType: 'modified',
          },
        ],
        context: { adaptationType: 'reduce_intensity' },
        created_at: '2026-04-04T08:00:00Z',
        updated_at: '2026-04-04T08:00:00Z',
        applied_at: null,
        rejected_at: null,
      },
    ];

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Coach Suggestion');
      expect(json).toContain('Poor sleep — reduce intensity.');
    });
  });

  it('renders block setup CTA when no plan and no active block', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    mockGetActiveBlock.mockResolvedValue({ data: null, error: null });

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Start Block Setup');
    });
  });

  it('shows no workouts message for empty week', async () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      createPlan: jest.fn(),
      cancelPlan: mockCancelPlan,
    };
    mockGetActiveBlock.mockResolvedValue({
      data: {
        id: 'block-3',
        name: 'Taper',
        total_weeks: 2,
        start_date: '2099-01-01',
        end_date: '2099-01-14',
        status: 'in_progress',
        phases: [],
      },
      error: null,
    });
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });

    const { toJSON } = render(<PlanScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No workouts for this week');
    });
  });
});
