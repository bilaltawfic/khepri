import { render } from '@testing-library/react-native';

import type { UseTrainingPlanReturn } from '@/hooks/useTrainingPlan';

import PlanScreen from '../plan';

const mockRefetch = jest.fn();
const mockPausePlan = jest.fn();
const mockCancelPlan = jest.fn();

let mockTrainingPlanReturn: UseTrainingPlanReturn = {
  plan: null,
  isLoading: true,
  error: null,
  refetch: mockRefetch,
  pausePlan: mockPausePlan,
  cancelPlan: mockCancelPlan,
};

jest.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => mockTrainingPlanReturn,
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
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
    mockTrainingPlanReturn = {
      plan: mockPlan,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      pausePlan: mockPausePlan,
      cancelPlan: mockCancelPlan,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<PlanScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows loading state when loading', () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      pausePlan: mockPausePlan,
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading your training plan...');
  });

  it('shows error state when error occurs', () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: 'Database error',
      refetch: mockRefetch,
      pausePlan: mockPausePlan,
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Database error');
    expect(json).toContain('Unable to load training plan');
  });

  it('shows empty state when no active plan', () => {
    mockTrainingPlanReturn = {
      plan: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      pausePlan: mockPausePlan,
      cancelPlan: mockCancelPlan,
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No Active Training Plan');
    expect(json).toContain('Talk to Coach');
  });

  it('renders plan name', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman Base Training');
  });

  it('renders plan description', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('20-week Ironman preparation plan');
  });

  it('renders active status badge', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Active');
  });

  it('renders training phases section', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Training Phases');
    expect(json).toContain('Base');
    expect(json).toContain('Build');
    expect(json).toContain('Peak');
    expect(json).toContain('Taper');
  });

  it('renders phase focus areas', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Aerobic Endurance');
    expect(json).toContain('Threshold Work');
    expect(json).toContain('Race Specific');
    expect(json).toContain('Recovery');
  });

  it('renders weekly volume section', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Weekly Volume');
  });

  it('renders pause and cancel buttons', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Pause Plan');
    expect(json).toContain('Cancel Plan');
  });

  it('renders week progress indicator', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('of 20');
  });

  it('renders intensity legend', () => {
    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Easy');
    expect(json).toContain('Moderate');
    expect(json).toContain('Hard');
  });

  it('renders plan without periodization when data is invalid', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, periodization: 'invalid' },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman Base Training');
    // Should not contain phases section since periodization is invalid
    expect(json).not.toContain('Training Phases');
  });

  it('renders plan without description when null', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, description: null },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman Base Training');
    expect(json).not.toContain('20-week Ironman preparation plan');
  });

  it('handles plan that has not started yet', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, start_date: '2099-01-01' },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Starts soon');
  });

  it('handles periodization with empty phases array', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: { phases: [], weekly_volumes: [] },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman Base Training');
    expect(json).not.toContain('Training Phases');
    expect(json).not.toContain('Weekly Volume');
  });

  it('handles periodization with invalid phase objects', () => {
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
    const json = JSON.stringify(toJSON());
    // Invalid periodization should be treated as null
    expect(json).not.toContain('Training Phases');
  });

  it('rejects periodization with invalid phase name', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [
            {
              phase: 'unknown_phase',
              weeks: 4,
              focus: 'aerobic_endurance',
              intensity_distribution: [80, 15, 5],
            },
          ],
          weekly_volumes: [],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Training Phases');
  });

  it('rejects periodization with non-finite intensity values', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [
            {
              phase: 'base',
              weeks: 4,
              focus: 'aerobic_endurance',
              intensity_distribution: [Number.NaN, 15, 5],
            },
          ],
          weekly_volumes: [],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Training Phases');
  });

  it('rejects periodization with invalid weekly volume data', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [
            {
              phase: 'base',
              weeks: 8,
              focus: 'aerobic_endurance',
              intensity_distribution: [80, 15, 5],
            },
          ],
          weekly_volumes: [{ week: Number.NaN, volume_multiplier: 0.7, phase: 'base' }],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Training Phases');
    expect(json).not.toContain('Weekly Volume');
  });

  it('rejects weekly volume with invalid phase name', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: {
        ...mockPlan,
        periodization: {
          phases: [
            {
              phase: 'base',
              weeks: 8,
              focus: 'aerobic_endurance',
              intensity_distribution: [80, 15, 5],
            },
          ],
          weekly_volumes: [{ week: 1, volume_multiplier: 0.7, phase: 'invalid_phase' }],
        },
      },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Training Phases');
  });

  it('clamps progress to 0% when plan has not started', () => {
    mockTrainingPlanReturn = {
      ...mockTrainingPlanReturn,
      plan: { ...mockPlan, start_date: '2099-01-01' },
    };

    const { toJSON } = render(<PlanScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('0%');
    expect(json).not.toContain('-5%');
  });
});
