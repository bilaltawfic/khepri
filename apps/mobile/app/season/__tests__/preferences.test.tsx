import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeasonSetupProvider } from '@/contexts';

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
});
