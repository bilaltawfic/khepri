import { render, waitFor } from '@testing-library/react-native';

import BlockReviewCompleteScreen from '../block-review-complete';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

const mockGetAthleteByAuthUser = jest.fn();
const mockGetActiveBlock = jest.fn();
const mockGetBlockWorkouts = jest.fn();

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
  getActiveBlock: (...args: unknown[]) => mockGetActiveBlock(...args),
  getBlockWorkouts: (...args: unknown[]) => mockGetBlockWorkouts(...args),
}));

// =============================================================================
// Fixtures
// =============================================================================

const mockBlock = {
  id: 'block-1',
  athlete_id: 'athlete-1',
  name: 'Base Building',
  total_weeks: 4,
  start_date: '2026-01-05',
  end_date: '2026-02-02',
  status: 'in_progress',
  phases: [{ name: 'Base', focus: 'Aerobic endurance', weeks: 4, weeklyHours: 8 }],
};

function makeWorkout(overrides: Record<string, unknown> = {}) {
  return {
    id: `w-${Math.random()}`,
    block_id: 'block-1',
    week_number: 1,
    date: '2026-01-05',
    name: 'Run - Easy',
    sport: 'run',
    planned_duration_minutes: 60,
    actual_duration_minutes: null,
    completed_at: null,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('BlockReviewCompleteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAthleteByAuthUser.mockResolvedValue({ data: { id: 'athlete-1' }, error: null });
    mockGetActiveBlock.mockResolvedValue({ data: mockBlock, error: null });
    mockGetBlockWorkouts.mockResolvedValue({
      data: [
        makeWorkout({ week_number: 1, planned_duration_minutes: 60, actual_duration_minutes: 55 }),
        makeWorkout({ week_number: 2, planned_duration_minutes: 90, actual_duration_minutes: 85 }),
        makeWorkout({ week_number: 3, planned_duration_minutes: 60, actual_duration_minutes: 30 }),
        makeWorkout({ week_number: 4, planned_duration_minutes: 45, actual_duration_minutes: 0 }),
      ],
      error: null,
    });
  });

  it('renders without crashing', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it('shows loading state initially', () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading block summary...');
  });

  it('renders block name in header', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Base Building');
    });
  });

  it('renders "Block Complete" title', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Block Complete');
    });
  });

  it('renders overall compliance percentage', async () => {
    // Workouts: 55+85+30+0 = 170 completed, 60+90+60+45 = 255 planned
    // 170/255 = 0.6667 → Math.round(66.67) = 67%
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('67%');
    });
  });

  it('renders Overall Compliance label', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Overall Compliance');
    });
  });

  it('renders Key Metrics section', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Key Metrics');
      expect(json).toContain('Planned');
      expect(json).toContain('Completed');
      expect(json).toContain('Completion rate');
      expect(json).toContain('Total weeks');
    });
  });

  it('renders AI Analysis section', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('AI Analysis');
    });
  });

  it('renders Plan Next Block button', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Plan Next Block');
    });
  });

  it('renders Back to Dashboard button', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Back to Dashboard');
    });
  });

  it('shows 100% and strong performance AI text for high compliance', async () => {
    mockGetBlockWorkouts.mockResolvedValue({
      data: [makeWorkout({ planned_duration_minutes: 60, actual_duration_minutes: 60 })],
      error: null,
    });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('100%');
      expect(json).toContain('Strong block');
    });
  });

  it('shows appropriate AI text for low compliance (<60%)', async () => {
    mockGetBlockWorkouts.mockResolvedValue({
      data: [makeWorkout({ planned_duration_minutes: 100, actual_duration_minutes: 30 })],
      error: null,
    });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('challenging block');
    });
  });

  it('shows appropriate AI text for medium compliance (60-84%)', async () => {
    mockGetBlockWorkouts.mockResolvedValue({
      data: [makeWorkout({ planned_duration_minutes: 100, actual_duration_minutes: 70 })],
      error: null,
    });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Good effort');
    });
  });

  it('shows error state when athlete lookup fails', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Unable to load review');
      expect(json).toContain('Could not load athlete profile.');
    });
  });

  it('shows error state when no active block exists', async () => {
    mockGetActiveBlock.mockResolvedValue({ data: null, error: null });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No active training block found.');
    });
  });

  it('shows error state when block fetch returns error', async () => {
    mockGetActiveBlock.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Unable to load review');
    });
  });

  it('shows error state when workouts fetch fails', async () => {
    mockGetBlockWorkouts.mockResolvedValue({ data: null, error: { message: 'Timeout' } });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Could not load workouts.');
    });
  });

  it('handles zero planned minutes without crashing', async () => {
    mockGetBlockWorkouts.mockResolvedValue({ data: [], error: null });

    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('0%');
    });
  });

  it('renders start and end dates', async () => {
    const { toJSON } = render(<BlockReviewCompleteScreen />);
    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      // Dates are formatted but year should still be visible
      expect(json).toContain('2026');
    });
  });
});
