import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeasonSetupProvider } from '@/contexts';
import { getCalendarEvents } from '@/services/calendar';
import type { CalendarEvent } from '@/services/calendar';

import RacesScreen from '../races';

// Mock FormDatePicker to allow programmatic date selection in tests
let mockDateChangeCallback: ((date: Date) => void) | null = null;

jest.mock('@/components/FormDatePicker', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    FormDatePicker: (props: {
      onChange?: (date: Date) => void;
      label?: string;
      value?: Date;
      placeholder?: string;
    }) => {
      if (typeof props.onChange === 'function') {
        mockDateChangeCallback = props.onChange;
      }
      return React.createElement(
        View,
        { accessibilityLabel: props.label },
        React.createElement(
          Pressable,
          {
            accessibilityLabel: `Open ${props.label}`,
            accessibilityRole: 'button',
          },
          React.createElement(
            Text,
            null,
            props.value != null ? 'Date selected' : (props.placeholder ?? 'Select a date')
          )
        )
      );
    },
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

/** Helper to simulate selecting a date via the FormDatePicker mock */
function selectDate(dateStr: string) {
  if (mockDateChangeCallback == null) {
    throw new Error('FormDatePicker onChange callback not registered');
  }
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  act(() => {
    mockDateChangeCallback(new Date(y, m - 1, d));
  });
}

function renderScreen() {
  return render(
    <SeasonSetupProvider>
      <RacesScreen />
    </SeasonSetupProvider>
  );
}

/**
 * Helper: fill the add-race form with a two-step discipline → distance flow.
 * Selects discipline, then distance, then enters name, date, and submits.
 */
function addRaceViaForm(
  utils: ReturnType<typeof renderScreen>,
  opts: {
    name: string;
    date: string;
    disciplineLabel: string;
    distanceLabel: string;
    location?: string;
  }
) {
  const { getByLabelText } = utils;

  fireEvent.press(getByLabelText('Add a race'));
  fireEvent.changeText(getByLabelText('Race name'), opts.name);
  selectDate(opts.date);
  fireEvent.press(getByLabelText(`Discipline: ${opts.disciplineLabel}`));
  fireEvent.press(getByLabelText(`Distance: ${opts.distanceLabel}`));
  if (opts.location) {
    fireEvent.changeText(getByLabelText('Race location'), opts.location);
  }
  fireEvent.press(getByLabelText('Add race'));
}

describe('RacesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCalendarEvents.mockResolvedValue([]);
    mockDateChangeCallback = null;
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
    expect(json).toContain('Discipline');
    expect(json).toContain('Location (optional)');
  });

  it('validates empty race name on submit', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter a race name');
  });

  it('validates missing date selection', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman');
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please select a race date');
  });

  it('validates missing discipline selection', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman');
    selectDate('2026-06-15');
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please select a discipline');
  });

  it('validates missing distance selection', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Ironman');
    selectDate('2026-06-15');
    // Select discipline but not distance
    fireEvent.press(getByLabelText('Discipline: Triathlon'));
    fireEvent.press(getByLabelText('Add race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please select a distance');
  });

  it('adds a race successfully with discipline and distance', () => {
    const utils = renderScreen();

    addRaceViaForm(utils, {
      name: 'Ironman 70.3 Geelong',
      date: '2026-06-15',
      disciplineLabel: 'Triathlon',
      distanceLabel: 'Ironman 70.3',
    });

    const json = JSON.stringify(utils.toJSON());
    expect(json).toContain('Ironman 70.3 Geelong');
    expect(json).toContain('Your Races (');
  });

  it('removes a race', () => {
    const utils = renderScreen();

    addRaceViaForm(utils, {
      name: 'Sprint Tri',
      date: '2026-05-01',
      disciplineLabel: 'Triathlon',
      distanceLabel: 'Sprint Triathlon',
    });

    expect(JSON.stringify(utils.toJSON())).toContain('Sprint Tri');

    fireEvent.press(utils.getByLabelText('Remove race: Sprint Tri'));

    expect(JSON.stringify(utils.toJSON())).not.toContain('Your Races');
  });

  it('shows all 6 discipline options in form', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    // All 6 disciplines should be visible as radio buttons
    expect(getByLabelText('Discipline: Triathlon')).toBeTruthy();
    expect(getByLabelText('Discipline: Duathlon')).toBeTruthy();
    expect(getByLabelText('Discipline: Aquathlon')).toBeTruthy();
    expect(getByLabelText('Discipline: Running')).toBeTruthy();
    expect(getByLabelText('Discipline: Cycling')).toBeTruthy();
    expect(getByLabelText('Discipline: Swimming')).toBeTruthy();
  });

  it('shows distance options after selecting a discipline', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    // Distance section should NOT be visible before discipline is selected
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Distance: Sprint Triathlon');

    // Select Triathlon discipline
    fireEvent.press(getByLabelText('Discipline: Triathlon'));

    // Now triathlon distances should appear
    expect(getByLabelText('Distance: Sprint Triathlon')).toBeTruthy();
    expect(getByLabelText('Distance: Olympic Triathlon')).toBeTruthy();
    expect(getByLabelText('Distance: Ironman 70.3')).toBeTruthy();
    expect(getByLabelText('Distance: Ironman')).toBeTruthy();
    expect(getByLabelText('Distance: T100')).toBeTruthy();
  });

  it('resets distance when discipline changes', () => {
    const { getByLabelText, queryByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    // Select Triathlon and pick a distance
    fireEvent.press(getByLabelText('Discipline: Triathlon'));
    fireEvent.press(getByLabelText('Distance: Ironman 70.3'));

    // Switch to Running — triathlon distances gone, running distances appear
    fireEvent.press(getByLabelText('Discipline: Running'));
    expect(queryByLabelText('Distance: Ironman 70.3')).toBeNull();
    expect(getByLabelText('Distance: Marathon')).toBeTruthy();
    expect(getByLabelText('Distance: Half Marathon')).toBeTruthy();
  });

  it('cancels add race form', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    expect(JSON.stringify(toJSON())).toContain('Race Name');

    fireEvent.press(getByLabelText('Cancel adding race'));
    expect(JSON.stringify(toJSON())).not.toContain('Race Name');
  });

  it('adds race with optional location', () => {
    const utils = renderScreen();

    addRaceViaForm(utils, {
      name: 'Ironman Melbourne',
      date: '2026-06-15',
      disciplineLabel: 'Triathlon',
      distanceLabel: 'Ironman',
      location: 'Melbourne, VIC',
    });

    const json = JSON.stringify(utils.toJSON());
    expect(json).toContain('Ironman Melbourne');
    expect(json).toContain('Your Races (');
  });

  it('sorts races by date when adding', () => {
    const utils = renderScreen();

    // Add a later race first
    addRaceViaForm(utils, {
      name: 'Late Race',
      date: '2026-12-01',
      disciplineLabel: 'Running',
      distanceLabel: 'Marathon',
    });

    // Add an earlier race second
    addRaceViaForm(utils, {
      name: 'Early Race',
      date: '2026-05-01',
      disciplineLabel: 'Running',
      distanceLabel: '5K',
    });

    const json = JSON.stringify(utils.toJSON());
    const earlyIdx = json.indexOf('Early Race');
    const lateIdx = json.indexOf('Late Race');
    expect(earlyIdx).toBeLessThan(lateIdx);
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

  it('clears error when date is selected', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    fireEvent.changeText(getByLabelText('Race name'), 'Test');
    fireEvent.press(getByLabelText('Add race'));
    expect(JSON.stringify(toJSON())).toContain('Please select a race date');

    selectDate('2026-06-15');
    expect(JSON.stringify(toJSON())).not.toContain('Please select a race date');
  });

  it('renders date picker in add form', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Date');
    expect(getByLabelText('Date')).toBeTruthy();
  });

  it('hides import section when add form is open', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add a race'));
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Import from Intervals.icu');
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
    const utils = renderScreen();

    // Add an existing race manually
    addRaceViaForm(utils, {
      name: 'Ironman Geelong',
      date: '2026-06-15',
      disciplineLabel: 'Triathlon',
      distanceLabel: 'Ironman',
      location: 'Geelong, VIC',
    });

    // Import returns events matching + new
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
      fireEvent.press(utils.getByLabelText('Import races from Intervals.icu'));
    });

    await waitFor(() => {
      const json = JSON.stringify(utils.toJSON());
      // Both races should appear
      expect(json).toContain('Ironman Geelong');
      expect(json).toContain('Sprint Tri Sydney');
      // Exactly 2 race cards rendered (check remove buttons)
      const removeButtons = json.match(/Remove race:/g);
      expect(removeButtons).toHaveLength(2);
    });
  });
});

