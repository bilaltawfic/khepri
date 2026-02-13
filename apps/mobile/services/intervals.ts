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
