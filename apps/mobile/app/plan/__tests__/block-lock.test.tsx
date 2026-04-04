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
  block: { id: string; name: string; total_weeks: number };
  workouts: { id: string }[];
  step: string;
  error: null;
  lockIn: jest.Mock;
} = {
  block: { id: 'block-1', name: 'Base 1', total_weeks: 8 },
  workouts: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
  step: 'review',
  error: null,
  lockIn: mockLockIn,
};

let mockHookReturn = { ...MOCK_DEFAULT_HOOK };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

describe('BlockLockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockIn.mockResolvedValue(undefined);
    mockHookReturn = { ...MOCK_DEFAULT_HOOK };
  });

  it('renders lock-in confirmation with block summary', () => {
    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Ready to lock in your plan?');
    expect(tree).toContain('Base 1');
    expect(tree).toContain(' weeks, ');
    expect(tree).toContain(' workouts');
  });

  it('renders lock-in benefits', () => {
    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Save all workouts to your plan');
    expect(tree).toContain('Push workouts to Intervals.icu (if connected)');
    expect(tree).toContain('Enable compliance tracking');
    expect(tree).toContain('Allow the AI coach to suggest daily adjustments');
  });

  it('calls lockIn on lock button press', async () => {
    const { getByLabelText } = render(<BlockLockScreen />);

    fireEvent.press(getByLabelText('Lock in your training plan'));

    await waitFor(() => {
      expect(mockLockIn).toHaveBeenCalled();
    });
  });

  it('shows loading state during locking', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, step: 'locking' as const };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Locking in your plan');
  });

  it('shows success state when done', () => {
    mockHookReturn = { ...MOCK_DEFAULT_HOOK, step: 'done' as const };

    const { toJSON } = render(<BlockLockScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Plan locked in!');
  });

  it('renders go back button', () => {
    const { getByLabelText } = render(<BlockLockScreen />);
    expect(getByLabelText('Go back to review')).toBeTruthy();
  });
});
