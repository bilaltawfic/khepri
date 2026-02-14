import { formatDateLocal } from '@khepri/core';

import { type MCPToolResponse, getAuthHeaders, getMCPGatewayUrl } from '@/services/mcp-gateway';

/**
 * Calendar event shape matching the MCP gateway get_events tool response.
 */
export interface CalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly type: 'workout' | 'race' | 'note' | 'rest_day' | 'travel';
  readonly start_date: string;
  readonly end_date?: string;
  readonly description?: string;
  readonly category?: string;
  readonly planned_duration?: number; // seconds
  readonly planned_tss?: number;
  readonly planned_distance?: number; // meters
  readonly indoor?: boolean;
  readonly priority?: 'A' | 'B' | 'C';
}

interface EventsResponse {
  events: CalendarEvent[];
  total: number;
  source: string;
  date_range: { oldest: string; newest: string };
}

/**
 * Fetch calendar events from Intervals.icu via MCP gateway.
 * Default range: today to 14 days ahead.
 */
export async function getCalendarEvents(
  oldest?: string,
  newest?: string
): Promise<CalendarEvent[]> {
  const headers = await getAuthHeaders();

  const today = formatDateLocal(new Date());
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 13);
  const defaultNewest = formatDateLocal(twoWeeksOut);

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_events',
      tool_input: {
        oldest: oldest ?? today,
        newest: newest ?? defaultNewest,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }

  const result: MCPToolResponse<EventsResponse> = await response.json();

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.events;
}
