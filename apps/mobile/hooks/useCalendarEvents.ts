import { useCallback, useEffect, useState } from 'react';

import { formatDateLocal } from '@khepri/core';

import { useAuth } from '@/contexts';
import { type CalendarEvent, getCalendarEvents } from '@/services/calendar';

export interface UseCalendarEventsReturn {
  readonly events: CalendarEvent[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly dateRange: { readonly oldest: string; readonly newest: string };
  readonly refresh: () => Promise<void>;
  readonly navigateForward: () => void;
  readonly navigateBack: () => void;
}

/**
 * Hook that fetches calendar events for a 2-week window.
 * Supports navigating forward/back by 2-week increments.
 */
export function useCalendarEvents(): UseCalendarEventsReturn {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => new Date());

  const oldest = formatDateLocal(startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 13);
  const newest = formatDateLocal(endDate);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents(oldest, newest);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, oldest, newest]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const navigateForward = useCallback(() => {
    setStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 14);
      return next;
    });
  }, []);

  const navigateBack = useCallback(() => {
    setStartDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 14);
      return next;
    });
  }, []);

  return {
    events,
    isLoading,
    error,
    dateRange: { oldest, newest },
    refresh: fetchEvents,
    navigateForward,
    navigateBack,
  };
}
