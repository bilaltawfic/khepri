import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeasonSetupProvider } from '@/contexts';

import RacesScreen from '../races';

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
    expect(json).toContain('Date (YYYY-MM-DD)');
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
    fireEvent.press(getByLabelText('Distance: 70.3'));
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
    expect(json).toContain('70.3');
    expect(json).toContain('Ironman');
    expect(json).toContain('Marathon');
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
});
