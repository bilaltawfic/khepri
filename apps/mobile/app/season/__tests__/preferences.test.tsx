import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { SeasonSetupProvider, useSeasonSetup } from '@/contexts';
import type { SeasonRace } from '@/contexts';

import PreferencesScreen from '../preferences';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

function renderScreen() {
  return render(
    <SeasonSetupProvider>
      <PreferencesScreen />
    </SeasonSetupProvider>
  );
}

/**
 * Pre-loads races into context so getHoursWarning can produce race-based warnings.
 */
function RaceSetter({ races }: Readonly<{ races: readonly SeasonRace[] }>) {
  const { setRaces } = useSeasonSetup();
  useEffect(() => {
    setRaces(races);
  }, [races, setRaces]);
  return null;
}

function renderWithRaces(races: readonly SeasonRace[]) {
  return render(
    <SeasonSetupProvider>
      <RaceSetter races={races} />
      <PreferencesScreen />
    </SeasonSetupProvider>
  );
}

describe('PreferencesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header and sections', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Training preferences');
    expect(json).toContain('Weekly training hours');
    expect(json).toContain('Training days');
    expect(json).toContain('Sport priority');
    expect(json).not.toContain('drag to reorder');
  });

  it('shows default hour values', () => {
    const { getByLabelText } = renderScreen();

    expect(getByLabelText('Minimum weekly hours').props.value).toBe('6');
    expect(getByLabelText('Maximum weekly hours').props.value).toBe('10');
  });

  it('shows day toggles', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Mon');
    expect(json).toContain('Tue');
    expect(json).toContain('Wed');
    expect(json).toContain('Thu');
    expect(json).toContain('Fri');
    expect(json).toContain('Sat');
    expect(json).toContain('Sun');
  });

  it('shows sport priority list with Run, Bike, Swim', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Run');
    expect(json).toContain('Bike');
    expect(json).toContain('Swim');
  });

  it('shows generate button', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Generate Season Plan');
  });

  it('validates invalid hours on submit', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), 'abc');
    fireEvent.press(getByLabelText('Generate season plan'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter valid weekly hours');
  });

  it('validates min greater than max hours', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '15');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');
    fireEvent.press(getByLabelText('Generate season plan'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Minimum hours cannot exceed maximum');
  });

  it('validates empty training days', () => {
    const { getByLabelText, toJSON } = renderScreen();

    // Deselect all defaults (Mon=1, Tue=2, Wed=3, Thu=4, Sat=6)
    fireEvent.press(getByLabelText('Mon: selected'));
    fireEvent.press(getByLabelText('Tue: selected'));
    fireEvent.press(getByLabelText('Wed: selected'));
    fireEvent.press(getByLabelText('Thu: selected'));
    fireEvent.press(getByLabelText('Sat: selected'));

    fireEvent.press(getByLabelText('Generate season plan'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please select at least one training day');
  });

  it('toggles a day on and off', () => {
    const { getByLabelText } = renderScreen();

    // Friday is off by default
    fireEvent.press(getByLabelText('Fri: not selected'));
    expect(getByLabelText('Fri: selected')).toBeTruthy();

    fireEvent.press(getByLabelText('Fri: selected'));
    expect(getByLabelText('Fri: not selected')).toBeTruthy();
  });

  it('reorders sport priority up', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Move Bike up'));

    const json = JSON.stringify(toJSON());
    const bikeIdx = json.indexOf('Bike');
    const runIdx = json.indexOf('Run');
    expect(bikeIdx).toBeLessThan(runIdx);
  });

  it('reorders sport priority down', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Move Run down'));

    const json = JSON.stringify(toJSON());
    const bikeIdx = json.indexOf('Bike');
    const runIdx = json.indexOf('Run');
    expect(bikeIdx).toBeLessThan(runIdx);
  });

  it('does not move first sport up (no-op)', () => {
    const { getByLabelText, toJSON } = renderScreen();

    // Run is first — pressing up should have no effect
    fireEvent.press(getByLabelText('Move Run up'));

    const json = JSON.stringify(toJSON());
    const runIdx = json.indexOf('Run');
    const bikeIdx = json.indexOf('Bike');
    expect(runIdx).toBeLessThan(bikeIdx);
  });

  it('does not move last sport down (no-op)', () => {
    const { getByLabelText, toJSON } = renderScreen();

    // Strength is last — pressing down should have no effect
    fireEvent.press(getByLabelText('Move Strength down'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Strength');
  });

  it('shows tip card', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Be honest about your available hours');
  });

  it('navigates to overview on valid submit', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Generate season plan'));

    expect(router.push).toHaveBeenCalledWith('/season/overview');
  });

  // ===========================================================================
  // getHoursWarning coverage
  // ===========================================================================

  it('shows no warning when max hours is empty', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '');

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('below the recommended');
    expect(json).not.toContain('Maximum hours must be at least');
  });

  it('shows no warning when max hours is NaN', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Maximum weekly hours'), 'xyz');

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('below the recommended');
  });

  it('shows min > max warning when min exceeds max', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '15');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Maximum hours must be at least equal to minimum');
  });

  it('shows race-based warning when max hours below minimum for race', () => {
    const ironmanRace: SeasonRace = {
      name: 'Ironman Melbourne',
      date: '2026-10-15',
      discipline: 'triathlon',
      distance: 'Ironman',
      priority: 'A',
    };

    const { getByLabelText, toJSON } = renderWithRaces([ironmanRace]);

    // Ironman requires 12h min; set max to 8
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '8');

    const json = JSON.stringify(toJSON());
    expect(json).toContain('below the recommended');
    expect(json).toContain('12');
    expect(json).toContain('Ironman');
  });

  it('shows no warning when max hours meets race minimum', () => {
    const ironmanRace: SeasonRace = {
      name: 'Ironman Melbourne',
      date: '2026-10-15',
      discipline: 'triathlon',
      distance: 'Ironman',
      priority: 'A',
    };

    const { getByLabelText, toJSON } = renderWithRaces([ironmanRace]);

    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '14');

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('below the recommended');
  });

  it('shows no warning when min hours is empty string', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');

    const json = JSON.stringify(toJSON());
    // Empty min treated as 0, which is <= 10, so no min>max warning
    expect(json).not.toContain('Maximum hours must be at least');
  });

  it('validates zero hours as invalid on submit', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '0');
    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '0');
    fireEvent.press(getByLabelText('Generate season plan'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter valid weekly hours');
  });

  it('clears error when min hours is changed', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), 'abc');
    fireEvent.press(getByLabelText('Generate season plan'));
    expect(JSON.stringify(toJSON())).toContain('Please enter valid weekly hours');

    fireEvent.changeText(getByLabelText('Minimum weekly hours'), '6');
    expect(JSON.stringify(toJSON())).not.toContain('Please enter valid weekly hours');
  });

  it('clears error when max hours is changed', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.changeText(getByLabelText('Maximum weekly hours'), 'abc');
    fireEvent.press(getByLabelText('Generate season plan'));
    expect(JSON.stringify(toJSON())).toContain('Please enter valid weekly hours');

    fireEvent.changeText(getByLabelText('Maximum weekly hours'), '10');
    expect(JSON.stringify(toJSON())).not.toContain('Please enter valid weekly hours');
  });
});
