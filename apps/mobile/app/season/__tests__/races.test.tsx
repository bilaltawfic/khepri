import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeasonSetupProvider } from '@/contexts';
import { getCalendarEvents } from '@/services/calendar';
import type { CalendarEvent } from '@/services/calendar';

import RacesScreen from '../races';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React.createElement(View, props),
  };
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('@/services/calendar', () => ({
  getCalendarEvents: jest.fn().mockResolvedValue([]),
}));

const mockGetCalendarEvents = getCalendarEvents as jest.MockedFunction<typeof getCalendarEvents>;

function renderScreen() {
  return render(
    <SeasonSetupProvider>
      <RacesScreen />
    </SeasonSetupProvider>
  );
}

describe('RacesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCalendarEvents.mockResolvedValue([]);
  });

  it('renders header and empty state', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Your race calendar');
    expect(json).toContain('No races added yet');
    expect(json).toContain('Continue');
    expect(json).toContain('Skip - No races this season');
  });

  it('shows add race button', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Add Race');
  });

  it('opens add race form when button pressed', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Name');
    expect(json).toContain('Date');
    expect(json).toContain('Distance');
    expect(json).toContain('Location (optional)');
  });

  it('validates empty race name on submit', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter a race name');
  });

  it('validates invalid date', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman');
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter a valid date');
  });

  it('validates missing distance selection', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman');
    fireEvent.changeText(getByLabelText('Race date'), '2026-06-15');
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please select a distance');
  });

  it('adds a race successfully', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman 70.3');
    fireEvent.changeText(getByLabelText('Race date'), '2026-06-15');
    fireEvent.press(getByLabelText('Distance: Ironman 70.3'));
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman 70.3');
    expect(json).toContain('Your Races (');
  });

  it('removes a race', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Sprint Tri');
    fireEvent.changeText(getByLabelText('Race date'), '2026-05-01');
    fireEvent.press(getByLabelText('Distance: Sprint Tri'));
    fireEvent.press(getByLabelText('Add race'));

    expect(JSON.stringify(toJSON())).toContain('Sprint Tri');

    fireEvent.press(getByLabelText('Remove race: Sprint Tri'));

    expect(JSON.stringify(toJSON())).not.toContain('Your Races');
  });

  it('cancels add race form', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    expect(JSON.stringify(toJSON())).toContain('Race Name');

    fireEvent.press(getByLabelText('Cancel adding race'));
    expect(JSON.stringify(toJSON())).not.toContain('Race Name');
  });

  it('shows distance options in form', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Sprint Tri');
    expect(json).toContain('Olympic Tri');
    expect(json).toContain('Ironman 70.3');
    expect(json).toContain('Ironman');
    expect(json).toContain('T100');
    expect(json).toContain('Aquathlon');
    expect(json).toContain('Duathlon');
    expect(json).toContain('Marathon');
    expect(json).toContain('Ultra Marathon');
  });

  it('shows tip card', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Mark your most important race');
  });

  it('Continue navigates to goals', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Continue to goals'));

    expect(router.push).toHaveBeenCalledWith('/season/goals');
  });

  it('Skip navigates to goals', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Skip race entry'));

    expect(router.push).toHaveBeenCalledWith('/season/goals');
  });

  // ===========================================================================
  // ADD RACE FORM — additional validation coverage
  // ===========================================================================

  it('validates date with non-YYYY-MM-DD format', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Test Race');
    fireEvent.changeText(getByLabelText('Race date'), '15/06/2026');
    fireEvent.press(getByLabelText('Distance: Sprint Tri'));
    fireEvent.press(getByLabelText('Add race'));

    expect(JSON.stringify(toJSON())).toContain('Please enter a valid date');
  });

  it('validates impossible date like 2026-02-30', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Test Race');
    fireEvent.changeText(getByLabelText('Race date'), '2026-02-30');
    fireEvent.press(getByLabelText('Distance: Sprint Tri'));
    fireEvent.press(getByLabelText('Add race'));

    expect(JSON.stringify(toJSON())).toContain('Please enter a valid date');
  });

  it('clears error when name is edited', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.press(getByLabelText('Add race'));
    expect(JSON.stringify(toJSON())).toContain('Please enter a race name');

    fireEvent.changeText(getByLabelText('Race name'), 'Updated');
    expect(JSON.stringify(toJSON())).not.toContain('Please enter a race name');
  });

  it('clears error when date is edited', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Test');
    fireEvent.press(getByLabelText('Add race'));
    expect(JSON.stringify(toJSON())).toContain('Please enter a valid date');

    fireEvent.changeText(getByLabelText('Race date'), '2026-06-15');
    expect(JSON.stringify(toJSON())).not.toContain('Please enter a valid date');
  });

  it('adds race with optional location', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman Melbourne');
    fireEvent.changeText(getByLabelText('Race date'), '2026-06-15');
    fireEvent.press(getByLabelText('Distance: Ironman'));
    fireEvent.changeText(getByLabelText('Race location'), 'Melbourne, VIC');
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman Melbourne');
    expect(json).toContain('Your Races (');
  });

  it('sorts races by date when adding', () => {
    const { getByLabelText, toJSON } = renderScreen();

    // Add a later race first
    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Late Race');
    fireEvent.changeText(getByLabelText('Race date'), '2026-12-01');
    fireEvent.press(getByLabelText('Distance: Marathon'));
    fireEvent.press(getByLabelText('Add race'));

    // Add an earlier race second
    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Early Race');
    fireEvent.changeText(getByLabelText('Race date'), '2026-05-01');
    fireEvent.press(getByLabelText('Distance: 5K'));
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    const earlyIdx = json.indexOf('Early Race');
    const lateIdx = json.indexOf('Late Race');
    expect(earlyIdx).toBeLessThan(lateIdx);
  });

  it('opens date picker when calendar button is pressed', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.press(getByLabelText('Pick date from calendar'));

    // DateTimePicker should now be rendered with its testID
    expect(getByLabelText('Pick date from calendar')).toBeTruthy();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('race-date-picker');
  });

  // ===========================================================================
  // IMPORT FROM INTERVALS.ICU
  // ===========================================================================

  it('shows import section with button', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Import from Intervals.icu');
    expect(json).toContain('Import Races');
  });

  it('imports races from calendar events', async () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        name: 'Ironman 70.3 Geelong',
        type: 'race',
        start_date: '2026-06-15T00:00:00',
        priority: 'A',
      },
      {
        id: '2',
        name: 'Sprint Tri Local',
        type: 'race',
        start_date: '2026-08-20T00:00:00',
      },
    ];
    mockGetCalendarEvents.mockResolvedValueOnce(events).mockResolvedValue([]);

    const { getByLabelText, toJSON } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman 70.3 Geelong');
      expect(json).toContain('Sprint Tri Local');
    });
  });

  it('shows error when no race events found', async () => {
    // Return only non-race events for all chunks
    mockGetCalendarEvents.mockResolvedValue([
      {
        id: '1',
        name: 'Easy Run',
        type: 'workout' as const,
        start_date: '2026-06-15T00:00:00',
      },
    ]);

    const { getByLabelText, toJSON } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No race events found in the next 12 months');
    });
  });

  it('shows error when import fails', async () => {
    mockGetCalendarEvents.mockRejectedValue(new Error('Network error'));

    const { getByLabelText, toJSON } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to import from Intervals.icu');
    });
  });

  it('import merges with existing races (updates existing, appends new)', async () => {
    const { getByLabelText, toJSON } = renderScreen();

    // Add an existing race manually
    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman Geelong');
    fireEvent.changeText(getByLabelText('Race date'), '2026-06-15');
    fireEvent.press(getByLabelText('Distance: Ironman'));
    fireEvent.changeText(getByLabelText('Race location'), 'Geelong, VIC');
    fireEvent.press(getByLabelText('Add race'));

    // Import returns events only on the first chunk call, empty for the rest
    const events: CalendarEvent[] = [
      {
        id: '1',
        name: 'Ironman Geelong',
        type: 'race',
        start_date: '2026-06-15T00:00:00',
        priority: 'A',
      },
      {
        id: '2',
        name: 'Sprint Tri Sydney',
        type: 'race',
        start_date: '2026-09-01T00:00:00',
        priority: 'B',
      },
    ];
    mockGetCalendarEvents.mockResolvedValueOnce(events).mockResolvedValue([]);

    await act(async () => {
      fireEvent.press(getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      // Both races should appear
      expect(json).toContain('Ironman Geelong');
      expect(json).toContain('Sprint Tri Sydney');
      // Should show 2 races total (merge deduplicated the existing one)
      // React splits text nodes: ["Your Races (","2","/","10",")"]
      expect(json).toContain('"Your Races ("');
      // Exactly 2 race cards rendered (check remove buttons)
      const removeButtons = json.match(/Remove race:/g);
      expect(removeButtons).toHaveLength(2);
    });
  });

  it('import infers distance from race names', async () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        name: 'Ironman 70.3 Geelong',
        type: 'race',
        start_date: '2026-06-15T00:00:00',
      },
    ];
    mockGetCalendarEvents.mockResolvedValueOnce(events).mockResolvedValue([]);

    const { getByLabelText, toJSON } = renderScreen();

    await act(async () => {
      fireEvent.press(getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ironman 70.3');
    });
  });

  it('hides import section when add form is open', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Import from Intervals.icu');
  });
});

