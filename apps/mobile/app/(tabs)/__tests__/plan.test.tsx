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
});
