import { fireEvent, render } from '@testing-library/react-native';

import BlockReviewScreen from '../block-review';

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
  supabase: { functions: { invoke: jest.fn() } },
}));

const MOCK_WORKOUTS = [
  {
    id: 'w1',
    block_id: 'block-1',
    week_number: 1,
    date: '2026-01-05',
    name: 'Run - Aerobic Endurance',
    sport: 'run',
    planned_duration_minutes: 50,
    structure: {
      sections: [
        { name: 'Warmup', steps: [{ description: 'Easy ramp 8m' }] },
        { name: 'Main Set', steps: [{ description: 'Steady aerobic run' }] },
      ],
    },
  },
  {
    id: 'w2',
    block_id: 'block-1',
    week_number: 1,
    date: '2026-01-06',
    name: 'Bike - Easy Spin',
    sport: 'bike',
    planned_duration_minutes: 68,
    structure: { sections: [] },
  },
  {
    id: 'w3',
    block_id: 'block-1',
    week_number: 2,
    date: '2026-01-12',
    name: 'Swim - Easy Technique',
    sport: 'swim',
    planned_duration_minutes: 45,
    structure: {
      sections: [
        { name: 'Main', steps: [{ description: 'Drill work 30m' }, { description: 'Cool down 15m' }] },
      ],
    },
  },
];

const MOCK_HOOK_DEFAULTS = {
  block: { id: 'block-1', name: 'Base 1', total_weeks: 8 } as { id: string; name: string; total_weeks: number } | null,
  workouts: MOCK_WORKOUTS as typeof MOCK_WORKOUTS | never[],
  error: null as string | null,
  isLoading: false,
};

let mockHookReturn = { ...MOCK_HOOK_DEFAULTS };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

describe('BlockReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS };
  });

  it('renders block name and workout summary', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Base 1');
    expect(tree).toContain('workouts across');
  });

  it('renders all workout names with sport icons', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Run - Aerobic Endurance');
    expect(tree).toContain('Bike - Easy Spin');
    expect(tree).toContain('Swim - Easy Technique');
    // Sport icons
    expect(tree).toContain('"footsteps"');
    expect(tree).toContain('"bicycle"');
    expect(tree).toContain('"water"');
  });

  it('renders week headers', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('"Week "');
  });

  it('shows weekly hours summary', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    // Week 1 total: 50 + 68 = 118 min = 2.0h
    expect(tree).toContain('2.0');
  });

  it('expands workout to show structure details on tap', () => {
    const { getByLabelText, toJSON } = render(<BlockReviewScreen />);

    // Tap the first workout to expand
    fireEvent.press(getByLabelText(/Run - Aerobic Endurance.*Tap to expand/));

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Warmup');
    expect(tree).toContain('Easy ramp 8m');
    expect(tree).toContain('Main Set');
    expect(tree).toContain('Steady aerobic run');
  });

  it('collapses expanded workout on second tap', () => {
    const { getByLabelText, toJSON } = render(<BlockReviewScreen />);

    // Expand
    fireEvent.press(getByLabelText(/Run - Aerobic Endurance.*Tap to expand/));
    let tree = JSON.stringify(toJSON());
    expect(tree).toContain('Warmup');

    // Collapse
    fireEvent.press(getByLabelText(/Run - Aerobic Endurance.*Tap to collapse/));
    tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('Easy ramp 8m');
  });

  it('renders action buttons', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Lock In This Plan');
    expect(tree).toContain('Back to Setup');
  });

  it('shows empty state when no workouts', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, block: { id: 'b1', name: 'Empty', total_weeks: 4 }, workouts: [] };

    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('No workouts to review');
    expect(tree).toContain('Back to Setup');
  });

  it('shows empty state when no block', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, block: null, workouts: [] };

    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('No workouts to review');
  });

  it('shows loading state', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, isLoading: true };

    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Loading workouts');
  });

  it('displays error message when present', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, error: 'Failed to load workouts' };

    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Failed to load workouts');
  });
});
