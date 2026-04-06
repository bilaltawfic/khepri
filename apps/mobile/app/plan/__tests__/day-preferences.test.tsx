import { act, fireEvent, render } from '@testing-library/react-native';

import BlockSetupScreen from '../block-setup';

// ====================================================================
// Mocks
// ====================================================================

const mockGenerateWorkouts = jest.fn();

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

jest.mock('@/components/FormDatePicker', () => {
  const { View, Text } = require('react-native');
  return {
    FormDatePicker: (props: { label: string }) => (
      <View testID="form-date-picker">
        <Text>{props.label}</Text>
      </View>
    ),
  };
});

// Mock AddPreferenceSheet to expose test controls
let mockAddSheetProps: {
  visible: boolean;
  dayIndex: number;
  onConfirm: (sport: string, workoutLabel?: string) => void;
  onDismiss: () => void;
} | null = null;

jest.mock('@/components/AddPreferenceSheet', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    AddPreferenceSheet: (props: {
      visible: boolean;
      dayIndex: number;
      availableSports: string[];
      onConfirm: (sport: string, workoutLabel?: string) => void;
      onDismiss: () => void;
    }) => {
      mockAddSheetProps = props;
      if (!props.visible) return null;
      return (
        <View testID="add-preference-sheet">
          <Text testID="sheet-day-index">{props.dayIndex}</Text>
          <Pressable
            testID="confirm-swim"
            onPress={() => props.onConfirm('Swim')}
            accessibilityRole="button"
            accessibilityLabel="Add Swim"
          >
            <Text>Add Swim</Text>
          </Pressable>
          <Pressable
            testID="confirm-swim-long"
            onPress={() => props.onConfirm('Swim', 'Long')}
            accessibilityRole="button"
            accessibilityLabel="Add Swim Long"
          >
            <Text>Add Swim Long</Text>
          </Pressable>
          <Pressable
            testID="dismiss-sheet"
            onPress={() => props.onDismiss()}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text>Dismiss</Text>
          </Pressable>
        </View>
      );
    },
  };
});

// ====================================================================
// Hook mock
// ====================================================================

const MOCK_BLOCK_META = {
  blockName: 'Base 1',
  blockStartDate: '2026-01-19',
  blockEndDate: '2026-06-07',
  blockTotalWeeks: 20,
};

const MOCK_HOOK_DEFAULTS = {
  season: { id: 'season-1', name: '2026 Season' },
  step: 'setup' as string,
  error: null as string | null,
  isLoading: false,
  blockMeta: MOCK_BLOCK_META as typeof MOCK_BLOCK_META | null,
  seasonRaces: [] as { distance: string }[],
  generateWorkouts: mockGenerateWorkouts,
};

let mockHookReturn = { ...MOCK_HOOK_DEFAULTS };

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => mockHookReturn,
}));

// ====================================================================
// Tests
// ====================================================================

describe('Day workout preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = { ...MOCK_HOOK_DEFAULTS };
    mockAddSheetProps = null;
  });

  it('renders add buttons for all 7 days', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const day of days) {
      expect(getByLabelText(`Add preference for ${day}`)).toBeTruthy();
    }
  });

  it('does not show info card when no season races', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Your race requires');
  });

  it('shows required sports info card for Ironman 70.3', () => {
    mockHookReturn = {
      ...MOCK_HOOK_DEFAULTS,
      seasonRaces: [{ distance: 'Ironman 70.3' }],
    };
    const { toJSON } = render(<BlockSetupScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your race requires');
    expect(json).toContain('swim');
    expect(json).toContain('bike');
    expect(json).toContain('run');
  });

  it('shows required sports info card for Sprint Tri', () => {
    mockHookReturn = {
      ...MOCK_HOOK_DEFAULTS,
      seasonRaces: [{ distance: 'Sprint Tri' }],
    };
    const { toJSON } = render(<BlockSetupScreen />);
    expect(JSON.stringify(toJSON())).toContain('Your race requires');
  });

  it('tapping + on Mon opens the add preference sheet for day 0', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    expect(mockAddSheetProps?.visible).toBe(true);
    expect(mockAddSheetProps?.dayIndex).toBe(0);
  });

  it('tapping + on Wed opens the add preference sheet for day 2', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Wed'));
    });
    expect(mockAddSheetProps?.visible).toBe(true);
    expect(mockAddSheetProps?.dayIndex).toBe(2);
  });

  it('adding a preference shows a chip on the correct day', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    act(() => {
      mockAddSheetProps?.onConfirm('Swim');
    });
    // Sheet should close
    expect(mockAddSheetProps?.visible).toBe(false);
    // Chip text "Swim" should appear
    expect(JSON.stringify(toJSON())).toContain('Swim');
  });

  it('adding a preference with workout label shows combined chip text', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    act(() => {
      mockAddSheetProps?.onConfirm('Swim', 'Long');
    });
    expect(JSON.stringify(toJSON())).toContain('Swim · Long');
  });

  it('removing a preference removes the chip', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);
    // Add Swim to Mon
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    act(() => {
      mockAddSheetProps?.onConfirm('Swim');
    });
    // Now remove it
    act(() => {
      fireEvent.press(getByLabelText('Remove Swim on Mon'));
    });
    expect(JSON.stringify(toJSON())).not.toContain('"Swim"');
  });

  it('shows warning when swim count is below minimum for Ironman 70.3', () => {
    mockHookReturn = {
      ...MOCK_HOOK_DEFAULTS,
      seasonRaces: [{ distance: 'Ironman 70.3' }],
    };
    const { toJSON } = render(<BlockSetupScreen />);
    // No swim sessions assigned — min is 2 for 70.3
    expect(JSON.stringify(toJSON())).toContain('0 Swim sessions');
  });

  it('warning disappears once swim minimum is met', () => {
    mockHookReturn = {
      ...MOCK_HOOK_DEFAULTS,
      seasonRaces: [{ distance: 'Ironman 70.3' }],
    };
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);

    // Assign 2 swim sessions (min is 2)
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    act(() => {
      mockAddSheetProps?.onConfirm('Swim');
    });
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Tue'));
    });
    act(() => {
      mockAddSheetProps?.onConfirm('Swim');
    });

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('0 Swim sessions');
    expect(json).not.toContain('1 Swim session');
  });

  it('dismissing the sheet closes it without adding', () => {
    const { getByLabelText, toJSON } = render(<BlockSetupScreen />);
    act(() => {
      fireEvent.press(getByLabelText('Add preference for Mon'));
    });
    expect(mockAddSheetProps?.visible).toBe(true);
    act(() => {
      mockAddSheetProps?.onDismiss();
    });
    expect(mockAddSheetProps?.visible).toBe(false);
    // No chip should appear
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('"Swim"');
  });

  it('add buttons have correct accessibility labels for each day', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const day of dayNames) {
      const btn = getByLabelText(`Add preference for ${day}`);
      expect(btn).toBeTruthy();
    }
  });
});