// =============================================================================
// inferDisciplineAndDistance (tested via import flow)
// =============================================================================

describe('inferDisciplineAndDistance via import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateChangeCallback = null;
  });

  const testCases = [
    { name: 'Ironman 70.3 Melbourne', expectedDiscipline: 'Triathlon', expectedDistance: '70.3' },
    { name: 'Half Ironman Geelong', expectedDiscipline: 'Triathlon', expectedDistance: '70.3' },
    {
      name: 'Ironman World Championship',
      expectedDiscipline: 'Triathlon',
      expectedDistance: 'Ironman',
    },
    { name: 'T100 London', expectedDiscipline: 'Triathlon', expectedDistance: 'T100' },
    { name: 'Olympic Tri Nationals', expectedDiscipline: 'Triathlon', expectedDistance: 'Olympic' },
    {
      name: 'Olympic Distance Champs',
      expectedDiscipline: 'Triathlon',
      expectedDistance: 'Olympic',
    },
    { name: 'Sprint Tri Elwood', expectedDiscipline: 'Triathlon', expectedDistance: 'Sprint' },
    {
      name: 'Sprint Distance Fun Run',
      expectedDiscipline: 'Triathlon',
      expectedDistance: 'Sprint',
    },
    { name: 'Aquathlon Worlds', expectedDiscipline: 'Aquathlon', expectedDistance: 'Standard' },
    { name: 'Aquabike Challenge', expectedDiscipline: 'Aquathlon', expectedDistance: 'Standard' },
    { name: 'Duathlon State Champs', expectedDiscipline: 'Duathlon', expectedDistance: 'Standard' },
    { name: 'Gran Fondo Classic', expectedDiscipline: 'Cycling', expectedDistance: 'Gran Fondo' },
    { name: 'Century Ride', expectedDiscipline: 'Cycling', expectedDistance: 'Century' },
    { name: 'Criterium Series', expectedDiscipline: 'Cycling', expectedDistance: 'Criterium' },
    {
      name: 'Ultra Marathon 100k',
      expectedDiscipline: 'Running',
      expectedDistance: 'Ultra Marathon',
    },
    {
      name: 'City2Surf Half Marathon',
      expectedDiscipline: 'Running',
      expectedDistance: 'Half Marathon',
    },
    { name: 'Melbourne Marathon', expectedDiscipline: 'Running', expectedDistance: 'Marathon' },
    { name: '10K Fun Run', expectedDiscipline: 'Running', expectedDistance: '10K' },
    { name: '5K Parkrun', expectedDiscipline: 'Running', expectedDistance: '5K' },
    { name: 'Local Fun Race', expectedDiscipline: 'Running', expectedDistance: '5K' },
  ];

  for (const { name, expectedDiscipline, expectedDistance } of testCases) {
    it(`infers discipline="${expectedDiscipline}" distance="${expectedDistance}" from "${name}"`, async () => {
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
        // Discipline label appears in the race card
        expect(json).toContain(expectedDiscipline);
        // Distance appears in the race card
        expect(json).toContain(expectedDistance);
      });
    });
  }
});