// =============================================================================
// HELPER: inferDistance (tested via import flow)
// =============================================================================

describe('inferDistance via import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    { name: 'Ironman 70.3 Melbourne', expected: 'Ironman 70.3' },
    { name: 'Half Ironman Geelong', expected: 'Ironman 70.3' },
    { name: 'Ironman World Championship', expected: 'Ironman' },
    { name: 'T100 London', expected: 'T100' },
    { name: 'Olympic Tri Nationals', expected: 'Olympic Tri' },
    { name: 'Olympic Distance Champs', expected: 'Olympic Tri' },
    { name: 'Sprint Tri Elwood', expected: 'Sprint Tri' },
    { name: 'Sprint Distance Fun Run', expected: 'Sprint Tri' },
    { name: 'Aquathlon Worlds', expected: 'Aquathlon' },
    { name: 'Aquabike Challenge', expected: 'Aquathlon' },
    { name: 'Duathlon State Champs', expected: 'Duathlon' },
    { name: 'Ultra Marathon 100k', expected: 'Ultra Marathon' },
    { name: 'City2Surf Half Marathon', expected: 'Half Marathon' },
    { name: 'Melbourne Marathon', expected: 'Marathon' },
    { name: '10K Fun Run', expected: '10K' },
    { name: '5K Parkrun', expected: '5K' },
    { name: 'Local Fun Race', expected: 'Custom' },
  ];

  for (const { name, expected } of testCases) {
    it(`infers "${expected}" from "${name}"`, async () => {
      const mockGetCalendarEvents = getCalendarEvents as jest.MockedFunction<
        typeof getCalendarEvents
      >;
      mockGetCalendarEvents
        .mockResolvedValueOnce([{ id: '1', name, type: 'race', start_date: '2026-06-15T00:00:00' }])
        .mockResolvedValue([]);

      const { getByLabelText, toJSON } = render(
        <SeasonSetupProvider>
          <RacesScreen />
        </SeasonSetupProvider>
      );

      await act(async () => {
        fireEvent.press(getByLabelText('Import races from Intervals.icu'));
      });

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain(expected);
      });
    });
  }
});
