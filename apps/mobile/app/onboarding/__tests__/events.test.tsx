import { OnboardingProvider, useOnboarding } from '@/contexts';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type MutableRefObject, useEffect } from 'react';
import { View } from 'react-native';
import EventsScreen from '../events';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock calendar service
jest.mock('@/services/calendar', () => ({
  getCalendarEvents: jest.fn().mockResolvedValue([]),
}));

function renderWithProvider() {
  return render(
    <OnboardingProvider>
      <EventsScreen />
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
        <EventsScreen />
      </View>
    </OnboardingProvider>
  );
  return { ...result, dataRef };
}

describe('EventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = renderWithProvider();
    expect(toJSON()).toBeTruthy();
  });

  it('renders the title and description', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Key events this year');
    expect(json).toContain('Add your races, camps, and travel');
  });

  it('renders all event type cards', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Race');
    expect(json).toContain('Training Camp');
    expect(json).toContain('Travel');
    expect(json).toContain('Other Event');
  });

  it('renders the empty state when no Intervals.icu connected', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No events added yet');
  });

  it('renders the tip', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Adding your A-race helps Khepri periodize');
  });

  it('renders Continue and Skip buttons', () => {
    const { toJSON } = renderWithProvider();
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Continue');
    expect(json).toContain("Skip - I'll add events later");
  });

  describe('navigation', () => {
    it('Continue button navigates to plan screen', () => {
      const { getByLabelText } = renderWithProvider();
      fireEvent.press(getByLabelText('Continue to plan selection'));
      expect(router.push).toHaveBeenCalledWith('/onboarding/plan');
    });

    it('Skip button navigates to plan screen', () => {
      const { getByLabelText } = renderWithProvider();
      fireEvent.press(getByLabelText('Skip event entry'));
      expect(router.push).toHaveBeenCalledWith('/onboarding/plan');
    });
  });

  describe('adding events', () => {
    it('shows add event form when event type is tapped', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Event Name');
        expect(json).toContain('Date (YYYY-MM-DD)');
        expect(json).toContain('Priority');
      });
    });

    it('hides event type cards when add form is shown', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Training Camp');
        expect(json).not.toContain('Other Event');
      });
    });

    it('shows validation error when submitting empty name', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter an event name');
      });
    });

    it('shows validation error for invalid date', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'My Race');
      fireEvent.changeText(getByLabelText('Event date'), 'not-a-date');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Please enter a valid date');
      });
    });

    it('adds event to context when valid data is submitted', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'Ironman 70.3');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events).toHaveLength(1);
        expect(dataRef.current?.events[0]).toMatchObject({
          name: 'Ironman 70.3',
          type: 'race',
          date: '2026-06-15',
          priority: 'A',
        });
      });
    });

    it('displays added event in list', async () => {
      const { getByLabelText, toJSON } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'Ironman 70.3');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Your Events');
        expect(json).toContain('Ironman 70.3');
      });
    });

    it('closes form when cancel is pressed', async () => {
      const { getByLabelText, toJSON } = renderWithProvider();

      fireEvent.press(getByLabelText('Add race'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Event Name');
      });

      fireEvent.press(getByLabelText('Cancel adding event'));

      await waitFor(() => {
        const json = JSON.stringify(toJSON());
        expect(json).not.toContain('Event Name');
        expect(json).toContain('Race');
        expect(json).toContain('Training Camp');
      });
    });

    it('trims whitespace from event name', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), '  My Race  ');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.name).toBe('My Race');
      });
    });
  });

  describe('priority selection', () => {
    it('defaults to priority A', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'My Race');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.priority).toBe('A');
      });
    });

    it('allows selecting priority B', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'My Race');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Priority B'));
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.priority).toBe('B');
      });
    });
  });

  describe('removing events', () => {
    it('removes event when remove button is pressed', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      // Add an event
      fireEvent.press(getByLabelText('Add race'));
      fireEvent.changeText(getByLabelText('Event name'), 'Event to remove');
      fireEvent.changeText(getByLabelText('Event date'), '2026-06-15');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events).toHaveLength(1);
      });

      // Remove the event
      fireEvent.press(getByLabelText('Remove event: Event to remove'));

      await waitFor(() => {
        expect(dataRef.current?.events).toHaveLength(0);
      });
    });
  });

  describe('different event types', () => {
    it('adds travel event correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add travel'));
      fireEvent.changeText(getByLabelText('Event name'), 'Family vacation');
      fireEvent.changeText(getByLabelText('Event date'), '2026-08-01');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.type).toBe('travel');
      });
    });

    it('adds training camp event correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add training camp'));
      fireEvent.changeText(getByLabelText('Event name'), 'Cycling camp');
      fireEvent.changeText(getByLabelText('Event date'), '2026-05-01');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.type).toBe('camp');
      });
    });

    it('adds other event correctly', async () => {
      const { getByLabelText, dataRef } = renderWithContextObserver();

      fireEvent.press(getByLabelText('Add other event'));
      fireEvent.changeText(getByLabelText('Event name'), 'Wedding');
      fireEvent.changeText(getByLabelText('Event date'), '2026-10-01');
      fireEvent.press(getByLabelText('Add event'));

      await waitFor(() => {
        expect(dataRef.current?.events[0]?.type).toBe('other');
      });
    });
  });
});
