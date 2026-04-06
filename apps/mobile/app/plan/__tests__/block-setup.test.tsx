import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import BlockSetupScreen from '../block-setup';

const mockGenerateWorkouts = jest.fn();
const mockRouterPush = jest.fn();
let mockRangeSelectCallback: ((start: Date | null, end: Date | null) => void) | null = null;

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

jest.mock('@/components/FormDatePicker', () => {
  const { View, Text } = require('react-native');
  return {
    FormDatePicker: (props: {
      mode?: string;
      label: string;
      rangeStart?: Date | null;
      rangeEnd?: Date | null;
      onRangeSelect?: (start: Date | null, end: Date | null) => void;
    }) => {
      if (props.mode === 'range' && props.onRangeSelect) {
        mockRangeSelectCallback = props.onRangeSelect;
      }
      return (
        <View testID="form-date-picker">
          <Text>{props.label}</Text>
          {props.rangeStart != null && (
            <Text testID="range-display">
              {`${props.rangeStart.getFullYear()}-${String(props.rangeStart.getMonth() + 1).padStart(2, '0')}-${String(props.rangeStart.getDate()).padStart(2, '0')}`}
              {props.rangeEnd == null
                ? ''
                : ` - ${props.rangeEnd.getFullYear()}-${String(props.rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(props.rangeEnd.getDate()).padStart(2, '0')}`}
            </Text>
          )}
        </View>
      );
    },
  };
});

const MOCK_BLOCK_META = {
  blockName: 'Base 1',
  blockStartDate: '2026-01-19',
  blockEndDate: '2026-06-07',
  blockTotalWeeks: 20,
};

const MOCK_HOOK_DEFAULTS = {
  season: { id: 'season-1', name: '2026 Season' } as { id: string; name: string } | null,
  step: 'setup' as string,
  error: null as string | null,
  isLoading: false,
  blockMeta: MOCK_BLOCK_META as typeof MOCK_BLOCK_META | null,
  generateWorkouts: mockGenerateWorkouts,
};

let mockHookReturn = { ...MOCK_HOOK_DEFAULTS };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

/** Parse a YYYY-MM-DD string as a local Date (avoids UTC shift from new Date('YYYY-MM-DD')). */
function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match == null) {
    throw new Error(`Invalid date-only value: ${value}. Expected YYYY-MM-DD.`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Helper to simulate selecting a date range via the mock FormDatePicker. */
function selectDateRange(start: string, end: string) {
  if (mockRangeSelectCallback == null) {
    throw new Error('FormDatePicker range callback not captured — render the component first');
  }
  act(() => {
    mockRangeSelectCallback?.(parseDateOnly(start), parseDateOnly(end));
  });
}

describe('BlockSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateWorkouts.mockResolvedValue(true);
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS };
    mockRangeSelectCallback = null;
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

    const minInput = getByLabelText('Minimum weekly hours');
    expect(minInput.props.value).toBe('6');
    const maxInput = getByLabelText('Maximum weekly hours');
    expect(maxInput.props.value).toBe('10');
  });

  it('renders a date range picker for unavailable dates', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Date range');
  });

  it('adds unavailable dates via range selection', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    selectDateRange('2026-03-15', '2026-03-17');
    fireEvent.press(getByLabelText('Add unavailable dates'));

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-03-15');
    expect(tree).toContain('2026-03-17');
  });

  it('adds unavailable dates with a reason', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    selectDateRange('2026-04-01', '2026-04-03');
    fireEvent.changeText(getByLabelText('Unavailable reason'), 'Vacation');
    fireEvent.press(getByLabelText('Add unavailable dates'));

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-04-01');
    expect(tree).toContain('Vacation');
  });

  it('removes a date group when remove button is pressed', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    selectDateRange('2026-03-15', '2026-03-17');
    fireEvent.press(getByLabelText('Add unavailable dates'));

    let tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-03-15');

    fireEvent.press(getByLabelText('Remove 2026-03-15 \u2013 2026-03-17'));

    tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('2026-03-15');
  });

  it('sends UnavailableDate objects with generate request', async () => {
    const { getByLabelText } = render(<BlockSetupScreen />);

    selectDateRange('2026-02-14', '2026-02-14');
    fireEvent.press(getByLabelText('Add unavailable dates'));

    fireEvent.press(getByLabelText('Generate workouts for this block'));

    await waitFor(() => {
      expect(mockGenerateWorkouts).toHaveBeenCalledWith(
        expect.objectContaining({
          unavailableDates: [{ date: '2026-02-14' }],
        })
      );
    });
  });

  it('clears date selection after adding', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    selectDateRange('2026-03-15', '2026-03-15');

    // Before adding, range should be shown in the tree
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('2026-03-15');

    fireEvent.press(getByLabelText('Add unavailable dates'));

    // After adding, reason input should be cleared
    const reasonInput = getByLabelText('Unavailable reason');
    expect(reasonInput.props.value).toBe('');
  });

  it('shows inline error and disables button when max < min', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '15');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Max hours must be');

    // Button should be disabled
    const button = getByLabelText('Generate workouts for this block');
    expect(button.props.accessibilityState?.disabled ?? button.props.disabled).toBe(true);
  });

  it('shows inline error for invalid min hours', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '0');

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Min hours must be greater than 0');
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

  it('renders block date range header when blockMeta is available', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Base 1');
    expect(tree).toContain('20 weeks');
  });

  it('renders human-readable date range in header', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    // Jan 19 – Jun 7, 2026 (same year: no year on start)
    expect(tree).toContain('Jan 19');
    expect(tree).toContain('Jun 7, 2026');
  });

  it('does not render block date header when blockMeta is null', () => {
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS, blockMeta: null };

    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('Base 1');
    expect(tree).not.toContain('weeks');
  });
});
