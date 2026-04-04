import { fireEvent, render, waitFor } from '@testing-library/react-native';

import BlockLockScreen from '../block-lock';

const mockLockIn = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const MOCK_DEFAULT_HOOK: {
  block: { id: string; name: string; total_weeks: number } | null;
  workouts: { id: string }[];
  step: string;
  error: string | null;
  lockIn: jest.Mock;
  isLoading: boolean;
} = {
  block: { id: 'block-1', name: 'Base 1', total_weeks: 8 },
  workouts: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
  step: 'review',
  error: null,
  lockIn: mockLockIn,
  isLoading: false,
};

let mockHookReturn = { ...MOCK_DEFAULT_HOOK };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

describe('BlockLockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockIn.mockResolvedValue(true);
    mockHookReturn = { ...MOCK_DEFAULT_HOOK };
  });

  it('shows block summary with name and workout count', () => {
    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Ready to lock in your plan?');
    expect(tree).toContain('Base 1');
    expect(tree).toContain(' weeks, ');
    expect(tree).toContain(' workouts');
  });

  it('explains what lock-in does', () => {
    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Save all workouts to your plan');
    expect(tree).toContain('Push workouts to Intervals.icu (if connected)');
    expect(tree).toContain('Enable compliance tracking');
    expect(tree).toContain('Allow the AI coach to suggest daily adjustments');
  });

  it('calls lockIn when lock button pressed', async () => {
    const { getByLabelText } = render(<BlockLockScreen />);

    fireEvent.press(getByLabelText('Lock in your training plan'));

    await waitFor(() => {
      expect(mockLockIn).toHaveBeenCalled();
    });
  });

  it('shows progress spinner during locking', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, step: 'locking' };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Locking in your plan');
  });

  it('shows success message when done', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, step: 'done' };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Plan locked in!');
    expect(tree).toContain('Go to Plan');
  });

  it('shows loading state initially', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, isLoading: true };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Loading block details');
  });

  it('shows fallback when no block exists', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, block: null };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('No block to lock in');
  });

  it('displays error message when present', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, error: 'Sync to Intervals.icu failed' };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Sync to Intervals.icu failed');
  });

  it('renders go back button', () => {
    const { getByLabelText } = render(<BlockLockScreen />);
    expect(getByLabelText('Go back to review')).toBeTruthy();
  });
});
