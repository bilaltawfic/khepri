import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SeasonSetupProvider } from '@/contexts';

import SeasonGoalsScreen from '../goals';

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
      <SeasonGoalsScreen />
    </SeasonSetupProvider>
  );
}

describe('SeasonGoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header and empty state', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Other goals');
    expect(json).toContain('No goals added yet');
    expect(json).toContain('Continue');
  });

  it('shows goal type options', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());

    expect(json).toContain('Performance');
    expect(json).toContain('Fitness');
    expect(json).toContain('Health');
  });

  it('opens add goal form for performance type', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add performance goal'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Performance');
    expect(json).toContain('Goal Description');
  });

  it('validates empty goal title', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add performance goal'));
    fireEvent.press(getByLabelText('Add goal'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Please enter a goal description');
  });

  it('adds a goal successfully', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add performance goal'));
    fireEvent.changeText(getByLabelText('Goal description'), 'FTP from 190W to 220W');
    fireEvent.press(getByLabelText('Add goal'));

    const json = JSON.stringify(toJSON());
    expect(json).toContain('FTP from 190W to 220W');
    expect(json).toContain('Your Goals (');
  });

  it('removes a goal', () => {
    const { getByLabelText, toJSON } = renderScreen();

    fireEvent.press(getByLabelText('Add health goal'));
    fireEvent.changeText(getByLabelText('Goal description'), 'Stay injury-free');
    fireEvent.press(getByLabelText('Add goal'));

    expect(JSON.stringify(toJSON())).toContain('Stay injury-free');

    fireEvent.press(getByLabelText('Remove goal: Stay injury-free'));

    // After removal, the "Your Goals" section should not appear
    expect(JSON.stringify(toJSON())).not.toContain('Your Goals (');
  });

  it('cancels add goal form', () => {
    const { getByLabelText, queryByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Add fitness goal'));
    expect(getByLabelText('Goal description')).toBeTruthy();

    fireEvent.press(getByLabelText('Cancel adding goal'));
    expect(queryByLabelText('Goal description')).toBeNull();
  });

  it('shows tip card', () => {
    const { toJSON } = renderScreen();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Performance goals like FTP targets');
  });

  it('Continue navigates to preferences', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Continue to preferences'));

    expect(router.push).toHaveBeenCalledWith('/season/preferences');
  });

  it('Skip navigates to preferences', () => {
    const { getByLabelText } = renderScreen();

    fireEvent.press(getByLabelText('Skip goal setting'));

    expect(router.push).toHaveBeenCalledWith('/season/preferences');
  });
});
