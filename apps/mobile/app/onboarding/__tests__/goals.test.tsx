import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { View } from 'react-native';
import GoalsScreen from '../goals';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <GoalsScreen />
    </OnboardingProvider>
  );
}

/**
 * Test wrapper that captures context data changes for assertions.
 */
function ContextObserver({ dataRef }: { dataRef: MutableRefObject<OnboardingData | null> }) {
  const { data } = useOnboarding();
  useEffect(() => {
    dataRef.current = data;
  }, [data, dataRef]);
  return null;
}

function renderWithContextObserver() {
  const dataRef: MutableRefObject<OnboardingData | null> = { current: null };
  const result = render(
    <OnboardingProvider>
      <View>
        <ContextObserver dataRef={dataRef} />
        <GoalsScreen />
      </View>
    </OnboardingProvider>
  );
  return { ...result, dataRef };
}

describe('GoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('What are you working toward?');
  });

  it('renders the description', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Add your goals so Khepri can tailor your training');
  });

  it('renders the Race Goal card', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race Goal');
    expect(json).toContain("A specific event you're training for");
    expect(json).toContain('Complete Ironman 70.3 on June 15');
  });

  it('renders the Performance Goal card', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Performance Goal');
    expect(json).toContain('A fitness metric you want to improve');
    expect(json).toContain('Increase FTP from 250W to 280W');
  });

  it('renders the Fitness Goal card', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fitness Goal');
    expect(json).toContain('Volume or consistency targets');
    expect(json).toContain('Build to 40km running per week');
  });

  it('renders the Health Goal card', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Health Goal');
    expect(json).toContain('Weight, wellness, or lifestyle targets');
    expect(json).toContain('Lose 5kg before race season');
  });

  it('renders the empty state', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No goals added yet');
  });

  it('renders the tip', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Start with your most important goal');
  });

  it('renders the Continue button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue');
  });

  it('renders the Skip button', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain("Skip - I'll set goals later");
  });

  describe('navigation', () => {
    it('Continue button navigates to plan screen', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Continue to plan selection'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/plan');
    });

    it('Skip button navigates to plan screen', () => {
      const { getByLabelText } = renderWithProvider();

      fireEvent.press(getByLabelText('Skip goal setting'));

      expect(router.push).toHaveBeenCalledWith('/onboarding/plan');
    });
  });

  describe('adding goals', () => {
    it('shows add goal form when goal type is tapped', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        // Text may be split as ["Add ", "Race Goal"] so check separately
        expect(json).toContain('Goal Title');
        expect(json).toContain('Priority');
        expect(json).toContain('Cancel adding goal');
      });
    });

    it('hides goal type cards when add form is shown', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        // Should not show other goal type cards
        expect(json).not.toContain('Performance Goal');
        expect(json).not.toContain('Fitness Goal');
        expect(json).not.toContain('Health Goal');
      });
    });

    it('shows validation error when submitting empty title', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Add Goal');
      });

      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a goal title');
      });
    });

    it('adds goal to context when valid title is submitted', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Complete Ironman 70.3');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals).toHaveLength(1);
        expect(dataRef.current?.goals[0]).toMatchObject({
          goalType: 'race',
          title: 'Complete Ironman 70.3',
          priority: 'A',
        });
      });
    });

    it('displays added goal in list', async () => {
      const { getByLabelText, toJSON } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Complete Ironman 70.3');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Your Goals');
        expect(json).toContain('Complete Ironman 70.3');
      });
    });

    it('hides empty state when goals are added', async () => {
      const { getByLabelText, toJSON } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'My goal');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('No goals added yet');
      });
    });

    it('closes form when cancel is pressed', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Goal Title');
        expect(json).toContain('Cancel adding goal');
      });

      fireEvent.press(getByLabelText('Cancel adding goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        // Form should be hidden - no Goal Title input
        expect(json).not.toContain('Goal Title');
        // Cards should be visible again
        expect(json).toContain('Race Goal');
        expect(json).toContain('Performance Goal');
      });
    });

    it('trims whitespace from goal title', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), '  Complete marathon  ');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.title).toBe('Complete marathon');
      });
    });

    it('rejects whitespace-only title', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), '   ');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a goal title');
      });
    });
  });

  describe('priority selection', () => {
    it('defaults to priority A', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'My goal');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.priority).toBe('A');
      });
    });

    it('allows selecting priority B', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'My goal');
      fireEvent.press(getByLabelText('Priority B'));
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.priority).toBe('B');
      });
    });

    it('allows selecting priority C', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'My goal');
      fireEvent.press(getByLabelText('Priority C'));
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.priority).toBe('C');
      });
    });
  });

  describe('removing goals', () => {
    it('removes goal when remove button is pressed', async () => {
      const { getByLabelText, dataRef, toJSON } = renderWithContextObserver();

      // Add a goal first
      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Goal to remove');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals).toHaveLength(1);
      });

      // Remove the goal
      fireEvent.press(getByLabelText('Remove goal: Goal to remove'));

      await waitFor(() => {
        expect(dataRef.current?.goals).toHaveLength(0);
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Goal to remove');
      });
    });

    it('shows empty state after removing last goal', async () => {
      const { getByLabelText, toJSON } = renderWithContextObserver();

      // Add a goal
      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Only goal');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Only goal');
      });

      // Remove the goal
      fireEvent.press(getByLabelText('Remove goal: Only goal'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('No goals added yet');
      });
    });
  });

  describe('max goals limit', () => {
    it('shows correct count when multiple goals added', async () => {
      const { getByLabelText, toJSON, dataRef } = renderWithContextObserver();

      // Add first goal
      fireEvent.press(getByLabelText('Add race goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Goal 1');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals).toHaveLength(1);
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Your Goals');
        expect(json).toContain('Goal 1');
      });

      // Add second goal
      fireEvent.press(getByLabelText('Add performance goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Goal 2');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals).toHaveLength(2);
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Goal 1');
        expect(json).toContain('Goal 2');
      });
    });
  });

  describe('different goal types', () => {
    it('adds performance goal correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add performance goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Increase FTP to 300W');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.goalType).toBe('performance');
      });
    });

    it('adds fitness goal correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add fitness goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Run 50km per week');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.goalType).toBe('fitness');
      });
    });

    it('adds health goal correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add health goal'));
      fireEvent.changeText(getByLabelText('Goal title'), 'Lose 5kg');
      fireEvent.press(getByLabelText('Add goal'));

      await waitFor(() => {
        expect(dataRef.current?.goals[0]?.goalType).toBe('health');
      });
    });
  });
});
