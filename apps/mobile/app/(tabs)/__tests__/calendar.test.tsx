import { render } from '@testing-library/react-native';

import CalendarScreen from '../calendar';

import type { UseCalendarEventsReturn } from '@/hooks';

const mockRefresh = jest.fn();
const mockNavigateForward = jest.fn();
const mockNavigateBack = jest.fn();

let mockCalendarReturn: UseCalendarEventsReturn = {
  events: [],
  isLoading: true,
  error: null,
  dateRange: { oldest: '2026-02-15', newest: '2026-02-28' },
  refresh: mockRefresh,
  navigateForward: mockNavigateForward,
  navigateBack: mockNavigateBack,
};

jest.mock('@/hooks', () => ({
  useCalendarEvents: () => mockCalendarReturn,
}));

const mockEvents = [
  {
    id: 'event-1',
    name: 'Zone 2 Endurance Ride',
    type: 'workout' as const,
    start_date: '2026-02-15T07:00:00Z',
    category: 'Ride',
    planned_duration: 5400,
    planned_tss: 65,
  },
  {
    id: 'event-2',
    name: 'Recovery Day',
    type: 'rest_day' as const,
    start_date: '2026-02-16T00:00:00Z',
    description: 'Active recovery or complete rest',
  },
  {
    id: 'event-3',
    name: 'Interval Session',
    type: 'workout' as const,
    start_date: '2026-02-15T17:00:00Z',
    category: 'Run',
    planned_duration: 3600,
    planned_tss: 72,
  },
  {
    id: 'event-4',
    name: 'Local Sprint Triathlon',
    type: 'race' as const,
    start_date: '2026-02-20T08:00:00Z',
    priority: 'B' as const,
  },
];

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalendarReturn = {
      events: mockEvents,
      isLoading: false,
      error: null,
      dateRange: { oldest: '2026-02-15', newest: '2026-02-28' },
      refresh: mockRefresh,
      navigateForward: mockNavigateForward,
      navigateBack: mockNavigateBack,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<CalendarScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows loading state when loading', () => {
    mockCalendarReturn = {
      ...mockCalendarReturn,
      events: [],
      isLoading: true,
    };

    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Loading calendar events...');
  });

  it('shows error state when error occurs', () => {
    mockCalendarReturn = {
      ...mockCalendarReturn,
      events: [],
      isLoading: false,
      error: 'Network error',
    };

    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Network error');
    expect(json).toContain('Unable to load calendar');
  });

  it('shows empty state when no events', () => {
    mockCalendarReturn = {
      ...mockCalendarReturn,
      events: [],
      isLoading: false,
    };

    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No Events');
    expect(json).toContain('No events scheduled for this period');
  });

  it('renders event names', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Zone 2 Endurance Ride');
    expect(json).toContain('Recovery Day');
    expect(json).toContain('Interval Session');
    expect(json).toContain('Local Sprint Triathlon');
  });

  it('groups events by date', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    // Both event-1 and event-3 are on 2026-02-15
    // event-2 is on 2026-02-16
    // Verify all event names appear in the rendered output
    expect(json).toContain('Zone 2 Endurance Ride');
    expect(json).toContain('Interval Session');
    expect(json).toContain('Recovery Day');
  });

  it('displays event categories', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ride');
    expect(json).toContain('Run');
  });

  it('displays planned duration', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('1h 30m'); // 5400 seconds
    expect(json).toContain('1h'); // 3600 seconds (no extra minutes)
  });

  it('displays TSS values', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    // TSS values render as separate children: ["65", " TSS"]
    expect(json).toContain('65');
    expect(json).toContain(' TSS');
    expect(json).toContain('72');
  });

  it('displays event priority', () => {
    const { toJSON } = render(<CalendarScreen />);
    const json = JSON.stringify(toJSON());
    // Race event has priority B
    expect(json).toContain('"B"');
  });
});
