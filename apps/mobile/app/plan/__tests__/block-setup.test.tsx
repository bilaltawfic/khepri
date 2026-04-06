import { fireEvent, render, waitFor } from '@testing-library/react-native';

import BlockSetupScreen from '../block-setup';

const mockGenerateWorkouts = jest.fn();
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

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const MOCK_HOOK_DEFAULTS = {
  season: { id: 'season-1', name: '2026 Season' } as { id: string; name: string } | null,
  step: 'setup' as string,
  error: null as string | null,
  isLoading: false,
  generateWorkouts: mockGenerateWorkouts,
};

let mockHookReturn = { ...MOCK_HOOK_DEFAULTS };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

describe('BlockSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateWorkouts.mockResolvedValue(true);
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS };
  });

  it('renders all form sections', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Plan your next block');
    expect(tree).toContain('Weekly hours for this block');
    expect(tree).toContain('Unavailable days');
  });

  it('renders hours inputs with default min=8 and max=12', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('"8"');
    expect(tree).toContain('"12"');
  });

  it('allows changing hours via text input', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '6');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');

    // Inputs should reflect new values
    const minInput = getByLabelText('Minimum weekly hours');
    expect(minInput.props.value).toBe('6');
    const maxInput = getByLabelText('Maximum weekly hours');
    expect(maxInput.props.value).toBe('10');
  });

  it('adds unavailable dates via input and button', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    // Type a date
    fireEvent.changeText(getByLabelText('Unavailable date'), '2026-02-14');
    // Press add button
    fireEvent.press(getByLabelText('Add unavailable date'));

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-02-14');
  });

  it('removes unavailable dates when remove button pressed', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    // Add a date first
    fireEvent.changeText(getByLabelText('Unavailable date'), '2026-03-01');
    fireEvent.press(getByLabelText('Add unavailable date'));

    let tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-03-01');

    // Remove it
    fireEvent.press(getByLabelText('Remove 2026-03-01'));

    tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('"2026-03-01"');
  });

  it('sends unavailable dates with generate request', async () => {
    const { getByLabelText } = render(<BlockSetupScreen />);

    fireEvent.changeText(getByLabelText('Unavailable date'), '2026-02-14');
    fireEvent.press(getByLabelText('Add unavailable date'));

    fireEvent.press(getByLabelText('Generate workouts for this block'));

    await waitFor(() => {
      expect(mockGenerateWorkouts).toHaveBeenCalledWith(
        expect.objectContaining({
          unavailableDates: ['2026-02-14'],
        })
      );
    });
  });

  it('does not navigate when generation fails', async () => {
    mockGenerateWorkouts.mockResolvedValue(false);
    const { getByLabelText } = render(<BlockSetupScreen />);

    fireEvent.press(getByLabelText('Generate workouts for this block'));

    await waitFor(() => {
      expect(mockGenerateWorkouts).toHaveBeenCalled();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, isLoading: true };

    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Loading season data');
  });

  it('shows error when season is null', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, season: null, error: 'No season found' };

    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('No season found');
  });

  it('shows generating state with spinner', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, step: 'generating' };

    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Generating workouts');
  });

  it('displays error message when present', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, error: 'Generation failed - try again' };

    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Generation failed - try again');
  });
});
