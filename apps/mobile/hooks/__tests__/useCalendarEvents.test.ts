import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCalendarEvents } from '../useCalendarEvents';

// Mock calendar service
const mockGetCalendarEvents = jest.fn();

jest.mock('@/services/calendar', () => ({
  getCalendarEvents: (...args: unknown[]) => mockGetCalendarEvents(...args),
}));

// Mock auth context
const mockUser = { id: 'auth-user-123', email: 'test@example.com' };
let mockAuthUser: typeof mockUser | null = mockUser;

jest.mock('@/contexts', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
  }),
}));

const mockEvents = [
  {
    id: 'event-1',
    name: 'Zone 2 Endurance Ride',
    type: 'workout',
    start_date: '2026-02-14T07:00:00Z',
    category: 'Ride',
    planned_duration: 5400,
    planned_tss: 65,
  },
  {
    id: 'event-2',
    name: 'Recovery Day',
    type: 'rest_day',
    start_date: '2026-02-15T00:00:00Z',
    description: 'Active recovery or complete rest',
  },
  {
    id: 'event-3',
    name: 'Interval Session',
    type: 'workout',
    start_date: '2026-02-16T06:30:00Z',
    category: 'Run',
    planned_duration: 3600,
    planned_tss: 72,
  },
];

describe('useCalendarEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = mockUser;
    mockGetCalendarEvents.mockResolvedValue(mockEvents);
  });

  describe('initial load', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useCalendarEvents());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('fetches and returns events', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.error).toBeNull();
      expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);
    });

    it('passes date range to getCalendarEvents', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCalendarEvents).toHaveBeenCalledWith(
        result.current.dateRange.oldest,
        result.current.dateRange.newest
      );
    });
  });

  describe('error handling', () => {
    it('sets error message on fetch failure', async () => {
      mockGetCalendarEvents.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.events).toEqual([]);
    });

    it('handles non-Error exceptions', async () => {
      mockGetCalendarEvents.mockRejectedValue('unknown failure');

      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load events');
      expect(result.current.events).toEqual([]);
    });
  });

  describe('navigation', () => {
    it('shifts date range forward by 14 days on navigateForward', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialOldest = result.current.dateRange.oldest;

      act(() => {
        result.current.navigateForward();
      });

      await waitFor(() => {
        expect(result.current.dateRange.oldest).not.toBe(initialOldest);
      });

      // The new oldest should be 14 days after the initial oldest
      const initialDate = new Date(initialOldest);
      const newDate = new Date(result.current.dateRange.oldest);
      const diffDays = Math.round((newDate.getTime() - initialDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(14);
    });

    it('shifts date range back by 14 days on navigateBack', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialOldest = result.current.dateRange.oldest;

      act(() => {
        result.current.navigateBack();
      });

      await waitFor(() => {
        expect(result.current.dateRange.oldest).not.toBe(initialOldest);
      });

      const initialDate = new Date(initialOldest);
      const newDate = new Date(result.current.dateRange.oldest);
      const diffDays = Math.round((newDate.getTime() - initialDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(-14);
    });

    it('re-fetches events after navigation', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.navigateForward();
      });

      await waitFor(() => {
        expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('refresh', () => {
    it('re-fetches current date range', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCalendarEvents).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetCalendarEvents).toHaveBeenCalledTimes(2);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockAuthUser = null;
    });

    it('stops loading without fetching', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCalendarEvents).not.toHaveBeenCalled();
      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('date range', () => {
    it('covers a 14-day window', async () => {
      const { result } = renderHook(() => useCalendarEvents());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const oldest = new Date(result.current.dateRange.oldest);
      const newest = new Date(result.current.dateRange.newest);
      const diffDays = Math.round((newest.getTime() - oldest.getTime()) / 86_400_000);
      expect(diffDays).toBe(13); // 14 days inclusive = 13 day difference
    });
  });
});
