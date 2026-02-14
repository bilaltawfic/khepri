import { formatDateLocal } from '@khepri/core';

import { supabase } from '@/lib/supabase';

// MCP Gateway response types
interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface WellnessDataPoint {
  readonly date: string;
  readonly ctl: number;
  readonly atl: number;
  readonly tsb: number;
  readonly rampRate: number;
  readonly restingHR?: number;
  readonly hrv?: number;
  readonly sleepQuality?: number; // 1-5 scale
  readonly sleepHours?: number;
  readonly fatigue?: number; // 1-5 scale
  readonly soreness?: number; // 1-5 scale
  readonly stress?: number; // 1-5 scale
  readonly mood?: number; // 1-5 scale
}

interface WellnessResponse {
  wellness: WellnessDataPoint[];
  summary: {
    current_ctl: number;
    current_atl: number;
    current_tsb: number;
    form_status: 'fresh' | 'fatigued' | 'optimal';
    avg_sleep_hours: number;
    avg_hrv: number;
    days_included: number;
  } | null;
  date_range: {
    oldest: string;
    newest: string;
  };
}

function getMCPGatewayUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${url}/functions/v1/mcp-gateway`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Activity data returned by the MCP gateway get_activities tool.
 */
export interface ActivityData {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly start_date: string;
  readonly duration: number; // seconds
  readonly distance?: number;
  readonly tss?: number;
  readonly ctl?: number;
  readonly atl?: number;
}

interface ActivitiesResponse {
  activities: ActivityData[];
  total: number;
  source: string;
}

/**
 * Fetch recent activities from Intervals.icu via MCP gateway.
 */
export async function getRecentActivities(daysBack = 7): Promise<ActivityData[]> {
  const headers = await getAuthHeaders();
  const oldest = new Date();
  oldest.setDate(oldest.getDate() - daysBack);
  const oldestStr = formatDateLocal(oldest);

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_activities',
      tool_input: { oldest: oldestStr },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  const result: MCPToolResponse<ActivitiesResponse> = await response.json();

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.activities;
}

/**
 * Fetch current CTL/ATL/TSB summary from Intervals.icu via MCP gateway.
 * Returns null if the fetch fails or no summary is available.
 */
export async function getWellnessSummary(): Promise<{
  readonly ctl: number | null;
  readonly atl: number | null;
  readonly tsb: number | null;
} | null> {
  const headers = await getAuthHeaders();
  const today = formatDateLocal(new Date());
  const oldest = new Date();
  oldest.setDate(oldest.getDate() - 7);
  const oldestStr = formatDateLocal(oldest);

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_wellness_data',
      tool_input: {
        oldest: oldestStr,
        newest: today,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wellness summary');
  }

  const result: MCPToolResponse<WellnessResponse> = await response.json();

  if (!result.success || !result.data?.summary) {
    return null;
  }

  return {
    ctl: result.data.summary.current_ctl ?? null,
    atl: result.data.summary.current_atl ?? null,
    tsb: result.data.summary.current_tsb ?? null,
  };
}

/**
 * Fetch today's wellness data from Intervals.icu via MCP gateway.
 */
export async function getTodayWellness(): Promise<WellnessDataPoint | null> {
  const headers = await getAuthHeaders();
  const today = formatDateLocal(new Date());

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_wellness_data',
      tool_input: {
        oldest: today,
        newest: today,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wellness data');
  }

  const result: MCPToolResponse<WellnessResponse> = await response.json();

  if (!result.success || !result.data) {
    return null;
  }

  // Return today's data if available
  const todayData = result.data.wellness.find((w) => w.date === today);
  return todayData ?? null;
}
