import { render } from '@testing-library/react-native';

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
    structure: { sections: [] },
  },
];

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => ({
    block: { id: 'block-1', name: 'Base 1', total_weeks: 8 },
    workouts: MOCK_WORKOUTS,
    error: null,
    isLoading: false,
  }),
}));

describe('BlockReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders block name and workout count', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Base 1');
    expect(tree).toContain('workouts across');
  });

  it('renders workout names', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Run - Aerobic Endurance');
    expect(tree).toContain('Bike - Easy Spin');
    expect(tree).toContain('Swim - Easy Technique');
  });

  it('renders week headers', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('"Week "');
  });

  it('renders navigation buttons', () => {
    const { getByLabelText } = render(<BlockReviewScreen />);

    expect(getByLabelText('Proceed to lock in this training block')).toBeTruthy();
    expect(getByLabelText('Go back to block setup')).toBeTruthy();
  });

  it('renders lock-in button with correct label', () => {
    const { toJSON } = render(<BlockReviewScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Lock In This Plan');
  });
});
